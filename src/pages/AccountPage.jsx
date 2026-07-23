import { ArrowRight, CalendarDays, LogOut, PackageCheck, RefreshCw, ShoppingBag as Bag, Sparkles, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatDate, formatMoney, orderStatusLabel } from "../lib/format";

export default function AccountPage() {
  const { user, authLoading, logout, notify } = useStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    try {
      const payload = await api("/api/orders");
      setOrders(payload?.orders ?? payload ?? []);
      setError("");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) loadOrders(); }, [user]);

  if (authLoading) return <div className="page-loader"><span /><p>Opening your account…</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "admin") return <Navigate to="/admin" replace />;

  const cancelOrder = async (orderId) => {
    if (!window.confirm("Cancel this pending order?")) return;
    try {
      await api(`/api/orders/${orderId}/cancel`, { method: "POST" });
      notify("Order cancelled.", "info");
      loadOrders();
    } catch (requestError) { notify(requestError.message, "error"); }
  };

  return (
    <div className="account-page">
      <header className="account-hero"><div className="container-wide"><div><span className="eyebrow eyebrow-light">My Royco</span><h1>Welcome, <em>{user.name?.split(" ")[0] || "friend"}.</em></h1><p>Keep track of every beautiful choice from here.</p></div><div className="account-monogram">{(user.name || user.email || "R").slice(0, 1).toUpperCase()}</div></div></header>
      <div className="account-layout container-wide">
        <aside className="account-sidebar"><div className="account-person"><UserRound /><span><strong>{user.name || "Royco customer"}</strong><small>{user.email}</small></span></div><nav><a className="active" href="#orders"><Bag /> My orders</a><Link to="/shop"><Sparkles /> Continue shopping</Link></nav><button className="text-button account-logout" type="button" onClick={logout}><LogOut /> Sign out</button></aside>
        <section className="orders-panel" id="orders"><div className="panel-heading"><div><span className="eyebrow">Order history</span><h2>Your orders</h2></div><button className="icon-button" type="button" onClick={loadOrders} aria-label="Refresh orders"><RefreshCw size={18} /></button></div>{loading ? <div className="account-loading"><span /><p>Loading your orders…</p></div> : error ? <div className="form-error">{error} <button type="button" onClick={loadOrders}>Try again</button></div> : orders.length === 0 ? <div className="empty-state account-empty"><PackageCheck /><h3>No orders yet</h3><p>When a piece catches your eye, your order will appear here.</p><Link className="button button-dark" to="/shop">Explore the collection <ArrowRight /></Link></div> : <div className="order-list">{orders.map((order) => { const id = order.orderNumber || order.order_number || order.id; const items = order.items || []; return <article className="order-card" key={order.id}><header><div><span className="order-number">Order #{id}</span><span className={`status status-${order.status}`}>{orderStatusLabel(order.status)}</span></div><span><CalendarDays /> {formatDate(order.createdAt || order.created_at)}</span></header><div className="order-card-body"><div className="order-item-images">{items.slice(0, 4).map((item, index) => <img src={item.imageUrl || item.image_url || "/assets/products/gold-ring.webp"} alt="" key={item.id || index} />)}</div><div className="order-summary-copy"><span>{items.reduce((sum, item) => sum + Number(item.quantity || 1), 0) || order.item_count || 0} pieces</span><strong>{formatMoney(order.total)}</strong></div></div><footer><span>{order.paymentMethod || order.payment_method || "Pay in showroom"}</span>{order.status === "pending" && <button className="text-button danger" type="button" onClick={() => cancelOrder(order.id)}>Cancel order</button>}</footer></article>; })}</div>}</section>
      </div>
    </div>
  );
}
