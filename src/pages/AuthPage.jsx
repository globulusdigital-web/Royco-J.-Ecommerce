import { ArrowRight, Eye, EyeOff, Gem, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function AuthPage() {
  const { user, authLoading, login, signup } = useStore();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "signup" ? "signup" : "login";
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  if (!authLoading && user) return <Navigate to={user.role === "admin" ? "/admin" : "/account"} replace />;

  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        await signup({ name: form.get("name"), email: form.get("email"), phone: form.get("phone"), password: form.get("password") });
      } else {
        await login({ email: form.get("email"), password: form.get("password") });
      }
      navigate(location.state?.from || "/account", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <section className="auth-visual">
        <img src="/assets/products/necklace-temple.webp" alt="Diamond necklace detail" />
        <div className="auth-visual-overlay" />
        <div className="auth-visual-copy"><span className="eyebrow eyebrow-light">Your Royco account</span><h1>Keep every<br /><em>beautiful choice</em><br />close.</h1><p>Track orders, move through checkout faster and return to the pieces you love.</p><div className="auth-benefit"><ShieldCheck /><span><strong>Private by design</strong><small>Secure sessions and protected customer records</small></span></div></div>
        <span className="auth-orbit"><Gem /></span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form-panel">
          <Link className="back-home" to="/">← Back to Royco</Link>
          <span className="eyebrow">{mode === "signup" ? "Join Royco" : "Welcome back"}</span>
          <h2>{mode === "signup" ? "Create your account" : "Sign in to your account"}</h2>
          <p>{mode === "signup" ? "A few details, then the collection is yours to explore." : "Continue to your orders, account and checkout."}</p>
          <div className="auth-tabs" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => setParams({})}>Sign in</button><button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setParams({ mode: "signup" })}>Create account</button></div>
          <form className="form-stack" onSubmit={submit}>
            {mode === "signup" && <><label><span>Full name</span><input name="name" autoComplete="name" placeholder="Your full name" required minLength="2" /></label><label><span>Phone number</span><input name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" required pattern="[+0-9 ()-]{8,18}" /></label></>}
            <label><span>Email address</span><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></label>
            <label><span>Password</span><div className="password-field"><LockKeyhole size={17} /><input name="password" type={showPassword ? "text" : "password"} autoComplete={mode === "signup" ? "new-password" : "current-password"} placeholder={mode === "signup" ? "At least 8 characters" : "Your password"} required minLength="8" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <button className="button button-dark button-full" disabled={loading} type="submit">{loading ? "Please wait…" : mode === "signup" ? "Create my account" : "Sign in"}<ArrowRight /></button>
          </form>
          <div className="auth-security"><Sparkles /><span>Shopping for the showroom? <Link to="/visit">Plan your visit</Link></span></div>
        </div>
      </section>
    </div>
  );
}
