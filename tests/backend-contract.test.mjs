import assert from "node:assert/strict";
import test from "node:test";
import { createApiHandler } from "../backend/lib/api-handler.mjs";
import { serializeUser } from "../backend/lib/serializers.mjs";

const env = {
  SESSION_SECRET: "test-session-secret-that-is-at-least-32-characters-long",
  ADMIN_USER: "Admin@Royco",
  ADMIN_PASSWORD: "Admin@123",
};

function makeFakeDependencies() {
  const users = [];
  const sessions = [];
  const blobs = new Map();
  const products = [{
    id: "1", sku: "RJ-GR-001", slug: "lotus-ring", name: "Lotus Ring", bengaliName: "",
    description: "A polished gold lotus ring.", metal: "Gold", material: "Gold", category: "Rings",
    purity: "22K", weightG: 4.2, price: 48000, compareAtPrice: 51000, stock: 8,
    imageUrl: "/assets/products/gold-ring.webp", gallery: [], featured: true, active: true,
  }];
  const promotions = [{ id: "promo-1", code: "ROYCO10", title: "Royco 10", description: "Save ten percent", discountPercent: 10, active: true }];
  const orders = [];
  const audits = [];

  const repository = {
    async ping() { return true; },
    serializeUser,
    async createUser(user) { const row = { ...user, role: "customer", password_hash: user.passwordHash, created_at: new Date().toISOString() }; users.push(row); return row; },
    async getUserByEmail(email) { return users.find((user) => user.emailNormalized === email || user.email_normalized === email) || null; },
    async upsertAdmin(user) {
      let row = users.find((entry) => entry.emailNormalized === user.emailNormalized);
      if (!row) { row = { ...user, role: "admin", password_hash: user.passwordHash, created_at: new Date().toISOString() }; users.push(row); }
      return row;
    },
    async createSession(session) { sessions.push(session); },
    async getSession(tokenHash) {
      const session = sessions.find((entry) => entry.tokenHash === tokenHash);
      if (!session) return null;
      const user = users.find((entry) => entry.id === session.userId);
      return { ...user, session_id: session.id };
    },
    async revokeSession(id) { const session = sessions.find((entry) => entry.id === id); if (session) session.tokenHash = "revoked"; },
    async listProducts({ includeInactive } = {}) { return products.filter((product) => includeInactive || product.active); },
    async getProduct(identifier) { return products.find((product) => product.id === String(identifier) || product.slug === identifier) || null; },
    async createProduct(product) { const row = { ...product, id: String(products.length + 1), metal: product.material, price: product.pricePaise / 100, compareAtPrice: (product.compareAtPricePaise || 0) / 100 }; products.push(row); return row; },
    async updateProduct(id, product) { const index = products.findIndex((entry) => entry.id === String(id)); if (index < 0) return null; products[index] = { ...products[index], ...product, id: String(id), metal: product.material, price: product.pricePaise / 100, compareAtPrice: (product.compareAtPricePaise || 0) / 100 }; return products[index]; },
    async deleteProduct(id) { const index = products.findIndex((entry) => entry.id === String(id)); if (index < 0) return false; products.splice(index, 1); return true; },
    async listPromotions() { return promotions; },
    async createPromotion(promotion) { const row = { ...promotion, discountPercent: promotion.discountValue }; promotions.push(row); return row; },
    async updatePromotion(identifier, promotion) { const index = promotions.findIndex((entry) => entry.id === identifier || entry.code === identifier); if (index < 0) return null; promotions[index] = { ...promotion, id: promotions[index].id, discountPercent: promotion.discountValue }; return promotions[index]; },
    async deletePromotion(identifier) { const index = promotions.findIndex((entry) => entry.id === identifier || entry.code === identifier); if (index < 0) return false; promotions.splice(index, 1); return true; },
    async checkout({ user, items, paymentMethod, shippingAddress }) { const order = { id: "order-1", orderNumber: "RJ-TEST-1", status: "pending", total: 48000, items, paymentMethod, shippingAddress, customerEmail: user.email }; orders.push(order); return order; },
    async listOrdersForUser() { return orders; },
    async cancelOrder(_userId, id) { const order = orders.find((entry) => entry.id === id); if (!order || order.status !== "pending") return null; order.status = "cancelled"; return order; },
    async listOrdersAdmin() { return orders; },
    async updateOrderStatus(id, status) { const order = orders.find((entry) => entry.id === id); if (!order) return null; order.status = status; return order; },
    async dashboard() { return { metrics: { revenue: 48000, orders: orders.length }, recentOrders: orders, bestSellers: [], dailySales: [] }; },
    async databaseSummary() { return { connected: true, counts: { products: products.length, orders: orders.length }, tables: [] }; },
    async listAudit() { return audits; },
    async salesRows() { return [{ order_number: "RJ-TEST-1", created_at: "2026-07-17", status: "pending", customer_name: "Customer", customer_email: "customer@example.com", total_paise: 4800000, items: "Lotus Ring x1" }]; },
    async audit(event) { audits.push(event); },
  };

  const uploads = {
    async put(key, file, metadata) { blobs.set(key, { data: await file.arrayBuffer(), metadata, etag: '"test-etag"' }); },
    async get(key) { return blobs.get(key) || null; },
  };
  return { repository, uploads };
}

function request(path, { method = "GET", body, cookie, form } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  if (!["GET", "HEAD"].includes(method)) headers.set("sec-fetch-site", "same-origin");
  if (cookie) headers.set("cookie", cookie);
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers.set("content-type", "application/json"); payload = JSON.stringify(body); }
  return new Request(`http://localhost${path}`, { method, headers, body: payload });
}

async function json(response, expectedStatus = 200) {
  if (response.status !== expectedStatus) {
    assert.equal(response.status, expectedStatus, await response.clone().text());
  }
  return response.json();
}

function cookieFrom(response) {
  return response.headers.get("set-cookie").split(";")[0];
}

test("public API uses the standard data envelope", async () => {
  const dependencies = makeFakeDependencies();
  const handler = createApiHandler({ getDependencies: async () => dependencies, env });
  const health = await json(await handler(request("/api/health")));
  assert.equal(health.data.database, "connected");
  const catalogue = await json(await handler(request("/.netlify/functions/api/products")));
  assert.equal(catalogue.data.products[0].id, "1");
  const product = await json(await handler(request("/api/products/lotus-ring")));
  assert.equal(product.data.product.metal, "Gold");
  const offers = await json(await handler(request("/api/promotions")));
  assert.equal(offers.data.promotions[0].code, "ROYCO10");
});

test("customer authentication, checkout, orders and cancellation match frontend contracts", async () => {
  const dependencies = makeFakeDependencies();
  const handler = createApiHandler({ getDependencies: async () => dependencies, env });
  const signupResponse = await handler(request("/api/auth/signup", { method: "POST", body: { name: "Royco Customer", phone: "+91 98765 43210", email: "customer@example.com", password: "StrongPass1" } }));
  const signup = await json(signupResponse, 201);
  assert.equal(signup.data.user.role, "customer");
  assert.doesNotMatch(signupResponse.headers.get("set-cookie"), /; Secure;/, "localhost cookies must work over HTTP");
  const cookie = cookieFrom(signupResponse);
  const me = await json(await handler(request("/api/auth/me", { cookie })));
  assert.equal(me.data.user.email, "customer@example.com");
  const checkout = await json(await handler(request("/api/checkout", { method: "POST", cookie, body: {
    items: [{ productId: "1", quantity: 1 }], couponCode: "ROYCO10", paymentMethod: "pay_in_store",
    shippingAddress: { name: "Royco Customer", phone: "+91 98765 43210", line1: "1 Bagbazar Plaza", line2: "", city: "Chandannagar", state: "West Bengal", postalCode: "712136", instructions: "Call first" },
  } })), 201);
  assert.equal(checkout.data.order.paymentMethod, "store");
  const orderList = await json(await handler(request("/api/orders", { cookie })));
  assert.equal(orderList.data.orders.length, 1);
  const cancelled = await json(await handler(request("/api/orders/order-1/cancel", { method: "POST", cookie })));
  assert.equal(cancelled.data.order.status, "cancelled");
  const logout = await json(await handler(request("/api/auth/logout", { method: "POST", cookie })));
  assert.equal(logout.data.signedOut, true);
});

test("admin routes cover catalogue, offers, orders, reporting and uploads", async () => {
  const dependencies = makeFakeDependencies();
  const handler = createApiHandler({ getDependencies: async () => dependencies, env });
  const loginResponse = await handler(request("/api/auth/login", { method: "POST", body: { email: "Admin@Royco", password: "Admin@123", admin: true } }));
  const login = await json(loginResponse);
  assert.equal(login.data.user.role, "admin");
  const cookie = cookieFrom(loginResponse);
  for (const path of ["/api/admin/dashboard", "/api/admin/products", "/api/admin/promotions", "/api/admin/orders", "/api/admin/database-summary", "/api/admin/audit"]) {
    assert.equal((await handler(request(path, { cookie }))).status, 200, path);
  }

  const productBody = { name: "Silver Moon Ring", bengaliName: "", sku: "RJ-SR-NEW", slug: "silver-moon-ring", metal: "Silver", category: "Rings", purity: "925", weightG: 3.2, price: 5200, compareAtPrice: 5900, stock: 4, imageUrl: "/assets/products/gold-ring.webp", description: "A luminous sterling silver ring.", featured: false, active: true };
  const createdProduct = await json(await handler(request("/api/admin/products", { method: "POST", cookie, body: productBody })), 201);
  assert.equal(createdProduct.data.product.id, "2");
  assert.equal((await handler(request("/api/admin/products/2", { method: "PUT", cookie, body: { ...productBody, price: 5400 } }))).status, 200);

  const createdPromo = await json(await handler(request("/api/admin/promotions", { method: "POST", cookie, body: { code: "FESTIVE12", title: "Festive", description: "A festive saving", discountPercent: 12, active: true } })), 201);
  assert.equal(createdPromo.data.promotion.code, "FESTIVE12");
  assert.equal((await handler(request(`/api/admin/promotions/${createdPromo.data.promotion.id}`, { method: "PUT", cookie, body: { code: "FESTIVE12", title: "Festive Edit", description: "A festive saving", discountPercent: 10, active: true } }))).status, 200);

  const form = new FormData();
  form.append("image", new Blob([Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: "image/png" }), "ring.png");
  const uploaded = await json(await handler(request("/api/admin/uploads", { method: "POST", cookie, form })), 201);
  assert.match(uploaded.data.url, /^\/api\/uploads\/[a-f0-9-]{36}\.png$/);
  const imageResponse = await handler(request(uploaded.data.url));
  assert.equal(imageResponse.status, 200);
  assert.equal(imageResponse.headers.get("content-type"), "image/png");

  const csv = await handler(request("/api/admin/sales.csv", { cookie }));
  assert.equal(csv.status, 200);
  assert.match(await csv.text(), /order_number/);
  assert.equal((await handler(request("/api/admin/products/2", { method: "DELETE", cookie }))).status, 200);
  assert.equal((await handler(request(`/api/admin/promotions/${createdPromo.data.promotion.id}`, { method: "DELETE", cookie }))).status, 200);
});

test("errors use the standard error envelope and protect private routes", async () => {
  const dependencies = makeFakeDependencies();
  const handler = createApiHandler({ getDependencies: async () => dependencies, env });
  const response = await handler(request("/api/orders"));
  const payload = await json(response, 401);
  assert.equal(payload.error.code, "authentication_required");
  assert.equal(typeof payload.error.message, "string");
});
