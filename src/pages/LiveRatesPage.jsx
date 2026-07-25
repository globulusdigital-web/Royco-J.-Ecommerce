import { Clock3, Diamond, Gem, RefreshCw, ShieldCheck } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

export default function LiveRatesPage() {
  const { storeSettings } = useStore();
  const rates = storeSettings.rates;
  const updated = new Date(storeSettings.updatedAt || Date.now());
  return <div className="rates-page">
    <header className="page-hero rates-hero"><div className="container-wide"><span className="eyebrow eyebrow-light">Published daily by Royco</span><h1>Live precious<br /><em>metal rates.</em></h1><p>Transparent reference rates used by products in dynamic pricing mode.</p><div className="rate-timestamp"><Clock3 /> Last updated today at {updated.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</div></div><RefreshCw /></header>
    <section className="rate-card-grid container-wide">
      <article className="rate-card rate-gold"><Gem /><span>Gold</span><h2>Today’s gold rate</h2><dl><div><dt>24K · 999</dt><dd>{formatMoney(rates.gold24k)}<small>/ gram</small></dd></div><div><dt>22K · 916</dt><dd>{formatMoney(rates.gold22k)}<small>/ gram</small></dd></div><div><dt>18K · 750</dt><dd>{formatMoney(rates.gold18k)}<small>/ gram</small></dd></div></dl></article>
      <article className="rate-card rate-silver"><Gem /><span>Silver</span><h2>Today’s silver rate</h2><dl><div><dt>Fine silver</dt><dd>{formatMoney(rates.silverGram)}<small>/ gram</small></dd></div><div><dt>Fine silver bulk</dt><dd>{formatMoney(rates.silverKg)}<small>/ kg</small></dd></div></dl></article>
      <article className="rate-card rate-platinum"><Gem /><span>Platinum</span><h2>Today’s platinum rate</h2><dl><div><dt>Pt 950 reference</dt><dd>{formatMoney(rates.platinumGram)}<small>/ gram</small></dd></div></dl></article>
      <article className="rate-card rate-diamond"><Diamond /><span>Diamond</span><h2>Reference tiers</h2><dl>{Object.entries(rates.diamond).map(([tier, value]) => <div key={tier}><dt>{tier} clarity</dt><dd>{formatMoney(value)}<small>/ carat</small></dd></div>)}</dl></article>
    </section>
    <section className="rate-disclaimer container"><ShieldCheck /><div><h2>How dynamic pricing works</h2><p>Eligible product prices combine the published material rate, verified product weight and the configured making charge. The final invoice reflects verified weight, stone grading and applicable 3% GST.</p></div></section>
  </div>;
}
