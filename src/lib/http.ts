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

// Helper functions for API responses
export function getTotalCountFromHeaders(response: Response): number {
  const totalCount = response.headers.get("X-Total-Count");
  if (totalCount) return parseInt(totalCount, 10);

  const contentRange = response.headers.get("Content-Range");
  if (contentRange) {
    const match = contentRange.match(/\/(\d+)$/);
    if (match) return parseInt(match[1], 10);
  }

  return 0;
}

export function mapApiError(status: number, data?: any): { message: string; code: string } {
  switch (status) {
    case 401:
      return { message: "Nie jesteś zalogowany", code: "unauthorized" };
    case 404:
      return { message: "Nie znaleziono", code: "not_found" };
    case 409:
      return { message: data?.error || "Konflikt danych", code: "conflict" };
    case 422:
      return { message: "Błędne dane", code: "validation_failed" };
    case 500:
      return { message: "Błąd serwera", code: "server_error" };
    default:
      return { message: "Nieoczekiwany błąd", code: "unknown_error" };
  }
}
