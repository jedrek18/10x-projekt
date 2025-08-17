export const prerender = false;

import type { APIRoute } from "astro";
import { listQuerySchema, createManualSchema } from "../../../lib/validation/flashcards";
import {
  createManualFlashcard,
  listFlashcards,
  ConflictError,
  ValidationError,
} from "../../../lib/services/flashcards.service";
import { UnauthorizedError } from "../../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../../lib/http";

export const GET: APIRoute = async ({ request, locals, url }) => {
  try {
    const supabase = locals.supabase;
    const queryObject: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());
    const parsed = listQuerySchema.safeParse(queryObject);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const result = (await Promise.race([
      listFlashcards(supabase, parsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof listFlashcards>>;

    const headers = new Headers({ "X-Total-Count": String(result.count) });
    return json(result.items, { status: 200, headers });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const requestBody = await request.json().catch(() => null);
    if (!requestBody || typeof requestBody !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    console.log("[DEBUG] Flashcards API - POST request body:", requestBody);

    const parsed = createManualSchema.safeParse(requestBody);
    if (!parsed.success) {
      console.log("[DEBUG] Flashcards API - POST validation error:", parsed.error.flatten());
      return validationFailed(parsed.error.flatten());
    }

    console.log("[DEBUG] Flashcards API - POST parsed data:", parsed.data);

    const TIMEOUT_MS = 10000;
    const created = (await Promise.race([
      createManualFlashcard(supabase, parsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof createManualFlashcard>>;

    console.log("[DEBUG] Flashcards API - POST success:", created);
    return json(created, 201);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards] POST failed", error);
    console.error("[api/flashcards] POST error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof ConflictError) {
      return errorJson("Conflict", "conflict", 409);
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
