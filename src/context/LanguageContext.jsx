import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LanguageContext = createContext(null);
const LANGUAGE_KEY = "royco-language-v2";

export const supportedLanguages = [
  { code: "en", label: "English", locale: "en-IN" },
  { code: "bn", label: "বাংলা", locale: "bn-IN" },
  { code: "hi", label: "हिंदी", locale: "hi-IN" },
];

const dictionaries = {
  bn: {
    "nav.new": "নতুন সংগ্রহ", "nav.gold": "সোনা", "nav.diamond": "হীরা", "nav.silver": "রূপা",
    "nav.platinum": "প্ল্যাটিনাম", "nav.jyotishi": "জ্যোতিষী জুয়েলস", "nav.appointments": "সাক্ষাৎ",
    "nav.rates": "লাইভ রেট", "nav.visit": "শোরুম", "nav.story": "আমাদের কথা",
    "header.delivery": "₹৫০,০০০-এর বেশি অর্ডারে বিনামূল্যে বিমাকৃত ডেলিভারি",
    "header.searchPlaceholder": "আংটি, হার বা সোনা খুঁজুন…", "common.search": "খুঁজুন", "common.remove": "সরান",
    "common.all": "সব", "common.filters": "ফিল্টার", "common.clearAll": "সব মুছুন", "common.explore": "দেখুন",
    "common.date": "তারিখ", "common.time": "সময়", "common.status": "অবস্থা", "common.pending": "অনুমোদনের অপেক্ষায়",
    "cart.selection": "আপনার পছন্দ", "cart.title": "শপিং ব্যাগ", "cart.emptyTitle": "আপনার ব্যাগ অপেক্ষায়",
    "cart.emptyText": "উৎসব, স্মৃতি ও প্রতিদিনের জন্য তৈরি গয়না আবিষ্কার করুন।", "cart.explore": "সংগ্রহ দেখুন",
    "cart.subtotal": "মোট", "cart.taxNote": "চেকআউটে কর ও ডেলিভারি হিসাব হবে।",
    "cart.checkout": "চেকআউটে যান", "cart.continue": "কেনাকাটা চালিয়ে যান", "cart.add": "ব্যাগে যোগ করুন",
    "cart.out": "স্টক শেষ", "cart.saved": "এই ভিজিটের জন্য সংরক্ষিত হয়েছে।",
    "home.kickerOne": "চন্দননগর থেকে", "home.kickerTwo": "আজকের জন্য তৈরি",
    "home.title": "প্রতিটি অধ্যায় তার নিজস্ব দীপ্তি চায়।", "home.bengali": "প্রতিটি মুহূর্তের জন্য একটু উজ্জ্বলতা",
    "home.lead": "আধুনিক রুচি ও পাড়ার জুয়েলারির আন্তরিকতায় সাজানো সোনা, রূপা, প্ল্যাটিনাম ও হীরার গয়না আবিষ্কার করুন।",
    "home.shop": "সংগ্রহ কিনুন", "home.visit": "আমাদের শোরুমে আসুন", "home.featured": "রয়কোর বাছাই",
    "home.pieces": "যে গয়না রেখে দিতে ইচ্ছে করে।", "home.viewAll": "সব গয়না দেখুন",
    "shop.eyebrow": "সম্পূর্ণ সংগ্রহ", "shop.title": "আপনার নিজের মনে হয় এমন গয়না খুঁজুন।",
    "shop.intro": "প্রতিটি রূপ ও উপলক্ষের জন্য সোনা, রূপা, হীরা ও প্ল্যাটিনাম।",
    "shop.placeholder": "সংগ্রহে খুঁজুন", "shop.category": "বিভাগ", "shop.sort": "সাজান", "shop.designs": "ডিজাইন",
    "shop.none": "এই ফিল্টারে কোনো গয়না নেই", "shop.noneText": "অন্য ধাতু, বিভাগ বা শব্দ দিয়ে চেষ্টা করুন।",
    "shop.showAll": "সব গয়না দেখুন", "shop.featured": "নির্বাচিত প্রথমে", "shop.newest": "নতুন",
    "shop.lowHigh": "দাম: কম থেকে বেশি", "shop.highLow": "দাম: বেশি থেকে কম",
    "jyotishi.eyebrow": "জ্যোতিষ রত্ন · বৈদিক গয়না", "jyotishi.title": "উদ্দেশ্য নিয়ে নির্বাচিত জ্যোতিষী জুয়েলস।",
    "jyotishi.intro": "সার্টিফায়েড প্রাকৃতিক রত্ন, বৈদিক সেটিং, ঐচ্ছিক অভিমন্ত্রিত সেবা ও ব্যক্তিগত নির্দেশনা।",
    "jyotishi.consult": "জ্যোতিষীর পরামর্শ নিন", "jyotishi.gemstone": "রত্ন", "jyotishi.sign": "রাশি",
    "jyotishi.planet": "গ্রহ", "jyotishi.metal": "ধাতুর সেটিং", "jyotishi.certified": "সার্টিফায়েড অপরিশোধিত",
    "jyotishi.weight": "ওজন", "jyotishi.origin": "উৎপত্তি", "jyotishi.setting": "সেটিং",
    "jyotishi.energized": "অভিমন্ত্রিত বিকল্প", "jyotishi.recommendation": "ব্যক্তিগত সুপারিশ",
    "jyotishi.unsure": "কোন রত্ন আপনার জন্য ঠিক বুঝতে পারছেন না?", "jyotishi.book": "সাক্ষাৎ বুক করুন",
    "rates.eyebrow": "রয়কো প্রতিদিন প্রকাশ করে", "rates.title": "লাইভ মূল্যবান ধাতুর রেট।",
    "rates.intro": "ডায়নামিক দামের পণ্যে ব্যবহৃত স্বচ্ছ রেফারেন্স রেট।", "rates.updated": "আজ সর্বশেষ আপডেট",
    "rates.gold": "সোনা", "rates.silver": "রূপা", "rates.platinum": "প্ল্যাটিনাম", "rates.diamond": "হীরা",
    "rates.gram": "প্রতি গ্রাম", "rates.kg": "প্রতি কেজি", "rates.carat": "প্রতি ক্যারেট",
    "rates.how": "ডায়নামিক দাম কীভাবে কাজ করে", "rates.explain": "প্রকাশিত ধাতুর রেট, যাচাইকৃত ওজন ও নির্ধারিত মেকিং চার্জ মিলিয়ে দাম তৈরি হয়। চূড়ান্ত ইনভয়েসে প্রযোজ্য ৩% GST যোগ হয়।",
    "appointment.private": "ব্যক্তিগত পরামর্শ", "appointment.pageTitle": "সাক্ষাৎ বুক করুন",
    "appointment.pageIntro": "রত্ন নির্দেশনার জন্য জ্যোতিষী বা ডিজাইন ও কেনাকাটার জন্য রয়কো বিশেষজ্ঞ বেছে নিন।",
    "appointment.who": "কার সঙ্গে দেখা করতে চান?", "appointment.team": "পরামর্শদাতা দল বেছে নিন",
    "appointment.specialist": "বিশেষজ্ঞ", "appointment.consultation": "পরামর্শ", "appointment.dateTime": "তারিখ ও সময়",
    "appointment.slot": "খালি সময় বেছে নিন", "appointment.details": "আপনার তথ্য", "appointment.meet": "কীভাবে দেখা হবে?",
    "appointment.person": "সশরীরে", "appointment.virtual": "অনলাইন / ভার্চুয়াল", "appointment.name": "নাম",
    "appointment.phone": "ফোন", "appointment.email": "ইমেল", "appointment.preferred": "পছন্দের ভাষা",
    "appointment.notes": "আমাদের কী প্রস্তুত রাখা উচিত?", "appointment.request": "সাক্ষাতের অনুরোধ করুন",
    "appointment.signIn": "চালিয়ে যেতে সাইন ইন করুন", "appointment.summary": "আপনার অনুরোধ",
    "appointment.received": "অনুরোধ পাওয়া গেছে", "appointment.pendingTitle": "আপনার সাক্ষাৎ অনুমোদনের অপেক্ষায়।",
    "appointment.success": "আপনার সাক্ষাতের অনুরোধ পাঠানো হয়েছে।",
    "auth.eyebrow": "আপনার রয়কো অ্যাকাউন্ট", "auth.title": "মোবাইল নম্বর দিয়ে সাইন ইন",
    "auth.intro": "আমরা আপনার মোবাইলে একটি ৬ সংখ্যার সুরক্ষিত কোড পাঠাব।", "auth.name": "পুরো নাম",
    "auth.phone": "মোবাইল নম্বর", "auth.send": "SMS কোড পাঠান", "auth.sending": "কোড পাঠানো হচ্ছে…",
    "auth.code": "৬ সংখ্যার OTP", "auth.verify": "যাচাই করে চালিয়ে যান", "auth.verifying": "যাচাই হচ্ছে…",
    "auth.change": "নম্বর বদলান", "auth.resend": "আবার কোড পাঠান", "auth.sent": "কোড পাঠানো হয়েছে",
    "auth.secure": "OTP-সুরক্ষিত প্রবেশ", "backToTop": "উপরে ফিরুন",
    "footer.tagline": "চন্দননগরের হৃদয় থেকে, আপনার স্মরণীয় মুহূর্তের গয়না।", "footer.collections": "সংগ্রহ",
    "footer.visit": "শোরুমে আসুন", "footer.orders": "আমার অর্ডার", "footer.admin": "অ্যাডমিন প্রবেশ",
    "footer.secure": "সুরক্ষিত অর্ডার ও বিমাকৃত ডেলিভারি", "jyotishi.certification": "সার্টিফিকেশন",
    "jyotishi.energization": "অভিমন্ত্রিত",
  },
  hi: {
    "nav.new": "नया संग्रह", "nav.gold": "सोना", "nav.diamond": "हीरा", "nav.silver": "चाँदी",
    "nav.platinum": "प्लैटिनम", "nav.jyotishi": "ज्योतिषी ज्वेल्स", "nav.appointments": "अपॉइंटमेंट",
    "nav.rates": "लाइव रेट", "nav.visit": "शोरूम", "nav.story": "हमारी कहानी",
    "header.delivery": "₹50,000 से अधिक के ऑर्डर पर निःशुल्क बीमित डिलीवरी",
    "header.searchPlaceholder": "अंगूठी, हार या सोना खोजें…", "common.search": "खोजें", "common.remove": "हटाएँ",
    "common.all": "सभी", "common.filters": "फ़िल्टर", "common.clearAll": "सभी हटाएँ", "common.explore": "देखें",
    "common.date": "तारीख", "common.time": "समय", "common.status": "स्थिति", "common.pending": "पुष्टि बाकी",
    "cart.selection": "आपका चयन", "cart.title": "शॉपिंग बैग", "cart.emptyTitle": "आपका बैग इंतज़ार कर रहा है",
    "cart.emptyText": "उत्सव, यादगार अवसरों और हर दिन के लिए बने आभूषण खोजें।", "cart.explore": "संग्रह देखें",
    "cart.subtotal": "उप-योग", "cart.taxNote": "कर और डिलीवरी की गणना चेकआउट पर होगी।",
    "cart.checkout": "चेकआउट जारी रखें", "cart.continue": "खरीदारी जारी रखें", "cart.add": "बैग में डालें",
    "cart.out": "स्टॉक समाप्त", "cart.saved": "इस विज़िट के लिए सहेजा गया।",
    "home.kickerOne": "चंदननगर से", "home.kickerTwo": "आज के लिए निर्मित",
    "home.title": "हर अध्याय अपनी चमक का हक़दार है।", "home.bengali": "हर पल के लिए थोड़ी चमक",
    "home.lead": "आधुनिक दृष्टि और पड़ोस के जौहरी की आत्मीयता से चुने सोने, चाँदी, प्लैटिनम और हीरे के आभूषण खोजें।",
    "home.shop": "संग्रह खरीदें", "home.visit": "हमारा शोरूम देखें", "home.featured": "रॉयको चयन",
    "home.pieces": "संभालकर रखने योग्य आभूषण।", "home.viewAll": "सभी आभूषण देखें",
    "shop.eyebrow": "संपूर्ण संग्रह", "shop.title": "वह आभूषण खोजें जो आपका लगे।",
    "shop.intro": "हर रूप और अवसर के लिए सोना, चाँदी, हीरा और प्लैटिनम।",
    "shop.placeholder": "संग्रह खोजें", "shop.category": "श्रेणी", "shop.sort": "क्रम", "shop.designs": "डिज़ाइन",
    "shop.none": "इन फ़िल्टरों से कोई आभूषण नहीं मिला", "shop.noneText": "कोई दूसरी धातु, श्रेणी या खोज आज़माएँ।",
    "shop.showAll": "सभी आभूषण दिखाएँ", "shop.featured": "चुनिंदा पहले", "shop.newest": "नवीनतम",
    "shop.lowHigh": "कीमत: कम से अधिक", "shop.highLow": "कीमत: अधिक से कम",
    "jyotishi.eyebrow": "ज्योतिषीय रत्न · वैदिक आभूषण", "jyotishi.title": "उद्देश्य से चुने ज्योतिषी ज्वेल्स।",
    "jyotishi.intro": "प्रमाणित प्राकृतिक रत्न, वैदिक सेटिंग, वैकल्पिक अभिमंत्रित सेवा और व्यक्तिगत मार्गदर्शन।",
    "jyotishi.consult": "ज्योतिषी से सलाह लें", "jyotishi.gemstone": "रत्न", "jyotishi.sign": "राशि",
    "jyotishi.planet": "ग्रह", "jyotishi.metal": "धातु सेटिंग", "jyotishi.certified": "प्रमाणित अनुपचारित",
    "jyotishi.weight": "वज़न", "jyotishi.origin": "उत्पत्ति", "jyotishi.setting": "सेटिंग",
    "jyotishi.energized": "अभिमंत्रित विकल्प", "jyotishi.recommendation": "व्यक्तिगत सुझाव",
    "jyotishi.unsure": "निश्चित नहीं कि कौन-सा रत्न सही है?", "jyotishi.book": "अपॉइंटमेंट बुक करें",
    "rates.eyebrow": "रॉयको द्वारा प्रतिदिन प्रकाशित", "rates.title": "लाइव कीमती धातु दरें।",
    "rates.intro": "डायनेमिक मूल्य वाले उत्पादों के लिए पारदर्शी संदर्भ दरें।", "rates.updated": "आज अंतिम अपडेट",
    "rates.gold": "सोना", "rates.silver": "चाँदी", "rates.platinum": "प्लैटिनम", "rates.diamond": "हीरा",
    "rates.gram": "प्रति ग्राम", "rates.kg": "प्रति किलो", "rates.carat": "प्रति कैरेट",
    "rates.how": "डायनेमिक मूल्य कैसे काम करता है", "rates.explain": "प्रकाशित धातु दर, सत्यापित वज़न और मेकिंग चार्ज से मूल्य बनता है। अंतिम बिल में लागू 3% GST शामिल होता है।",
    "appointment.private": "निजी परामर्श", "appointment.pageTitle": "अपॉइंटमेंट बुक करें",
    "appointment.pageIntro": "रत्न मार्गदर्शन के लिए ज्योतिषी या डिज़ाइन और खरीद सहायता के लिए रॉयको विशेषज्ञ चुनें।",
    "appointment.who": "आप किससे मिलना चाहेंगे?", "appointment.team": "परामर्श टीम चुनें",
    "appointment.specialist": "विशेषज्ञ", "appointment.consultation": "परामर्श", "appointment.dateTime": "तारीख और समय",
    "appointment.slot": "उपलब्ध समय चुनें", "appointment.details": "आपकी जानकारी", "appointment.meet": "हम कैसे मिलें?",
    "appointment.person": "शोरूम में", "appointment.virtual": "ऑनलाइन / वर्चुअल", "appointment.name": "नाम",
    "appointment.phone": "फ़ोन", "appointment.email": "ईमेल", "appointment.preferred": "पसंदीदा भाषा",
    "appointment.notes": "हमें क्या तैयार रखना चाहिए?", "appointment.request": "अपॉइंटमेंट अनुरोध भेजें",
    "appointment.signIn": "जारी रखने के लिए साइन इन करें", "appointment.summary": "आपका अनुरोध",
    "appointment.received": "अनुरोध प्राप्त हुआ", "appointment.pendingTitle": "आपका अपॉइंटमेंट पुष्टि के लिए लंबित है।",
    "appointment.success": "आपका अपॉइंटमेंट अनुरोध भेजा गया।",
    "auth.eyebrow": "आपका रॉयको खाता", "auth.title": "मोबाइल नंबर से साइन इन करें",
    "auth.intro": "हम आपके मोबाइल पर 6 अंकों का सुरक्षित कोड भेजेंगे।", "auth.name": "पूरा नाम",
    "auth.phone": "मोबाइल नंबर", "auth.send": "SMS कोड भेजें", "auth.sending": "कोड भेजा जा रहा है…",
    "auth.code": "6 अंकों का OTP", "auth.verify": "सत्यापित कर आगे बढ़ें", "auth.verifying": "सत्यापन हो रहा है…",
    "auth.change": "नंबर बदलें", "auth.resend": "कोड फिर भेजें", "auth.sent": "कोड भेजा गया",
    "auth.secure": "OTP-सुरक्षित प्रवेश", "backToTop": "ऊपर जाएँ",
    "footer.tagline": "चंदननगर के हृदय से, आपके यादगार पलों के लिए आभूषण।", "footer.collections": "संग्रह",
    "footer.visit": "शोरूम आएँ", "footer.orders": "मेरे ऑर्डर", "footer.admin": "एडमिन प्रवेश",
    "footer.secure": "सुरक्षित ऑर्डर और बीमित डिलीवरी", "jyotishi.certification": "प्रमाणन",
    "jyotishi.energization": "अभिमंत्रित",
  },
};

function safeLanguage(value) {
  return supportedLanguages.some(({ code }) => code === value) ? value : "en";
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return safeLanguage(localStorage.getItem(LANGUAGE_KEY) || localStorage.getItem("royco-language-v1"));
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    try {
      localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // Storage can be unavailable in privacy-focused browsing modes.
    }
  }, [language]);

  const value = useMemo(() => ({
    language,
    locale: supportedLanguages.find(({ code }) => code === language)?.locale || "en-IN",
    setLanguage: (next) => setLanguageState(safeLanguage(next)),
    toggleLanguage: () => setLanguageState((current) => current === "en" ? "bn" : current === "bn" ? "hi" : "en"),
    t: (key, fallback) => dictionaries[language]?.[key] || fallback || key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
