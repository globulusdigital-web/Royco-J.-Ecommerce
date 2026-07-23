import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Camera as Instagram, ChevronRight, MapPin, Menu, Phone, Search, ShieldCheck, ShoppingBag as Bag, User, X } from "lucide-react";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

const navItems = [
  ["New arrivals", "/shop?sort=newest"],
  ["Gold", "/shop?metal=Gold"],
  ["Diamond", "/shop?metal=Diamond"],
  ["Silver", "/shop?metal=Silver"],
  ["Platinum", "/shop?metal=Platinum"],
  ["Visit us", "/visit"],
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
          <div><span className="eyebrow">Your selection</span><h2 id="bag-title">Shopping bag <em>{cartCount}</em></h2></div>
          <button className="icon-button" onClick={() => setCartOpen(false)} type="button" aria-label="Close bag"><X size={20} /></button>
        </header>
        <div className="drawer-content">
          {cart.length === 0 ? (
            <div className="empty-state">
              <span className="empty-gem"><Bag size={30} /></span>
              <h3>Your bag is waiting</h3>
              <p>Discover pieces made for celebrations, milestones and beautiful ordinary days.</p>
              <button className="button button-dark" type="button" onClick={() => { setCartOpen(false); navigate("/shop"); }}>Explore the collection</button>
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
              <button className="cart-remove" type="button" onClick={() => removeFromCart(product.id)}>Remove</button>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <footer className="drawer-footer">
            <div className="drawer-total"><span>Subtotal</span><strong>{formatMoney(cartSubtotal)}</strong></div>
            <p>Taxes and delivery are calculated at checkout.</p>
            <button className="button button-gold button-full" type="button" onClick={() => { setCartOpen(false); navigate("/checkout"); }}>Continue to checkout <ArrowRight size={17} /></button>
            <button className="text-button" type="button" onClick={() => { setCartOpen(false); navigate("/shop"); }}>Continue shopping</button>
          </footer>
        )}
      </aside>
    </div>
  );
}

export default function Layout({ children }) {
  const { cartCount, setCartOpen, user, toast, setToast } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
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
      <div className="announcement">
        <span>Complimentary insured delivery on orders above ₹50,000</span>
        <Link to="/visit">Visit Chandannagar <ChevronRight size={14} /></Link>
      </div>
      <header className="site-header">
        <div className="header-primary container-wide">
          <button className="icon-button mobile-menu-button" type="button" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <Brand />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map(([label, href]) => <NavLink key={label} to={href}>{label}</NavLink>)}
          </nav>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen((value) => !value)}><Search size={20} /></button>
            <Link className="icon-button" aria-label={user ? "Your account" : "Sign in"} to={user ? (user.role === "admin" ? "/admin" : "/account") : "/login"}><User size={20} /></Link>
            <button className="icon-button bag-button" type="button" aria-label={`Shopping bag with ${cartCount} items`} onClick={() => setCartOpen(true)}><Bag size={20} /><span>{cartCount}</span></button>
          </div>
        </div>
        {searchOpen && (
          <form className="header-search" onSubmit={submitSearch}>
            <Search size={20} />
            <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search rings, necklaces, gold…" aria-label="Search products" />
            <button className="text-button" type="submit">Search</button>
          </form>
        )}
      </header>

      {menuOpen && (
        <div className="mobile-menu-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMenuOpen(false)}>
          <aside className="mobile-menu" aria-label="Mobile navigation">
            <div className="mobile-menu-header"><Brand /><button className="icon-button" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X /></button></div>
            <nav>
              {navItems.map(([label, href], index) => <Link key={label} to={href}><span>0{index + 1}</span>{label}<ArrowRight /></Link>)}
              <Link to="/about"><span>07</span>Our story<ArrowRight /></Link>
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
          <div className="footer-column"><h3>Royco</h3><Link to="/about">Our story</Link><Link to="/visit">Visit the showroom</Link><Link to="/account">My orders</Link><Link to="/admin/login">Admin access</Link></div>
          <div className="footer-column footer-contact"><h3>Chandannagar</h3><a href="https://maps.google.com/?cid=12735356697874811323" target="_blank" rel="noreferrer"><MapPin size={16} /> Bagbazar Plaza, Rash Behari Ave, West Bengal 712136</a><a href="tel:+913326835943"><Phone size={16} /> 033 2683 5943</a><span><ShieldCheck size={16} /> Secure ordering & insured delivery</span></div>
        </div>
        <div className="footer-bottom container-wide"><span>© {new Date().getFullYear()} Royco Jewellers. All rights reserved.</span><span className="bengali">বিশ্বাসে, ঐতিহ্যে, আপনাদের সঙ্গে</span><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a></div>
      </footer>
      <CartDrawer />
      {toast && <div className={`toast toast-${toast.tone}`} role="status" onClick={() => setToast(null)}>{toast.message}</div>}
    </div>
  );
}
