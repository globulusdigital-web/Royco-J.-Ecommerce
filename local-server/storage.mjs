import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LOCAL_DIRECTORY = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_UPLOADS_DIRECTORY = resolve(LOCAL_DIRECTORY, "uploads");
const SAFE_KEY = /^[a-f0-9-]{36}\.(?:jpg|png|webp)$/i;

function safePath(directory, key) {
  if (!SAFE_KEY.test(key) || basename(key) !== key) throw new Error("Unsafe local upload key");
  return resolve(directory, key);
}

async function fileBytes(file) {
  if (Buffer.isBuffer(file)) return file;
  if (file instanceof Uint8Array) return Buffer.from(file);
  if (file instanceof ArrayBuffer) return Buffer.from(file);
  if (file && typeof file.arrayBuffer === "function") return Buffer.from(await file.arrayBuffer());
  throw new TypeError("Upload must be a File, Blob, ArrayBuffer, Buffer or Uint8Array");
}

async function atomicWrite(path, data) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, data, { flag: "wx" });
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true }).catch(() => {});
  }
}

export async function createLocalFileStorage({ uploadsDir = DEFAULT_UPLOADS_DIRECTORY } = {}) {
  const directory = resolve(uploadsDir);
  await mkdir(directory, { recursive: true });
  let writes = Promise.resolve();

  return {
    uploadsDir: directory,

    async put(key, file, metadata = {}) {
      const path = safePath(directory, key);
      const data = await fileBytes(file);
      const record = {
        contentType: metadata.contentType || file?.type || "application/octet-stream",
        fileName: metadata.fileName || file?.name || key,
        size: data.byteLength,
        etag: `"${createHash("sha256").update(data).digest("hex")}"`,
        createdAt: new Date().toISOString(),
      };
      const operation = writes.then(async () => {
        await atomicWrite(path, data);
        await atomicWrite(`${path}.json`, `${JSON.stringify(record, null, 2)}\n`);
      });
      writes = operation.then(() => undefined, () => undefined);
      await operation;
    },

    async get(key) {
      await writes;
      const path = safePath(directory, key);
      try {
        const [data, rawMetadata] = await Promise.all([
          readFile(path),
          readFile(`${path}.json`, "utf8").catch(() => "{}"),
        ]);
        const record = JSON.parse(rawMetadata);
        return {
          data,
          metadata: {
            contentType: record.contentType || "application/octet-stream",
            fileName: record.fileName || key,
            size: Number(record.size || data.byteLength),
          },
          etag: record.etag || `"${createHash("sha256").update(data).digest("hex")}"`,
        };
      } catch (error) {
        if (error?.code === "ENOENT") return null;
        throw error;
      }
    },
  };
}

export const createLocalBlobStorage = createLocalFileStorage;

let defaultStoragePromise;

export function getLocalFileStorage(options = {}) {
  if (options.uploadsDir) return createLocalFileStorage(options);
  defaultStoragePromise ||= createLocalFileStorage(options);
  return defaultStoragePromise;
}

export const getLocalBlobStorage = getLocalFileStorage;

export async function getLocalDependencies(options = {}) {
  const [repository, uploads] = await Promise.all([
    getLocalRepositoryFromSibling(options),
    getLocalFileStorage(options),
  ]);
  return { repository, uploads };
}

async function getLocalRepositoryFromSibling(options) {
  const { getLocalRepository } = await import("./repository.mjs");
  return getLocalRepository(options);
}

export default getLocalFileStorage;

