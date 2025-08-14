export const prerender = false;

import type { APIRoute } from "astro";
import { batchSaveSchema } from "../../lib/validation/flashcards";
import { batchSaveFlashcards, ValidationError } from "../../lib/services/flashcards.service";
import { UnauthorizedError } from "../../lib/services/ai.service";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
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

    const parsed = batchSaveSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: parsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const idempotencyKey = request.headers.get("idempotency-key") || undefined;
    const TIMEOUT_MS = 15000;
    const result = await Promise.race([
      batchSaveFlashcards(supabase, parsed.data, idempotencyKey),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]) as Awaited<ReturnType<typeof batchSaveFlashcards>>;

    return new Response(JSON.stringify(result), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards:batch-save] POST failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof ValidationError) {
      return new Response(JSON.stringify({ error: error.message || "Validation failed", code: "validation_failed" }), {
        status: 422,
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


