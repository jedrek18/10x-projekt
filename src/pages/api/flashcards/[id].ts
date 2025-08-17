export const prerender = false;

import type { APIRoute } from "astro";
import { z } from "zod";
import { updateContentSchema } from "../../../lib/validation/flashcards";
import {
  getFlashcardById,
  updateFlashcardContent,
  softDeleteFlashcard,
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

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const payloadParsed = updateContentSchema.safeParse(json);
    if (!payloadParsed.success) {
      return validationFailed(payloadParsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const updated = (await Promise.race([
      updateFlashcardContent(supabase, idParsed.data.id, payloadParsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof updateFlashcardContent>>;

    return json(updated, 200);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] PATCH failed", error);
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

    const TIMEOUT_MS = 10000;
    await Promise.race([
      softDeleteFlashcard(supabase, parsed.data.id),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] DELETE failed", error);
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
