import { ArrowUpRight, Heart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { formatMoney } from "../lib/format";

export default function ProductCard({ product, compact = false }) {
  const { addToCart, notify } = useStore();
  const saving = product.compareAtPrice > product.price
    ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
    : 0;

  return (
    <article className={`product-card ${compact ? "product-card-compact" : ""}`}>
      <div className="product-media">
        <Link to={`/shop/${product.slug}`} aria-label={`View ${product.name}`}>
          <img src={product.imageUrl} alt={product.name} loading="lazy" />
        </Link>
        <div className="product-badges">
          {saving > 0 && <span className="badge badge-sale">Save {saving}%</span>}
          {product.stock > 0 && product.stock < 5 && <span className="badge">Only {product.stock} left</span>}
        </div>
        <button className="product-wish" type="button" aria-label={`Save ${product.name}`} onClick={() => notify("Saved for this visit.", "info")}>
          <Heart size={17} />
        </button>
        <button className="quick-add" type="button" onClick={() => addToCart(product)} disabled={product.stock < 1}>
          <Plus size={17} /> {product.stock > 0 ? "Add to bag" : "Out of stock"}
        </button>
      </div>
      <div className="product-info">
        <div className="product-meta"><span>{product.metal}</span><span>{product.category}</span></div>
        <Link className="product-title" to={`/shop/${product.slug}`}>
          <span>{product.name}</span><ArrowUpRight size={16} />
        </Link>
        {product.bengaliName && <p className="bengali product-bengali">{product.bengaliName}</p>}
        <div className="product-price">
          <strong>{formatMoney(product.price)}</strong>
          {product.compareAtPrice > product.price && <del>{formatMoney(product.compareAtPrice)}</del>}
        </div>
      </div>
    </article>
  );
}
