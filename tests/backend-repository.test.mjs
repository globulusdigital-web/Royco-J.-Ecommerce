import assert from "node:assert/strict";
import test from "node:test";
import { createDatabaseRepository } from "../backend/lib/repository.mjs";

function checkoutDatabase({ stock = 2 } = {}) {
  const statements = [];
  const product = {
    id: 1, sku: "RJ-GR-001", name: "Lotus Ring", material: "Gold", category: "Rings",
    image_url: "/assets/products/gold-ring.webp", price_paise: 4_800_000, stock, active: true,
  };
  const client = {
    async query(sql, values = []) {
      statements.push(String(sql).trim().split(/\s+/).slice(0, 3).join(" "));
      if (String(sql).startsWith("SELECT * FROM products")) return { rows: [product] };
      if (String(sql).includes("INSERT INTO orders")) return { rows: [{
        id: values[0], order_number: values[1], status: "pending", subtotal_paise: values[3],
        discount_paise: values[4], shipping_paise: values[5], total_paise: values[6],
        promo_code: values[7], customer_name: values[8], customer_email: values[9],
        customer_phone: values[10], shipping_address: JSON.parse(values[11]), payment_method: values[12],
        created_at: "2026-07-17T00:00:00.000Z",
      }] };
      if (String(sql).includes("INSERT INTO order_items")) return { rows: [{
        id: 1, order_id: values[0], product_id: values[1], sku: values[2], name: values[3],
        material: values[4], category: values[5], image_url: values[6], unit_price_paise: values[7],
        quantity: values[8], line_total_paise: values[9],
      }] };
      return { rows: [], rowCount: 1 };
    },
    release() { statements.push("RELEASE"); },
  };
  return {
    statements,
    db: { pool: { connect: async () => client, query: async () => ({ rows: [] }) } },
  };
}

const checkoutInput = {
  user: { id: "user-1", email: "customer@example.com" },
  items: [{ productId: 1, quantity: 1 }],
  couponCode: null,
  paymentMethod: "store",
  shippingAddress: { name: "Customer", phone: "+91 9876543210", line1: "Bagbazar Plaza", city: "Chandannagar", state: "West Bengal", postalCode: "712136" },
  now: new Date("2026-07-17T12:00:00.000Z"),
};

test("database checkout commits order, items, inventory and audit atomically", async () => {
  const fake = checkoutDatabase();
  const repository = createDatabaseRepository(fake.db);
  const order = await repository.checkout(checkoutInput);
  assert.equal(fake.statements[0], "BEGIN");
  assert.ok(fake.statements.includes("UPDATE products SET"));
  assert.ok(fake.statements.includes("INSERT INTO audit_logs"));
  assert.ok(fake.statements.includes("COMMIT"));
  assert.equal(fake.statements.at(-1), "RELEASE");
  assert.equal(order.paymentMethod, "pay_in_store");
  assert.equal(order.subtotal, 48000);
  assert.equal(order.shipping, 499);
  assert.equal(order.total, 48499);
});

test("database checkout rolls back when stock validation fails", async () => {
  const fake = checkoutDatabase({ stock: 0 });
  const repository = createDatabaseRepository(fake.db);
  await assert.rejects(repository.checkout(checkoutInput), /does not have enough stock/);
  assert.ok(fake.statements.includes("ROLLBACK"));
  assert.ok(!fake.statements.includes("COMMIT"));
  assert.equal(fake.statements.at(-1), "RELEASE");
});

function orderStatusDatabase(initialStatus = "processing") {
  const statements = [];
  const state = {
    order: {
      id: "order-1", order_number: "RJ-TEST-1", status: initialStatus,
      subtotal_paise: 4_800_000, discount_paise: 0, shipping_paise: 0, total_paise: 4_800_000,
      customer_name: "Customer", customer_email: "customer@example.com", customer_phone: "9876543210",
      shipping_address: {}, payment_method: "store", created_at: "2026-07-17T00:00:00.000Z",
    },
    restocks: 0,
  };
  const client = {
    async query(sql, values = []) {
      const source = String(sql);
      statements.push(source.trim().split(/\s+/).slice(0, 4).join(" "));
      if (source.startsWith("SELECT * FROM orders")) return { rows: [{ ...state.order }] };
      if (source.includes("UPDATE orders SET status")) {
        state.order.status = values[1];
        if (values[1] === "cancelled") state.order.cancelled_at = "2026-07-17T12:00:00.000Z";
        return { rows: [{ ...state.order }], rowCount: 1 };
      }
      if (source.includes("UPDATE products p SET stock")) state.restocks += 1;
      return { rows: [], rowCount: 1 };
    },
    release() { statements.push("RELEASE"); },
  };
  return {
    state,
    statements,
    db: { pool: { connect: async () => client, query: async () => ({ rows: [] }) } },
  };
}

test("admin cancellation restores inventory once inside the locked transaction", async () => {
  const fake = orderStatusDatabase();
  const repository = createDatabaseRepository(fake.db);
  const cancelled = await repository.updateOrderStatus("order-1", "cancelled");
  assert.equal(cancelled.status, "cancelled");
  assert.equal(fake.state.restocks, 1);
  assert.equal(fake.statements[0], "BEGIN");
  assert.ok(fake.statements.includes("SELECT * FROM orders"));
  assert.ok(fake.statements.includes("UPDATE products p SET"));
  assert.ok(fake.statements.includes("COMMIT"));

  const repeated = await repository.updateOrderStatus("order-1", "cancelled");
  assert.equal(repeated.status, "cancelled");
  assert.equal(fake.state.restocks, 1, "a repeated cancellation must not add inventory again");
});

test("admin cannot transition an order away from cancelled", async () => {
  const fake = orderStatusDatabase("cancelled");
  const repository = createDatabaseRepository(fake.db);
  await assert.rejects(
    repository.updateOrderStatus("order-1", "processing"),
    (error) => error.code === "cancelled_order_final" && error.status === 409,
  );
  assert.equal(fake.state.restocks, 0);
  assert.ok(fake.statements.includes("ROLLBACK"));
  assert.ok(!fake.statements.includes("UPDATE orders SET status"));
});
