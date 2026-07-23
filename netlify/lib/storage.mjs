import path from "node:path";

export async function getProductionBlobStorage() {
  const uploadsDir = process.env.ROYCO_UPLOADS_DIR || path.join(process.cwd(), "local-server", "uploads");
  const { getLocalFileStorage } = await import("../../local-server/storage.mjs");
  return getLocalFileStorage({ uploadsDir });
}
