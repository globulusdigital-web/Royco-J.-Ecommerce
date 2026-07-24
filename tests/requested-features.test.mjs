import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createApiHandler } from "../backend/lib/api-handler.mjs";
import { verifyRazorpaySignature } from "../backend/lib/payments.mjs";
import { createLocalRepository } from "../local-server/repository.mjs";

const env = {
  NODE_ENV: "test",
  SESSION_SECRET: "requested-feature-session-secret-at-least-32-characters",
  ADMIN_USER: "Admin@Royco",
  ADMIN_PASSWORD: "Admin@123",
};

function request(path, { method = "GET", body, cookie } = {}) {
  const headers = new Headers({ Accept: "application/json" });
  if (!["GET", "HEAD"].includes(method)) headers.set("sec-fetch-site", "same-origin");
  if (cookie) headers.set("cookie", cookie);
  return new Request(`http://localhost${path}`, {
    method,
    headers: body === undefined ? headers : new Headers({ ...Object.fromEntries(headers), "content-type": "application/json" }),
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function payload(response, status = 200) {
  assert.equal(response.status, status, await response.clone().text());
  return response.json();
}

function indiaDate(daysAhead) {
  const value = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000);
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}

test("mobile OTP creates a session and appointments flow into the admin diary", async (context) => {
  const directory = await mkdtemp(join(tmpdir(), "royco-requested-features-"));
  context.after(() => rm(directory, { recursive: true, force: true }));
  const repository = await createLocalRepository({ storePath: join(directory, "store.json") });
  const handler = createApiHandler({
    env,
    getDependencies: async () => ({
      repository,
      uploads: { async get() { return null; }, async put() {} },
    }),
  });

  const otpRequest = await payload(await handler(request("/api/auth/otp/request", {
    method: "POST",
    body: { phone: "98765 43210" },
  })));
  assert.match(otpRequest.data.devOtp, /^\d{6}$/);
  assert.equal(otpRequest.data.phone, "+919876543210");

  const otpResponse = await handler(request("/api/auth/otp/verify", {
    method: "POST",
    body: { phone: otpRequest.data.phone, code: otpRequest.data.devOtp, name: "Ananya Sen" },
  }));
  const otp = await payload(otpResponse);
  assert.equal(otp.data.user.phone, "+919876543210");
  const customerCookie = otpResponse.headers.get("set-cookie").split(";")[0];

  const date = indiaDate(2);
  const availability = await payload(await handler(request(`/api/appointments/availability?date=${date}`)));
  const slot = availability.data.slots.find((entry) => entry.available);
  assert.ok(slot);

  const booked = await payload(await handler(request("/api/appointments", {
    method: "POST",
    cookie: customerCookie,
    body: {
      date,
      time: slot.time,
      service: "gemstone_guidance",
      language: "Bengali",
      notes: "Guidance before choosing a ruby.",
    },
  })), 201);
  assert.equal(booked.data.appointment.status, "requested");

  const adminResponse = await handler(request("/api/auth/login", {
    method: "POST",
    body: { email: "Admin@Royco", password: "Admin@123", admin: true },
  }));
  await payload(adminResponse);
  const adminCookie = adminResponse.headers.get("set-cookie").split(";")[0];
  const diary = await payload(await handler(request("/api/admin/appointments", { cookie: adminCookie })));
  assert.equal(diary.data.appointments.length, 1);
  assert.equal(diary.data.appointments[0].customerName, "Ananya Sen");

  const confirmed = await payload(await handler(request(
    `/api/admin/appointments/${booked.data.appointment.id}/status`,
    { method: "PUT", cookie: adminCookie, body: { status: "confirmed" } },
  )));
  assert.equal(confirmed.data.appointment.status, "confirmed");
});

test("Razorpay signatures are checked with the server-side secret", () => {
  const paymentEnv = { RAZORPAY_KEY_ID: "rzp_test_royco", RAZORPAY_KEY_SECRET: "test-secret" };
  const providerOrderId = "order_royco_123";
  const paymentId = "pay_royco_456";
  const signature = createHmac("sha256", paymentEnv.RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${paymentId}`)
    .digest("hex");
  assert.equal(verifyRazorpaySignature({ providerOrderId, paymentId, signature, env: paymentEnv }), true);
  assert.equal(verifyRazorpaySignature({ providerOrderId, paymentId, signature: `${signature.slice(0, -1)}0`, env: paymentEnv }), false);
});

test("production administrator access stays disabled until Render has a password secret", async () => {
  const handler = createApiHandler({
    env: {
      NODE_ENV: "production",
      SESSION_SECRET: "production-session-secret-at-least-32-characters",
      ADMIN_USER: "Admin@Royco",
    },
    getDependencies: async () => ({
      repository: { async ping() { return true; } },
      uploads: {},
    }),
  });
  const response = await handler(request("/api/auth/login", {
    method: "POST",
    body: { email: "Admin@Royco", password: "Admin@123", admin: true },
  }));
  const result = await payload(response, 503);
  assert.equal(result.error.code, "admin_not_configured");
});
