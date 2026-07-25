import { ArrowRight, BadgeCheck, Gem, MoonStar, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { formatMoney } from "../lib/format";

const jewels = [
  { id: "ruby", name: "Manik Ruby Surya Ring", gemstone: "Ruby", sign: "Leo", planet: "Sun", metal: "Gold", carat: "5.25 ct / 5.77 ratti", origin: "Mozambique", price: 128000, untreated: true, image: "/assets/products/ring-solitaire.webp" },
  { id: "emerald", name: "Panna Emerald Budh Pendant", gemstone: "Emerald", sign: "Gemini", planet: "Mercury", metal: "Gold", carat: "4.80 ct / 5.27 ratti", origin: "Zambia", price: 96500, untreated: true, image: "/assets/products/necklace-heritage.webp" },
  { id: "sapphire", name: "Neelam Saturn Signet", gemstone: "Blue Sapphire", sign: "Capricorn", planet: "Saturn", metal: "Silver", carat: "5.10 ct / 5.60 ratti", origin: "Ceylon", price: 156000, untreated: true, image: "/assets/products/rings-vintage.webp" },
  { id: "pearl", name: "Moti Chandra Pendant", gemstone: "Pearl", sign: "Cancer", planet: "Moon", metal: "Silver", carat: "7.20 ct / 7.91 ratti", origin: "South Sea", price: 28500, untreated: true, image: "/assets/products/necklace-temple.webp" },
  { id: "coral", name: "Moonga Mangal Ring", gemstone: "Red Coral", sign: "Aries", planet: "Mars", metal: "Gold", carat: "6.00 ct / 6.59 ratti", origin: "Italy", price: 54000, untreated: true, image: "/assets/products/gold-ring.webp" },
  { id: "yellow-sapphire", name: "Pukhraj Guru Ring", gemstone: "Yellow Sapphire", sign: "Sagittarius", planet: "Jupiter", metal: "Gold", carat: "5.50 ct / 6.04 ratti", origin: "Ceylon", price: 118000, untreated: true, image: "/assets/products/rings-diamond.webp" },
];

const options = (key) => ["All", ...new Set(jewels.map((item) => item[key]))];

export default function JyotishiPage() {
  const { t } = useLanguage();
  const [filters, setFilters] = useState({ gemstone: "All", sign: "All", planet: "All", metal: "All" });
  const visible = useMemo(() => jewels.filter((item) =>
    Object.entries(filters).every(([key, value]) => value === "All" || item[key] === value)), [filters]);
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  return <div className="jyotishi-catalog">
    <header className="page-hero jyotishi-catalog-hero"><div className="container-wide"><span className="eyebrow eyebrow-light">{t("jyotishi.eyebrow", "Astrological gemstones · Vedic jewellery")}</span><h1>{t("jyotishi.title", "Jyotishi Jewels, chosen with intention.")}</h1><p>{t("jyotishi.intro", "Certified natural gemstones in considered Vedic settings, with optional Abhimantrit energization and personal guidance.")}</p><Link className="button button-gold" to="/appointments?type=astrologer">{t("jyotishi.consult", "Consult an astrologer")} <ArrowRight /></Link></div><MoonStar /></header>
    <section className="jyotishi-filter-bar container-wide" aria-label="Jyotishi jewel filters">
      {[["gemstone", "jyotishi.gemstone", "Gemstone"], ["sign", "jyotishi.sign", "Rashi / Zodiac"], ["planet", "jyotishi.planet", "Planet"], ["metal", "jyotishi.metal", "Metal setting"]].map(([key, translationKey, label]) =>
        <label key={key}><span>{t(translationKey, label)}</span><select value={filters[key]} onChange={(event) => update(key, event.target.value)}>{options(key).map((value) => <option key={value}>{value === "All" ? t("common.all", value) : value}</option>)}</select></label>)}
      <div><strong>{visible.length}</strong><span>certified jewels</span></div>
    </section>
    <section className="jyotishi-grid container-wide">
      {visible.map((jewel) => <article className="jyotishi-jewel-card" key={jewel.id}>
        <div className="jyotishi-jewel-image"><img src={jewel.image} alt="" /><span><BadgeCheck /> {t("jyotishi.certified", "Certified untreated")}</span></div>
        <div className="jyotishi-jewel-copy"><span className="eyebrow">{jewel.planet} · {jewel.sign}</span><h2>{jewel.name}</h2><dl><div><dt>{t("jyotishi.gemstone", "Gemstone")}</dt><dd>{jewel.gemstone}</dd></div><div><dt>{t("jyotishi.weight", "Weight")}</dt><dd>{jewel.carat}</dd></div><div><dt>{t("jyotishi.origin", "Origin")}</dt><dd>{jewel.origin}</dd></div><div><dt>{t("jyotishi.setting", "Setting")}</dt><dd>{jewel.metal}</dd></div></dl><div className="jyotishi-card-foot"><strong>{formatMoney(jewel.price)}</strong><span><Sparkles /> {t("jyotishi.energized", "Abhimantrit option")}</span></div></div>
      </article>)}
      {!visible.length && <div className="empty-state large-empty"><Gem /><h2>No exact match</h2><p>Try clearing one filter or ask an astrologer for a personal recommendation.</p></div>}
    </section>
    <section className="jyotishi-consult-cta container"><Sparkles /><div><span className="eyebrow">{t("jyotishi.recommendation", "Personal recommendation")}</span><h2>{t("jyotishi.unsure", "Unsure which gemstone is right?")}</h2><p>Book a private reading before purchasing. Gemstone suitability depends on the full birth chart, not a sun sign alone.</p></div><Link className="button button-dark" to="/appointments?type=astrologer">{t("jyotishi.book", "Book an appointment")} <ArrowRight /></Link></section>
  </div>;
}
