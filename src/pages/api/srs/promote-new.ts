export const prerender = false;

import type { APIRoute } from "astro";
import { promoteNewSchema } from "../../../lib/validation/srs";
import { promoteNew } from "../../../lib/services/srs.service";
import { UnauthorizedError } from "../../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../../lib/http";
import { logError } from "../../../lib/services/error-logger";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const jsonBody = await request.json().catch(() => null);
    if (!jsonBody || typeof jsonBody !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = promoteNewSchema.safeParse(jsonBody);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const result = (await Promise.race([
      promoteNew(supabase, parsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof promoteNew>>;

    return json(result, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/srs/promote-new] POST failed", error);
    try {
      await logError(locals?.supabase, { endpoint: "/api/srs/promote-new", error });
    } catch {}
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
