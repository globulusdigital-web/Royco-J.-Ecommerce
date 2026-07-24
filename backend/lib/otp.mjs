import { randomInt } from "node:crypto";
import { ApiError } from "./http.mjs";

const localChallenges = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;

export function normalizePhone(value) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) {
    throw new ApiError(422, "validation_error", "Enter a valid mobile number with country code");
  }
  return `+${digits}`;
}

export function maskPhone(phone) {
  const digits = String(phone).replace(/\D/g, "");
  return `+${digits.slice(0, Math.max(1, digits.length - 8))} •••••• ${digits.slice(-2)}`;
}

function twilioConfigured(env) {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SERVICE_SID);
}

async function twilioVerifyRequest(resource, values, env) {
  if (!twilioConfigured(env)) {
    throw new ApiError(503, "sms_not_configured", "SMS verification is being configured. Please try again later.");
  }
  const authorization = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64");
  let response;
  try {
    response = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(env.TWILIO_VERIFY_SERVICE_SID)}/${resource}`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${authorization}`,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams(values),
      },
    );
  } catch {
    throw new ApiError(502, "sms_service_unavailable", "The SMS service is temporarily unavailable. Please try again.");
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.message || "The SMS verification request could not be completed.";
    throw new ApiError(response.status === 429 ? 429 : 502, "sms_service_error", message);
  }
  return payload;
}

function localMode(env) {
  return env.NODE_ENV !== "production" && !twilioConfigured(env);
}

export async function sendOtp(phone, env = process.env) {
  const normalized = normalizePhone(phone);
  if (localMode(env)) {
    const code = String(randomInt(100000, 1000000));
    localChallenges.set(normalized, { code, expiresAt: Date.now() + OTP_TTL_MS, attempts: 0 });
    return { phone: normalized, devOtp: code };
  }
  await twilioVerifyRequest("Verifications", { To: normalized, Channel: "sms" }, env);
  return { phone: normalized };
}

export async function checkOtp(phone, code, env = process.env) {
  const normalized = normalizePhone(phone);
  const safeCode = String(code ?? "").trim();
  if (!/^\d{6}$/.test(safeCode)) return false;
  if (localMode(env)) {
    const challenge = localChallenges.get(normalized);
    if (!challenge || challenge.expiresAt <= Date.now() || challenge.attempts >= 5) {
      localChallenges.delete(normalized);
      return false;
    }
    challenge.attempts += 1;
    const approved = challenge.code === safeCode;
    if (approved) localChallenges.delete(normalized);
    return approved;
  }
  const result = await twilioVerifyRequest("VerificationCheck", { To: normalized, Code: safeCode }, env);
  return result.status === "approved";
}

export const OTP_EXPIRES_IN_SECONDS = OTP_TTL_MS / 1000;
