import { mkdir, rename, stat, appendFile } from "node:fs/promises";
import path from "node:path";

function describe(value) {
  if (value instanceof Error) return value.stack || `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function createRollingLogger({
  directory,
  filename = "royco-server.log",
  maxBytes = 2 * 1024 * 1024,
  retainedFiles = 5,
  mirror = console,
} = {}) {
  if (!directory) throw new TypeError("A rolling log directory is required");
  const logDirectory = path.resolve(directory);
  const logPath = path.join(logDirectory, filename);
  let queue = Promise.resolve();

  const rotate = async () => {
    await mkdir(logDirectory, { recursive: true });
    const current = await stat(logPath).catch(() => null);
    if (!current || current.size < maxBytes) return;
    for (let index = retainedFiles - 1; index >= 1; index -= 1) {
      const source = `${logPath}.${index}`;
      const destination = `${logPath}.${index + 1}`;
      await rename(source, destination).catch(() => {});
    }
    await rename(logPath, `${logPath}.1`).catch(() => {});
  };

  const write = (level, values) => {
    mirror?.[level]?.(...values);
    const line = `${new Date().toISOString()} ${level.toUpperCase()} ${values.map(describe).join(" ")}\n`;
    queue = queue
      .then(rotate)
      .then(() => appendFile(logPath, line, "utf8"))
      .catch((error) => mirror?.error?.("Unable to write Royco rolling log", error));
  };

  return {
    log: (...values) => write("log", values),
    info: (...values) => write("info", values),
    warn: (...values) => write("warn", values),
    error: (...values) => write("error", values),
    flush: () => queue,
    path: logPath,
  };
}
