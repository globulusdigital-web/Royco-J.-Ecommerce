import { randomUUID, timingSafeEqual } from "node:crypto";
import {
  clearSessionCookie,
  hashPassword,
  normalizeEmail,
  parseCookies,
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  sessionCookie,
  sha256,
  signSession,
  verifyPassword,
  verifySession,
} from "./auth.mjs";
import { ApiError, assertSameOrigin, clientIp, fail, ok, readJson } from "./http.mjs";
import { checkOtp, maskPhone, normalizePhone, OTP_EXPIRES_IN_SECONDS, sendOtp } from "./otp.mjs";
import { createRazorpayOrder, verifyRazorpaySignature } from "./payments.mjs";
import { getProductionRepository } from "./repository.mjs";
import { getProductionBlobStorage } from "./storage.mjs";
import {
  booleanValue,
  CATEGORIES,
  enumValue,
  integer,
  MATERIALS,
  passwordErrors,
  positiveMoneyPaise,
  slugify,
  text,
  validEmail,
  validateImageSignature,
} from "./validation.mjs";

const ORDER_STATUSES = Object.freeze(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);
const PAYMENT_METHODS = Object.freeze({
  pay_in_store: "store",
  store: "store",
  cod: "cod",
  upi_transfer: "bank_transfer",
  bank_transfer: "bank_transfer",
  razorpay: "razorpay",
});
const APPOINTMENT_STATUSES = Object.freeze(["requested", "confirmed", "completed", "cancelled"]);
const APPOINTMENT_SERVICES = Object.freeze(["birth_chart", "gemstone_guidance", "muhurat"]);
const APPOINTMENT_LANGUAGES = Object.freeze(["Bengali", "English", "Hindi"]);
const APPOINTMENT_TIMES = Object.freeze(["10:30", "11:30", "12:30", "15:30", "16:30", "17:30"]);
const IMAGE_EXTENSIONS = Object.freeze({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" });
const MAX_UPLOAD_BYTES = Math.floor(3.5 * 1024 * 1024);

let productionDependencies;

async function defaultDependencies() {
  productionDependencies ??= Promise.all([getProductionRepository(), getProductionBlobStorage()])
    .then(([repository, uploads]) => ({ repository, uploads }));
  return productionDependencies;
}

function apiPath(url) {
  const pathname = new URL(url).pathname.replace(/\/+$/, "") || "/";
  for (const prefix of ["/.netlify/functions/api", "/api"]) {
    if (pathname === prefix) return "/";
    if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  }
  return pathname;
}

function constantTimeText(left, right) {
  const a = Buffer.from(sha256(String(left)));
  const b = Buffer.from(sha256(String(right)));
  return timingSafeEqual(a, b);
}

function isSecureRequest(request) {
  return new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
}

function requiredSessionSecret(env) {
  if (typeof env.SESSION_SECRET !== "string" || env.SESSION_SECRET.length < 32) {
    throw new ApiError(503, "service_not_configured", "Secure account access is being configured. Please try again shortly.");
  }
  return env.SESSION_SECRET;
}

function cleanEmail(value) {
  const email = String(value ?? "").trim();
  if (!validEmail(email) && normalizeEmail(email) !== "admin@royco") {
    throw new ApiError(422, "validation_error", "Enter a valid email address");
  }
  return email;
}

function requiredText(value, field, min = 1, max = 255) {
  const checked = text(value, { field, min, max, required: true });
  if (checked.error) throw new ApiError(422, "validation_error", checked.error);
  return checked.value;
}

function optionalText(value, field, max = 255) {
  const checked = text(value, { field, max });
  if (checked.error) throw new ApiError(422, "validation_error", checked.error);
  return checked.value;
}

function validUrl(value, { required = true } = {}) {
  const source = String(value ?? "").trim();
  if (!source && !required) return "";
  if (source.startsWith("/") && !source.startsWith("//")) return source.slice(0, 2048);
  try {
    const url = new URL(source);
    if (url.protocol === "https:" && source.length <= 2048) return source;
  } catch {}
  throw new ApiError(422, "validation_error", "Image URL must be a local path or secure HTTPS URL");
}

function validateProduct(body) {
  const name = requiredText(body.name, "Product name", 2, 160);
  const sku = requiredText(body.sku, "SKU", 2, 64).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku)) throw new ApiError(422, "validation_error", "SKU contains unsupported characters");
  const slug = slugify(body.slug || name);
  if (!slug) throw new ApiError(422, "validation_error", "A valid product slug is required");
  const material = enumValue(body.material ?? body.metal, MATERIALS);
  const category = enumValue(body.category, CATEGORIES);
  if (!material || !category) throw new ApiError(422, "validation_error", "Select a valid metal and category");
  const price = positiveMoneyPaise(body.pricePaise, body.price, "price");
  const compare = positiveMoneyPaise(body.compareAtPricePaise, body.compareAtPrice, "compareAtPrice");
  if (price.error || compare.error) throw new ApiError(422, "validation_error", price.error || compare.error);
  const compareAtPricePaise = compare.value > 0 ? compare.value : null;
  if (compareAtPricePaise != null && compareAtPricePaise < price.value) {
    throw new ApiError(422, "validation_error", "Compare price cannot be lower than the selling price");
  }
  const stock = integer(body.stock, { field: "stock", min: 0, max: 1_000_000 });
  if (stock.error) throw new ApiError(422, "validation_error", stock.error);
  const weightG = Number(body.weightG ?? body.weight_g ?? 0);
  if (!Number.isFinite(weightG) || weightG < 0 || weightG > 1_000_000) {
    throw new ApiError(422, "validation_error", "Weight must be a non-negative number");
  }
  const gallery = Array.isArray(body.gallery) ? body.gallery.slice(0, 12).map((url) => validUrl(url)) : [];
  return {
    name,
    bengaliName: optionalText(body.bengaliName ?? body.bengali_name, "Bengali name", 160),
    sku,
    slug,
    material,
    category,
    purity: requiredText(body.purity, "Purity", 1, 80),
    description: requiredText(body.description, "Description", 2, 4000),
    weightG: Math.round(weightG * 1000) / 1000,
    pricePaise: price.value,
    compareAtPricePaise,
    stock: stock.value,
    imageUrl: validUrl(body.imageUrl ?? body.image_url),
    gallery,
    featured: booleanValue(body.featured, false),
    active: booleanValue(body.active, true),
  };
}

function validatePromotion(body) {
  const code = requiredText(body.code, "Offer code", 3, 24).toUpperCase();
  if (!/^[A-Z0-9_-]+$/.test(code)) throw new ApiError(422, "validation_error", "Offer code contains unsupported characters");
  const discountType = body.discountType === "fixed" ? "fixed" : "percent";
  let discountValue;
  if (discountType === "percent") {
    const result = integer(body.discountPercent ?? body.discount_value, { field: "Discount", min: 1, max: 100 });
    if (result.error) throw new ApiError(422, "validation_error", result.error);
    discountValue = result.value;
  } else {
    const result = positiveMoneyPaise(body.discountValuePaise, body.discountAmount, "discount");
    if (result.error || result.value <= 0) throw new ApiError(422, "validation_error", result.error || "Discount must be positive");
    discountValue = result.value;
  }
  const minimum = positiveMoneyPaise(body.minOrderPaise, body.minOrder ?? 0, "minimum order");
  const maximum = positiveMoneyPaise(body.maxDiscountPaise, body.maxDiscount ?? 0, "maximum discount");
  if (minimum.error || maximum.error) throw new ApiError(422, "validation_error", minimum.error || maximum.error);
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if ((startsAt && Number.isNaN(startsAt.valueOf())) || (endsAt && Number.isNaN(endsAt.valueOf())) || (startsAt && endsAt && endsAt <= startsAt)) {
    throw new ApiError(422, "validation_error", "Promotion dates are invalid");
  }
  return {
    id: body.id || `promo-${randomUUID()}`,
    code,
    title: requiredText(body.title, "Title", 2, 160),
    description: requiredText(body.description ?? body.details, "Description", 2, 1000),
    discountType,
    discountValue,
    minOrderPaise: minimum.value,
    maxDiscountPaise: maximum.value > 0 ? maximum.value : null,
    startsAt: startsAt?.toISOString() || null,
    endsAt: endsAt?.toISOString() || null,
    active: booleanValue(body.active, true),
  };
}

function validateCheckout(body) {
  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    throw new ApiError(422, "validation_error", "Your bag must contain between 1 and 50 products");
  }
  const consolidated = new Map();
  for (const item of body.items) {
    const productId = Number(item?.productId);
    const quantity = integer(item?.quantity, { field: "quantity", min: 1, max: 25 });
    if (!Number.isSafeInteger(productId) || productId <= 0 || quantity.error) {
      throw new ApiError(422, "validation_error", quantity.error || "A product in the bag is invalid");
    }
    consolidated.set(productId, (consolidated.get(productId) || 0) + quantity.value);
    if (consolidated.get(productId) > 25) throw new ApiError(422, "validation_error", "Quantity cannot exceed 25");
  }
  const address = body.shippingAddress || {};
  const postalCode = requiredText(address.postalCode, "PIN code", 6, 6);
  if (!/^\d{6}$/.test(postalCode)) throw new ApiError(422, "validation_error", "PIN code must contain 6 digits");
  const phone = requiredText(address.phone, "Phone number", 8, 18);
  if (!/^[+0-9 ()-]+$/.test(phone)) throw new ApiError(422, "validation_error", "Enter a valid phone number");
  const paymentMethod = PAYMENT_METHODS[body.paymentMethod];
  if (!paymentMethod) throw new ApiError(422, "validation_error", "Select a valid payment method");
  const couponCode = body.couponCode ? requiredText(body.couponCode, "Offer code", 3, 24).toUpperCase() : null;
  return {
    items: [...consolidated].map(([productId, quantity]) => ({ productId, quantity })),
    couponCode,
    paymentMethod,
    shippingAddress: {
      name: requiredText(address.name, "Full name", 2, 160),
      phone,
      line1: requiredText(address.line1, "Address", 3, 240),
      line2: optionalText(address.line2, "Address line 2", 240),
      city: requiredText(address.city, "City", 2, 120),
      state: requiredText(address.state, "State", 2, 120),
      postalCode,
      instructions: optionalText(address.instructions, "Delivery note", 500),
    },
  };
}

function appointmentDay(dateValue) {
  const date = String(dateValue || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new ApiError(422, "validation_error", "Choose a valid appointment date");
  }
  const start = new Date(`${date}T00:00:00+05:30`);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(start);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  const normalized = `${value("year")}-${value("month")}-${value("day")}`;
  if (Number.isNaN(start.valueOf()) || normalized !== date) {
    throw new ApiError(422, "validation_error", "Choose a valid appointment date");
  }
  return {
    date,
    start,
    end: new Date(start.valueOf() + 24 * 60 * 60 * 1000),
  };
}

function validateAppointment(body) {
  const day = appointmentDay(body.date);
  const time = String(body.time || "").trim();
  if (!APPOINTMENT_TIMES.includes(time)) {
    throw new ApiError(422, "validation_error", "Choose an available appointment time");
  }
  const scheduledAt = new Date(`${day.date}T${time}:00+05:30`);
  const earliest = Date.now() + 30 * 60 * 1000;
  const latest = Date.now() + 90 * 24 * 60 * 60 * 1000;
  if (scheduledAt.valueOf() < earliest || scheduledAt.valueOf() > latest) {
    throw new ApiError(422, "validation_error", "Appointments can be booked from 30 minutes to 90 days ahead");
  }
  const service = enumValue(body.service, APPOINTMENT_SERVICES);
  const language = enumValue(body.language || "Bengali", APPOINTMENT_LANGUAGES);
  if (!service || !language) throw new ApiError(422, "validation_error", "Choose a valid consultation and language");
  return {
    service,
    language,
    scheduledAt: scheduledAt.toISOString(),
    notes: body.notes ? requiredText(body.notes, "Notes", 0, 600) : "",
  };
}

async function appointmentAvailability(repository, dateValue) {
  const day = appointmentDay(dateValue);
  const reserved = new Set(
    (await repository.appointmentAvailability(day.start.toISOString(), day.end.toISOString()))
      .map((value) => new Date(value).toISOString()),
  );
  return {
    date: day.date,
    timeZone: "Asia/Kolkata",
    slots: APPOINTMENT_TIMES.map((time) => {
      const scheduledAt = new Date(`${day.date}T${time}:00+05:30`).toISOString();
      return {
        time,
        scheduledAt,
        available: new Date(scheduledAt).valueOf() >= Date.now() + 30 * 60 * 1000
          && !reserved.has(scheduledAt),
      };
    }),
  };
}

async function authenticatedUser(request, repository, env, { admin = false } = {}) {
  const secret = requiredSessionSecret(env);
  const token = parseCookies(request.headers.get("cookie"))[SESSION_COOKIE];
  const payload = verifySession(token, secret);
  if (!payload) throw new ApiError(401, "authentication_required", "Please sign in to continue");
  const session = await repository.getSession(sha256(token));
  if (!session || String(session.id) !== payload.sub || session.session_id !== payload.sid || session.role !== payload.role) {
    throw new ApiError(401, "session_expired", "Your session has expired. Please sign in again.");
  }
  if (admin && session.role !== "admin") throw new ApiError(403, "admin_required", "Administrator access is required");
  return { user: session, sessionId: session.session_id };
}

async function issueSession(repository, user, request, env) {
  const secret = requiredSessionSecret(env);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const sessionId = randomUUID();
  const token = signSession({
    v: 1,
    sid: sessionId,
    sub: String(user.id),
    role: user.role,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
  }, secret);
  await repository.createSession({
    id: sessionId,
    userId: user.id,
    tokenHash: sha256(token),
    expiresAt: new Date((nowSeconds + SESSION_TTL_SECONDS) * 1000).toISOString(),
    ipAddress: clientIp(request),
    userAgent: String(request.headers.get("user-agent") || "").slice(0, 500),
  });
  return token;
}

function csvCell(value) {
  const source = value == null ? "" : String(value);
  return /[",\r\n]/.test(source) ? `"${source.replaceAll('"', '""')}"` : source;
}

function salesCsv(rows) {
  const columns = ["order_number", "created_at", "status", "customer_name", "customer_email", "customer_phone", "payment_method", "promo_code", "items", "subtotal", "discount", "shipping", "total"];
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push([
      row.order_number, row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
      row.status, row.customer_name, row.customer_email, row.customer_phone, row.payment_method,
      row.promo_code, row.items, Number(row.subtotal_paise || 0) / 100,
      Number(row.discount_paise || 0) / 100, Number(row.shipping_paise || 0) / 100,
      Number(row.total_paise || 0) / 100,
    ].map(csvCell).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

function translateDatabaseError(error) {
  if (error instanceof ApiError) return error;
  if (error?.constraint === "appointments_active_slot_unique") {
    return new ApiError(409, "appointment_unavailable", "That appointment time was just booked. Please choose another.");
  }
  if (error?.code === "23505") return new ApiError(409, "already_exists", "A record with that email, SKU, slug or offer code already exists");
  if (["23503", "23514", "22P02"].includes(error?.code)) return new ApiError(422, "validation_error", "The submitted data could not be saved");
  return error;
}

export function createApiHandler({ getDependencies = defaultDependencies, env = process.env } = {}) {
  return async function handler(request) {
    try {
      const method = request.method.toUpperCase();
      const path = apiPath(request.url);
      const url = new URL(request.url);
      if (method === "OPTIONS") return new Response(null, { status: 204, headers: { Allow: "GET, HEAD, POST, PUT, DELETE, OPTIONS" } });
      if (!["GET", "HEAD"].includes(method)) assertSameOrigin(request);
      const { repository, uploads } = await getDependencies();

      if (path === "/health" && method === "GET") {
        const connected = await repository.ping();
        return ok({ status: connected ? "ok" : "degraded", database: connected ? "connected" : "unavailable", time: new Date().toISOString() }, connected ? 200 : 503);
      }

      if (path === "/products" && method === "GET") {
        const material = url.searchParams.get("metal") || url.searchParams.get("material");
        const category = url.searchParams.get("category");
        const products = await repository.listProducts({
          material: material ? enumValue(material, MATERIALS) : null,
          category: category ? enumValue(category, CATEGORIES) : null,
          featured: ["1", "true"].includes(url.searchParams.get("featured")),
          search: String(url.searchParams.get("q") || "").trim().slice(0, 120),
        });
        return ok({ products });
      }

      const publicProduct = path.match(/^\/products\/([^/]+)$/);
      if (publicProduct && method === "GET") {
        const product = await repository.getProduct(decodeURIComponent(publicProduct[1]));
        if (!product) throw new ApiError(404, "not_found", "Product not found");
        return ok({ product });
      }

      if (path === "/promotions" && method === "GET") {
        return ok({ promotions: await repository.listPromotions(false) });
      }

      if (path === "/appointments/availability" && method === "GET") {
        return ok(await appointmentAvailability(repository, url.searchParams.get("date")));
      }

      if (path === "/auth/otp/request" && method === "POST") {
        const body = await readJson(request);
        const result = await sendOtp(body.phone, env);
        return ok({
          sent: true,
          phone: result.phone,
          maskedPhone: maskPhone(result.phone),
          expiresIn: OTP_EXPIRES_IN_SECONDS,
          ...(result.devOtp ? { devOtp: result.devOtp } : {}),
        });
      }

      if (path === "/auth/otp/verify" && method === "POST") {
        const body = await readJson(request);
        const phone = normalizePhone(body.phone);
        if (!(await checkOtp(phone, body.code, env))) {
          throw new ApiError(401, "invalid_otp", "That verification code is invalid or has expired");
        }
        let user = await repository.getUserByPhone(phone);
        if (!user) {
          const name = requiredText(body.name, "Full name", 2, 160);
          try {
            user = await repository.createOtpUser({
              id: randomUUID(),
              name,
              phone,
              phoneNormalized: phone,
            });
          } catch (error) {
            if (error?.code !== "23505") throw error;
            user = await repository.getUserByPhone(phone);
            if (!user) throw error;
          }
        }
        const token = await issueSession(repository, user, request, env);
        return ok({ user: repository.serializeUser(user), isNewUser: !user.email }, 200, {
          "Set-Cookie": sessionCookie(token, SESSION_TTL_SECONDS, { secure: isSecureRequest(request) }),
        });
      }

      if (path === "/auth/signup" && method === "POST") {
        const body = await readJson(request);
        const email = cleanEmail(body.email);
        const normalized = normalizeEmail(email);
        if (normalized === normalizeEmail(env.ADMIN_USER || "Admin@Royco")) throw new ApiError(409, "email_unavailable", "That email cannot be used for a customer account");
        const errors = passwordErrors(body.password);
        if (errors.length) throw new ApiError(422, "validation_error", errors[0], errors);
        const user = await repository.createUser({
          id: randomUUID(), email, emailNormalized: normalized,
          name: requiredText(body.name, "Name", 2, 160),
          phone: requiredText(body.phone, "Phone number", 8, 18),
          passwordHash: await hashPassword(body.password),
        });
        const token = await issueSession(repository, user, request, env);
        return ok({ user: repository.serializeUser(user) }, 201, { "Set-Cookie": sessionCookie(token, SESSION_TTL_SECONDS, { secure: isSecureRequest(request) }) });
      }

      if (path === "/auth/login" && method === "POST") {
        const body = await readJson(request);
        const email = cleanEmail(body.email);
        const normalized = normalizeEmail(email);
        let user;
        if (body.admin === true) {
          const adminEmail = env.ADMIN_USER || "Admin@Royco";
          const adminPassword = env.ADMIN_PASSWORD || (env.NODE_ENV === "production" ? "" : "Admin@123");
          if (!adminPassword) {
            throw new ApiError(503, "admin_not_configured", "Administrator access must be configured in Render.");
          }
          if (!constantTimeText(normalized, normalizeEmail(adminEmail)) || !constantTimeText(body.password, adminPassword)) {
            throw new ApiError(401, "invalid_credentials", "Administrator ID or password is incorrect");
          }
          user = await repository.upsertAdmin({
            id: randomUUID(), email: adminEmail, emailNormalized: normalizeEmail(adminEmail),
            name: "Royco Administrator", passwordHash: await hashPassword(adminPassword),
          });
        } else {
          user = await repository.getUserByEmail(normalized);
          if (!user || !(await verifyPassword(body.password, user.password_hash))) {
            throw new ApiError(401, "invalid_credentials", "Email or password is incorrect");
          }
        }
        const token = await issueSession(repository, user, request, env);
        return ok({ user: repository.serializeUser(user) }, 200, { "Set-Cookie": sessionCookie(token, SESSION_TTL_SECONDS, { secure: isSecureRequest(request) }) });
      }

      if (path === "/auth/me" && method === "GET") {
        const { user } = await authenticatedUser(request, repository, env);
        return ok({ user: repository.serializeUser(user) });
      }

      if (path === "/auth/logout" && method === "POST") {
        try {
          const { sessionId } = await authenticatedUser(request, repository, env);
          await repository.revokeSession(sessionId);
        } catch (error) {
          if (!(error instanceof ApiError) || ![401, 403].includes(error.status)) throw error;
        }
        return ok({ signedOut: true }, 200, { "Set-Cookie": clearSessionCookie({ secure: isSecureRequest(request) }) });
      }

      if (path === "/checkout" && method === "POST") {
        const { user } = await authenticatedUser(request, repository, env);
        if (user.role !== "customer") throw new ApiError(403, "customer_required", "Use a customer account to place an order");
        const checkout = validateCheckout(await readJson(request));
        if (checkout.paymentMethod === "razorpay") {
          throw new ApiError(422, "payment_verification_required", "Complete Razorpay verification before placing this order");
        }
        const order = await repository.checkout({ user, ...checkout });
        return ok({ order }, 201);
      }

      if (path === "/payments/razorpay/order" && method === "POST") {
        const { user } = await authenticatedUser(request, repository, env);
        if (user.role !== "customer") throw new ApiError(403, "customer_required", "Use a customer account to place an order");
        const checkout = validateCheckout({ ...(await readJson(request)), paymentMethod: "razorpay" });
        const quote = await repository.quoteCheckout(checkout);
        const intentId = randomUUID();
        const provider = await createRazorpayOrder({
          amountPaise: quote.totalPaise,
          receipt: `royco_${intentId.replaceAll("-", "").slice(0, 24)}`,
          notes: { customer_id: String(user.id), purpose: "Royco jewellery order" },
          env,
        });
        if (provider.amountPaise !== quote.totalPaise || provider.currency !== "INR") {
          throw new ApiError(502, "payment_amount_mismatch", "Razorpay returned an unexpected payment amount");
        }
        await repository.createPaymentIntent({
          id: intentId,
          userId: user.id,
          providerOrderId: provider.providerOrderId,
          amountPaise: quote.totalPaise,
          checkoutPayload: checkout,
        });
        return ok({
          keyId: provider.keyId,
          orderId: provider.providerOrderId,
          amount: quote.totalPaise,
          currency: "INR",
          name: "Royco Jewellers",
          description: "Jewellery order",
          prefill: { name: user.name, contact: user.phone, email: user.email || "" },
        }, 201);
      }

      if (path === "/payments/razorpay/verify" && method === "POST") {
        const { user } = await authenticatedUser(request, repository, env);
        if (user.role !== "customer") throw new ApiError(403, "customer_required", "Use a customer account to place an order");
        const body = await readJson(request);
        const providerOrderId = requiredText(body.razorpay_order_id, "Razorpay order", 5, 100);
        const paymentId = requiredText(body.razorpay_payment_id, "Razorpay payment", 5, 100);
        const signature = requiredText(body.razorpay_signature, "Razorpay signature", 10, 256);
        const intent = await repository.getPaymentIntent(providerOrderId, user.id);
        if (!intent) throw new ApiError(404, "payment_not_found", "This payment session was not found");
        if (intent.status === "paid" && intent.completed_order_id) {
          const orders = await repository.listOrdersForUser(user.id);
          const completed = orders.find((order) => String(order.id) === String(intent.completed_order_id));
          if (completed) return ok({ order: completed });
        }
        if (!verifyRazorpaySignature({ providerOrderId, paymentId, signature, env })) {
          throw new ApiError(400, "invalid_payment_signature", "Razorpay could not verify this payment");
        }
        const checkout = intent.checkoutPayload || intent.checkout_payload;
        const order = await repository.checkout({
          user,
          ...checkout,
          paymentMethod: "razorpay",
          razorpayOrderId: providerOrderId,
          razorpayPaymentId: paymentId,
        });
        await repository.completePaymentIntent(providerOrderId, paymentId, order.id);
        return ok({ order }, 201);
      }

      if (path === "/appointments" && method === "GET") {
        const { user } = await authenticatedUser(request, repository, env);
        return ok({ appointments: await repository.listAppointmentsForUser(user.id) });
      }

      if (path === "/appointments" && method === "POST") {
        const { user } = await authenticatedUser(request, repository, env);
        if (user.role !== "customer") throw new ApiError(403, "customer_required", "Use a customer account to book an appointment");
        const appointment = await repository.createAppointment({
          id: randomUUID(),
          user,
          ...validateAppointment(await readJson(request)),
        });
        await repository.audit({
          actorUserId: user.id,
          actorRole: user.role,
          action: "appointment.created",
          entityType: "appointment",
          entityId: appointment.id,
          metadata: { scheduledAt: appointment.scheduledAt, service: appointment.service },
          ipAddress: clientIp(request),
        });
        return ok({ appointment }, 201);
      }

      if (path === "/orders" && method === "GET") {
        const { user } = await authenticatedUser(request, repository, env);
        return ok({ orders: await repository.listOrdersForUser(user.id) });
      }

      const cancelOrder = path.match(/^\/orders\/([^/]+)\/cancel$/);
      if (cancelOrder && method === "POST") {
        const { user } = await authenticatedUser(request, repository, env);
        const order = await repository.cancelOrder(user.id, decodeURIComponent(cancelOrder[1]));
        if (!order) throw new ApiError(409, "cannot_cancel", "Only a pending order can be cancelled");
        return ok({ order });
      }

      const uploadRead = path.match(/^\/uploads\/([a-f0-9-]{36}\.(?:jpg|png|webp))$/i);
      if (uploadRead && method === "GET") {
        const entry = await uploads.get(uploadRead[1]);
        if (!entry) throw new ApiError(404, "not_found", "Image not found");
        return new Response(entry.data, {
          status: 200,
          headers: {
            "Content-Type": entry.metadata?.contentType || "application/octet-stream",
            "Cache-Control": "public, max-age=31536000, immutable",
            ...(entry.etag ? { ETag: entry.etag } : {}),
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      if (path.startsWith("/admin/")) {
        const { user } = await authenticatedUser(request, repository, env, { admin: true });
        const audit = (action, entityType, entityId, metadata = {}) => repository.audit({
          actorUserId: user.id, actorRole: user.role, action, entityType, entityId,
          metadata, ipAddress: clientIp(request),
        });

        if (path === "/admin/dashboard" && method === "GET") return ok(await repository.dashboard());
        if (path === "/admin/products" && method === "GET") return ok({ products: await repository.listProducts({ includeInactive: true }) });
        if (path === "/admin/products" && method === "POST") {
          const product = await repository.createProduct(validateProduct(await readJson(request)));
          await audit("product.created", "product", product.id, { sku: product.sku });
          return ok({ product }, 201);
        }
        const adminProduct = path.match(/^\/admin\/products\/(\d+)$/);
        if (adminProduct && method === "PUT") {
          const product = await repository.updateProduct(Number(adminProduct[1]), validateProduct(await readJson(request)));
          if (!product) throw new ApiError(404, "not_found", "Product not found");
          await audit("product.updated", "product", product.id, { sku: product.sku });
          return ok({ product });
        }
        if (adminProduct && method === "DELETE") {
          if (!(await repository.deleteProduct(Number(adminProduct[1])))) throw new ApiError(404, "not_found", "Product not found");
          await audit("product.deleted", "product", adminProduct[1]);
          return ok({ deleted: true });
        }

        if (path === "/admin/promotions" && method === "GET") return ok({ promotions: await repository.listPromotions(true) });
        if (path === "/admin/promotions" && method === "POST") {
          const promotion = await repository.createPromotion(validatePromotion(await readJson(request)));
          await audit("promotion.created", "promotion", promotion.id, { code: promotion.code });
          return ok({ promotion }, 201);
        }
        const adminPromotion = path.match(/^\/admin\/promotions\/([^/]+)$/);
        if (adminPromotion && method === "PUT") {
          const promotion = await repository.updatePromotion(decodeURIComponent(adminPromotion[1]), validatePromotion(await readJson(request)));
          if (!promotion) throw new ApiError(404, "not_found", "Promotion not found");
          await audit("promotion.updated", "promotion", promotion.id, { code: promotion.code });
          return ok({ promotion });
        }
        if (adminPromotion && method === "DELETE") {
          const identifier = decodeURIComponent(adminPromotion[1]);
          if (!(await repository.deletePromotion(identifier))) throw new ApiError(404, "not_found", "Promotion not found");
          await audit("promotion.deleted", "promotion", identifier);
          return ok({ deleted: true });
        }

        if (path === "/admin/orders" && method === "GET") return ok({ orders: await repository.listOrdersAdmin() });
        const orderStatus = path.match(/^\/admin\/orders\/([^/]+)\/status$/);
        if (orderStatus && method === "PUT") {
          const body = await readJson(request);
          const status = enumValue(body.status, ORDER_STATUSES);
          if (!status) throw new ApiError(422, "validation_error", "Select a valid order status");
          const order = await repository.updateOrderStatus(decodeURIComponent(orderStatus[1]), status);
          if (!order) throw new ApiError(404, "not_found", "Order not found");
          await audit("order.status_updated", "order", order.id, { status });
          return ok({ order });
        }

        if (path === "/admin/appointments" && method === "GET") {
          return ok({ appointments: await repository.listAppointmentsAdmin() });
        }
        const appointmentStatus = path.match(/^\/admin\/appointments\/([^/]+)\/status$/);
        if (appointmentStatus && method === "PUT") {
          const body = await readJson(request);
          const status = enumValue(body.status, APPOINTMENT_STATUSES);
          if (!status) throw new ApiError(422, "validation_error", "Select a valid appointment status");
          const appointment = await repository.updateAppointmentStatus(
            decodeURIComponent(appointmentStatus[1]),
            status,
          );
          if (!appointment) throw new ApiError(404, "not_found", "Appointment not found");
          await audit("appointment.status_updated", "appointment", appointment.id, { status });
          return ok({ appointment });
        }

        if (path === "/admin/database-summary" && method === "GET") return ok(await repository.databaseSummary());
        if (path === "/admin/audit" && method === "GET") return ok({ events: await repository.listAudit() });
        if (path === "/admin/sales.csv" && method === "GET") {
          return new Response(salesCsv(await repository.salesRows()), {
            status: 200,
            headers: {
              "Content-Type": "text/csv; charset=utf-8",
              "Content-Disposition": `attachment; filename="royco-sales-${new Date().toISOString().slice(0, 10)}.csv"`,
              "Cache-Control": "no-store",
              "X-Content-Type-Options": "nosniff",
            },
          });
        }

        if (path === "/admin/uploads" && method === "POST") {
          const contentType = request.headers.get("content-type") || "";
          if (!contentType.toLowerCase().startsWith("multipart/form-data")) {
            throw new ApiError(415, "unsupported_media_type", "Upload must use multipart/form-data");
          }
          const declared = Number(request.headers.get("content-length") || 0);
          if (declared > MAX_UPLOAD_BYTES + 128 * 1024) throw new ApiError(413, "payload_too_large", "Image must be smaller than 3.5 MB");
          const form = await request.formData();
          const file = form.get("image");
          if (!file || typeof file.arrayBuffer !== "function") throw new ApiError(422, "validation_error", "Choose an image to upload");
          if (!IMAGE_EXTENSIONS[file.type] || file.size < 1 || file.size > MAX_UPLOAD_BYTES) {
            throw new ApiError(422, "validation_error", "Upload a JPG, PNG or WebP image smaller than 3.5 MB");
          }
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (!validateImageSignature(bytes, file.type)) throw new ApiError(422, "invalid_image", "The uploaded file is not a valid image");
          const key = `${randomUUID()}.${IMAGE_EXTENSIONS[file.type]}`;
          await uploads.put(key, file, { contentType: file.type, fileName: String(file.name || "image").slice(0, 200), size: file.size });
          const imageUrl = `/api/uploads/${key}`;
          await audit("image.uploaded", "upload", key, { contentType: file.type, size: file.size });
          return ok({ url: imageUrl, imageUrl }, 201);
        }
      }

      throw new ApiError(404, "not_found", "API route not found");
    } catch (rawError) {
      const error = translateDatabaseError(rawError);
      if (!(error instanceof ApiError)) console.error("Royco API error", error);
      return fail(error);
    }
  };
}

export { apiPath, salesCsv, validateCheckout, validateProduct, validatePromotion };
