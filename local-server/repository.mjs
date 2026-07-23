import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fallbackProducts, fallbackPromotions } from "../src/data/fallbackProducts.js";
import { ApiError } from "../netlify/lib/http.mjs";
import {
  rupees,
  serializeOrder,
  serializeProduct,
  serializePromotion,
  serializeUser,
} from "../netlify/lib/serializers.mjs";

const LOCAL_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_STORE_PATH = resolve(LOCAL_DIRECTORY, "data", "store.json");

function nowIso(now = new Date()) {
  return now instanceof Date ? now.toISOString() : new Date(now).toISOString();
}

function clone(value) {
  return structuredClone(value);
}

function uniqueViolation(message) {
  const error = new Error(message);
  error.code = "23505";
  return error;
}

function makeOrderNumber(now = new Date()) {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `RJ${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function seedProduct(product, index, createdAt) {
  return {
    id: index + 1,
    sku: product.sku,
    slug: product.slug,
    name: product.name,
    bengali_name: product.bengaliName || "",
    description: product.description || "",
    material: product.material || product.metal,
    category: product.category,
    purity: product.purity || "",
    weight_grams: Number(product.weightG || 0),
    price_paise: Math.round(Number(product.price || 0) * 100),
    compare_at_price_paise: product.compareAtPrice
      ? Math.round(Number(product.compareAtPrice) * 100)
      : null,
    stock: Number(product.stock || 0),
    image_url: product.imageUrl || "/assets/products/gold-ring.webp",
    gallery: Array.isArray(product.gallery) ? product.gallery : [],
    featured: Boolean(product.featured),
    active: product.active !== false,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function seedPromotion(promotion, index, createdAt) {
  const defaults = promotion.code === "ROYCO10"
    ? { minOrderPaise: 2_500_000, maxDiscountPaise: 750_000 }
    : { minOrderPaise: 0, maxDiscountPaise: 750_000 };
  return {
    id: promotion.id || `promo-${index + 1}`,
    code: String(promotion.code).toUpperCase(),
    title: promotion.title,
    description: promotion.description || "",
    discount_type: promotion.discountType || "percent",
    discount_value: promotion.discountType === "fixed"
      ? Math.round(Number(promotion.discountAmount || 0) * 100)
      : Number(promotion.discountPercent || 0),
    min_order_paise: promotion.minOrderPaise ?? defaults.minOrderPaise,
    max_discount_paise: promotion.maxDiscountPaise ?? defaults.maxDiscountPaise,
    starts_at: promotion.startsAt || null,
    ends_at: promotion.endsAt || null,
    active: promotion.active !== false,
    created_at: createdAt,
    updated_at: createdAt,
  };
}

export function createSeedStore(now = new Date()) {
  const createdAt = nowIso(now);
  return {
    schema_version: 1,
    next_product_id: fallbackProducts.length + 1,
    next_order_item_id: 1,
    next_audit_id: 1,
    users: [],
    sessions: [],
    products: fallbackProducts.map((product, index) => seedProduct(product, index, createdAt)),
    promotions: fallbackPromotions.map((promotion, index) => seedPromotion(promotion, index, createdAt)),
    orders: [],
    order_items: [],
    audit_logs: [],
    created_at: createdAt,
    updated_at: createdAt,
  };
}

function normalizeLoadedStore(value) {
  if (!value || typeof value !== "object") throw new Error("Local store is not a JSON object");
  const lists = ["users", "sessions", "products", "promotions", "orders", "order_items", "audit_logs"];
  for (const key of lists) {
    if (!Array.isArray(value[key])) value[key] = [];
  }
  value.schema_version ||= 1;
  value.next_product_id ||= Math.max(0, ...value.products.map((row) => Number(row.id) || 0)) + 1;
  value.next_order_item_id ||= Math.max(0, ...value.order_items.map((row) => Number(row.id) || 0)) + 1;
  value.next_audit_id ||= Math.max(0, ...value.audit_logs.map((row) => Number(row.id) || 0)) + 1;
  return value;
}

async function atomicWriteJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

async function loadOrCreateStore(path) {
  try {
    return normalizeLoadedStore(JSON.parse(await readFile(path, "utf8")));
  } catch (error) {
    if (error?.code !== "ENOENT") {
      if (error instanceof SyntaxError) {
        throw new Error(`Local store at ${path} contains invalid JSON`, { cause: error });
      }
      throw error;
    }
  }
  const store = createSeedStore();
  await atomicWriteJson(path, store);
  return store;
}

function orderItems(store, orderId) {
  return store.order_items.filter((item) => String(item.order_id) === String(orderId));
}

function serializeOrderFromStore(store, order) {
  const items = orderItems(store, order.id);
  return serializeOrder({
    ...order,
    item_count: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
  }, items);
}

function promotionIsActive(promotion, now = new Date()) {
  if (!promotion.active) return false;
  const timestamp = now.valueOf();
  return (!promotion.starts_at || new Date(promotion.starts_at).valueOf() <= timestamp)
    && (!promotion.ends_at || new Date(promotion.ends_at).valueOf() > timestamp);
}

function descendingCreated(left, right) {
  return String(right.created_at || "").localeCompare(String(left.created_at || ""));
}

/**
 * A persistent development repository with the same public contract as the
 * production Postgres repository. Mutations use a cloned draft and a single
 * write queue, so validation failures never leave inventory or orders half saved.
 */
export async function createLocalRepository({ storePath = DEFAULT_STORE_PATH } = {}) {
  const absolutePath = resolve(storePath);
  let state = await loadOrCreateStore(absolutePath);
  let writes = Promise.resolve();

  async function readState() {
    await writes;
    return state;
  }

  function mutate(operation) {
    const result = writes.then(async () => {
      const draft = clone(state);
      const returned = await operation(draft);
      draft.updated_at = nowIso();
      await atomicWriteJson(absolutePath, draft);
      state = draft;
      return returned;
    });
    writes = result.then(() => undefined, () => undefined);
    return result;
  }

  function assertProductUnique(store, product, excludedId = null) {
    const duplicate = store.products.find((row) => Number(row.id) !== Number(excludedId)
      && (String(row.sku).toUpperCase() === String(product.sku).toUpperCase()
        || String(row.slug).toLowerCase() === String(product.slug).toLowerCase()));
    if (duplicate) throw uniqueViolation("A product with that SKU or slug already exists");
  }

  function assertPromotionUnique(store, promotion, excludedIdentifier = null) {
    const duplicate = store.promotions.find((row) => String(row.id) !== String(excludedIdentifier)
      && String(row.code).toUpperCase() === String(promotion.code).toUpperCase());
    if (duplicate) throw uniqueViolation("A promotion with that code already exists");
  }

  const repository = {
    storePath: absolutePath,

    async ping() {
      await readState();
      return true;
    },

    async getUserByEmail(emailNormalized) {
      const store = await readState();
      const user = store.users.find((row) => row.active !== false
        && row.email_normalized === String(emailNormalized).toLowerCase());
      return user ? clone(user) : null;
    },

    async getUserById(id) {
      const store = await readState();
      const user = store.users.find((row) => row.active !== false && String(row.id) === String(id));
      return user ? clone(user) : null;
    },

    async createUser({ id, email, emailNormalized, name, phone, passwordHash }) {
      return mutate((store) => {
        if (store.users.some((row) => row.email_normalized === emailNormalized)) {
          throw uniqueViolation("A user with that email already exists");
        }
        const createdAt = nowIso();
        const user = {
          id, email, email_normalized: String(emailNormalized).toLowerCase(), name, phone,
          password_hash: passwordHash, role: "customer", active: true,
          created_at: createdAt, updated_at: createdAt,
        };
        store.users.push(user);
        return clone(user);
      });
    },

    async upsertAdmin({ id, email, emailNormalized, name, passwordHash }) {
      return mutate((store) => {
        const normalized = String(emailNormalized).toLowerCase();
        let user = store.users.find((row) => row.email_normalized === normalized);
        const changedAt = nowIso();
        if (!user) {
          user = {
            id, email, email_normalized: normalized, name, phone: "",
            password_hash: passwordHash, role: "admin", active: true,
            created_at: changedAt, updated_at: changedAt,
          };
          store.users.push(user);
        } else {
          Object.assign(user, {
            email, name, password_hash: passwordHash, role: "admin", active: true,
            updated_at: changedAt,
          });
        }
        return clone(user);
      });
    },

    async createSession({ id, userId, tokenHash, expiresAt, ipAddress, userAgent }) {
      return mutate((store) => {
        const createdAt = nowIso();
        store.sessions.push({
          id, user_id: userId, token_hash: tokenHash, expires_at: expiresAt,
          ip_address: ipAddress || null, user_agent: userAgent || "",
          revoked_at: null, last_seen_at: createdAt, created_at: createdAt,
        });
      });
    },

    async getSession(tokenHash) {
      return mutate((store) => {
        const session = store.sessions.find((row) => row.token_hash === tokenHash
          && !row.revoked_at && new Date(row.expires_at).valueOf() > Date.now());
        if (!session) return null;
        const user = store.users.find((row) => String(row.id) === String(session.user_id) && row.active !== false);
        if (!user) return null;
        session.last_seen_at = nowIso();
        return clone({ ...user, session_id: session.id, expires_at: session.expires_at });
      });
    },

    async revokeSession(sessionId) {
      return mutate((store) => {
        const session = store.sessions.find((row) => String(row.id) === String(sessionId));
        if (session && !session.revoked_at) session.revoked_at = nowIso();
      });
    },

    async listProducts(filters = {}) {
      const store = await readState();
      const search = String(filters.search || "").toLowerCase();
      return store.products
        .filter((row) => filters.includeInactive || row.active !== false)
        .filter((row) => !filters.material || row.material === filters.material)
        .filter((row) => !filters.category || row.category === filters.category)
        .filter((row) => filters.featured !== true || row.featured === true)
        .filter((row) => !search || [row.name, row.sku, row.description]
          .some((value) => String(value || "").toLowerCase().includes(search)))
        .sort((left, right) => Number(right.featured) - Number(left.featured)
          || descendingCreated(left, right) || Number(right.id) - Number(left.id))
        .slice(0, 500)
        .map(serializeProduct);
    },

    async getProduct(identifier, includeInactive = false) {
      const store = await readState();
      const numeric = /^\d+$/.test(String(identifier));
      const product = store.products.find((row) => (includeInactive || row.active !== false)
        && (numeric ? Number(row.id) === Number(identifier) : row.slug === identifier));
      return serializeProduct(product);
    },

    async createProduct(product) {
      return mutate((store) => {
        assertProductUnique(store, product);
        const createdAt = nowIso();
        const row = {
          id: store.next_product_id++, sku: product.sku, slug: product.slug,
          name: product.name, bengali_name: product.bengaliName || "",
          description: product.description, material: product.material, category: product.category,
          purity: product.purity, weight_grams: product.weightG, price_paise: product.pricePaise,
          compare_at_price_paise: product.compareAtPricePaise, stock: product.stock,
          image_url: product.imageUrl, gallery: product.gallery || [], featured: product.featured,
          active: product.active, created_at: createdAt, updated_at: createdAt,
        };
        store.products.push(row);
        return serializeProduct(row);
      });
    },

    async updateProduct(id, product) {
      return mutate((store) => {
        const row = store.products.find((entry) => Number(entry.id) === Number(id));
        if (!row) return null;
        assertProductUnique(store, product, id);
        Object.assign(row, {
          sku: product.sku, slug: product.slug, name: product.name,
          bengali_name: product.bengaliName || "", description: product.description,
          material: product.material, category: product.category, purity: product.purity,
          weight_grams: product.weightG, price_paise: product.pricePaise,
          compare_at_price_paise: product.compareAtPricePaise, stock: product.stock,
          image_url: product.imageUrl, gallery: product.gallery || [], featured: product.featured,
          active: product.active, updated_at: nowIso(),
        });
        return serializeProduct(row);
      });
    },

    async deleteProduct(id) {
      return mutate((store) => {
        const index = store.products.findIndex((row) => Number(row.id) === Number(id));
        if (index < 0) return false;
        store.products.splice(index, 1);
        return true;
      });
    },

    async listPromotions(includeInactive = false) {
      const store = await readState();
      return store.promotions
        .filter((row) => includeInactive || promotionIsActive(row))
        .sort(descendingCreated)
        .map(serializePromotion);
    },

    async createPromotion(promotion) {
      return mutate((store) => {
        assertPromotionUnique(store, promotion);
        const createdAt = nowIso();
        const row = {
          id: promotion.id, code: promotion.code, title: promotion.title,
          description: promotion.description, discount_type: promotion.discountType,
          discount_value: promotion.discountValue, min_order_paise: promotion.minOrderPaise,
          max_discount_paise: promotion.maxDiscountPaise, starts_at: promotion.startsAt,
          ends_at: promotion.endsAt, active: promotion.active,
          created_at: createdAt, updated_at: createdAt,
        };
        store.promotions.push(row);
        return serializePromotion(row);
      });
    },

    async updatePromotion(identifier, promotion) {
      return mutate((store) => {
        const row = store.promotions.find((entry) => String(entry.id) === String(identifier)
          || entry.code === String(identifier).toUpperCase());
        if (!row) return null;
        assertPromotionUnique(store, promotion, row.id);
        Object.assign(row, {
          code: promotion.code, title: promotion.title, description: promotion.description,
          discount_type: promotion.discountType, discount_value: promotion.discountValue,
          min_order_paise: promotion.minOrderPaise, max_discount_paise: promotion.maxDiscountPaise,
          starts_at: promotion.startsAt, ends_at: promotion.endsAt, active: promotion.active,
          updated_at: nowIso(),
        });
        return serializePromotion(row);
      });
    },

    async deletePromotion(identifier) {
      return mutate((store) => {
        const index = store.promotions.findIndex((row) => String(row.id) === String(identifier)
          || row.code === String(identifier).toUpperCase());
        if (index < 0) return false;
        store.promotions.splice(index, 1);
        return true;
      });
    },

    async checkout({ user, items, couponCode, paymentMethod, shippingAddress, now = new Date() }) {
      return mutate((store) => {
        const products = new Map(store.products.map((product) => [Number(product.id), product]));
        if (new Set(items.map((item) => item.productId)).size !== items.length
          || items.some((item) => !products.has(item.productId))) {
          throw new ApiError(409, "product_unavailable", "One or more products are no longer available");
        }

        let subtotalPaise = 0;
        for (const item of items) {
          const product = products.get(item.productId);
          if (!product.active || Number(product.stock) < item.quantity) {
            throw new ApiError(409, "insufficient_stock", `${product?.name || "A product"} does not have enough stock`);
          }
          subtotalPaise += Number(product.price_paise) * item.quantity;
        }

        let promotion = null;
        let discountPaise = 0;
        if (couponCode) {
          promotion = store.promotions.find((row) => row.code === couponCode && promotionIsActive(row, now));
          if (!promotion || subtotalPaise < Number(promotion.min_order_paise || 0)) {
            throw new ApiError(422, "promotion_invalid", "That offer is not active for this order");
          }
          discountPaise = promotion.discount_type === "percent"
            ? Math.round(subtotalPaise * Number(promotion.discount_value) / 100)
            : Number(promotion.discount_value);
          if (promotion.max_discount_paise != null) {
            discountPaise = Math.min(discountPaise, Number(promotion.max_discount_paise));
          }
          discountPaise = Math.min(discountPaise, subtotalPaise);
        }

        const shippingPaise = subtotalPaise - discountPaise >= 5_000_000 ? 0 : 49_900;
        const totalPaise = subtotalPaise - discountPaise + shippingPaise;
        const timestamp = nowIso(now);
        const order = {
          id: randomUUID(), order_number: makeOrderNumber(now), user_id: user.id, status: "pending",
          subtotal_paise: subtotalPaise, discount_paise: discountPaise,
          shipping_paise: shippingPaise, total_paise: totalPaise,
          promo_code: promotion?.code || null, customer_name: shippingAddress.name,
          customer_email: user.email, customer_phone: shippingAddress.phone,
          shipping_address: clone(shippingAddress), payment_method: paymentMethod,
          notes: shippingAddress.instructions || "", cancelled_at: null,
          created_at: timestamp, updated_at: timestamp,
        };

        const addedItems = [];
        for (const item of items) {
          const product = products.get(item.productId);
          const row = {
            id: store.next_order_item_id++, order_id: order.id, product_id: product.id,
            sku: product.sku, name: product.name, material: product.material,
            category: product.category, image_url: product.image_url,
            unit_price_paise: product.price_paise, quantity: item.quantity,
            line_total_paise: Number(product.price_paise) * item.quantity,
          };
          addedItems.push(row);
          store.order_items.push(row);
          product.stock -= item.quantity;
          product.updated_at = timestamp;
        }
        store.orders.push(order);
        store.audit_logs.push({
          id: store.next_audit_id++, actor_user_id: user.id, actor_role: "customer",
          action: "order.created", entity_type: "order", entity_id: order.id,
          metadata: { orderNumber: order.order_number, totalPaise }, ip_address: null,
          created_at: timestamp,
        });
        return serializeOrder(order, addedItems);
      });
    },

    async listOrdersForUser(userId) {
      const store = await readState();
      return store.orders.filter((order) => String(order.user_id) === String(userId))
        .sort(descendingCreated).map((order) => serializeOrderFromStore(store, order));
    },

    async cancelOrder(userId, orderId) {
      return mutate((store) => {
        const order = store.orders.find((entry) => String(entry.id) === String(orderId)
          && String(entry.user_id) === String(userId) && entry.status === "pending");
        if (!order) return null;
        const changedAt = nowIso();
        order.status = "cancelled";
        order.cancelled_at = changedAt;
        order.updated_at = changedAt;
        for (const item of orderItems(store, order.id)) {
          const product = store.products.find((row) => Number(row.id) === Number(item.product_id));
          if (product) {
            product.stock += Number(item.quantity);
            product.updated_at = changedAt;
          }
        }
        store.audit_logs.push({
          id: store.next_audit_id++, actor_user_id: userId, actor_role: "customer",
          action: "order.cancelled", entity_type: "order", entity_id: order.id,
          metadata: {}, ip_address: null, created_at: changedAt,
        });
        return serializeOrderFromStore(store, order);
      });
    },

    async listOrdersAdmin() {
      const store = await readState();
      return store.orders.slice().sort(descendingCreated).slice(0, 1000)
        .map((order) => serializeOrderFromStore(store, order));
    },

    async updateOrderStatus(orderId, status) {
      return mutate((store) => {
        const order = store.orders.find((entry) => String(entry.id) === String(orderId));
        if (!order) return null;
        if (order.status === status) return serializeOrderFromStore(store, order);
        if (order.status === "cancelled") {
          throw new ApiError(409, "cancelled_order_final", "A cancelled order cannot be reopened");
        }
        const changedAt = nowIso();
        order.status = status;
        order.updated_at = changedAt;
        if (status === "cancelled") {
          order.cancelled_at = changedAt;
          for (const item of orderItems(store, order.id)) {
            const product = store.products.find((row) => Number(row.id) === Number(item.product_id));
            if (product) {
              product.stock += Number(item.quantity);
              product.updated_at = changedAt;
            }
          }
        }
        return serializeOrderFromStore(store, order);
      });
    },

    async dashboard() {
      const store = await readState();
      const validOrders = store.orders.filter((order) => order.status !== "cancelled");
      const unitsByProduct = new Map();
      const validOrderIds = new Set(validOrders.map((order) => String(order.id)));
      for (const item of store.order_items) {
        if (!validOrderIds.has(String(item.order_id))) continue;
        const current = unitsByProduct.get(String(item.product_id)) || { units: 0, revenuePaise: 0 };
        current.units += Number(item.quantity || 0);
        current.revenuePaise += Number(item.line_total_paise || 0);
        unitsByProduct.set(String(item.product_id), current);
      }
      const bestSellers = [...unitsByProduct.entries()].map(([id, values]) => {
        const product = store.products.find((row) => String(row.id) === id);
        const historical = store.order_items.find((row) => String(row.product_id) === id);
        return {
          id, name: product?.name || historical?.name || "Deleted product",
          imageUrl: product?.image_url || historical?.image_url || "/assets/products/gold-ring.webp",
          units: values.units, revenue: rupees(values.revenuePaise),
        };
      }).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 4);

      const dailySales = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(today);
        day.setDate(day.getDate() - offset);
        const date = day.toISOString().slice(0, 10);
        const totalPaise = validOrders
          .filter((order) => String(order.created_at).slice(0, 10) === date)
          .reduce((sum, order) => sum + Number(order.total_paise || 0), 0);
        dailySales.push({
          date, label: day.toLocaleDateString("en-US", { weekday: "short" }), total: rupees(totalPaise),
        });
      }

      return {
        metrics: {
          revenue: rupees(validOrders.reduce((sum, order) => sum + Number(order.total_paise || 0), 0)),
          orders: store.orders.length,
          pending_orders: store.orders.filter((order) => order.status === "pending").length,
          active_products: store.products.filter((product) => product.active !== false).length,
          low_stock: store.products.filter((product) => product.active !== false && Number(product.stock) < 5).length,
          customers: store.users.filter((user) => user.role === "customer" && user.active !== false).length,
        },
        recentOrders: store.orders.slice().sort(descendingCreated).slice(0, 5)
          .map((order) => serializeOrderFromStore(store, order)),
        bestSellers,
        dailySales,
      };
    },

    async databaseSummary() {
      const store = await readState();
      const counts = {
        users: store.users.length,
        sessions: store.sessions.length,
        products: store.products.length,
        promotions: store.promotions.length,
        orders: store.orders.length,
        order_items: store.order_items.length,
        audit_logs: store.audit_logs.length,
      };
      return {
        connected: true,
        counts,
        tables: Object.entries(counts).map(([name, count]) => ({ name, count })),
      };
    },

    async listAudit() {
      const store = await readState();
      return store.audit_logs.slice().sort(descendingCreated).slice(0, 100).map(clone);
    },

    async salesRows() {
      const store = await readState();
      return store.orders.slice().sort(descendingCreated).map((order) => ({
        order_number: order.order_number, created_at: order.created_at, status: order.status,
        customer_name: order.customer_name, customer_email: order.customer_email,
        customer_phone: order.customer_phone, payment_method: order.payment_method,
        promo_code: order.promo_code, subtotal_paise: order.subtotal_paise,
        discount_paise: order.discount_paise, shipping_paise: order.shipping_paise,
        total_paise: order.total_paise,
        items: orderItems(store, order.id).map((item) => `${item.name} x${item.quantity}`).join("; "),
      }));
    },

    async audit({ actorUserId, actorRole, action, entityType, entityId = null, metadata = {}, ipAddress = null }) {
      return mutate((store) => {
        store.audit_logs.push({
          id: store.next_audit_id++, actor_user_id: actorUserId, actor_role: actorRole,
          action, entity_type: entityType, entity_id: entityId, metadata: clone(metadata),
          ip_address: ipAddress, created_at: nowIso(),
        });
      });
    },

    serializeUser,
  };

  return repository;
}

let defaultRepositoryPromise;

export function getLocalRepository(options = {}) {
  if (options.storePath) return createLocalRepository(options);
  defaultRepositoryPromise ||= createLocalRepository(options);
  return defaultRepositoryPromise;
}

export default getLocalRepository;

