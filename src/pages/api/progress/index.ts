export const prerender = false;

import type { APIRoute } from "astro";
import { getQuerySchema } from "../../../lib/validation/progress.schemas";
import { fetchDailyProgress } from "../../../lib/services/progress.service";
import { json, errorJson } from "../../../lib/http";
import { UnauthorizedError } from "../../../lib/services/ai.service";
import { logError } from "../../../lib/services/error-logger";

export const GET: APIRoute = async ({ url, locals, request }) => {
  try {
    const supabase = locals.supabase;
    const queryObject: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());

    const parsed = getQuerySchema.safeParse(queryObject);
    if (!parsed.success) {
      return errorJson("Bad Request", "bad_request", 400, parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const result = (await Promise.race([
      fetchDailyProgress(supabase, parsed.data as any),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof fetchDailyProgress>>;

    // Responses contain only the caller's own data; avoid caching
    const headers = new Headers({ "Cache-Control": "private, max-age=0" });
    return json(result, { status: 200, headers });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/progress] GET failed", error);
    try { await logError(locals?.supabase, { endpoint: "/api/progress", error }); } catch {}
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};


