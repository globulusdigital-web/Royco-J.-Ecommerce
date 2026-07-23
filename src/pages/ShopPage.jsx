import { Check, ChevronDown, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import { useStore } from "../context/StoreContext";
import { categories, metals } from "../data/fallbackProducts";

export default function ShopPage() {
  const { products, catalogLoading, usingPreviewData } = useStore();
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") || "");
  const metal = params.get("metal") || "All";
  const category = params.get("category") || "All";
  const sort = params.get("sort") || "featured";

  useEffect(() => setQuery(params.get("q") || ""), [params]);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (!value || value === "All" || value === "featured") next.delete(key);
    else next.set(key, value);
    setParams(next);
  };

  const filtered = useMemo(() => {
    const search = (params.get("q") || "").toLowerCase();
    const result = products.filter((product) => {
      const matchesSearch = !search || [product.name, product.bengaliName, product.metal, product.category, product.sku].join(" ").toLowerCase().includes(search);
      return matchesSearch && (metal === "All" || product.metal === metal) && (category === "All" || product.category === category);
    });
    return [...result].sort((a, b) => {
      if (sort === "price-asc") return a.price - b.price;
      if (sort === "price-desc") return b.price - a.price;
      if (sort === "newest") return String(b.id).localeCompare(String(a.id));
      return Number(b.featured) - Number(a.featured);
    });
  }, [products, params, metal, category, sort]);

  const submitSearch = (event) => {
    event.preventDefault();
    update("q", query.trim());
  };

  const clear = () => {
    setQuery("");
    setParams({});
  };

  return (
    <div className="shop-page">
      <header className="page-hero shop-hero">
        <div className="container-wide"><span className="eyebrow eyebrow-light">The complete collection</span><h1>Find the piece that<br /><em>feels like yours.</em></h1><p>Gold, silver, diamond and platinum—curated across every form and occasion.</p></div>
        <span className="shop-hero-gem"><Sparkles /></span>
      </header>
      <div className="shop-toolbar container-wide">
        <form className="shop-search" onSubmit={submitSearch}><Search size={19} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the collection" aria-label="Search the collection" />{query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(""); update("q", ""); }}><X size={16} /></button>}</form>
        <div className="metal-tabs" role="group" aria-label="Filter by metal">{metals.map((value) => <button className={metal === value ? "active" : ""} type="button" key={value} onClick={() => update("metal", value)}>{value}{metal === value && <Check size={14} />}</button>)}</div>
        <button className="filter-toggle" type="button" onClick={() => setFiltersOpen((value) => !value)}><SlidersHorizontal size={18} /> Filters</button>
      </div>
      <div className={`filter-panel ${filtersOpen ? "open" : ""}`}>
        <div className="container-wide filter-panel-inner">
          <div><label htmlFor="category">Category</label><div className="select-wrap"><select id="category" value={category} onChange={(event) => update("category", event.target.value)}>{categories.map((value) => <option key={value}>{value}</option>)}</select><ChevronDown /></div></div>
          <div><label htmlFor="sort">Sort by</label><div className="select-wrap"><select id="sort" value={sort} onChange={(event) => update("sort", event.target.value)}><option value="featured">Featured first</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><ChevronDown /></div></div>
          <div className="filter-summary"><span>{filtered.length} pieces</span>{(params.toString()) && <button className="text-button" type="button" onClick={clear}>Clear all</button>}</div>
        </div>
      </div>
      <section className="shop-results container-wide">
        <div className="results-heading"><p><strong>{filtered.length}</strong> designs</p>{usingPreviewData && <span className="preview-note">Preview catalogue · live inventory connects on Netlify</span>}<div className="mobile-sort select-wrap"><select value={sort} onChange={(event) => update("sort", event.target.value)} aria-label="Sort products"><option value="featured">Featured</option><option value="newest">Newest</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option></select><ChevronDown /></div></div>
        {catalogLoading ? <div className="product-grid loading-grid">{Array.from({ length: 8 }).map((_, index) => <div className="product-skeleton" key={index}><i /><span /><span /></div>)}</div> : filtered.length ? <div className="product-grid">{filtered.map((product) => <ProductCard product={product} key={product.id} />)}</div> : <div className="empty-state large-empty"><Search /><h2>No pieces match those filters</h2><p>Try a different metal, category or search.</p><button className="button button-dark" type="button" onClick={clear}>Show all jewellery</button></div>}
      </section>
    </div>
  );
}
