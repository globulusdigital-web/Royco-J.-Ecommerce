import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";

function materialId(name, existing) {
  const base = String(name || "custom-material")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "custom-material";
  let candidate = base;
  let suffix = 2;
  while (existing.some((material) => material.id === candidate)) candidate = `${base}-${suffix++}`;
  return candidate;
}

export default function DynamicMaterialsManager({ materials = [], onChange }) {
  const update = (index, key, value) => {
    onChange(materials.map((material, position) => position === index ? { ...material, [key]: value } : material));
  };
  const updateCharge = (index, key, value) => {
    onChange(materials.map((material, position) => position === index
      ? { ...material, makingCharge: { ...material.makingCharge, [key]: value } }
      : material));
  };
  const add = () => {
    const name = "New material";
    onChange([...materials, {
      id: materialId(name, materials),
      name,
      productMetal: name,
      rate: 0,
      currency: "INR",
      unit: "gram",
      makingCharge: { type: "percent", value: 0 },
      visible: true,
      system: false,
    }]);
  };
  const remove = (index) => onChange(materials.filter((_, position) => position !== index));

  return (
    <section className="admin-card dynamic-materials-card">
      <div className="card-heading">
        <div><span className="eyebrow">Formula pricing</span><h3>Dynamic live materials</h3></div>
        <button className="button button-outline" type="button" onClick={add}><Plus /> Add material</button>
      </div>
      <p className="admin-card-intro">Publish any metal, alloy, gemstone or diamond tier. Dynamic products use weight × rate + making charge; GST is added at checkout.</p>
      <div className="dynamic-material-list">
        {materials.map((material, index) => (
          <article className={material.visible === false ? "material-rate-row material-rate-hidden" : "material-rate-row"} key={`${material.id}-${index}`}>
            <label><span>Display name</span><input value={material.name} onChange={(event) => update(index, "name", event.target.value)} /></label>
            <label><span>Product tag</span><input value={material.productMetal} onChange={(event) => update(index, "productMetal", event.target.value)} /></label>
            <label><span>Rate</span><input type="number" min="0" step="0.01" value={material.rate} onChange={(event) => update(index, "rate", Number(event.target.value))} /></label>
            <label><span>Currency</span><input maxLength="3" value={material.currency || "INR"} onChange={(event) => update(index, "currency", event.target.value.toUpperCase())} /></label>
            <label><span>Unit</span><select value={material.unit} onChange={(event) => update(index, "unit", event.target.value)}><option value="gram">gram</option><option value="kg">kg</option><option value="carat">carat</option><option value="piece">piece</option><option value="tola">tola</option></select></label>
            <label><span>Making charge</span><select value={material.makingCharge?.type || "percent"} onChange={(event) => updateCharge(index, "type", event.target.value)}><option value="percent">Percentage</option><option value="flat">Flat amount</option></select></label>
            <label><span>Making value</span><input type="number" min="0" step="0.01" value={material.makingCharge?.value || 0} onChange={(event) => updateCharge(index, "value", Number(event.target.value))} /></label>
            <div className="material-rate-actions">
              <button type="button" aria-label={material.visible === false ? `Show ${material.name}` : `Hide ${material.name}`} onClick={() => update(index, "visible", material.visible === false)}>
                {material.visible === false ? <Eye /> : <EyeOff />}
              </button>
              <button className="danger" type="button" aria-label={`Delete ${material.name}`} onClick={() => remove(index)}><Trash2 /></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
