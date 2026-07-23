export class ApiError extends Error {
  constructor(message, status = 500, code = "REQUEST_FAILED", details = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, options = {}) {
  const init = {
    credentials: "include",
    ...options,
    headers: {
      Accept: "application/json",
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  };

  if (init.body && !(init.body instanceof FormData) && typeof init.body !== "string") {
    init.body = JSON.stringify(init.body);
  }

  let response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new ApiError("The store service is temporarily unavailable.", 0, "NETWORK_ERROR");
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const source = payload?.error || payload;
    throw new ApiError(source?.message || `Request failed (${response.status})`, response.status, source?.code, source?.details);
  }

  return payload?.data ?? payload;
}

export function toQuery(values) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "" && value !== "All") params.set(key, value);
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}
