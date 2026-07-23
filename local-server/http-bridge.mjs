import { Readable } from "node:stream";

const DEFAULT_BODY_LIMIT = 4 * 1024 * 1024;

export class HttpBridgeError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpBridgeError";
    this.status = status;
  }
}

function safeRequestBase(request, fallbackHost, fallbackPort) {
  const forwarded = String(request.headers["x-forwarded-proto"] || "").toLowerCase();
  const protocol = forwarded === "https" ? "https" : "http";
  const suppliedHost = String(request.headers.host || "");
  const localHost = /^(?:localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d{1,5})?$/i.test(suppliedHost)
    ? suppliedHost
    : `${fallbackHost}:${fallbackPort}`;
  return `${protocol}://${localHost}`;
}

async function readBody(request, maxBytes) {
  const declaredLength = Number(request.headers["content-length"] || 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new HttpBridgeError(413, "Request body is too large");
  }

  const chunks = [];
  let total = 0;
  let tooLarge = false;

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.length;
    if (total > maxBytes) {
      tooLarge = true;
      continue;
    }
    chunks.push(bytes);
  }

  if (tooLarge) throw new HttpBridgeError(413, "Request body is too large");
  return chunks.length ? Buffer.concat(chunks, total) : undefined;
}

/** Convert Node's IncomingMessage into the Fetch Request used by Netlify Functions. */
export async function toWebRequest(request, {
  hostname = "127.0.0.1",
  port = 4173,
  maxBodyBytes = DEFAULT_BODY_LIMIT,
} = {}) {
  const method = String(request.method || "GET").toUpperCase();
  const base = safeRequestBase(request, hostname, port);
  let url;
  try {
    url = new URL(request.url || "/", base);
    if (url.origin !== new URL(base).origin) throw new Error("Request target changed origin");
  } catch {
    throw new HttpBridgeError(400, "Invalid request URL");
  }

  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }

  const body = ["GET", "HEAD"].includes(method) ? undefined : await readBody(request, maxBodyBytes);
  return new Request(url, { method, headers, body });
}

function responseCookies(headers) {
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

/** Write a Fetch Response back to Node's ServerResponse without buffering it. */
export async function writeWebResponse(nodeResponse, response, { head = false } = {}) {
  nodeResponse.statusCode = response.status;
  if (response.statusText) nodeResponse.statusMessage = response.statusText;

  for (const [name, value] of response.headers) {
    if (name.toLowerCase() !== "set-cookie") nodeResponse.setHeader(name, value);
  }
  const cookies = responseCookies(response.headers);
  if (cookies.length) nodeResponse.setHeader("Set-Cookie", cookies);

  if (head || !response.body || [204, 304].includes(response.status)) {
    nodeResponse.end();
    return;
  }

  await new Promise((resolve, reject) => {
    const stream = Readable.fromWeb(response.body);
    stream.once("error", reject);
    nodeResponse.once("error", reject);
    nodeResponse.once("finish", resolve);
    stream.pipe(nodeResponse);
  });
}
