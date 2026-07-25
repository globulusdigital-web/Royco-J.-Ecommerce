export const GST_RATE_PERCENT = 3;
export const HIGH_VALUE_THRESHOLD_PAISE = 20_000_000;

export const SEASONAL_THEME_OFFERS = Object.freeze([
  ["durga-puja", "Durga Puja Offer", "দুর্গা পূজা অফার", "दुर्गा पूजा ऑफर"],
  ["kali-puja", "Kali Puja Offer", "কালী পূজা অফার", "काली पूजा ऑफर"],
  ["poila-baisakh", "Poila Baisakh Offer", "পয়লা বৈশাখ অফার", "पोइला बैसाख ऑफर"],
  ["dhanteras", "Dhanteras Offer", "ধনতেরাস অফার", "धनतेरस ऑफर"],
  ["lakshmi-puja", "Lakshmi Puja Offer", "লক্ষ্মী পূজা অফার", "लक्ष्मी पूजा ऑफर"],
  ["ganesh-chaturthi", "Ganesh Chaturthi Offer", "গণেশ চতুর্থী অফার", "गणेश चतुर्थी ऑफर"],
  ["shivratri", "Shivratri Offer", "শিবরাত্রি অফার", "महाशिवरात्रि ऑफर"],
  ["saraswati-puja", "Saraswati Puja Offer", "সরস্বতী পূজা অফার", "सरस्वती पूजा ऑफर"],
  ["diwali", "Diwali Offer", "দীপাবলি অফার", "दिवाली ऑफर"],
  ["christmas", "Christmas Offer", "বড়দিনের অফার", "क्रिसमस ऑफर"],
  ["new-year", "New Year Offer", "নববর্ষের অফার", "नव वर्ष ऑफर"],
  ["magh", "Magh Month Offer", "মাঘ মাসের অফার", "माघ माह ऑफर"],
  ["vaishakha", "Vaishakha Month Offer", "বৈশাখ মাসের অফার", "वैशाख माह ऑफर"],
].map(([id, en, bn, hi]) => ({
  id,
  enabled: false,
  title: { en, bn, hi },
  promotionText: {
    en: "Celebrate with a specially curated Royco jewellery edit.",
    bn: "রয়কোর বিশেষ গয়নার সংগ্রহের সঙ্গে উৎসব উদ্‌যাপন করুন।",
    hi: "रॉयको के विशेष आभूषण संग्रह के साथ उत्सव मनाएँ।",
  },
  discountCode: "",
  bannerImageUrl: "",
  startAt: "",
  endAt: "",
})));

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
  theme: {
    animationsEnabled: true,
    activeTheme: "default",
    density: 34,
    speed: 1,
    disableOnMobile: true,
    offers: SEASONAL_THEME_OFFERS,
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

export function mergeStoreSettings(current, patch, { touch = true } = {}) {
  const source = cloneStoreSettings(current || DEFAULT_STORE_SETTINGS);
  return {
    ...source,
    ...patch,
    rates: { ...source.rates, ...(patch?.rates || {}), diamond: { ...source.rates.diamond, ...(patch?.rates?.diamond || {}) } },
    makingCharges: { ...source.makingCharges, ...(patch?.makingCharges || {}) },
    social: { ...source.social, ...(patch?.social || {}) },
    theme: {
      ...source.theme,
      ...(patch?.theme || {}),
      offers: Array.isArray(patch?.theme?.offers) ? patch.theme.offers : source.theme.offers,
    },
    updatedAt: touch ? new Date().toISOString() : (patch?.updatedAt || source.updatedAt || new Date().toISOString()),
  };
}
