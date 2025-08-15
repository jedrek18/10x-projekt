export const prerender = false;

import type { APIRoute } from "astro";
import { eventCreateSchema } from "../../lib/validation/events";
import { createEvent } from "../../lib/services/events.service";
import { UnauthorizedError } from "../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const TIMEOUT_MS = 10000;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = eventCreateSchema.safeParse(json);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    if (request.signal.aborted) {
      return new Response(JSON.stringify({ error: "Request timeout", code: "timeout" }), {
        status: 408,
        headers: { "Content-Type": "application/json" },
      });
    }

    await Promise.race([
      createEvent(supabase, parsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]);

    return json({ status: "accepted" }, 202);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/events] POST failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};


