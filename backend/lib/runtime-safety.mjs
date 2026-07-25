const RUNTIME_SAFETY_KEY = Symbol.for("royco.runtimeSafety");

function describeError(value) {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function installProcessSafety({ logger = console } = {}) {
  if (globalThis[RUNTIME_SAFETY_KEY]) return globalThis[RUNTIME_SAFETY_KEY];

  const state = {
    installedAt: new Date().toISOString(),
    uncaughtExceptions: 0,
    unhandledRejections: 0,
    lastErrorAt: null,
  };

  const record = (kind, value) => {
    state.lastErrorAt = new Date().toISOString();
    if (kind === "uncaughtException") state.uncaughtExceptions += 1;
    else state.unhandledRejections += 1;
    logger.error(`[Royco runtime] ${kind}\n${describeError(value)}`);
  };

  process.on("uncaughtException", (error) => record("uncaughtException", error));
  process.on("unhandledRejection", (reason) => record("unhandledRejection", reason));
  process.on("warning", (warning) => logger.warn(`[Royco runtime] warning\n${describeError(warning)}`));

  globalThis[RUNTIME_SAFETY_KEY] = state;
  return state;
}

export function runtimeSafetyState() {
  return globalThis[RUNTIME_SAFETY_KEY] || null;
}
