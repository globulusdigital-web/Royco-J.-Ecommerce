export const seasonalThemeCatalog = [
  { id: "default", label: "Default Gold Petals", native: "সোনালি পাপড়ি", motif: "✦", particle: "petal", colors: ["#D4AF37", "#f2b7c9", "#fff0c2"], background: "soft" },
  { id: "durga-puja", label: "Durga Puja", native: "দুর্গা পূজা", motif: "ত্রিশূল", particle: "flower", colors: ["#e7b640", "#e85f48", "#fff1c9"], background: "vermillion", artworkPosition: "52% center" },
  { id: "kali-puja", label: "Kali Puja", native: "কালী পূজা", motif: "জবা", particle: "hibiscus", colors: ["#d92f45", "#ef8b22", "#73243d"], background: "midnight", artworkPosition: "46% center" },
  { id: "poila-baisakh", label: "Poila Baisakh", native: "পয়লা বৈশাখ", motif: "শুভ নববর্ষ", particle: "flower", colors: ["#c73535", "#f4d8a0", "#ffffff"], background: "alpona", artworkPosition: "40% center" },
  { id: "dhanteras", label: "Dhanteras", native: "ধনতেরাস", motif: "शुभ लाभ", particle: "coin", colors: ["#ffd65a", "#D4AF37", "#fff2a8"], background: "golden", artworkPosition: "86% center" },
  { id: "lakshmi-puja", label: "Lakshmi Puja", native: "লক্ষ্মী পূজা", motif: "পদ্ম", particle: "lotus", colors: ["#e98daa", "#f6c858", "#fff2cf"], background: "lotus", artworkPosition: "65% center" },
  { id: "ganesh-chaturthi", label: "Ganesh Chaturthi", native: "গণেশ চতুর্থী", motif: "ॐ गं", particle: "marigold", colors: ["#ff9e2c", "#db3f3f", "#ffd66f"], background: "saffron", artworkPosition: "82% center" },
  { id: "shivratri", label: "Shivratri", native: "শিবরাত্রি", motif: "ॐ नमः शिवाय", particle: "spark", colors: ["#b9d8ef", "#7b83cf", "#f3f7ff"], background: "indigo", artworkPosition: "0% center" },
  { id: "saraswati-puja", label: "Saraswati Puja", native: "সরস্বতী পূজা", motif: "বীণা", particle: "flower", colors: ["#f5d85d", "#fffaf0", "#e8b63b"], background: "yellow", artworkPosition: "74% center" },
  { id: "diwali", label: "Diwali", native: "দীপাবলি", motif: "🪔", particle: "spark", colors: ["#ffd85a", "#ff8f38", "#f7ebba"], background: "diya", artworkPosition: "68% center" },
  { id: "christmas", label: "Christmas", native: "বড়দিন", motif: "✶", particle: "snow", colors: ["#ffffff", "#dceaff", "#c9d4df"], background: "winter", artworkPosition: "100% center" },
  { id: "new-year", label: "New Year", native: "নববর্ষ", motif: "✦ 2027 ✦", particle: "firework", colors: ["#ffd65a", "#ef78b8", "#8bc7ff"], background: "firework", artworkPosition: "98% center" },
  { id: "magh", label: "Magh Month", native: "মাঘ মাস", motif: "মাঘ", particle: "gold", colors: ["#d8aa45", "#e8c980", "#fff1c9"], background: "winter-gold", artworkPosition: "94% center" },
  { id: "vaishakha", label: "Vaishakha Month", native: "বৈশাখ মাস", motif: "বৈশাখ", particle: "flower", colors: ["#e95e43", "#f0bb3f", "#fff0bd"], background: "summer", artworkPosition: "38% center" },
];

const offerTitles = {
  "durga-puja": ["Durga Puja Offer", "দুর্গা পূজা অফার", "दुर्गा पूजा ऑफर"],
  "kali-puja": ["Kali Puja Offer", "কালী পূজা অফার", "काली पूजा ऑफर"],
  "poila-baisakh": ["Poila Baisakh Offer", "পয়লা বৈশাখ অফার", "पोइला बैसाख ऑफर"],
  dhanteras: ["Dhanteras Offer", "ধনতেরাস অফার", "धनतेरस ऑफर"],
  "lakshmi-puja": ["Lakshmi Puja Offer", "লক্ষ্মী পূজা অফার", "लक्ष्मी पूजा ऑफर"],
  "ganesh-chaturthi": ["Ganesh Chaturthi Offer", "গণেশ চতুর্থী অফার", "गणेश चतुर्थी ऑफर"],
  shivratri: ["Shivratri Offer", "শিবরাত্রি অফার", "महाशिवरात्रि ऑफर"],
  "saraswati-puja": ["Saraswati Puja Offer", "সরস্বতী পূজা অফার", "सरस्वती पूजा ऑफर"],
  diwali: ["Diwali Offer", "দীপাবলি অফার", "दिवाली ऑफर"],
  christmas: ["Christmas Offer", "বড়দিনের অফার", "क्रिसमस ऑफर"],
  "new-year": ["New Year Offer", "নববর্ষের অফার", "नव वर्ष ऑफर"],
  magh: ["Magh Month Offer", "মাঘ মাসের অফার", "माघ माह ऑफर"],
  vaishakha: ["Vaishakha Month Offer", "বৈশাখ মাসের অফার", "वैशाख माह ऑफर"],
};

export const defaultSeasonalOffers = Object.entries(offerTitles).map(([id, [en, bn, hi]]) => ({
  id, enabled: false, status: "stopped", title: { en, bn, hi },
  promotionText: {
    en: "Celebrate with a specially curated Royco jewellery edit.",
    bn: "রয়কোর বিশেষ গয়নার সংগ্রহের সঙ্গে উৎসব উদ্‌যাপন করুন।",
    hi: "रॉयको के विशेष आभूषण संग्रह के साथ उत्सव मनाएँ।",
  },
  discountCode: "", discountPercent: 0, bannerImageUrl: "/assets/themes/royco-festival-tapestry.png", attachmentUrl: "",
  terms: { en: "", bn: "", hi: "" }, startAt: "", endAt: "",
}));

export const defaultThemeSettings = {
  animationsEnabled: true,
  activeTheme: "default",
  density: 34,
  speed: 1,
  disableOnMobile: true,
  offers: defaultSeasonalOffers,
};

function dateValue(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value).valueOf();
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function resolveSeasonalTheme(settings = defaultThemeSettings, language = "en", now = new Date()) {
  const timestamp = now.valueOf();
  const offers = Array.isArray(settings.offers) ? settings.offers : [];
  const scheduled = offers
    .filter((offer) => offer.enabled && offer.status !== "paused")
    .filter((offer) => dateValue(offer.startAt, -Infinity) <= timestamp && dateValue(offer.endAt, Infinity) >= timestamp)
    .sort((left, right) => dateValue(right.startAt, 0) - dateValue(left.startAt, 0))[0];
  const configuredId = scheduled?.id || settings.activeTheme || "default";
  const configuredOffer = offers.find((entry) => entry.id === configuredId);
  const id = configuredOffer && (configuredOffer.status === "paused" || (configuredOffer.status === "stopped" && !configuredOffer.enabled))
    ? "default"
    : configuredId;
  const definition = seasonalThemeCatalog.find((theme) => theme.id === id) || seasonalThemeCatalog[0];
  const offer = scheduled || offers.find((entry) => entry.id === id) || null;
  return {
    ...definition,
    offer,
    title: offer?.title?.[language] || offer?.title?.en || definition.label,
    promotionText: offer?.promotionText?.[language] || offer?.promotionText?.en || "",
  };
}
