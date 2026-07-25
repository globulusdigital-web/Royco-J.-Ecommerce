import { CalendarDays, Clock3, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";

function localDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.valueOf())) return "";
  const local = new Date(date.valueOf() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const serviceLabel = (value) => ({
  birth_chart: "Birth chart consultation",
  gemstone_guidance: "Gemstone guidance",
  muhurat: "Muhurat consultation",
  custom_design: "Custom jewellery design",
  high_value_purchase: "Gold / diamond purchase",
  product_consultation: "Product consultation",
}[value] || value);

export default function AppointmentManager() {
  const { notify } = useStore();
  const [appointments, setAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reschedules, setReschedules] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await api("/api/admin/appointments");
      setAppointments(payload.appointments || []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = async (id, changes) => {
    try {
      await api(`/api/admin/appointments/${id}`, { method: "PUT", body: changes });
      notify(changes.scheduledAt ? "Appointment rescheduled." : "Appointment status updated.");
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };
  const visible = statusFilter === "all" ? appointments : appointments.filter((item) => item.status === statusFilter);

  return (
    <div className="admin-panel">
      <header className="admin-panel-heading"><div><span className="eyebrow">Consultation diary</span><h1>Appointments</h1></div><button className="icon-button" type="button" onClick={load} aria-label="Refresh appointments"><RefreshCw /></button></header>
      <div className="admin-toolbar"><div className="status-filters">{["all", "requested", "confirmed", "completed", "cancelled"].map((status) => <button className={statusFilter === status ? "active" : ""} type="button" key={status} onClick={() => setStatusFilter(status)}>{status === "all" ? "All" : status}</button>)}</div><span>{visible.length} appointments</span></div>
      {error && <div className="admin-error"><span>{error}</span></div>}
      {loading ? <div className="admin-loading"><p>Loading appointment diary…</p></div> : <div className="admin-table-wrap"><table className="admin-table appointment-admin-table"><thead><tr><th>Customer</th><th>Consultation</th><th>Date & time</th><th>Reschedule</th><th>Format</th><th>Status</th></tr></thead><tbody>
        {visible.map((appointment) => <tr key={appointment.id}>
          <td><strong>{appointment.customerName}</strong><small>{appointment.customerPhone}<br />{appointment.customerEmail}</small></td>
          <td><strong>{serviceLabel(appointment.service)}</strong><small>{appointment.providerType === "royco_specialist" ? "Royco Specialist" : "Astrologer"} · {appointment.specialist}</small></td>
          <td><strong>{new Date(appointment.scheduledAt).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" })}</strong><small><Clock3 /> {new Date(appointment.scheduledAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</small></td>
          <td><div className="appointment-reschedule"><input type="datetime-local" value={reschedules[appointment.id] ?? localDateTime(appointment.scheduledAt)} onChange={(event) => setReschedules((current) => ({ ...current, [appointment.id]: event.target.value }))} /><button type="button" onClick={() => update(appointment.id, { scheduledAt: new Date(reschedules[appointment.id] || localDateTime(appointment.scheduledAt)).toISOString() })}>Reschedule</button></div></td>
          <td>{appointment.consultationMode === "virtual" ? "Online" : "In person"}<small>{appointment.language}</small></td>
          <td><select value={appointment.status} onChange={(event) => update(appointment.id, { status: event.target.value })}><option value="requested">Requested</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></td>
        </tr>)}
      </tbody></table>{!visible.length && <div className="admin-empty"><CalendarDays /><span>No appointments in this view</span></div>}</div>}
    </div>
  );
}
