export function json(data: unknown, init?: number | ResponseInit): Response {
  const base: ResponseInit = typeof init === "number" ? { status: init } : (init ?? {});
  const headers = new Headers(base.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return new Response(JSON.stringify(data), { ...base, headers });
}

export function errorJson(message: string, code: string, status: number, details?: unknown): Response {
  return json({ error: message, code, ...(details ? { details } : {}) }, { status });
}

export function validationFailed(details: unknown): Response {
  return errorJson("Validation failed", "validation_failed", 422, details);
}
