import { ArrowRight, Gem, KeyRound, MessageSquareText, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";

export default function AuthPage() {
  const { user, authLoading, requestOtp, verifyOtp } = useStore();
  const { language, t } = useLanguage();
  const [step, setStep] = useState("phone");
  const [phone, setPhone] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [name, setName] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  if (!authLoading && user) return <Navigate to={user.role === "admin" ? "/admin" : "/account"} replace />;

  const sendCode = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await requestOtp(step === "code" && verifiedPhone ? verifiedPhone : phone);
      setVerifiedPhone(result.phone);
      setMaskedPhone(result.maskedPhone);
      setDevOtp(result.devOtp || "");
      setStep("code");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setLoading(true);
    setError("");
    try {
      await verifyOtp({ phone: verifiedPhone, name, code: values.get("code") });
      navigate(location.state?.from || "/account", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page otp-auth-page">
      <section className="auth-visual">
        <img src="/assets/products/necklace-temple.webp" alt="Diamond necklace detail" />
        <div className="auth-visual-overlay" />
        <div className="auth-form-petals" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        <div className="auth-visual-copy">
          <span className="eyebrow eyebrow-light">{t("auth.eyebrow", "Your Royco account")}</span>
          <h1>{language === "bn" ? <>প্রতিটি<br /><em>সুন্দর পছন্দ</em><br />কাছে রাখুন।</> : <>Keep every<br /><em>beautiful choice</em><br />close.</>}</h1>
          <p>{language === "bn" ? "অর্ডার দেখুন, দ্রুত চেকআউট করুন এবং আপনার পছন্দের গয়নায় ফিরে আসুন।" : "Track orders, move through checkout faster and return to the pieces you love."}</p>
          <div className="auth-benefit"><ShieldCheck /><span><strong>{t("auth.secure", "OTP-secured access")}</strong><small>{language === "bn" ? "কোনো পাসওয়ার্ড মনে রাখতে হবে না" : "No password to remember or reuse"}</small></span></div>
        </div>
        <span className="auth-orbit"><Gem /></span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form-panel">
          <Link className="back-home" to="/">← {language === "bn" ? "রয়কোতে ফিরুন" : "Back to Royco"}</Link>
          <span className="otp-step-icon">{step === "phone" ? <Smartphone /> : <MessageSquareText />}</span>
          <span className="eyebrow">{step === "phone" ? (language === "bn" ? "নিরাপদ প্রবেশ" : "Secure access") : t("auth.sent", "Code sent")}</span>
          <h2>{step === "phone" ? t("auth.title", "Sign in with your mobile") : (language === "bn" ? "আপনার কোড লিখুন" : "Enter your verification code")}</h2>
          <p>{step === "phone" ? t("auth.intro", "We’ll send a secure 6-digit code to your mobile.") : `${language === "bn" ? "SMS পাঠানো হয়েছে" : "We sent an SMS to"} ${maskedPhone}.`}</p>

          {step === "phone" ? (
            <form className="form-stack otp-form" onSubmit={sendCode}>
              <label><span>{t("auth.name", "Full name")}</span><input name="name" autoComplete="name" placeholder={language === "bn" ? "আপনার পুরো নাম" : "Your full name"} value={name} onChange={(event) => setName(event.target.value)} required minLength="2" /></label>
              <label><span>{t("auth.phone", "Mobile number")}</span><div className="mobile-number-field"><span>+91</span><input name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="98765 43210" value={phone} onChange={(event) => setPhone(event.target.value)} required pattern="[+0-9 ()-]{8,18}" /></div></label>
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="button button-dark button-full" disabled={loading} type="submit">{loading ? t("auth.sending", "Sending code…") : t("auth.send", "Send SMS code")}<ArrowRight /></button>
            </form>
          ) : (
            <form className="form-stack otp-form" onSubmit={verifyCode}>
              <label><span>{t("auth.code", "6-digit OTP")}</span><div className="otp-code-field"><KeyRound /><input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength="6" placeholder="• • • • • •" autoFocus required /></div></label>
              {devOtp && <div className="dev-otp-note"><Sparkles /><span>Local preview code: <strong>{devOtp}</strong></span></div>}
              {error && <div className="form-error" role="alert">{error}</div>}
              <button className="button button-dark button-full" disabled={loading} type="submit">{loading ? t("auth.verifying", "Verifying…") : t("auth.verify", "Verify & continue")}<ArrowRight /></button>
              <div className="otp-secondary-actions"><button type="button" onClick={() => { setStep("phone"); setVerifiedPhone(""); setError(""); }}>{t("auth.change", "Change number")}</button><button type="button" disabled={loading} onClick={() => sendCode()}>{t("auth.resend", "Resend code")}</button></div>
            </form>
          )}
          <div className="auth-security"><ShieldCheck /><span>{language === "bn" ? "আপনার OTP কারও সঙ্গে ভাগ করবেন না।" : "Never share your OTP with anyone, including Royco staff."}</span></div>
        </div>
      </section>
    </div>
  );
}
