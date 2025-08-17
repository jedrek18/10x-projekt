export const prerender = false;

import type { APIRoute } from "astro";
import { dateSchema, patchBodySchema } from "../../../lib/validation/progress.schemas";
import { upsertGoalOverride } from "../../../lib/services/progress.service";
import { json, errorJson, validationFailed } from "../../../lib/http";
import { UnauthorizedError } from "../../../lib/services/ai.service";
import { logError } from "../../../lib/services/error-logger";

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    const dateParam = params.date;
    const dateParsed = dateSchema.safeParse(dateParam);
    if (!dateParsed.success) {
      return errorJson("Bad Request", "bad_request", 400, dateParsed.error.flatten());
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = patchBodySchema.safeParse(body);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const updated = (await Promise.race([
      upsertGoalOverride(supabase, dateParsed.data, parsed.data.goal_override),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof upsertGoalOverride>>;

    return json(updated, 200);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/progress/[date]] PATCH failed", error);
    try {
      await logError(locals?.supabase, { endpoint: "/api/progress/[date]", error });
    } catch {}
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as any)?.code === "validation_failed") {
      return validationFailed((error as any).details ?? undefined);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
