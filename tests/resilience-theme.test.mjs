import assert from "node:assert/strict";
import test from "node:test";
import { mergeStoreSettings, DEFAULT_STORE_SETTINGS } from "../backend/lib/commerce-rules.mjs";
import { createRateLimiter } from "../backend/lib/rate-limit.mjs";
import { withDatabaseRetry } from "../backend/lib/repository.mjs";
import { defaultThemeSettings, resolveSeasonalTheme } from "../src/lib/seasonal-themes.js";

test("rate limiter bounds a client and resets after its window", () => {
  let now = 1_000;
  const limiter = createRateLimiter({ max: 2, windowMs: 500, now: () => now });
  limiter.check("customer");
  limiter.check("customer");
  assert.throws(() => limiter.check("customer"), (error) => error.status === 429 && error.code === "rate_limited");
  now += 501;
  assert.equal(limiter.check("customer").remaining, 1);
});

test("database retry recovers only after transient connection failures", async () => {
  let attempts = 0;
  const result = await withDatabaseRetry(() => {
    attempts += 1;
    if (attempts < 3) throw Object.assign(new Error("connection terminated"), { code: "ECONNRESET" });
    return "connected";
  }, { attempts: 4, baseDelayMs: 0, maxDelayMs: 0, jitterMs: 0 });
  assert.equal(result, "connected");
  assert.equal(attempts, 3);
  await assert.rejects(
    withDatabaseRetry(() => { throw Object.assign(new Error("bad query"), { code: "42601" }); }),
    /bad query/,
  );
});

test("scheduled offers override a manual seasonal theme during their active window", () => {
  const settings = {
    ...defaultThemeSettings,
    activeTheme: "christmas",
    offers: defaultThemeSettings.offers.map((offer) => offer.id === "diwali" ? {
      ...offer,
      enabled: true,
      startAt: "2026-10-01T00:00:00.000Z",
      endAt: "2026-11-30T00:00:00.000Z",
    } : offer),
  };
  const active = resolveSeasonalTheme(settings, "hi", new Date("2026-10-20T12:00:00.000Z"));
  assert.equal(active.id, "diwali");
  assert.equal(active.title, "दिवाली ऑफर");
});

test("theme settings merge without removing pricing and compliance settings", () => {
  const merged = mergeStoreSettings(DEFAULT_STORE_SETTINGS, {
    theme: { animationsEnabled: false, density: 22, activeTheme: "durga-puja" },
  });
  assert.equal(merged.theme.animationsEnabled, false);
  assert.equal(merged.theme.density, 22);
  assert.equal(merged.rates.gold22k, DEFAULT_STORE_SETTINGS.rates.gold22k);
  assert.equal(merged.makingCharges.Gold.value, DEFAULT_STORE_SETTINGS.makingCharges.Gold.value);
});
