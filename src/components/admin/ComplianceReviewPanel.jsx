import { FileText, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "../../context/StoreContext";
import { api } from "../../lib/api";
import { formatDate, formatMoney } from "../../lib/format";

export default function ComplianceReviewPanel() {
  const { notify } = useStore();
  const [reviews, setReviews] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(() => api("/api/admin/compliance")
    .then((payload) => { setReviews(payload.reviews || []); setError(""); })
    .catch((requestError) => setError(requestError.message)), []);
  useEffect(() => { load(); }, [load]);
  const decide = async (id, status) => {
    try {
      await api(`/api/admin/compliance/${id}`, { method: "PUT", body: { status } });
      notify(`Compliance review ${status}.`);
      load();
    } catch (requestError) {
      notify(requestError.message, "error");
    }
  };

  return (
    <div className="admin-panel">
      <header className="admin-panel-heading"><div><span className="eyebrow">Section 139A controls</span><h1>High-value compliance</h1></div><button className="icon-button" type="button" onClick={load} aria-label="Refresh compliance reviews"><RefreshCw /></button></header>
      {error && <div className="admin-error"><span>{error}</span></div>}
      <div className="compliance-review-grid">
        {reviews.map((review) => <article className="admin-card compliance-review" key={review.id}>
          <div><span className={`status status-${review.status}`}>{review.status}</span><small>{formatDate(review.created_at)}</small></div>
          <h3>Order #{review.order_id}</h3>
          <dl>
            <div><dt>Document</dt><dd>{review.document_type === "pan" ? `PAN · ${review.pan_number}` : "Form 60 declaration"}</dd></div>
            <div><dt>Phone</dt><dd>{review.phone}</dd></div>
            <div><dt>24-hour combined value</dt><dd>{formatMoney(Number(review.combined_total_paise) / 100)}</dd></div>
          </dl>
          {review.document_url && <a className="button button-outline compliance-document-link" href={review.document_url} target="_blank" rel="noreferrer"><FileText /> Inspect PAN image</a>}
          {review.form60_declaration && <p>{review.form60_declaration}</p>}
          <div className="review-actions"><button className="button button-outline" type="button" onClick={() => decide(review.id, "rejected")}>Reject</button><button className="button button-dark" type="button" onClick={() => decide(review.id, "approved")}>Approve</button></div>
        </article>)}
        {!reviews.length && <div className="admin-empty"><ShieldCheck /><span>No high-value reviews are waiting</span></div>}
      </div>
    </div>
  );
}
