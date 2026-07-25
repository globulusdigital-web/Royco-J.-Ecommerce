export const GST_RATE = 3;
export const HIGH_VALUE_THRESHOLD = 200000;

export const fallbackStoreSettings = {
  rates: {
    gold24k: 10450, gold22k: 9580, gold18k: 7838,
    silverGram: 118, silverKg: 118000, platinumGram: 3560,
    diamond: { IF: 725000, VVS: 525000, VS: 365000, SI: 245000 },
  },
  makingCharges: {
    Gold: { type: "percent", value: 12 },
    Silver: { type: "percent", value: 18 },
    Platinum: { type: "percent", value: 15 },
    Diamond: { type: "flat", value: 7500 },
  },
  social: {
    x: "https://x.com/",
    facebook: "https://www.facebook.com/",
    whatsapp: "https://wa.me/913326835943",
    instagram: "https://www.instagram.com/",
  },
  updatedAt: new Date().toISOString(),
  published: true,
};

function goldRate(product, rates) {
  const purity = String(product.purity || "");
  if (purity.includes("24")) return rates.gold24k;
  if (purity.includes("18")) return rates.gold18k;
  return rates.gold22k;
}

export function dynamicProductPrice(product, settings = fallbackStoreSettings) {
  if (product.pricingMode !== "dynamic") return Number(product.price) || 0;
  const rates = settings.rates || fallbackStoreSettings.rates;
  const weight = Math.max(0, Number(product.weightG) || 0);
  let base = Number(product.price) || 0;
  if (product.metal === "Gold") base = weight * goldRate(product, rates);
  if (product.metal === "Silver") base = weight * rates.silverGram;
  if (product.metal === "Platinum") base = weight * rates.platinumGram;
  if (product.metal === "Diamond") {
    const carat = Number(product.caratWeight) || Number(String(product.purity || "").match(/([\d.]+)\s*ct/i)?.[1]) || 1;
    const tier = product.diamondTier || (String(product.purity).match(/\b(IF|VVS|VS|SI)\b/i)?.[1] || "VS").toUpperCase();
    base = carat * (rates.diamond?.[tier] || rates.diamond?.VS || 0);
  }
  const configured = settings.makingCharges?.[product.metal] || { type: "percent", value: 0 };
  const type = product.makingChargeType || configured.type;
  const value = Number(product.makingChargeValue ?? configured.value) || 0;
  const making = type === "flat" ? value : base * value / 100;
  return Math.round(base + making);
}
