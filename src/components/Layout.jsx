import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Camera as Instagram, ChevronRight, Languages, MapPin, Menu, MessageCircle, Phone, Search, ShieldCheck, ShoppingBag as Bag, User, X } from "lucide-react";
import BackToTop from "./BackToTop";
import SeasonalPetals from "./SeasonalPetals";
import { supportedLanguages, useLanguage } from "../context/LanguageContext";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

const navItems = [
  ["nav.new", "New arrivals", "/shop?sort=newest"],
  ["nav.gold", "Gold", "/shop?metal=Gold"],
  ["nav.diamond", "Diamond", "/shop?metal=Diamond"],
  ["nav.silver", "Silver", "/shop?metal=Silver"],
  ["nav.platinum", "Platinum", "/shop?metal=Platinum"],
  ["nav.jyotishi", "Jyotishi", "/jyotishi"],
  ["nav.appointments", "Appointments", "/appointments"],
  ["nav.rates", "Live rates", "/live-rates"],
  ["nav.visit", "Visit us", "/visit"],
];

function Brand({ inverted = false }) {
  return (
    <Link className={`brand ${inverted ? "brand-inverted" : ""}`} to="/" aria-label="Royco Jewellers home">
      <span className="brand-gem" aria-hidden="true"><i /><b /></span>
      <span className="brand-copy">
        <strong>ROYCO</strong>
        <small>JEWELLERS · রায়কো জুয়েলার্স</small>
      </span>
    </Link>
  );
}

function CartDrawer() {
  const { cart, cartCount, cartSubtotal, cartOpen, setCartOpen, updateCart, removeFromCart } = useStore();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.toggle("no-scroll", cartOpen);
    return () => document.body.classList.remove("no-scroll");
  }, [cartOpen]);

  if (!cartOpen) return null;
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setCartOpen(false)}>
      <aside className="cart-drawer" role="dialog" aria-modal="true" aria-labelledby="bag-title">
        <header className="drawer-header">
          <div><span className="eyebrow">{t("cart.selection", "Your selection")}</span><h2 id="bag-title">{t("cart.title", "Shopping bag")} <em>{cartCount}</em></h2></div>
          <button className="icon-button" onClick={() => setCartOpen(false)} type="button" aria-label="Close bag"><X size={20} /></button>
        </header>
        <div className="drawer-content">
          {cart.length === 0 ? (
            <div className="empty-state">
              <span className="empty-gem"><Bag size={30} /></span>
              <h3>{t("cart.emptyTitle", "Your bag is waiting")}</h3>
              <p>{t("cart.emptyText", "Discover pieces made for celebrations, milestones and beautiful ordinary days.")}</p>
              <button className="button button-dark" type="button" onClick={() => { setCartOpen(false); navigate("/shop"); }}>{t("cart.explore", "Explore the collection")}</button>
            </div>
          ) : cart.map(({ product, quantity }) => (
            <div className="cart-item" key={product.id}>
              <img src={product.imageUrl} alt="" />
              <div className="cart-item-copy">
                <div><span className="micro">{product.metal} · {product.category}</span><Link to={`/shop/${product.slug}`} onClick={() => setCartOpen(false)}>{product.name}</Link></div>
                <strong>{formatMoney(product.price * quantity)}</strong>
                <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
                  <button type="button" onClick={() => updateCart(product.id, quantity - 1)} aria-label="Decrease quantity">−</button>
                  <span>{quantity}</span>
                  <button type="button" onClick={() => updateCart(product.id, quantity + 1)} aria-label="Increase quantity">+</button>
                </div>
              </div>
              <button className="cart-remove" type="button" onClick={() => removeFromCart(product.id)}>{t("common.remove", "Remove")}</button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <footer className="drawer-footer">
            <div className="drawer-total"><span>{t("cart.subtotal", "Subtotal")}</span><strong>{formatMoney(cartSubtotal)}</strong></div>
            <p>{t("cart.taxNote", "Taxes and delivery are calculated at checkout.")}</p>
            <button className="button button-gold button-full" type="button" onClick={() => { setCartOpen(false); navigate("/checkout"); }}>{t("cart.checkout", "Continue to checkout")} <ArrowRight size={17} /></button>
            <button className="text-button" type="button" onClick={() => { setCartOpen(false); navigate("/shop"); }}>{t("cart.continue", "Continue shopping")}</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

export default function Layout({ children }) {
  const { cartCount, setCartOpen, user, toast, setToast, storeSettings } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const isAdmin = location.pathname.startsWith("/admin");

  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.pathname, location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    if (search.trim()) navigate(`/shop?q=${encodeURIComponent(search.trim())}`);
  };

  if (isAdmin) return <>{children}{toast && <div className={`toast toast-${toast.tone}`} role="status" onClick={() => setToast(null)}>{toast.message}</div>}</>;

  return (
    <div className="site-shell">
      <SeasonalPetals />
      <div className="announcement live-rate-banner">
        <Link to="/live-rates"><strong>LIVE</strong> 22K Gold ₹{Number(storeSettings.rates.gold22k).toLocaleString("en-IN")}/g · Silver ₹{Number(storeSettings.rates.silverGram).toLocaleString("en-IN")}/g <ChevronRight size={14} /></Link>
        <span>{t("header.delivery", "Complimentary insured delivery above ₹50,000")}</span>
      </div>
      <header className="site-header">
        <div className="header-primary container-wide">
          <button className="icon-button mobile-menu-button" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <Brand />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map(([key, label, href]) => <NavLink key={key} to={href}>{t(key, label)}</NavLink>)}
          </nav>
          <div className="header-actions">
            <div className="header-socials"><a href={storeSettings.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><b>f</b></a><a href={storeSettings.social.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp Business"><MessageCircle /></a><a href={storeSettings.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram /></a><a href={storeSettings.social.x} target="_blank" rel="noreferrer" aria-label="X">𝕏</a></div>
            <label className="language-selector" aria-label="Select language">
              <Languages />
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                {supportedLanguages.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
              </select>
            </label>
            <button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen((value) => !value)}><Search size={20} /></button>
            <Link className="icon-button" aria-label={user ? "Your account" : "Sign in"} to={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}><User size={20} /></Link>
            <button className="icon-button bag-button" type="button" aria-label={`Shopping bag with ${cartCount} items`} onClick={() => setCartOpen(true)}><Bag size={20} /><span>{cartCount}</span></button>
          </div>
        </div>
        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={20} />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("header.searchPlaceholder", "Search rings, necklaces, gold…")} aria-label={t("common.search", "Search products")} />
            <button className="text-button" type="submit">{t("common.search", "Search")}</button>
          </form>
        )}
      </header>

      {menuOpen && (
        <div className="mobile-menu-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
          <aside className="mobile-menu" aria-label="Mobile navigation">
            <div className="mobile-menu-header"><Brand /><button className="icon-button" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button></div>
            <label className="mobile-language-selector">
              <Languages />
              <select value={language} onChange={(event) => setLanguage(event.target.value)} aria-label="Select language">
                {supportedLanguages.map((option) => <option value={option.code} key={option.code}>{option.label}</option>)}
              </select>
            </label>
            <nav>
              {navItems.map(([key, label, href], index) => <Link key={key} to={href}><span>0{index + 1}</span>{t(key, label)}<ArrowRight /></Link>)}
              <Link to="/about"><span>10</span>{t("nav.story", "Our story")}<ArrowRight /></Link>
            </nav>
            <div className="mobile-menu-contact"><a href="tel:+913326835943"><Phone size={17} /> 033 2683 5943</a><p>Open daily · 10:30 am – 9:00 pm</p></div>
          </aside>
        </div>
      )}

      <main>{children}</main>

      <footer className="site-footer">
        <div className="footer-top container-wide">
          <div className="footer-brand"><Brand inverted /><p>Jewellery for the moments you keep, from the heart of Chandannagar.</p><div className="footer-rating"><strong>4.2</strong><span>★★★★★<small>89 Google reviews</small></span></div></div>
          <div className="footer-column"><h3>Collections</h3><Link to="/shop?metal=Gold">Gold</Link><Link to="/shop?metal=Diamond">Diamond</Link><Link to="/shop?metal=Silver">Silver</Link><Link to="/shop?metal=Platinum">Platinum</Link></div>
          <div className="footer-column"><h3>Royco</h3><Link to="/about">Our story</Link><Link to="/visit">Visit the showroom</Link><Link to="/appointments">Book an appointment</Link><Link to="/live-rates">Live rates</Link><Link to="/account">My orders</Link><Link to="/admin/login">Admin access</Link></div>
          <div className="footer-column footer-contact"><h3>Chandannagar</h3><a href="https://maps.google.com/?cid=12735356697874811323" target="_blank" rel="noreferrer"><MapPin size={16} /> Bagbazar Plaza, Rash Behari Ave, West Bengal 712136</a><a href="tel:+913326835943"><Phone size={16} /> 033 2683 5943</a><span><ShieldCheck size={16} /> Secure ordering & insured delivery</span></div>
        </div>
        <div className="footer-bottom container-wide"><span>© {new Date().getFullYear()} Royco Jewellers. All rights reserved.</span><span className="bengali">বিশ্বাসে, ঐতিহ্যে, আপনাদের সঙ্গে</span><div className="footer-socials"><a href={storeSettings.social.x} target="_blank" rel="noreferrer" aria-label="X">𝕏</a><a href={storeSettings.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"><b>f</b></a><a href={storeSettings.social.whatsapp} target="_blank" rel="noreferrer" aria-label="WhatsApp Business"><MessageCircle size={18} /></a><a href={storeSettings.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a></div></div>
      </footer>
      <CartDrawer />
      <BackToTop />
      {toast && <div className={`toast toast-${toast.tone}`} role="status" onClick={() => setToast(null)}>{toast.message}</div>}
    </div>
  );
}
