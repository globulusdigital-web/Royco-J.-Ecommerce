export function createBlobStorage(store) {
  return {
    async put(key, file, metadata) {
      await store.set(key, file, { metadata });
    },
    async get(key) {
      return store.getWithMetadata(key, { type: "arrayBuffer", consistency: "strong" });
    },
  };
}

export async function getProductionBlobStorage() {
  const { getStore } = await import("@netlify/blobs");
  return createBlobStorage(getStore({ name: "royco-product-images", consistency: "strong" }));
}
