import { createHmac, timingSafeEqual } from "node:crypto";
import { ApiError } from "./http.mjs";

function configured(env) {
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

async function razorpayRequest(path, { env, method = "GET", body } = {}) {
  if (!configured(env)) {
    throw new ApiError(503, "razorpay_not_configured", "Online payment is being configured. Please choose another payment option.");
  }
  const authorization = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  let response;
  try {
    response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method,
      headers: {
        Authorization: `Basic ${authorization}`,
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(502, "payment_service_unavailable", "Razorpay is temporarily unavailable. Please try again.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.description || "Razorpay could not prepare this payment.";
    throw new ApiError(502, "payment_service_error", message);
  }
  return payload;
}

export async function createRazorpayOrder({ amountPaise, receipt, notes = {}, env = process.env }) {
  const order = await razorpayRequest("/orders", {
    env,
    method: "POST",
    body: {
      amount: amountPaise,
      currency: "INR",
      receipt: String(receipt).slice(0, 40),
      notes,
    },
  });
  return {
    keyId: env.RAZORPAY_KEY_ID,
    providerOrderId: order.id,
    amountPaise: Number(order.amount),
    currency: order.currency,
  };
}

export function verifyRazorpaySignature({ providerOrderId, paymentId, signature, env = process.env }) {
  if (!configured(env)) {
    throw new ApiError(503, "razorpay_not_configured", "Online payment is being configured.");
  }
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${providerOrderId}|${paymentId}`)
    .digest("hex");
  const left = Buffer.from(expected);
  const right = Buffer.from(String(signature || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

export function razorpayConfigured(env = process.env) {
  return configured(env);
}
