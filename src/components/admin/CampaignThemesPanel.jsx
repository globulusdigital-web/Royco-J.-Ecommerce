import { CalendarDays, FileText, ImagePlus, Pause, Play, RotateCcw, Save, Sparkles, Square } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { defaultSeasonalOffers, defaultThemeSettings, seasonalThemeCatalog } from "../../lib/seasonal-themes";

function mergeTheme(value = {}) {
  const stored = Array.isArray(value.offers) ? value.offers : [];
  return {
    ...defaultThemeSettings,
    ...value,
    offers: defaultSeasonalOffers.map((fallback) => {
      const found = stored.find((entry) => entry.id === fallback.id) || {};
      return {
        ...fallback,
        ...found,
        status: found.status || (found.enabled ? "running" : "stopped"),
        title: { ...fallback.title, ...found.title },
        promotionText: { ...fallback.promotionText, ...found.promotionText },
        terms: { ...fallback.terms, ...found.terms },
      };
    }),
  };
}

function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return "";
  const local = new Date(date.valueOf() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CampaignThemesPanel() {
  const { notify, reloadCatalog } = useStore();
  const [theme, setTheme] = useState(null);
  const [selectedId, setSelectedId] = useState("durga-puja");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    api("/api/admin/store-settings")
      .then((payload) => setTheme(mergeTheme(payload.settings?.theme)))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const selected = useMemo(
    () => theme?.offers.find((entry) => entry.id === selectedId) || theme?.offers[0],
    [selectedId, theme],
  );
  const definition = seasonalThemeCatalog.find((entry) => entry.id === selectedId);

  if (!theme && !error) return <div className="admin-loading"><p>Loading seasonal campaigns…</p></div>;
  if (!theme) return <div className="admin-error"><span>{error}</span></div>;

  const setting = (key, value) => setTheme((current) => ({ ...current, [key]: value }));
  const offer = (key, value) => setTheme((current) => ({
    ...current,
    offers: current.offers.map((entry) => entry.id === selected.id ? { ...entry, [key]: value } : entry),
  }));
  const translated = (field, language, value) => setTheme((current) => ({
    ...current,
    offers: current.offers.map((entry) => entry.id === selected.id
      ? { ...entry, [field]: { ...entry[field], [language]: value } }
      : entry),
  }));

  const persist = async (nextTheme = theme, message = "Seasonal theme settings published.") => {
    setSaving(true);
    setError("");
    try {
      const payload = await api("/api/admin/store-settings", { method: "PUT", body: { theme: nextTheme } });
      setTheme(mergeTheme(payload.settings?.theme));
      await reloadCatalog();
      notify(message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const lifecycle = (status) => {
    const next = {
      ...theme,
      activeTheme: status === "running" ? selected.id : (theme.activeTheme === selected.id ? "default" : theme.activeTheme),
      animationsEnabled: status === "running" ? true : theme.animationsEnabled,
      offers: theme.offers.map((entry) => entry.id === selected.id
        ? { ...entry, status, enabled: status !== "stopped" }
        : entry),
    };
    setTheme(next);
    persist(next, `${definition?.label || "Campaign"} ${status}.`);
  };

  const resetDefault = () => {
    const next = { ...theme, activeTheme: "default", animationsEnabled: true };
    setTheme(next);
    persist(next, "Default Gold Petal theme restored.");
  };

  const upload = async (event, kind) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const max = kind === "attachmentUrl" ? 8 * 1024 * 1024 : 3.5 * 1024 * 1024;
    if (file.size > max) {
      setError(kind === "attachmentUrl" ? "PDF must be smaller than 8 MB." : "Banner must be smaller than 3.5 MB.");
      return;
    }
    setUploading(kind);
    const body = new FormData();
    body.append("asset", file);
    try {
      const payload = await api("/api/admin/uploads", { method: "POST", body });
      offer(kind, payload.url);
      notify(kind === "attachmentUrl" ? "Offer PDF attached. Publish to make it available." : "Campaign artwork uploaded. Publish to display it.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading("");
      event.target.value = "";
    }
  };

  return (
    <form className="admin-panel themes-panel" onSubmit={(event) => { event.preventDefault(); persist(); }}>
      <header className="admin-panel-heading">
        <div><span className="eyebrow">Visual experience</span><h1>Occasional offers & campaigns</h1></div>
        <button className="button button-dark" type="submit" disabled={saving}><Save /> {saving ? "Publishing…" : "Publish campaign"}</button>
      </header>
      {error && <div className="admin-error"><span>{error}</span></div>}

      <section className="admin-card theme-master-card">
        <div className="card-heading"><div><span className="eyebrow">Global controls</span><h3>Animation & active theme</h3></div><Sparkles /></div>
        <div className="campaign-lifecycle">
          <button className="button button-dark" type="button" onClick={() => lifecycle("running")}><Play /> Start / resume</button>
          <button className="button button-outline" type="button" onClick={() => lifecycle("paused")}><Pause /> Pause</button>
          <button className="button button-outline" type="button" onClick={() => lifecycle("stopped")}><Square /> Stop</button>
          <button className="button button-outline" type="button" onClick={resetDefault}><RotateCcw /> Default Gold Petals</button>
        </div>
        <div className="theme-control-grid">
          <label className="theme-switch"><input type="checkbox" checked={theme.animationsEnabled !== false} onChange={(event) => setting("animationsEnabled", event.target.checked)} /><span><strong>{theme.animationsEnabled !== false ? "Animations running" : "Animations paused"}</strong><small>Master control for every browser-side particle effect.</small></span></label>
          <label><span>Active theme</span><select value={theme.activeTheme} onChange={(event) => setting("activeTheme", event.target.value)}>{seasonalThemeCatalog.map((entry) => <option value={entry.id} key={entry.id}>{entry.label} · {entry.native}</option>)}</select></label>
          <label><span>Particle density · {theme.density}</span><input type="range" min="8" max="90" value={theme.density} onChange={(event) => setting("density", Number(event.target.value))} /></label>
          <label><span>Animation speed · {Number(theme.speed).toFixed(2)}×</span><input type="range" min=".25" max="2.5" step=".05" value={theme.speed} onChange={(event) => setting("speed", Number(event.target.value))} /></label>
          <label className="theme-switch"><input type="checkbox" checked={theme.disableOnMobile !== false} onChange={(event) => setting("disableOnMobile", event.target.checked)} /><span><strong>Low-power mobile protection</strong><small>Hide particles below 720px while keeping campaign artwork.</small></span></label>
        </div>
      </section>

      <section className="admin-card">
        <div className="card-heading"><div><span className="eyebrow">Offer editor</span><h3>Message, artwork, files & schedule</h3></div><CalendarDays /></div>
        <div className="theme-offer-layout">
          <nav className="theme-offer-list" aria-label="Festival offers">
            {theme.offers.map((entry) => {
              const item = seasonalThemeCatalog.find((catalogEntry) => catalogEntry.id === entry.id);
              return <button className={selected.id === entry.id ? "active" : ""} type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}><span>{item?.motif}</span><span><strong>{item?.label || entry.id}</strong><small>{entry.status || (entry.enabled ? "running" : "stopped")}</small></span></button>;
            })}
          </nav>
          <div className="theme-offer-editor">
            <div className="campaign-status-row"><span className={`status status-${selected.status === "running" ? "active" : "cancelled"}`}>{selected.status || "stopped"}</span><strong>{definition?.label} · {definition?.native}</strong></div>
            <div className="theme-language-grid">
              {[["en", "English"], ["bn", "বাংলা"], ["hi", "हिंदी"]].map(([code, label]) => <fieldset key={code}><legend>{label}</legend><label><span>Offer title</span><input value={selected.title?.[code] || ""} maxLength="160" onChange={(event) => translated("title", code, event.target.value)} /></label><label><span>Promotion text</span><textarea rows="3" value={selected.promotionText?.[code] || ""} maxLength="500" onChange={(event) => translated("promotionText", code, event.target.value)} /></label><label><span>Terms</span><textarea rows="3" value={selected.terms?.[code] || ""} maxLength="1500" onChange={(event) => translated("terms", code, event.target.value)} /></label></fieldset>)}
            </div>
            <div className="form-grid">
              <label><span>Discount code</span><input value={selected.discountCode || ""} maxLength="32" onChange={(event) => offer("discountCode", event.target.value.toUpperCase())} /></label>
              <label><span>Discount percentage</span><input type="number" min="0" max="100" value={selected.discountPercent || 0} onChange={(event) => offer("discountPercent", Number(event.target.value))} /></label>
              <label><span>Start date & time</span><input type="datetime-local" value={localDateTime(selected.startAt)} onChange={(event) => offer("startAt", event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
              <label><span>End date & time</span><input type="datetime-local" value={localDateTime(selected.endAt)} onChange={(event) => offer("endAt", event.target.value ? new Date(event.target.value).toISOString() : "")} /></label>
              <label className="campaign-upload"><span>Hero banner · JPG/PNG/WebP</span><span className="upload-button"><ImagePlus /> {uploading === "bannerImageUrl" ? "Uploading…" : "Upload artwork"}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event, "bannerImageUrl")} /></span></label>
              <label className="campaign-upload"><span>Catalog / offer terms · PDF</span><span className="upload-button"><FileText /> {uploading === "attachmentUrl" ? "Uploading…" : "Attach PDF"}<input type="file" accept="application/pdf" onChange={(event) => upload(event, "attachmentUrl")} /></span></label>
            </div>
            {selected.bannerImageUrl && <img className="campaign-banner-preview" src={selected.bannerImageUrl} alt={`${definition?.label} campaign preview`} />}
            {selected.attachmentUrl && <a className="line-link" href={selected.attachmentUrl} target="_blank" rel="noreferrer"><FileText /> Preview attached PDF</a>}
          </div>
        </div>
      </section>
    </form>
  );
}
