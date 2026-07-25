import { ApiError } from "./http.mjs";

function safeKey(value) {
  return String(value || "unknown").slice(0, 180);
}

export function createRateLimiter({
  windowMs = 60_000,
  max = 180,
  code = "rate_limited",
  message = "Too many requests. Please wait a moment and try again.",
  now = () => Date.now(),
} = {}) {
  const buckets = new Map();
  let checks = 0;

  const prune = (timestamp) => {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= timestamp) buckets.delete(key);
    }
  };

  return {
    check(keyValue) {
      const timestamp = now();
      checks += 1;
      if (checks % 250 === 0 || buckets.size > 5_000) prune(timestamp);
      const key = safeKey(keyValue);
      let bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= timestamp) {
        bucket = { count: 0, resetAt: timestamp + windowMs };
        buckets.set(key, bucket);
      }
      bucket.count += 1;
      if (bucket.count > max) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - timestamp) / 1000));
        throw new ApiError(429, code, message, { retryAfterSeconds });
      }
      return {
        remaining: Math.max(0, max - bucket.count),
        resetAt: bucket.resetAt,
      };
    },
    size() {
      return buckets.size;
    },
    clear() {
      buckets.clear();
    },
  };
}
