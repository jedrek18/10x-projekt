export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { updateContentSchema } from "../../../lib/validation/flashcards";
import {
  getFlashcardById,
  updateFlashcardContent,
  softDeleteFlashcard,
  restoreFlashcard,
  ConflictError,
  ValidationError,
  NotFoundError,
  SoftDeletedConflictError,
} from "../../../lib/services/flashcards.service";
import { UnauthorizedError } from "../../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../../lib/http";

const idParamSchema = z.object({ id: z.string().uuid() });

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const parsed = idParamSchema.safeParse(params);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const card = (await Promise.race([
      getFlashcardById(supabase, parsed.data.id),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof getFlashcardById>>;

    return json(card, 200);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not found", "not_found", 404);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const idParsed = idParamSchema.safeParse(params);
    if (!idParsed.success) {
      return validationFailed(idParsed.error.flatten());
    }

    const requestBody = await request.json().catch(() => null);
    if (!requestBody || typeof requestBody !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    console.log("[DEBUG] Flashcards API - PATCH request for id:", idParsed.data.id, "body:", requestBody);

    const payloadParsed = updateContentSchema.safeParse(requestBody);
    if (!payloadParsed.success) {
      console.log("[DEBUG] Flashcards API - PATCH validation error:", payloadParsed.error.flatten());
      return validationFailed(payloadParsed.error.flatten());
    }

    console.log("[DEBUG] Flashcards API - PATCH parsed data:", payloadParsed.data);

    const TIMEOUT_MS = 10000;
    const updated = (await Promise.race([
      updateFlashcardContent(supabase, idParsed.data.id, payloadParsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof updateFlashcardContent>>;

    console.log("[DEBUG] Flashcards API - PATCH success:", updated);
    return json(updated, 200);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] PATCH failed", error);
    console.error("[api/flashcards/[id]] PATCH error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not found", "not_found", 404);
    }
    if (error instanceof SoftDeletedConflictError) {
      return errorJson("Card is soft-deleted", "conflict_soft_deleted", 409);
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

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const parsed = idParamSchema.safeParse(params);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    console.log("[DEBUG] Flashcards API - DELETE request for id:", parsed.data.id);

    const TIMEOUT_MS = 10000;
    await Promise.race([
      softDeleteFlashcard(supabase, parsed.data.id),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]);

    console.log("[DEBUG] Flashcards API - DELETE success for id:", parsed.data.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] DELETE failed", error);
    console.error("[api/flashcards/[id]] DELETE error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not found", "not_found", 404);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};

export const PUT: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const parsed = idParamSchema.safeParse(params);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    console.log("[DEBUG] Flashcards API - PUT (restore) request for id:", parsed.data.id);

    const TIMEOUT_MS = 10000;
    await Promise.race([
      restoreFlashcard(supabase, parsed.data.id),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]);

    console.log("[DEBUG] Flashcards API - PUT (restore) success for id:", parsed.data.id);
    return new Response(null, { status: 204 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] PUT (restore) failed", error);
    console.error("[api/flashcards/[id]] PUT (restore) error details:", {
      name: error instanceof Error ? error.name : "Unknown",
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not found", "not_found", 404);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
