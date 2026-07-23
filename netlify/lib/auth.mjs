import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
  scrypt as nodeScrypt,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export const SESSION_COOKIE = "royco_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;
const SCRYPT_KEY_BYTES = 64;
const SCRYPT_OPTIONS = Object.freeze({ N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });

function base64url(input) {
  return Buffer.from(input).toString("base64url");
}

function safeEqualText(left, right) {
  const a = createHash("sha256").update(String(left)).digest();
  const b = createHash("sha256").update(String(right)).digest();
  return timingSafeEqual(a, b);
}

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(String(password), salt, SCRYPT_KEY_BYTES, SCRYPT_OPTIONS);
  return [
    "scrypt",
    SCRYPT_OPTIONS.N,
    SCRYPT_OPTIONS.r,
    SCRYPT_OPTIONS.p,
    base64url(salt),
    base64url(key),
  ].join("$");
}

export async function verifyPassword(password, encoded) {
  try {
    const [algorithm, n, r, p, saltText, expectedText] = String(encoded ?? "").split("$");
    if (algorithm !== "scrypt" || !saltText || !expectedText) return false;
    const options = {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    };
    if (options.N !== SCRYPT_OPTIONS.N || options.r !== SCRYPT_OPTIONS.r || options.p !== SCRYPT_OPTIONS.p) {
      return false;
    }
    const expected = Buffer.from(expectedText, "base64url");
    if (expected.length !== SCRYPT_KEY_BYTES) return false;
    const actual = await scrypt(String(password), Buffer.from(saltText, "base64url"), expected.length, options);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

export function signSession(payload, secret) {
  if (typeof secret !== "string" || secret.length < 32) {
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  }
  const encoded = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySession(token, secret, nowSeconds = Math.floor(Date.now() / 1000)) {
  try {
    if (typeof secret !== "string" || secret.length < 32 || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, suppliedSignature] = parts;
    const expectedSignature = createHmac("sha256", secret).update(encoded).digest("base64url");
    if (!safeEqualText(suppliedSignature, expectedSignature)) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      payload?.v !== 1 ||
      typeof payload.sid !== "string" ||
      typeof payload.sub !== "string" ||
      !["customer", "admin"].includes(payload.role) ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.iat > nowSeconds + 60 ||
      payload.exp <= nowSeconds
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function parseCookies(cookieHeader) {
  const cookies = {};
  for (const piece of String(cookieHeader ?? "").split(";")) {
    const separator = piece.indexOf("=");
    if (separator < 1) continue;
    const name = piece.slice(0, separator).trim();
    const value = piece.slice(separator + 1).trim();
    try {
      cookies[name] = decodeURIComponent(value);
    } catch {
      cookies[name] = value;
    }
  }
  return cookies;
}

export function sessionCookie(token, maxAge = SESSION_TTL_SECONDS, { secure = true } = {}) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookie({ secure = true } = {}) {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly;${secure ? " Secure;" : ""} SameSite=Lax; Max-Age=0`;
}
