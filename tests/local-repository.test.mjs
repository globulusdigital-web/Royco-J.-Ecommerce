import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createLocalRepository } from "../local-server/repository.mjs";
import { createLocalFileStorage } from "../local-server/storage.mjs";

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "royco-local-repository-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const storePath = join(directory, "data", "store.json");
  return {
    directory,
    storePath,
    repository: await createLocalRepository({ storePath }),
  };
}

test("local repository creates and reloads a numeric-id catalogue", async (t) => {
  const { repository, storePath } = await fixture(t);
  const products = await repository.listProducts({ includeInactive: true });
  assert.ok(products.length >= 24);
  assert.match(products[0].id, /^\d+$/);
  assert.ok(products.every((product) => /^\d+$/.test(product.id)));

  const onDisk = JSON.parse(await readFile(storePath, "utf8"));
  assert.equal(onDisk.products.length, products.length);
  const reloaded = await createLocalRepository({ storePath });
  assert.equal((await reloaded.getProduct(products[0].slug)).sku, products[0].sku);
});

test("local users and sessions persist with the production repository contract", async (t) => {
  const { repository } = await fixture(t);
  const user = await repository.createUser({
    id: "customer-1",
    email: "customer@example.com",
    emailNormalized: "customer@example.com",
    name: "Customer",
    phone: "9876543210",
    passwordHash: "test-password-hash",
  });
  assert.equal(repository.serializeUser(user).role, "customer");
  await repository.createSession({
    id: "session-1",
    userId: user.id,
    tokenHash: "token-hash",
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    ipAddress: "127.0.0.1",
    userAgent: "test",
  });
  const session = await repository.getSession("token-hash");
  assert.equal(session.session_id, "session-1");
  assert.equal(session.role, "customer");
  await repository.revokeSession("session-1");
  assert.equal(await repository.getSession("token-hash"), null);
});

test("checkout, customer cancellation and admin cancellation preserve inventory exactly once", async (t) => {
  const { repository } = await fixture(t);
  const product = (await repository.listProducts()).find((entry) => entry.stock >= 2);
  const originalStock = product.stock;
  const input = {
    user: { id: "customer-1", email: "customer@example.com" },
    items: [{ productId: Number(product.id), quantity: 1 }],
    couponCode: null,
    paymentMethod: "store",
    shippingAddress: {
      name: "Customer", phone: "9876543210", line1: "Bagbazar Plaza",
      city: "Chandannagar", state: "West Bengal", postalCode: "712136",
    },
    now: new Date("2026-07-17T12:00:00.000Z"),
  };

  const customerOrder = await repository.checkout(input);
  assert.equal((await repository.getProduct(product.id)).stock, originalStock - 1);
  assert.equal((await repository.cancelOrder("customer-1", customerOrder.id)).status, "cancelled");
  assert.equal((await repository.getProduct(product.id)).stock, originalStock);
  assert.equal(await repository.cancelOrder("customer-1", customerOrder.id), null);
  assert.equal((await repository.getProduct(product.id)).stock, originalStock);

  const adminOrder = await repository.checkout({ ...input, now: new Date("2026-07-17T13:00:00.000Z") });
  assert.equal((await repository.updateOrderStatus(adminOrder.id, "cancelled")).status, "cancelled");
  assert.equal((await repository.updateOrderStatus(adminOrder.id, "cancelled")).status, "cancelled");
  assert.equal((await repository.getProduct(product.id)).stock, originalStock);
  await assert.rejects(
    repository.updateOrderStatus(adminOrder.id, "processing"),
    (error) => error.code === "cancelled_order_final" && error.status === 409,
  );
});

test("local upload storage round-trips bytes, metadata and etag", async (t) => {
  const { directory } = await fixture(t);
  const storage = await createLocalFileStorage({ uploadsDir: join(directory, "uploads") });
  const key = "12345678-1234-1234-1234-123456789abc.webp";
  const source = Buffer.from([0x52, 0x49, 0x46, 0x46, 0x01, 0x02, 0x03]);
  await storage.put(key, source, { contentType: "image/webp", fileName: "ring.webp" });
  const result = await storage.get(key);
  assert.deepEqual(result.data, source);
  assert.equal(result.metadata.contentType, "image/webp");
  assert.equal(result.metadata.fileName, "ring.webp");
  assert.match(result.etag, /^"[a-f0-9]{64}"$/);
  assert.equal(await storage.get("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp"), null);
});

