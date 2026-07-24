import { ArrowRight, CalendarDays, Check, Clock3, Languages, MoonStar, ShieldCheck, Sparkles } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import { api, toQuery } from "../lib/api";

const services = [
  { id: "birth_chart", icon: MoonStar, titleKey: "appointment.birth", title: "Birth chart reading", copy: "A focused reading of your natal chart and current planetary influences." },
  { id: "gemstone_guidance", icon: Sparkles, titleKey: "appointment.gem", title: "Gemstone guidance", copy: "Personal guidance before choosing a gemstone for spiritual or astrological use." },
  { id: "muhurat", icon: CalendarDays, titleKey: "appointment.muhurat", title: "Auspicious muhurat", copy: "Select a favourable time for weddings, purchases, ceremonies or a new beginning." },
];

function dateKey(value) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function serviceName(id, t) {
  const service = services.find((entry) => entry.id === id);
  return service ? t(service.titleKey, service.title) : id;
}

export default function JyotishiPage() {
  const { user, notify } = useStore();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const dates = useMemo(() => Array.from({ length: 14 }, (_, index) => {
    const value = new Date(Date.now() + index * 24 * 60 * 60 * 1000);
    return { key: dateKey(value), value };
  }), []);
  const [date, setDate] = useState(dates[0].key);
  const [time, setTime] = useState("");
  const [service, setService] = useState("birth_chart");
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState(null);

  const loadAvailability = useCallback(async () => {
    setLoadingSlots(true);
    setTime("");
    try {
      const payload = await api(`/api/appointments/availability${toQuery({ date })}`);
      setSlots(payload.slots || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [date]);

  const loadAppointments = useCallback(async () => {
    if (!user || user.role !== "customer") return;
    try {
      const payload = await api("/api/appointments");
      setAppointments(payload.appointments || []);
    } catch {
      setAppointments([]);
    }
  }, [user]);

  useEffect(() => { loadAvailability(); }, [loadAvailability]);
  useEffect(() => { loadAppointments(); }, [loadAppointments]);

  const submit = async (event) => {
    event.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    const values = new FormData(event.currentTarget);
    setBooking(true);
    setError("");
    try {
      const payload = await api("/api/appointments", {
        method: "POST",
        body: {
          date,
          time,
          service,
          language: values.get("language"),
          notes: values.get("notes"),
        },
      });
      setBooked(payload.appointment);
      setTime("");
      notify(t("appointment.success", "Your appointment request has been sent."));
      await Promise.all([loadAvailability(), loadAppointments()]);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBooking(false);
    }
  };

  const dateLocale = language === "bn" ? "bn-BD" : "en-IN";

  return (
    <div className="jyotishi-page">
      <section className="jyotishi-hero">
        <div className="jyotishi-orbit" aria-hidden="true"><i /><i /><MoonStar /></div>
        <div className="container">
          <span className="eyebrow eyebrow-light">{t("appointment.eyebrow", "Personal astrology consultation")}</span>
          <h1>{t("appointment.title", "Book your Jyotishi appointment")}</h1>
          <p>{t("appointment.intro", "Choose a calm, private time for birth-chart insight, gemstone guidance or an auspicious muhurat.")}</p>
          <div className="jyotishi-trust"><ShieldCheck /><span>{language === "bn" ? "ব্যক্তিগত · ৪৫ মিনিট · চন্দননগার শোরুম" : "Private · 45 minutes · Chandannagar showroom"}</span></div>
        </div>
      </section>

      <section className="jyotishi-booking container-wide">
        <form className="appointment-form" onSubmit={submit}>
          <div className="appointment-heading"><span>01</span><div><small>{t("appointment.service", "Consultation")}</small><h2>{language === "bn" ? "কী নিয়ে আলোচনা করতে চান?" : "What would you like to explore?"}</h2></div></div>
          <div className="service-options">
            {services.map(({ id, icon: Icon, titleKey, title, copy }) => (
              <label className={service === id ? "selected" : ""} key={id}>
                <input type="radio" name="service" value={id} checked={service === id} onChange={() => setService(id)} />
                <Icon /><span><strong>{t(titleKey, title)}</strong><small>{language === "bn" ? (id === "birth_chart" ? "জন্মছক ও বর্তমান গ্রহের প্রভাব" : id === "gemstone_guidance" ? "উপযুক্ত রত্ন বেছে নেওয়ার পরামর্শ" : "বিবাহ, কেনাকাটা বা নতুন শুরুর শুভ সময়") : copy}</small></span><i><Check /></i>
              </label>
            ))}
          </div>

          <div className="appointment-heading appointment-heading-spaced"><span>02</span><div><small>{t("appointment.date", "Date & time")}</small><h2>{language === "bn" ? "আপনার সুবিধার সময় বেছে নিন" : "Choose a time that feels unhurried"}</h2></div></div>
          <div className="date-strip">
            {dates.map((entry) => <button className={date === entry.key ? "selected" : ""} type="button" key={entry.key} onClick={() => setDate(entry.key)}><small>{entry.value.toLocaleDateString(dateLocale, { weekday: "short", timeZone: "Asia/Kolkata" })}</small><strong>{entry.value.toLocaleDateString(dateLocale, { day: "2-digit", timeZone: "Asia/Kolkata" })}</strong><span>{entry.value.toLocaleDateString(dateLocale, { month: "short", timeZone: "Asia/Kolkata" })}</span></button>)}
          </div>
          <div className="time-slots" aria-busy={loadingSlots}>
            {loadingSlots ? <span className="slot-loading">{language === "bn" ? "সময় দেখা হচ্ছে…" : "Checking the diary…"}</span> : slots.filter((slot) => slot.available).map((slot) => <button className={time === slot.time ? "selected" : ""} type="button" key={slot.time} onClick={() => setTime(slot.time)}><Clock3 /> {new Date(slot.scheduledAt).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</button>)}
            {!loadingSlots && !slots.some((slot) => slot.available) && <span className="slot-loading">{t("appointment.none", "No more times are available on this date.")}</span>}
          </div>

          <div className="appointment-extras">
            <label><Languages /><span><small>{t("appointment.language", "Preferred language")}</small><select name="language" defaultValue={language === "bn" ? "Bengali" : "English"}><option>Bengali</option><option>English</option><option>Hindi</option></select></span></label>
            <label><Sparkles /><span><small>{t("appointment.notes", "Note for the Jyotishi")}</small><textarea name="notes" rows="3" maxLength="600" placeholder={language === "bn" ? "প্রশ্ন বা প্রাসঙ্গিক তথ্য (ঐচ্ছিক)" : "Questions or relevant context (optional)"} /></span></label>
          </div>
          {error && <div className="form-error" role="alert">{error}</div>}
          {booked && <div className="appointment-success"><Check /><span><strong>{t("appointment.success", "Your appointment request has been sent.")}</strong><small>{new Date(booked.scheduledAt).toLocaleString(dateLocale, { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Kolkata" })}</small></span></div>}
          {user ? <button className="button button-gold appointment-submit" type="submit" disabled={booking || !time}>{booking ? t("appointment.booking", "Booking…") : t("appointment.book", "Book appointment")}<ArrowRight /></button> : <Link className="button button-gold appointment-submit" to="/login" state={{ from: "/jyotishi" }}>{t("appointment.login", "Sign in with mobile to book")}<ArrowRight /></Link>}
        </form>

        <aside className="appointment-summary">
          <span className="eyebrow">{language === "bn" ? "আপনার নির্বাচন" : "Your consultation"}</span>
          <div className="appointment-summary-symbol"><MoonStar /></div>
          <h3>{serviceName(service, t)}</h3>
          <dl>
            <div><dt>{t("appointment.date", "Date")}</dt><dd>{new Date(`${date}T12:00:00+05:30`).toLocaleDateString(dateLocale, { dateStyle: "long", timeZone: "Asia/Kolkata" })}</dd></div>
            <div><dt>{t("appointment.time", "Time")}</dt><dd>{time ? new Date(`${date}T${time}:00+05:30`).toLocaleTimeString(dateLocale, { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—"}</dd></div>
            <div><dt>{language === "bn" ? "সময়কাল" : "Duration"}</dt><dd>45 minutes</dd></div>
            <div><dt>{language === "bn" ? "স্থান" : "Location"}</dt><dd>Royco Jewellers, Chandannagar</dd></div>
          </dl>
          <p>{language === "bn" ? "এটি একটি অ্যাপয়েন্টমেন্ট অনুরোধ। অ্যাডমিন নিশ্চিত করলে আপনি ফোনে আপডেট পাবেন।" : "This is an appointment request. You’ll receive a phone update after the Royco team confirms it."}</p>
        </aside>
      </section>

      {user && appointments.length > 0 && <section className="my-appointments container-wide"><span className="eyebrow">{t("appointment.upcoming", "Your appointments")}</span><div>{appointments.slice(0, 4).map((appointment) => <article key={appointment.id}><CalendarDays /><span><strong>{serviceName(appointment.service, t)}</strong><small>{new Date(appointment.scheduledAt).toLocaleString(dateLocale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}</small></span><em className={`status status-${appointment.status}`}>{appointment.status}</em></article>)}</div></section>}
    </div>
  );
}
