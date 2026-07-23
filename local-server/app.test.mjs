import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { createLocalApp } from "./app.mjs";

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return `http://127.0.0.1:${server.address().port}`;
}

function fakeDependencies() {
  return {
    repository: {
      async ping() { return true; },
    },
    uploads: {},
  };
}

test("local app serves SPA routes, static assets and API health", async (context) => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "royco-local-app-"));
  const distDir = path.join(projectRoot, "dist");
  await mkdir(path.join(distDir, "assets"), { recursive: true });
  await writeFile(path.join(distDir, "index.html"), "<!doctype html><title>Royco test</title>");
  await writeFile(path.join(distDir, "assets", "app-ABC123.js"), "globalThis.royco = true;");

  const server = createLocalApp({ projectRoot, distDir, dependencies: fakeDependencies() });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = await listen(server);

  const home = await fetch(`${base}/account/orders`);
  assert.equal(home.status, 200);
  assert.match(await home.text(), /Royco test/);

  const asset = await fetch(`${base}/assets/app-ABC123.js`);
  assert.equal(asset.status, 200);
  assert.match(asset.headers.get("content-type"), /text\/javascript/);
  assert.match(asset.headers.get("cache-control"), /immutable/);

  const health = await fetch(`${base}/api/health`);
  assert.equal(health.status, 200);
  const payload = await health.json();
  assert.equal(payload.data.database, "connected");
});

test("local app rejects traversal and does not turn missing files into the SPA", async (context) => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "royco-local-app-"));
  const distDir = path.join(projectRoot, "dist");
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, "index.html"), "<!doctype html><title>Royco test</title>");

  const server = createLocalApp({ projectRoot, distDir, dependencies: fakeDependencies() });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = await listen(server);

  assert.equal((await fetch(`${base}/missing.js`)).status, 404);
  assert.equal((await fetch(`${base}/uploads/not-an-upload.png`)).status, 404);
  assert.equal((await fetch(`${base}/%00secret`)).status, 400);
});

test("local app persists customer authentication through the real local repository", async (context) => {
  const projectRoot = await mkdtemp(path.join(tmpdir(), "royco-local-auth-"));
  const distDir = path.join(projectRoot, "dist");
  await mkdir(distDir, { recursive: true });
  await writeFile(path.join(distDir, "index.html"), "<!doctype html><title>Royco test</title>");

  const server = createLocalApp({ projectRoot, distDir });
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const base = await listen(server);
  const signup = await fetch(`${base}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: base },
    body: JSON.stringify({
      name: "Local Customer",
      phone: "9876543210",
      email: "local.customer@example.com",
      password: "LocalTest@123",
    }),
  });
  assert.equal(signup.status, 201, await signup.text());
  const cookie = signup.headers.get("set-cookie").split(";", 1)[0];
  assert.match(cookie, /^royco_session=/);

  const me = await fetch(`${base}/api/auth/me`, { headers: { Cookie: cookie } });
  assert.equal(me.status, 200);
  assert.equal((await me.json()).data.user.email, "local.customer@example.com");

  const products = await fetch(`${base}/api/products`);
  assert.equal(products.status, 200);
  assert.ok((await products.json()).data.products.length >= 20);
});
