export const prerender = false;

import type { APIRoute } from "astro";
import { eventCreateSchema } from "../../lib/validation/events";
import { createEvent } from "../../lib/services/events.service";
import { UnauthorizedError } from "../../lib/services/ai.service";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const TIMEOUT_MS = 10000;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Unsupported Media Type", code: "unsupported_media_type" }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body", code: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const parsed = eventCreateSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: parsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify({ status: "accepted" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/events] POST failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if ((error as Error)?.name === "AbortError") {
      return new Response(JSON.stringify({ error: "Request timeout", code: "timeout" }), {
        status: 408,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};


