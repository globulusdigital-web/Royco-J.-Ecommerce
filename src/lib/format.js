export const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDate = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

export function normalizeProduct(product) {
  return {
    ...product,
    id: String(product.id),
    bengaliName: product.bengaliName ?? product.bengali_name ?? "",
    imageUrl: product.imageUrl ?? product.image_url ?? "/assets/products/gold-ring.webp",
    compareAtPrice: Number(product.compareAtPrice ?? product.compare_at_price ?? product.compare_at ?? 0),
    price: Number(product.price ?? 0),
    weightG: Number(product.weightG ?? product.weight_g ?? 0),
    stock: Number(product.stock ?? 0),
    featured: Boolean(product.featured),
    active: product.active !== false,
  };
}

export const orderStatusLabel = (status) =>
  ({ pending: "Pending", confirmed: "Confirmed", processing: "Crafting", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled" })[status] || status;
