function number(value, fallback = 0) {
  const result = Number(value);
  return Number.isFinite(result) ? result : fallback;
}

export function rupees(paise) {
  return number(paise) / 100;
}

export function serializeUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    name: row.name,
    phone: row.phone || "",
    role: row.role,
    createdAt: row.created_at || row.createdAt,
  };
}

export function serializeProduct(row) {
  if (!row) return null;
  const gallery = Array.isArray(row.gallery) ? row.gallery : [];
  const price = row.price_paise === undefined ? number(row.price) : rupees(row.price_paise);
  const compareAtPrice = row.compare_at_price_paise == null
    ? number(row.compareAtPrice ?? row.compare_at_price, 0)
    : rupees(row.compare_at_price_paise);
  return {
    id: String(row.id),
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    bengaliName: row.bengali_name || row.bengaliName || "",
    description: row.description || "",
    metal: row.material || row.metal,
    material: row.material || row.metal,
    category: row.category,
    purity: row.purity || "",
    weightG: number(row.weight_grams ?? row.weightG ?? row.weight_g),
    price,
    compareAtPrice,
    stock: number(row.stock),
    imageUrl: row.image_url || row.imageUrl || "/assets/products/gold-ring.webp",
    gallery,
    featured: Boolean(row.featured),
    active: row.active !== false,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function serializePromotion(row) {
  if (!row) return null;
  const isPercent = (row.discount_type || "percent") === "percent";
  const discountValue = number(row.discount_value ?? row.discountPercent ?? row.discount_percent);
  return {
    id: String(row.id),
    code: row.code,
    title: row.title,
    description: row.description || row.details || "",
    discountType: row.discount_type || "percent",
    discountPercent: isPercent ? discountValue : 0,
    discountAmount: isPercent ? 0 : rupees(discountValue),
    minOrder: rupees(row.min_order_paise),
    maxDiscount: row.max_discount_paise == null ? null : rupees(row.max_discount_paise),
    startsAt: row.starts_at || null,
    endsAt: row.ends_at || null,
    active: row.active !== false,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

export function serializeOrderItem(row) {
  return {
    id: row.id == null ? undefined : String(row.id),
    productId: row.product_id == null ? null : String(row.product_id),
    sku: row.sku,
    name: row.name,
    metal: row.material,
    category: row.category,
    imageUrl: row.image_url || "/assets/products/gold-ring.webp",
    unitPrice: rupees(row.unit_price_paise),
    quantity: number(row.quantity, 1),
    lineTotal: rupees(row.line_total_paise),
  };
}

export function serializeOrder(row, itemRows = row?.items || []) {
  if (!row) return null;
  const paymentMethod = row.payment_method === "store"
    ? "pay_in_store"
    : row.payment_method === "bank_transfer" ? "upi_transfer" : row.payment_method;
  return {
    id: String(row.id),
    orderNumber: row.order_number,
    status: row.status,
    subtotal: rupees(row.subtotal_paise),
    discount: rupees(row.discount_paise),
    shipping: rupees(row.shipping_paise),
    total: rupees(row.total_paise),
    promoCode: row.promo_code || null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone,
    shippingAddress: row.shipping_address || {},
    paymentMethod,
    notes: row.notes || "",
    itemCount: number(row.item_count, itemRows.reduce((sum, item) => sum + number(item.quantity, 1), 0)),
    items: itemRows.map(serializeOrderItem),
    cancelledAt: row.cancelled_at || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
  };
}

