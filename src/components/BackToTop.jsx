import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguage } from "../context/LanguageContext";

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 520);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return (
    <button
      className={`back-to-top ${visible ? "visible" : ""}`}
      type="button"
      aria-label={t("backToTop", "Back to top")}
      title={t("backToTop", "Back to top")}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <ArrowUp />
    </button>
  );
}
