import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalApp } from "../local-server/app.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

async function close(server) {
  if (!server?.listening) return;
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function sessionCookie(response) {
  const setCookie = response.headers.get("set-cookie") || "";
  const cookie = setCookie.split(";", 1)[0];
  assert.match(cookie, /^royco_session=[^;]+$/);
  return cookie;
}

async function requestJson(base, route, {
  method = "GET",
  cookie,
  body,
  headers = {},
} = {}) {
  const requestHeaders = new Headers(headers);
  if (cookie) requestHeaders.set("Cookie", cookie);
  if (body !== undefined) requestHeaders.set("Content-Type", "application/json");
  if (!["GET", "HEAD"].includes(method)) requestHeaders.set("Origin", base);
  const response = await fetch(`${base}${route}`, {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return { response, payload, text };
}

function assertStatus(result, expected) {
  assert.equal(result.response.status, expected, result.text);
  assert.equal(result.payload?.error, undefined, result.text);
  return result.payload?.data;
}

test("local full stack serves the SPA and persists customer, commerce and admin workflows", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "royco-fullstack-"));
  const distDir = path.join(root, "dist");
  const uploadsDir = path.join(root, "uploads");
  const storePath = path.join(root, "data", "store.json");
  await mkdir(path.join(distDir, "assets"), { recursive: true });
  await writeFile(path.join(distDir, "index.html"), "<!doctype html><html><head><title>Royco QA</title></head><body><div id=\"root\"></div></body></html>");
  await writeFile(path.join(distDir, "assets", "app-QA1234.js"), "globalThis.roycoQa = true;");

  const env = {
    NODE_ENV: "test",
    SESSION_SECRET: "royco-fullstack-test-session-secret-2026",
    ADMIN_USER: "Admin@Royco",
    ADMIN_PASSWORD: "Admin@123",
  };
  const appOptions = { projectRoot: root, distDir, uploadsDir, storePath, env };
  let server = createLocalApp(appOptions);
  let base = await listen(server);
  t.after(async () => {
    await close(server);
    await rm(root, { recursive: true, force: true });
  });

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Royco QA/);
  const spa = await fetch(`${base}/login?mode=signup`);
  assert.equal(spa.status, 200);
  assert.match(await spa.text(), /<div id="root"><\/div>/);
  const asset = await fetch(`${base}/assets/app-QA1234.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /text\/javascript/);
  assert.match(asset.headers.get("cache-control"), /immutable/);

  const health = assertStatus(await requestJson(base, "/api/health"), 200);
  assert.equal(health.status, "ok");
  assert.equal(health.database, "connected");
  const catalogue = assertStatus(await requestJson(base, "/api/products"), 200).products;
  assert.ok(catalogue.length >= 24);
  const orderProduct = catalogue.find((product) => product.active && product.stock >= 2);
  assert.ok(orderProduct, "the seeded catalogue should contain an in-stock product");

  const signup = await requestJson(base, "/api/auth/signup", {
    method: "POST",
    body: {
      name: "End-to-end Customer",
      phone: "9876543210",
      email: "fullstack.customer@example.com",
      password: "Customer@123",
    },
  });
  const signedUp = assertStatus(signup, 201);
  assert.equal(signedUp.user.role, "customer");
  const customerCookie = sessionCookie(signup.response);
  const me = assertStatus(await requestJson(base, "/api/auth/me", { cookie: customerCookie }), 200);
  assert.equal(me.user.email, "fullstack.customer@example.com");

  const checkout = assertStatus(await requestJson(base, "/api/checkout", {
    method: "POST",
    cookie: customerCookie,
    body: {
      items: [{ productId: orderProduct.id, quantity: 1 }],
      couponCode: null,
      paymentMethod: "pay_in_store",
      shippingAddress: {
        name: "End-to-end Customer",
        phone: "9876543210",
        line1: "Bagbazar Plaza, Rash Behari Avenue",
        line2: "Sukhsanatantala",
        city: "Chandannagar",
        state: "West Bengal",
        postalCode: "712136",
        instructions: "QA order",
      },
    },
  }), 201);
  assert.match(checkout.order.orderNumber, /^RJ\d{8}-[A-F0-9]{8}$/);
  assert.equal(checkout.order.paymentMethod, "pay_in_store");
  assert.equal(checkout.order.items.length, 1);
  const customerOrders = assertStatus(await requestJson(base, "/api/orders", { cookie: customerCookie }), 200).orders;
  assert.equal(customerOrders.length, 1);
  assert.equal(customerOrders[0].id, checkout.order.id);

  const adminLogin = await requestJson(base, "/api/auth/login", {
    method: "POST",
    body: { email: "Admin@Royco", password: "Admin@123", admin: true },
  });
  const admin = assertStatus(adminLogin, 200);
  assert.equal(admin.user.role, "admin");
  const adminCookie = sessionCookie(adminLogin.response);
  const dashboard = assertStatus(await requestJson(base, "/api/admin/dashboard", { cookie: adminCookie }), 200);
  assert.ok(dashboard.metrics.orders >= 1);
  assert.ok(dashboard.metrics.customers >= 1);

  const productInput = {
    name: "QA Heritage Gold Ring",
    bengaliName: "QA Gold Ring",
    sku: "RJ-QA-999",
    slug: "qa-heritage-gold-ring",
    material: "Gold",
    category: "Rings",
    purity: "22K / 916",
    description: "A product created by the local full-stack acceptance test.",
    weightG: 4.25,
    price: 51000,
    compareAtPrice: 55000,
    stock: 9,
    imageUrl: "/assets/products/gold-ring.webp",
    gallery: [],
    featured: false,
    active: true,
  };
  const createdProduct = assertStatus(await requestJson(base, "/api/admin/products", {
    method: "POST", cookie: adminCookie, body: productInput,
  }), 201).product;
  assert.equal(createdProduct.sku, "RJ-QA-999");
  const updatedProduct = assertStatus(await requestJson(base, `/api/admin/products/${createdProduct.id}`, {
    method: "PUT",
    cookie: adminCookie,
    body: { ...productInput, name: "QA Updated Gold Ring", price: 52500, stock: 7 },
  }), 200).product;
  assert.equal(updatedProduct.name, "QA Updated Gold Ring");
  assert.equal(updatedProduct.price, 52500);
  assertStatus(await requestJson(base, `/api/admin/products/${createdProduct.id}`, {
    method: "DELETE", cookie: adminCookie,
  }), 200);

  const promotionInput = {
    code: "QA15",
    title: "QA Celebration Offer",
    description: "Fifteen percent off during the end-to-end test.",
    discountType: "percent",
    discountPercent: 15,
    minOrder: 0,
    maxDiscount: 5000,
    active: true,
  };
  const createdPromotion = assertStatus(await requestJson(base, "/api/admin/promotions", {
    method: "POST", cookie: adminCookie, body: promotionInput,
  }), 201).promotion;
  assert.equal(createdPromotion.discountPercent, 15);
  const updatedPromotion = assertStatus(await requestJson(base, `/api/admin/promotions/${createdPromotion.id}`, {
    method: "PUT",
    cookie: adminCookie,
    body: { ...promotionInput, title: "QA Updated Offer", discountPercent: 20 },
  }), 200).promotion;
  assert.equal(updatedPromotion.discountPercent, 20);
  assertStatus(await requestJson(base, `/api/admin/promotions/${createdPromotion.id}`, {
    method: "DELETE", cookie: adminCookie,
  }), 200);

  const adminOrders = assertStatus(await requestJson(base, "/api/admin/orders", { cookie: adminCookie }), 200).orders;
  assert.ok(adminOrders.some((order) => order.id === checkout.order.id));
  const confirmed = assertStatus(await requestJson(base, `/api/admin/orders/${checkout.order.id}/status`, {
    method: "PUT", cookie: adminCookie, body: { status: "confirmed" },
  }), 200).order;
  assert.equal(confirmed.status, "confirmed");

  const pngBytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ]);
  const form = new FormData();
  form.append("image", new Blob([pngBytes], { type: "image/png" }), "qa-ring.png");
  const uploadResponse = await fetch(`${base}/api/admin/uploads`, {
    method: "POST",
    headers: { Cookie: adminCookie, Origin: base },
    body: form,
  });
  const uploadText = await uploadResponse.text();
  assert.equal(uploadResponse.status, 201, uploadText);
  const upload = JSON.parse(uploadText).data;
  assert.match(upload.imageUrl, /^\/api\/uploads\/[a-f0-9-]{36}\.png$/);
  const uploadedImage = await fetch(`${base}${upload.imageUrl}`);
  assert.equal(uploadedImage.status, 200);
  assert.equal(uploadedImage.headers.get("content-type"), "image/png");
  assert.deepEqual(new Uint8Array(await uploadedImage.arrayBuffer()), pngBytes);

  await close(server);
  server = createLocalApp(appOptions);
  base = await listen(server);

  const persistedMe = assertStatus(await requestJson(base, "/api/auth/me", { cookie: customerCookie }), 200);
  assert.equal(persistedMe.user.email, "fullstack.customer@example.com");
  const persistedOrders = assertStatus(await requestJson(base, "/api/orders", { cookie: customerCookie }), 200).orders;
  assert.equal(persistedOrders[0].id, checkout.order.id);
  assert.equal(persistedOrders[0].status, "confirmed");
  const persistedAdminProducts = assertStatus(await requestJson(base, "/api/admin/products", { cookie: adminCookie }), 200).products;
  assert.equal(persistedAdminProducts.some((product) => product.id === createdProduct.id), false);
  const persistedPromotions = assertStatus(await requestJson(base, "/api/admin/promotions", { cookie: adminCookie }), 200).promotions;
  assert.equal(persistedPromotions.some((promotion) => promotion.id === createdPromotion.id), false);
  const persistedImage = await fetch(`${base}${upload.imageUrl}`);
  assert.equal(persistedImage.status, 200);
  assert.deepEqual(new Uint8Array(await persistedImage.arrayBuffer()), pngBytes);

  const logout = await requestJson(base, "/api/auth/logout", {
    method: "POST", cookie: customerCookie,
  });
  assertStatus(logout, 200);
  assert.match(logout.response.headers.get("set-cookie") || "", /Max-Age=0/);
  const signedOut = await requestJson(base, "/api/auth/me", { cookie: customerCookie });
  assert.equal(signedOut.response.status, 401);
  assert.equal(signedOut.payload.error.code, "session_expired");
});
