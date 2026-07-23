import { ArrowLeft, BadgeCheck, ChevronRight, Heart, Minus, PackageCheck, Plus, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

export default function ProductPage() {
  const { slug } = useParams();
  const { products, addToCart, notify } = useStore();
  const product = products.find((item) => item.slug === slug);
  const [quantity, setQuantity] = useState(1);
  const related = useMemo(() => product ? products.filter((item) => item.id !== product.id && (item.metal === product.metal || item.category === product.category)).slice(0, 4) : [], [product, products]);

  if (!product) return <div className="not-found container"><span className="eyebrow">Not found</span><h1>This piece has moved from the display.</h1><Link className="button button-dark" to="/shop"><ArrowLeft /> Return to the collection</Link></div>;

  return (
    <div className="product-page">
      <div className="breadcrumbs container-wide"><Link to="/shop">Shop</Link><ChevronRight /><Link to={`/shop?metal=${product.metal}`}>{product.metal}</Link><ChevronRight /><span>{product.name}</span></div>
      <section className="product-detail container-wide">
        <div className="product-gallery">
          <div className="product-main-image"><img src={product.imageUrl} alt={product.name} /><span className="image-sparkle image-sparkle-one" /><span className="image-sparkle image-sparkle-two" /></div>
          <div className="product-thumbs"><button className="active" type="button"><img src={product.imageUrl} alt="Front view" /></button><button type="button"><img src="/assets/products/jewellery-editorial.webp" alt="Styled view" /></button></div>
        </div>
        <div className="product-copy">
          <div className="product-detail-meta"><span>{product.metal}</span><i /><span>{product.category}</span><i /><span>{product.sku}</span></div>
          <h1>{product.name}</h1>
          {product.bengaliName && <p className="bengali product-detail-bengali">{product.bengaliName}</p>}
          <div className="product-detail-price"><strong>{formatMoney(product.price)}</strong>{product.compareAtPrice > product.price && <><del>{formatMoney(product.compareAtPrice)}</del><span>You save {formatMoney(product.compareAtPrice - product.price)}</span></>}</div>
          <p className="price-note">Inclusive of all taxes. Final price follows verified weight and specifications.</p>
          <div className="product-specs"><div><span>Purity</span><strong>{product.purity}</strong></div><div><span>Approx. weight</span><strong>{product.weightG ? `${product.weightG} g` : "Made to order"}</strong></div><div><span>Availability</span><strong className={product.stock > 0 ? "in-stock" : "out-stock"}>{product.stock > 0 ? `${product.stock} ready` : "Made to order"}</strong></div></div>
          <p className="product-description">{product.description}</p>
          <div className="purchase-row"><div className="quantity-control large"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} aria-label="Decrease quantity"><Minus /></button><span>{quantity}</span><button type="button" onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))} aria-label="Increase quantity"><Plus /></button></div><button className="button button-gold purchase-button" type="button" disabled={product.stock < 1} onClick={() => addToCart(product, quantity)}>{product.stock > 0 ? "Add to bag" : "Enquire in store"}<Sparkles size={17} /></button><button className="icon-button product-detail-wish" type="button" aria-label="Save item" onClick={() => notify("Saved for this visit.", "info")}><Heart /></button></div>
          <div className="product-assurances"><div><BadgeCheck /><span><strong>Assured details</strong><small>Purity and stone specifications on your invoice</small></span></div><div><PackageCheck /><span><strong>Insured delivery</strong><small>Complimentary above ₹50,000</small></span></div><div><RotateCcw /><span><strong>Easy support</strong><small>Call the showroom for exchange guidance</small></span></div><div><ShieldCheck /><span><strong>Secure ordering</strong><small>Protected account and checkout</small></span></div></div>
          <div className="product-help"><span>Need help choosing?</span><a href="tel:+913326835943">Speak to a Royco specialist</a></div>
        </div>
      </section>
      <section className="section related-section container-wide"><div className="section-heading section-heading-row"><div><span className="eyebrow">You may also love</span><h2>Continue <em>discovering.</em></h2></div><Link className="line-link" to={`/shop?metal=${product.metal}`}>See all {product.metal} <ChevronRight /></Link></div><div className="product-grid related-grid">{related.map((item) => <ProductCard product={item} key={item.id} compact />)}</div></section>
    </div>
  );
}
