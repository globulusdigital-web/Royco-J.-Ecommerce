import { createReadStream } from "node:fs";
import { access, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApiHandler } from "../netlify/lib/api-handler.mjs";
import { getLocalRepository } from "./repository.mjs";
import { getLocalFileStorage } from "./storage.mjs";
import { HttpBridgeError, toWebRequest, writeWebResponse } from "./http-bridge.mjs";

const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = path.resolve(moduleDirectory, "..");
const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PRODUCTION_HOST = "0.0.0.0";
const DEFAULT_PORT = 4173;
const LOCAL_SESSION_SECRET = "royco-local-session-secret-2026-change-for-production";

const CONTENT_TYPES = Object.freeze({
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
});

export function developmentEnvironment(source = process.env) {
  return {
    ...source,
    NODE_ENV: source.NODE_ENV || "development",
    SESSION_SECRET: source.SESSION_SECRET?.length >= 32 ? source.SESSION_SECRET : LOCAL_SESSION_SECRET,
    ADMIN_USER: source.ADMIN_USER || "Admin@Royco",
    ADMIN_PASSWORD: source.ADMIN_PASSWORD || "Admin@123",
    PUBLIC_SITE_URL: source.PUBLIC_SITE_URL || `http://${DEFAULT_HOST}:${DEFAULT_PORT}`,
  };
}

function securityHeaders(response) {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "SAMEORIGIN");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
}

function jsonError(response, status, code, message) {
  if (response.headersSent) {
    response.destroy();
    return;
  }
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  securityHeaders(response);
  response.end(JSON.stringify({ error: { code, message } }));
}

function decodePathname(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url || "/", "http://local.royco").pathname);
  } catch {
    throw new HttpBridgeError(400, "Invalid request URL");
  }
  if (pathname.includes("\0") || pathname.includes("\\")) {
    throw new HttpBridgeError(400, "Invalid request path");
  }
  return pathname;
}

function containedPath(root, pathname) {
  const target = path.resolve(root, `.${pathname}`);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;
  return target;
}

async function existingFile(filePath) {
  if (!filePath) return null;
  try {
    await access(filePath);
    const details = await stat(filePath);
    return details.isFile() ? details : null;
  } catch {
    return null;
  }
}

function cacheControl(filePath, distDirectory) {
  const relative = path.relative(distDirectory, filePath).replaceAll("\\", "/");
  if (/^assets\/.*-[A-Za-z0-9_-]{6,}\.(?:css|js|mjs|woff2?|png|jpe?g|webp|svg)$/i.test(relative)) {
    return "public, max-age=31536000, immutable";
  }
  if (path.extname(filePath).toLowerCase() === ".html") return "no-cache";
  return "public, max-age=3600";
}

async function serveFile(request, response, filePath, details, { distDirectory, immutable = false } = {}) {
  const extension = path.extname(filePath).toLowerCase();
  response.statusCode = 200;
  response.setHeader("Content-Type", CONTENT_TYPES[extension] || "application/octet-stream");
  response.setHeader("Content-Length", details.size);
  response.setHeader("Cache-Control", immutable ? "public, max-age=31536000, immutable" : cacheControl(filePath, distDirectory));
  securityHeaders(response);
  if (String(request.method).toUpperCase() === "HEAD") {
    response.end();
    return;
  }
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.once("error", reject);
    response.once("error", reject);
    response.once("finish", resolve);
    stream.pipe(response);
  });
}

export function createLocalApp({
  hostname = DEFAULT_HOST,
  port = DEFAULT_PORT,
  projectRoot = defaultProjectRoot,
  distDir = path.join(projectRoot, "dist"),
  uploadsDir = process.env.ROYCO_UPLOADS_DIR || path.join(projectRoot, "local-server", "uploads"),
  storePath = process.env.ROYCO_STORE_PATH || path.join(projectRoot, "local-server", "data", "store.json"),
  env = developmentEnvironment(),
  dependencies,
} = {}) {
  const distDirectory = path.resolve(distDir);
  const uploadsDirectory = path.resolve(uploadsDir);
  let dependencyPromise;
  const getDependencies = async () => {
    if (dependencies) return typeof dependencies === "function" ? dependencies() : dependencies;
    dependencyPromise ??= Promise.all([
      getLocalRepository({ storePath }),
      getLocalFileStorage({ uploadsDir: uploadsDirectory }),
    ]).then(([repository, uploads]) => ({ repository, uploads }));
    return dependencyPromise;
  };
  const apiHandler = createApiHandler({ getDependencies, env });

  const server = createServer(async (request, response) => {
    try {
      const method = String(request.method || "GET").toUpperCase();
      const pathname = decodePathname(request.url);
      securityHeaders(response);

      if (pathname === "/api" || pathname.startsWith("/api/")) {
        const webRequest = await toWebRequest(request, { hostname, port });
        const webResponse = await apiHandler(webRequest);
        await writeWebResponse(response, webResponse, { head: method === "HEAD" });
        return;
      }

      if (!["GET", "HEAD"].includes(method)) {
        response.setHeader("Allow", "GET, HEAD");
        jsonError(response, 405, "method_not_allowed", "Method not allowed");
        return;
      }

      if (pathname.startsWith("/uploads/")) {
        const uploadName = pathname.slice("/uploads/".length);
        if (!/^[a-f0-9-]{36}\.(?:jpg|jpeg|png|webp)$/i.test(uploadName)) {
          jsonError(response, 404, "not_found", "Image not found");
          return;
        }
        const uploadPath = containedPath(uploadsDirectory, `/${uploadName}`);
        const uploadDetails = await existingFile(uploadPath);
        if (!uploadDetails) {
          jsonError(response, 404, "not_found", "Image not found");
          return;
        }
        await serveFile(request, response, uploadPath, uploadDetails, { distDirectory, immutable: true });
        return;
      }

      const requestedPath = pathname === "/" ? "/index.html" : pathname;
      const staticPath = containedPath(distDirectory, requestedPath);
      const staticDetails = await existingFile(staticPath);
      if (staticDetails) {
        await serveFile(request, response, staticPath, staticDetails, { distDirectory });
        return;
      }

      // Client-side routes are served by the SPA entry point. Missing files remain 404.
      if (!path.extname(pathname)) {
        const indexPath = path.join(distDirectory, "index.html");
        const indexDetails = await existingFile(indexPath);
        if (indexDetails) {
          await serveFile(request, response, indexPath, indexDetails, { distDirectory });
          return;
        }
      }

      jsonError(response, 404, "not_found", "File not found");
    } catch (error) {
      if (!response.headersSent) {
        const status = error instanceof HttpBridgeError ? error.status : 500;
        jsonError(response, status, status === 500 ? "server_error" : "bad_request", status === 500 ? "The local store server encountered an error" : error.message);
      } else {
        response.destroy();
      }
      if (!(error instanceof HttpBridgeError)) console.error("Royco local server error", error);
    }
  });

  server.on("clientError", (_error, socket) => {
    if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
  });
  return server;
}

export async function start(options = {}) {
  const hostname = options.hostname || process.env.HOST || (process.env.NODE_ENV === "production" ? DEFAULT_PRODUCTION_HOST : DEFAULT_HOST);
  const configuredPort = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT);
  const port = Number.isInteger(configuredPort) && configuredPort >= 0 && configuredPort <= 65535 ? configuredPort : DEFAULT_PORT;
  const server = createLocalApp({ ...options, hostname, port });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, hostname, resolve);
  });
  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  const url = `http://${hostname}:${actualPort}`;
  console.log(`Royco Jewellers is running at ${url}`);
  return { server, url };
}

const executedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (executedDirectly) {
  start().then(({ server }) => {
    let closing = false;
    const close = (signal) => {
      if (closing) return;
      closing = true;
      console.log(`\n${signal} received; closing Royco Jewellers.`);
      server.close((error) => {
        if (error) console.error("Local server shutdown error", error);
        process.exitCode = error ? 1 : 0;
      });
      setTimeout(() => {
        console.error("Local server did not close in time; forcing shutdown.");
        process.exitCode = 1;
        process.exit();
      }, 5_000).unref();
    };
    process.once("SIGINT", () => close("SIGINT"));
    process.once("SIGTERM", () => close("SIGTERM"));
  }).catch((error) => {
    console.error("Unable to start Royco Jewellers local server", error);
    process.exitCode = 1;
  });
}
