import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);
const LANGUAGE_KEY = "royco-language-v1";

const bn = {
  "nav.new": "নতুন সংগ্রহ",
  "nav.gold": "সোনা",
  "nav.diamond": "হীরা",
  "nav.silver": "রূপা",
  "nav.platinum": "প্ল্যাটিনাম",
  "nav.jyotishi": "জ্যোতিষী",
  "nav.visit": "শোরুম",
  "nav.story": "আমাদের কথা",
  "header.delivery": "₹৫০,০০০-এর বেশি অর্ডারে বিনামূল্যে বিমাকৃত ডেলিভারি",
  "header.visit": "চন্দননগর শোরুম",
  "header.translate": "English",
  "auth.eyebrow": "আপনার রয়কো অ্যাকাউন্ট",
  "auth.title": "মোবাইল নম্বর দিয়ে সাইন ইন",
  "auth.intro": "আমরা আপনার মোবাইলে একটি ৬ সংখ্যার সুরক্ষিত কোড পাঠাব।",
  "auth.name": "পুরো নাম",
  "auth.phone": "মোবাইল নম্বর",
  "auth.send": "SMS কোড পাঠান",
  "auth.sending": "কোড পাঠানো হচ্ছে…",
  "auth.code": "৬ সংখ্যার OTP",
  "auth.verify": "যাচাই করে চালিয়ে যান",
  "auth.verifying": "যাচাই হচ্ছে…",
  "auth.change": "নম্বর বদলান",
  "auth.resend": "আবার কোড পাঠান",
  "auth.sent": "কোড পাঠানো হয়েছে",
  "auth.secure": "OTP-সুরক্ষিত প্রবেশ",
  "appointment.eyebrow": "ব্যক্তিগত জ্যোতিষ পরামর্শ",
  "appointment.title": "আপনার জ্যোতিষী সাক্ষাৎ বুক করুন",
  "appointment.intro": "জন্মছক, রত্ন নির্দেশনা বা শুভ মুহূর্তের জন্য একটি সময় বেছে নিন।",
  "appointment.service": "পরামর্শের ধরন",
  "appointment.birth": "জন্মছক পাঠ",
  "appointment.gem": "রত্ন নির্দেশনা",
  "appointment.muhurat": "শুভ মুহূর্ত নির্বাচন",
  "appointment.date": "তারিখ বেছে নিন",
  "appointment.time": "সময় বেছে নিন",
  "appointment.language": "পছন্দের ভাষা",
  "appointment.notes": "জ্যোতিষীর জন্য নোট",
  "appointment.book": "সাক্ষাৎ বুক করুন",
  "appointment.booking": "বুক করা হচ্ছে…",
  "appointment.login": "বুক করতে মোবাইল দিয়ে সাইন ইন করুন",
  "appointment.success": "আপনার সাক্ষাতের অনুরোধ পাঠানো হয়েছে।",
  "appointment.none": "এই দিনে আর কোনো সময় খালি নেই।",
  "appointment.upcoming": "আপনার সাক্ষাৎসমূহ",
  "backToTop": "উপরে ফিরুন",
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem(LANGUAGE_KEY) === "bn" ? "bn" : "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = language === "bn" ? "bn" : "en";
    document.documentElement.dataset.language = language;
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy-focused browsing modes.
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    toggleLanguage: () => setLanguage((current) => current === "en" ? "bn" : "en"),
    t: (key, fallback) => language === "bn" ? (bn[key] || fallback || key) : (fallback || key),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
