import { Clock3, Diamond, Gem, RefreshCw, ShieldCheck } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

export default function LiveRatesPage() {
  const { storeSettings } = useStore();
  const { locale, t } = useLanguage();
  const rates = storeSettings.rates;
  const updated = new Date(storeSettings.updatedAt || Date.now());
  return <div className="rates-page">
    <header className="page-hero rates-hero"><div className="container-wide"><span className="eyebrow eyebrow-light">{t("rates.eyebrow", "Published daily by Royco")}</span><h1>{t("rates.title", "Live precious metal rates.")}</h1><p>{t("rates.intro", "Transparent reference rates used by products in dynamic pricing mode.")}</p><div className="rate-timestamp"><Clock3 /> {t("rates.updated", "Last updated today at")} {updated.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</div></div><RefreshCw /></header>
    <section className="rate-card-grid container-wide">
      <article className="rate-card rate-gold"><Gem /><span>{t("rates.gold", "Gold")}</span><h2>{t("rates.gold", "Today’s gold rate")}</h2><dl><div><dt>24K · 999</dt><dd>{formatMoney(rates.gold24k)}<small>/ {t("rates.gram", "gram")}</small></dd></div><div><dt>22K · 916</dt><dd>{formatMoney(rates.gold22k)}<small>/ {t("rates.gram", "gram")}</small></dd></div><div><dt>18K · 750</dt><dd>{formatMoney(rates.gold18k)}<small>/ {t("rates.gram", "gram")}</small></dd></div></dl></article>
      <article className="rate-card rate-silver"><Gem /><span>{t("rates.silver", "Silver")}</span><h2>{t("rates.silver", "Today’s silver rate")}</h2><dl><div><dt>Fine silver</dt><dd>{formatMoney(rates.silverGram)}<small>/ {t("rates.gram", "gram")}</small></dd></div><div><dt>Fine silver bulk</dt><dd>{formatMoney(rates.silverKg)}<small>/ {t("rates.kg", "kg")}</small></dd></div></dl></article>
      <article className="rate-card rate-platinum"><Gem /><span>{t("rates.platinum", "Platinum")}</span><h2>{t("rates.platinum", "Today’s platinum rate")}</h2><dl><div><dt>Pt 950 reference</dt><dd>{formatMoney(rates.platinumGram)}<small>/ {t("rates.gram", "gram")}</small></dd></div></dl></article>
      <article className="rate-card rate-diamond"><Diamond /><span>{t("rates.diamond", "Diamond")}</span><h2>Reference tiers</h2><dl>{Object.entries(rates.diamond).map(([tier, value]) => <div key={tier}><dt>{tier} clarity</dt><dd>{formatMoney(value)}<small>/ {t("rates.carat", "carat")}</small></dd></div>)}</dl></article>
    </section>
    <section className="rate-disclaimer container"><ShieldCheck /><div><h2>{t("rates.how", "How dynamic pricing works")}</h2><p>{t("rates.explain", "Eligible product prices combine the published material rate, verified product weight and the configured making charge. The final invoice reflects verified weight, stone grading and applicable 3% GST.")}</p></div></section>
  </div>;
}
