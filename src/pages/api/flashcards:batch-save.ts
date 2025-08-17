export const prerender = false;

import type { APIRoute } from "astro";
import { batchSaveSchema } from "../../lib/validation/flashcards";
import { batchSaveFlashcards, ValidationError } from "../../lib/services/flashcards.service";
import { UnauthorizedError } from "../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../lib/http";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const requestData = await request.json().catch(() => null);
    if (!requestData || typeof requestData !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = batchSaveSchema.safeParse(requestData);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const idempotencyKey = request.headers.get("idempotency-key") || undefined;
    const TIMEOUT_MS = 15000;
    const result = (await Promise.race([
      batchSaveFlashcards(supabase, parsed.data, idempotencyKey),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof batchSaveFlashcards>>;

    return json(result, 201);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards:batch-save] POST failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof ValidationError) {
      return errorJson(error.message || "Validation failed", "validation_failed", 422);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
