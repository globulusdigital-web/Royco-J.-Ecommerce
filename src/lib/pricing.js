import { defaultThemeSettings } from "./seasonal-themes";

export const GST_RATE = 3;
export const HIGH_VALUE_THRESHOLD = 200000;

export const fallbackMaterialRates = [
  { id: "gold-24k", name: "Gold 24K", productMetal: "Gold", rate: 10450, currency: "INR", unit: "gram", makingCharge: { type: "percent", value: 12 }, visible: true, system: true },
  { id: "gold-22k", name: "Gold 22K", productMetal: "Gold", rate: 9580, currency: "INR", unit: "gram", makingCharge: { type: "percent", value: 12 }, visible: true, system: true },
  { id: "gold-18k", name: "Gold 18K", productMetal: "Gold", rate: 7838, currency: "INR", unit: "gram", makingCharge: { type: "percent", value: 12 }, visible: true, system: true },
  { id: "silver-gram", name: "Fine Silver", productMetal: "Silver", rate: 118, currency: "INR", unit: "gram", makingCharge: { type: "percent", value: 18 }, visible: true, system: true },
  { id: "silver-kg", name: "Fine Silver Bulk", productMetal: "Silver", rate: 118000, currency: "INR", unit: "kg", makingCharge: { type: "percent", value: 18 }, visible: true, system: true },
  { id: "platinum-gram", name: "Platinum Pt 950", productMetal: "Platinum", rate: 3560, currency: "INR", unit: "gram", makingCharge: { type: "percent", value: 15 }, visible: true, system: true },
  ...["IF", "VVS", "VS", "SI"].map((tier) => ({ id: `diamond-${tier.toLowerCase()}`, name: `Diamond ${tier}`, productMetal: "Diamond", rate: ({ IF: 725000, VVS: 525000, VS: 365000, SI: 245000 })[tier], currency: "INR", unit: "carat", makingCharge: { type: "flat", value: 7500 }, visible: true, system: true })),
];

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
  materials: fallbackMaterialRates,
  social: {
    x: "https://x.com/",
    facebook: "https://www.facebook.com/",
    whatsapp: "https://wa.me/913326835943",
    instagram: "https://www.instagram.com/",
  },
  theme: defaultThemeSettings,
  updatedAt: new Date().toISOString(),
  published: true,
};

function goldRate(product, rates) {
  const purity = String(product.purity || "");
  if (purity.includes("24")) return rates.gold24k;
  if (purity.includes("18")) return rates.gold18k;
  return rates.gold22k;
}

export function inferredMaterialRateId(product) {
  if (product.rateKey) return product.rateKey;
  if (product.metal === "Gold") {
    const purity = String(product.purity || "");
    if (purity.includes("24")) return "gold-24k";
    if (purity.includes("18")) return "gold-18k";
    return "gold-22k";
  }
  if (product.metal === "Silver") return "silver-gram";
  if (product.metal === "Platinum") return "platinum-gram";
  if (product.metal === "Diamond") {
    const tier = product.diamondTier || (String(product.purity).match(/\b(IF|VVS|VS|SI)\b/i)?.[1] || "VS");
    return `diamond-${tier.toLowerCase()}`;
  }
  return (product.metal || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function dynamicProductPrice(product, settings = fallbackStoreSettings) {
  if (product.pricingMode !== "dynamic") return Number(product.price) || 0;
  const material = (settings.materials || fallbackMaterialRates).find((entry) => entry.id === inferredMaterialRateId(product));
  if (material) {
    const weight = Math.max(0, Number(product.weightG) || 0);
    const carat = Math.max(0, Number(product.caratWeight) || Number(String(product.purity || "").match(/([\d.]+)\s*ct/i)?.[1]) || 0);
    const quantity = material.unit === "kg" ? weight / 1000 : material.unit === "carat" ? carat : material.unit === "piece" ? 1 : weight;
    const base = Math.max(0, Number(material.rate) || 0) * quantity;
    const configured = material.makingCharge || settings.makingCharges?.[product.metal] || { type: "percent", value: 0 };
    const type = product.makingChargeType || configured.type;
    const value = Number(product.makingChargeValue || configured.value) || 0;
    return Math.round(base + (type === "flat" ? value : base * value / 100));
  }
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
