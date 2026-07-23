export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const securityHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...securityHeaders, ...headers } });
}

export function ok(data, status = 200, headers = {}) {
  return json({ data }, status, headers);
}

export function fail(error) {
  const status = Number(error?.status) || 500;
  const code = error?.code || "internal_error";
  const message = status >= 500 && code === "internal_error" ? "An unexpected server error occurred" : error?.message;
  return json({ error: { code, message, ...(error?.details ? { details: error.details } : {}) } }, status);
}

export async function readJson(request, maxBytes = 256 * 1024) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Content-Type must be application/json");
  }
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  }
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Request body is too large");
  }
  try {
    const body = JSON.parse(raw || "{}");
    if (!body || Array.isArray(body) || typeof body !== "object") throw new Error("object required");
    return body;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must contain valid JSON");
  }
}

export function assertSameOrigin(request) {
  const url = new URL(request.url);
  const suppliedOrigin = request.headers.get("origin");
  const configuredOrigin = process.env.PUBLIC_SITE_URL ? new URL(process.env.PUBLIC_SITE_URL).origin : null;
  const permitted = new Set([url.origin, configuredOrigin].filter(Boolean));
  if (suppliedOrigin && permitted.has(suppliedOrigin)) return;
  const fetchSite = request.headers.get("sec-fetch-site");
  if (!suppliedOrigin && fetchSite === "same-origin") return;
  throw new ApiError(403, "origin_rejected", "This request must come from the Royco Jewellers site");
}

export function clientIp(request) {
  return String(
    request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown",
  )
    .trim()
    .slice(0, 64);
}

