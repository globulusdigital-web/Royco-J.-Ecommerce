import { ArrowLeft, ArrowRight, Check, CreditCard, LockKeyhole, MapPin, PackageCheck, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatMoney } from "../lib/format";

let razorpayScriptPromise;

function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve();
  razorpayScriptPromise ||= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Razorpay checkout could not be loaded. Please check your connection."));
    document.head.appendChild(script);
  });
  return razorpayScriptPromise;
}

async function collectRazorpayPayment(orderOptions) {
  await loadRazorpayCheckout();
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: orderOptions.keyId,
      amount: orderOptions.amount,
      currency: orderOptions.currency,
      name: orderOptions.name,
      description: orderOptions.description,
      order_id: orderOptions.orderId,
      prefill: orderOptions.prefill,
      theme: { color: "#7f1734" },
      handler: resolve,
      modal: {
        ondismiss: () => reject(new Error("Payment was cancelled. Your bag is still safe.")),
      },
    });
    checkout.on("payment.failed", (response) => {
      reject(new Error(response?.error?.description || "Razorpay could not complete the payment."));
    });
    checkout.open();
  });
}

export default function CheckoutPage() {
  const { user, authLoading, cart, cartSubtotal, clearCart, notify } = useStore();
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("pay_in_store");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState(null);
  const location = useLocation();
  const discount = appliedCoupon ? Math.round(cartSubtotal * (appliedCoupon.discountPercent / 100)) : 0;
  const delivery = cartSubtotal - discount >= 50000 ? 0 : 499;
  const total = cartSubtotal - discount + delivery;

  const applyCoupon = () => {
    const code = couponCode.trim().toUpperCase();
    if (["ROYCO10", "ZEROMAKING"].includes(code)) {
      setAppliedCoupon({ code, discountPercent: code === "ROYCO10" ? 10 : 8 });
      setError("");
      notify(`${code} applied.`);
    } else setError("That offer code is not active for this bag.");
  };

  const orderItems = useMemo(() => cart.map(({ product, quantity }) => ({ productId: product.id, quantity })), [cart]);

  useEffect(() => {
    if (user && !order && cart.length === 0) setError("");
  }, [user, cart, order]);

  if (authLoading) return <div className="page-loader"><span /><p>Preparing secure checkout…</p></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!cart.length && !order) return <div className="empty-state checkout-empty"><PackageCheck /><h1>Your bag is empty</h1><p>Add a piece before continuing to checkout.</p><Link className="button button-dark" to="/shop">Explore jewellery</Link></div>;

  const submit = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const checkoutBody = {
      items: orderItems,
      couponCode: appliedCoupon?.code || null,
      paymentMethod,
      shippingAddress: {
        name: values.get("name"), phone: values.get("phone"), line1: values.get("line1"), line2: values.get("line2"), city: values.get("city"), state: values.get("state"), postalCode: values.get("postalCode"), instructions: values.get("instructions"),
      },
    };
    setLoading(true);
    setError("");
    try {
      let payload;
      if (paymentMethod === "razorpay") {
        const paymentOrder = await api("/api/payments/razorpay/order", { method: "POST", body: checkoutBody });
        const payment = await collectRazorpayPayment(paymentOrder);
        payload = await api("/api/payments/razorpay/verify", {
          method: "POST",
          body: payment,
        });
      } else {
        payload = await api("/api/checkout", { method: "POST", body: checkoutBody });
      }
      setOrder(payload?.order ?? payload);
      clearCart();
      notify("Your order has been placed.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  if (order) return (
    <div className="order-success">
      <div className="success-ring"><Check /></div><span className="eyebrow">Order confirmed</span><h1>Thank you, {user.name?.split(" ")[0] || "from Royco"}.</h1><p>Your order <strong>#{order.orderNumber || order.order_number || order.id}</strong> is safely with us. We’ll contact you before dispatch or showroom collection.</p><div className="success-details"><span><small>Order total</small><strong>{formatMoney(order.total || total)}</strong></span><span><small>Payment</small><strong>{paymentMethod === "pay_in_store" ? "Pay in showroom" : paymentMethod === "cod" ? "Cash on delivery" : paymentMethod === "razorpay" ? "Paid securely via Razorpay" : "UPI transfer"}</strong></span></div><div className="success-actions"><Link className="button button-dark" to="/account">View my orders <ArrowRight /></Link><Link className="button button-outline" to="/shop">Continue shopping</Link></div>
    </div>
  );

  return (
    <div className="checkout-page container-wide">
      <div className="checkout-heading"><Link className="back-home" to="/shop"><ArrowLeft /> Continue shopping</Link><span className="eyebrow">Secure checkout</span><h1>Delivery & payment</h1><p>Complete your details below. No payment card is stored by Royco.</p></div>
      <form className="checkout-layout" onSubmit={submit}>
        <div className="checkout-form">
          <section className="checkout-card"><div className="checkout-card-heading"><span>01</span><div><h2>Contact & delivery</h2><p>Where should your order be prepared for?</p></div></div><div className="form-grid"><label><span>Full name</span><input name="name" defaultValue={user.name || ""} required /></label><label><span>Phone number</span><input name="phone" type="tel" defaultValue={user.phone || ""} required /></label><label className="span-two"><span>Address line 1</span><input name="line1" placeholder="House, street, area" required /></label><label className="span-two"><span>Address line 2 <small>Optional</small></span><input name="line2" placeholder="Landmark or apartment" /></label><label><span>City</span><input name="city" defaultValue="Chandannagar" required /></label><label><span>State</span><input name="state" defaultValue="West Bengal" required /></label><label><span>PIN code</span><input name="postalCode" inputMode="numeric" pattern="[0-9]{6}" defaultValue="712136" required /></label><label><span>Delivery note <small>Optional</small></span><input name="instructions" placeholder="Call before arrival" /></label></div></section>
          <section className="checkout-card"><div className="checkout-card-heading"><span>02</span><div><h2>Payment preference</h2><p>Choose how you’d like to complete payment.</p></div></div><div className="payment-options"><label className={paymentMethod === "razorpay" ? "selected" : ""}><input type="radio" name="paymentMethod" value="razorpay" checked={paymentMethod === "razorpay"} onChange={(event) => setPaymentMethod(event.target.value)} /><span className="radio-mark" /><div><strong>Pay online with Razorpay</strong><small>Secure cards, UPI, netbanking and supported wallets.</small></div><CreditCard /></label><label className={paymentMethod === "pay_in_store" ? "selected" : ""}><input type="radio" name="paymentMethod" value="pay_in_store" checked={paymentMethod === "pay_in_store"} onChange={(event) => setPaymentMethod(event.target.value)} /><span className="radio-mark" /><div><strong>Pay in showroom</strong><small>Reserve now and complete payment after inspection.</small></div><MapPin /></label><label className={paymentMethod === "cod" ? "selected" : ""}><input type="radio" name="paymentMethod" value="cod" checked={paymentMethod === "cod"} onChange={(event) => setPaymentMethod(event.target.value)} /><span className="radio-mark" /><div><strong>Cash on delivery</strong><small>Available after phone confirmation for eligible orders.</small></div><PackageCheck /></label><label className={paymentMethod === "upi_transfer" ? "selected" : ""}><input type="radio" name="paymentMethod" value="upi_transfer" checked={paymentMethod === "upi_transfer"} onChange={(event) => setPaymentMethod(event.target.value)} /><span className="radio-mark" /><div><strong>UPI / bank transfer</strong><small>We’ll send verified payment details after confirmation.</small></div><Sparkles /></label></div></section>
        </div>
        <aside className="order-summary"><div className="order-summary-header"><h2>Your order</h2><span>{cart.reduce((sum, item) => sum + item.quantity, 0)} pieces</span></div><div className="summary-items">{cart.map(({ product, quantity }) => <div key={product.id}><div className="summary-image"><img src={product.imageUrl} alt="" /><span>{quantity}</span></div><div><strong>{product.name}</strong><small>{product.purity}</small></div><b>{formatMoney(product.price * quantity)}</b></div>)}</div><div className="coupon-row"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Offer code" aria-label="Offer code" /><button type="button" onClick={applyCoupon}>Apply</button></div>{appliedCoupon && <div className="coupon-applied"><Check /> {appliedCoupon.code} · {appliedCoupon.discountPercent}% off</div>}<div className="summary-totals"><div><span>Subtotal</span><strong>{formatMoney(cartSubtotal)}</strong></div>{discount > 0 && <div className="discount-line"><span>Offer</span><strong>− {formatMoney(discount)}</strong></div>}<div><span>Insured delivery</span><strong>{delivery ? formatMoney(delivery) : "Complimentary"}</strong></div><div className="summary-grand-total"><span>Total</span><strong>{formatMoney(total)}</strong></div></div>{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-gold button-full" type="submit" disabled={loading}>{loading ? (paymentMethod === "razorpay" ? "Opening secure payment…" : "Placing your order…") : paymentMethod === "razorpay" ? "Pay securely with Razorpay" : "Place order"}<ArrowRight /></button><div className="summary-security"><LockKeyhole /><span><strong>Secure checkout</strong><small>{paymentMethod === "razorpay" ? "Payment details handled by Razorpay" : "Protected session · Same-origin requests"}</small></span></div><p className="summary-terms">By placing your order you agree to confirmation by phone and the final verified invoice.</p></aside>
      </form>
    </div>
  );
}
