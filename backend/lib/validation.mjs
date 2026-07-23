export const MATERIALS = Object.freeze(["Gold", "Silver", "Platinum", "Diamond"]);
export const CATEGORIES = Object.freeze([
  "Rings",
  "Earrings",
  "Necklaces",
  "Bangles",
  "Chains",
  "Pendants",
  "Bracelets",
  "Mangalsutra",
]);

export function text(value, { field = "value", min = 0, max = 255, required = false } = {}) {
  const result = typeof value === "string" ? value.trim() : "";
  if (required && result.length < Math.max(1, min)) return { error: `${field} is required` };
  if (result && result.length < min) return { error: `${field} must be at least ${min} characters` };
  if (result.length > max) return { error: `${field} must be at most ${max} characters` };
  return { value: result };
}

export function validEmail(value) {
  const email = String(value ?? "").trim();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+$/.test(email);
}

export function passwordErrors(value) {
  const password = String(value ?? "");
  const errors = [];
  if (password.length < 8) errors.push("Password must be at least 8 characters");
  if (password.length > 128) errors.push("Password must be at most 128 characters");
  if (!/[a-z]/.test(password)) errors.push("Password must include a lowercase letter");
  if (!/[A-Z]/.test(password)) errors.push("Password must include an uppercase letter");
  if (!/\d/.test(password)) errors.push("Password must include a number");
  return errors;
}

export function integer(value, { field = "value", min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER } = {}) {
  const result = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    return { error: `${field} must be an integer between ${min} and ${max}` };
  }
  return { value: result };
}

export function positiveMoneyPaise(value, fallbackRupees, field = "price") {
  if (value !== undefined && value !== null && value !== "") {
    return integer(value, { field: `${field}Paise`, min: 0, max: 1_000_000_000_00 });
  }
  const rupees = Number(fallbackRupees);
  const paise = Math.round(rupees * 100);
  if (!Number.isFinite(rupees) || rupees < 0 || !Number.isSafeInteger(paise)) {
    return { error: `${field} must be a non-negative amount` };
  }
  return { value: paise };
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function enumValue(value, choices) {
  const match = choices.find((choice) => choice.toLowerCase() === String(value ?? "").trim().toLowerCase());
  return match ?? null;
}

export function booleanValue(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "1" || value === 1) return true;
  if (value === "false" || value === "0" || value === 0) return false;
  return fallback;
}

export function validateImageSignature(bytes, claimedMime) {
  const mime = String(claimedMime ?? "").toLowerCase();
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes ?? []);
  const signatures = {
    "image/jpeg": b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
    "image/png": b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((x, i) => b[i] === x),
    "image/gif": b.length >= 6 && String.fromCharCode(...b.slice(0, 6)).match(/^GIF8[79]a$/) !== null,
    "image/webp":
      b.length >= 12 &&
      String.fromCharCode(...b.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...b.slice(8, 12)) === "WEBP",
    "image/avif":
      b.length >= 12 &&
      String.fromCharCode(...b.slice(4, 8)) === "ftyp" &&
      ["avif", "avis"].includes(String.fromCharCode(...b.slice(8, 12))),
  };
  return Object.hasOwn(signatures, mime) && signatures[mime];
}

