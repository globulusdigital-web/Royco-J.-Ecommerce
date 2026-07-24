import { ArrowLeft } from "lucide-react";
import { Link, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { LanguageProvider } from "./context/LanguageContext";
import { StoreProvider } from "./context/StoreContext";
import AboutPage from "./pages/AboutPage";
import AccountPage from "./pages/AccountPage";
import { AdminDashboardPage, AdminLoginPage } from "./pages/AdminPages";
import AuthPage from "./pages/AuthPage";
import CheckoutPage from "./pages/CheckoutPage";
import HomePage from "./pages/HomePage";
import ProductPage from "./pages/ProductPage";
import ShopPage from "./pages/ShopPage";
import VisitPage from "./pages/VisitPage";
import JyotishiPage from "./pages/JyotishiPage";

function NotFoundPage() {
  return <div className="not-found container"><span className="eyebrow">404 · Lost sparkle</span><h1>We couldn’t find<br /><em>that page.</em></h1><p>The collection is still right where you left it.</p><Link className="button button-dark" to="/"><ArrowLeft /> Return home</Link></div>;
}

export default function App() {
  return (
    <LanguageProvider>
      <StoreProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/shop/:slug" element={<ProductPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/visit" element={<VisitPage />} />
            <Route path="/jyotishi" element={<JyotishiPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/admin/*" element={<AdminDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Layout>
      </StoreProvider>
    </LanguageProvider>
  );
}
