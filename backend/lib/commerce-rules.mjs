export const GST_RATE_PERCENT = 3;
export const HIGH_VALUE_THRESHOLD_PAISE = 20_000_000;

export const DEFAULT_STORE_SETTINGS = Object.freeze({
  rates: {
    gold24k: 10450,
    gold22k: 9580,
    gold18k: 7838,
    silverGram: 118,
    silverKg: 118000,
    platinumGram: 3560,
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
});

export function cloneStoreSettings(value = DEFAULT_STORE_SETTINGS) {
  return JSON.parse(JSON.stringify(value));
}

export function gstPaise(amountPaise, rate = GST_RATE_PERCENT) {
  return Math.round(Math.max(0, Number(amountPaise) || 0) * (Number(rate) || 0) / 100);
}

export function isHighValue(amountPaise) {
  return Number(amountPaise) >= HIGH_VALUE_THRESHOLD_PAISE;
}

export function validPan(value) {
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(String(value || "").trim().toUpperCase());
}

export function mergeStoreSettings(current, patch) {
  const source = cloneStoreSettings(current || DEFAULT_STORE_SETTINGS);
  return {
    ...source,
    ...patch,
    rates: { ...source.rates, ...(patch?.rates || {}), diamond: { ...source.rates.diamond, ...(patch?.rates?.diamond || {}) } },
    makingCharges: { ...source.makingCharges, ...(patch?.makingCharges || {}) },
    social: { ...source.social, ...(patch?.social || {}) },
    updatedAt: new Date().toISOString(),
  };
}
