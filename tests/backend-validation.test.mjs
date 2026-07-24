import assert from "node:assert/strict";
import test from "node:test";
import { apiPath, salesCsv, validateCheckout, validateProduct, validatePromotion } from "../backend/lib/api-handler.mjs";

test("apiPath supports both redirected and direct Netlify function URLs", () => {
  assert.equal(apiPath("https://example.test/api/products"), "/products");
  assert.equal(apiPath("https://example.test/.netlify/functions/api/admin/orders"), "/admin/orders");
});

test("product validation maps frontend rupees and metal fields to database values", () => {
  const product = validateProduct({ name: "Lotus Gold Ring", sku: "RJ-GR-9", metal: "gold", category: "rings", purity: "22K", description: "Hand-finished lotus ring", weightG: "4.25", price: 48200, compareAtPrice: 51900, stock: "8", imageUrl: "/assets/products/gold-ring.webp", featured: true });
  assert.equal(product.material, "Gold");
  assert.equal(product.category, "Rings");
  assert.equal(product.pricePaise, 4_820_000);
  assert.equal(product.compareAtPricePaise, 5_190_000);
  assert.equal(product.slug, "lotus-gold-ring");
});

test("checkout consolidates duplicate IDs and maps frontend payment methods", () => {
  const checkout = validateCheckout({
    items: [{ productId: "7", quantity: 1 }, { productId: 7, quantity: 2 }], paymentMethod: "upi_transfer",
    shippingAddress: { name: "A Customer", phone: "+91 9876543210", line1: "Bagbazar Plaza", city: "Chandannagar", state: "West Bengal", postalCode: "712136" },
  });
  assert.deepEqual(checkout.items, [{ productId: 7, quantity: 3 }]);
  assert.equal(checkout.paymentMethod, "bank_transfer");
});

test("promotion validation and CSV output are safe", () => {
  const promotion = validatePromotion({ code: "royco10", title: "Celebration", description: "Seasonal saving", discountPercent: 10, active: true });
  assert.equal(promotion.code, "ROYCO10");
  const csv = salesCsv([{ order_number: "RJ1", customer_name: "Doe, Jane", items: 'Ring "Lotus"', total_paise: 10000 }]);
  assert.match(csv, /"Doe, Jane"/);
  assert.match(csv, /"Ring ""Lotus"""/);
});

