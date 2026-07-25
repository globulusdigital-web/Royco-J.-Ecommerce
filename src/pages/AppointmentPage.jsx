import { ArrowRight, CalendarDays, Check, Clock3, Gem, Laptop, MoonStar, Store, UserRound } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import { api, toQuery } from "../lib/api";

const providers = {
  astrologer: {
    label: "Astrologer", icon: MoonStar, specialists: ["Acharya Arindam", "Jyotishi Madhumita", "First available"],
    services: [["gemstone_guidance", "Gemstone recommendation"], ["birth_chart", "Birth chart reading"], ["muhurat", "Auspicious muhurat"]],
  },
  royco_specialist: {
    label: "Royco Specialist", icon: Gem, specialists: ["Anirban · Custom Design", "Riya · Fine Jewellery", "First available"],
    services: [["custom_design", "Custom jewellery design"], ["high_value_purchase", "Gold / diamond purchase"], ["product_consultation", "Private product consultation"]],
  },
};

function indiaDate(value) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function AppointmentPage() {
  const { user, notify } = useStore();
  const { locale, t } = useLanguage();
  const [params] = useSearchParams();
  const initial = params.get("type") === "royco_specialist" ? "royco_specialist" : "astrologer";
  const [providerType, setProviderType] = useState(initial);
  const config = providers[providerType];
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const value = new Date(Date.now() + index * 86400000); return { value, key: indiaDate(value) };
  }), []);
  const [date, setDate] = useState(dates[1].key);
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState([]);
  const [specialist, setSpecialist] = useState(config.specialists[2]);
  const [service, setService] = useState(config.services[0][0]);
  const [mode, setMode] = useState("in_person");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const loadSlots = useCallback(async () => {
    try { const payload = await api(`/api/appointments/availability${toQuery({ date, providerType })}`); setSlots(payload.slots || []); setTime(""); }
    catch (requestError) { setError(requestError.message); }
  }, [date, providerType]);
  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { setSpecialist(config.specialists[2]); setService(config.services[0][0]); }, [config]);

  const submit = async (event) => {
    event.preventDefault();
    if (!user) { navigate("/login", { state: { from: location.pathname + location.search } }); return; }
    const form = new FormData(event.currentTarget);
    setLoading(true); setError("");
    try {
      const payload = await api("/api/appointments", { method: "POST", body: {
        providerType, specialist, service, date, time, consultationMode: mode,
        language: form.get("language"), customerEmail: form.get("email"), notes: form.get("notes"),
      } });
      setBooked(payload.appointment); notify(t("appointment.success", "Your appointment request is pending confirmation."));
    } catch (requestError) { setError(requestError.message); } finally { setLoading(false); }
  };

  if (booked) return <div className="appointment-confirmation"><span><Check /></span><small>{t("appointment.received", "Request received")}</small><h1>{t("appointment.pendingTitle", "Your appointment is pending confirmation.")}</h1><p>Royco will contact you at {booked.customerPhone}. Your requested time is <strong>{new Date(booked.scheduledAt).toLocaleString(locale, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" })}</strong>.</p><div><Link className="button button-dark" to="/account">View account</Link><Link className="button button-outline" to="/">Return home</Link></div></div>;

  return <div className="appointment-page">
    <header className="appointment-page-hero container"><span className="eyebrow">{t("appointment.private", "Private consultations")}</span><h1>{t("appointment.pageTitle", "Book an appointment")}</h1><p>{t("appointment.pageIntro", "Choose an astrologer for Vedic gemstone guidance, or a Royco specialist for design and purchasing support.")}</p></header>
    <form className="appointment-flow container-wide" onSubmit={submit}>
      <section><div className="flow-heading"><span>01</span><div><small>{t("appointment.who", "Who would you like to meet?")}</small><h2>{t("appointment.team", "Select a consultation team")}</h2></div></div><div className="provider-options">{Object.entries(providers).map(([id, item]) => { const Icon = item.icon; return <button className={providerType === id ? "selected" : ""} type="button" key={id} onClick={() => setProviderType(id)}><Icon /><span><strong>{item.label}</strong><small>{id === "astrologer" ? "Gemstone & astrological guidance" : "Design & high-value purchase guidance"}</small></span><Check /></button>; })}</div>
        <div className="appointment-inline-grid"><label><span>{t("appointment.specialist", "Specialist")}</span><select value={specialist} onChange={(event) => setSpecialist(event.target.value)}>{config.specialists.map((name) => <option key={name}>{name}</option>)}</select></label><label><span>{t("appointment.consultation", "Consultation")}</span><select value={service} onChange={(event) => setService(event.target.value)}>{config.services.map(([id, label]) => <option value={id} key={id}>{label}</option>)}</select></label></div>
      </section>
      <section><div className="flow-heading"><span>02</span><div><small>{t("appointment.dateTime", "Date & time")}</small><h2>{t("appointment.slot", "Choose an available slot")}</h2></div></div><div className="date-strip">{dates.map((entry) => <button className={date === entry.key ? "selected" : ""} type="button" key={entry.key} onClick={() => setDate(entry.key)}><small>{entry.value.toLocaleDateString(locale, { weekday: "short" })}</small><strong>{entry.value.getDate()}</strong><span>{entry.value.toLocaleDateString(locale, { month: "short" })}</span></button>)}</div><div className="time-slots">{slots.filter((slot) => slot.available).map((slot) => <button className={time === slot.time ? "selected" : ""} type="button" key={slot.time} onClick={() => setTime(slot.time)}><Clock3 /> {slot.time}</button>)}</div>
      </section>
      <section><div className="flow-heading"><span>03</span><div><small>{t("appointment.details", "Your details")}</small><h2>{t("appointment.meet", "How should we meet?")}</h2></div></div><div className="mode-options"><button className={mode === "in_person" ? "selected" : ""} type="button" onClick={() => setMode("in_person")}><Store /> {t("appointment.person", "In person")}</button><button className={mode === "virtual" ? "selected" : ""} type="button" onClick={() => setMode("virtual")}><Laptop /> {t("appointment.virtual", "Online / virtual")}</button></div><div className="form-grid"><label><span>{t("appointment.name", "Name")}</span><input defaultValue={user?.name || ""} required /></label><label><span>{t("appointment.phone", "Phone")}</span><input defaultValue={user?.phone || ""} required /></label><label><span>{t("appointment.email", "Email")}</span><input name="email" type="email" defaultValue={user?.email || ""} required /></label><label><span>{t("appointment.preferred", "Preferred language")}</span><select name="language"><option>Bengali</option><option>English</option><option>Hindi</option></select></label><label className="span-two"><span>{t("appointment.notes", "Anything we should prepare?")}</span><textarea name="notes" rows="3" maxLength="600" /></label></div>{error && <div className="form-error">{error}</div>}{user ? <button className="button button-gold appointment-submit" disabled={!time || loading}>{loading ? "Sending request…" : t("appointment.request", "Request appointment")} <ArrowRight /></button> : <Link className="button button-gold appointment-submit" to="/login" state={{ from: location.pathname }}>{t("appointment.signIn", "Sign in to continue")} <UserRound /></Link>}</section>
      <aside className="booking-summary"><CalendarDays /><span className="eyebrow">{t("appointment.summary", "Your request")}</span><h3>{config.label}</h3><p>{specialist}</p><dl><div><dt>{t("common.date", "Date")}</dt><dd>{new Date(`${date}T12:00:00+05:30`).toLocaleDateString(locale, { dateStyle: "long" })}</dd></div><div><dt>{t("common.time", "Time")}</dt><dd>{time || t("appointment.slot", "Choose a slot")}</dd></div><div><dt>Format</dt><dd>{mode === "virtual" ? t("appointment.virtual", "Online / virtual") : t("appointment.person", "In person")}</dd></div><div><dt>{t("common.status", "Status")}</dt><dd>{t("common.pending", "Pending confirmation")}</dd></div></dl></aside>
    </form>
  </div>;
}
