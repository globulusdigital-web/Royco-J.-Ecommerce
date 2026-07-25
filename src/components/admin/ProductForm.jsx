import { Check, ImagePlus, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { useStore } from "../../context/StoreContext";
import { categories, metals } from "../../data/fallbackProducts";
import { api } from "../../lib/api";
import { normalizeProduct } from "../../lib/format";

const emptyProduct = {
  name: "", bengaliName: "", slug: "", sku: "", metal: "Gold", category: "Rings",
  purity: "22K / 916", weightG: "", price: "", compareAtPrice: "", stock: "",
  pricingMode: "manual", rateKey: "", makingChargeType: "", makingChargeValue: 0,
  caratWeight: 0, diamondTier: "", imageUrl: "/assets/products/gold-ring.webp",
  description: "", featured: false, active: true,
};

export default function ProductForm({ product, onDone }) {
  const { notify, storeSettings } = useStore();
  const [form, setForm] = useState(product ? normalizeProduct(product) : emptyProduct);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const materialTags = [...new Set([
    ...metals.slice(1),
    ...(storeSettings.materials || []).map((item) => item.productMetal),
  ])];

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 3.5 * 1024 * 1024) {
      setError("Image must be smaller than 3.5 MB.");
      return;
    }
    setUploading(true);
    const body = new FormData();
    body.append("image", file);
    try {
      const payload = await api("/api/admin/uploads", { method: "POST", body });
      update("imageUrl", payload.url || payload.imageUrl || payload.image_url);
      notify("Product image uploaded.");
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const body = {
        ...form,
        price: Number(form.price),
        compareAtPrice: Number(form.compareAtPrice || 0),
        weightG: Number(form.weightG || 0),
        stock: Number(form.stock || 0),
      };
      if (product?.id) await api(`/api/admin/products/${product.id}`, { method: "PUT", body });
      else await api("/api/admin/products", { method: "POST", body });
      notify(product ? "Product updated." : "Product created.");
      onDone();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="admin-form" onSubmit={submit}>
      <div className="product-image-editor">
        <img src={form.imageUrl || "/assets/products/gold-ring.webp"} alt="Product preview" />
        <label className="upload-button">
          {uploading ? <LoaderCircle className="spin" /> : <ImagePlus />}
          <span>{uploading ? "Uploading…" : "Upload image"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} />
        </label>
        <small>JPG, PNG or WebP · Maximum 3.5 MB</small>
      </div>
      <div className="form-grid admin-form-grid">
        <label className="span-two"><span>Product name</span><input value={form.name || ""} onChange={(event) => update("name", event.target.value)} required /></label>
        <label className="span-two"><span>Bengali name</span><input className="bengali" value={form.bengaliName || ""} onChange={(event) => update("bengaliName", event.target.value)} /></label>
        <label><span>SKU</span><input value={form.sku || ""} onChange={(event) => update("sku", event.target.value)} required /></label>
        <label><span>Slug</span><input value={form.slug || ""} onChange={(event) => update("slug", event.target.value)} placeholder="auto-from-name" /></label>
        <label><span>Material</span><input list="royco-material-tags" value={form.metal} onChange={(event) => update("metal", event.target.value)} required /><datalist id="royco-material-tags">{materialTags.map((value) => <option value={value} key={value} />)}</datalist></label>
        <label><span>Category</span><select value={form.category} onChange={(event) => update("category", event.target.value)}>{categories.slice(1).map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Purity</span><input value={form.purity || ""} onChange={(event) => update("purity", event.target.value)} required /></label>
        <label><span>Weight (g)</span><input type="number" step="0.01" min="0" value={form.weightG} onChange={(event) => update("weightG", event.target.value)} /></label>
        <label><span>Pricing mode</span><select value={form.pricingMode || "manual"} onChange={(event) => update("pricingMode", event.target.value)}><option value="manual">Manual price</option><option value="dynamic">Dynamic market rate</option></select></label>
        <label><span>Live rate linkage</span><select value={form.rateKey || ""} onChange={(event) => update("rateKey", event.target.value)}><option value="">Infer from material / purity</option>{(storeSettings.materials || []).map((item) => <option value={item.id} key={item.id}>{item.name} · {item.unit}</option>)}</select></label>
        <label><span>Making charge</span><select value={form.makingChargeType || ""} onChange={(event) => update("makingChargeType", event.target.value)}><option value="">Use linked rate setting</option><option value="percent">Percentage</option><option value="flat">Flat amount</option></select></label>
        <label><span>Making value</span><input type="number" min="0" step="0.01" value={form.makingChargeValue || 0} onChange={(event) => update("makingChargeValue", Number(event.target.value))} /></label>
        <label><span>Diamond carat</span><input type="number" min="0" step="0.01" value={form.caratWeight || 0} onChange={(event) => update("caratWeight", Number(event.target.value))} /></label>
        <label><span>Diamond tier</span><select value={form.diamondTier || ""} onChange={(event) => update("diamondTier", event.target.value)}><option value="">Not applicable</option><option>IF</option><option>VVS</option><option>VS</option><option>SI</option></select></label>
        <label><span>Price (₹)</span><input type="number" min="0" value={form.price} onChange={(event) => update("price", event.target.value)} required /></label>
        <label><span>Compare price (₹)</span><input type="number" min="0" value={form.compareAtPrice} onChange={(event) => update("compareAtPrice", event.target.value)} /></label>
        <label><span>Stock</span><input type="number" min="0" value={form.stock} onChange={(event) => update("stock", event.target.value)} required /></label>
        <label className="toggle-label"><input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => update("featured", event.target.checked)} /><span>Feature on home page</span></label>
        <label className="span-two"><span>Description</span><textarea value={form.description || ""} onChange={(event) => update("description", event.target.value)} rows="4" required /></label>
      </div>
      {error && <div className="admin-error"><span>{error}</span></div>}
      <div className="form-actions">
        <button className="button button-outline" type="button" onClick={onDone}>Cancel</button>
        <button className="button button-dark" type="submit" disabled={loading}>{loading ? "Saving…" : product ? "Save changes" : "Create product"}<Check /></button>
      </div>
    </form>
  );
}
