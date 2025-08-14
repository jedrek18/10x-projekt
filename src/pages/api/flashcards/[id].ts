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

const idParamSchema = z.object({ id: z.string().uuid() });

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const parsed = idParamSchema.safeParse(params);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: parsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const TIMEOUT_MS = 10000;
    const card = await Promise.race([
      getFlashcardById(supabase, parsed.data.id),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]) as Awaited<ReturnType<typeof getFlashcardById>>;

    return new Response(JSON.stringify(card), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: "Not found", code: "not_found" }), {
        status: 404,
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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Unsupported Media Type", code: "unsupported_media_type" }), {
        status: 415,
        headers: { "Content-Type": "application/json" },
      });
    }

    const idParsed = idParamSchema.safeParse(params);
    if (!idParsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: idParsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return new Response(JSON.stringify({ error: "Invalid JSON body", code: "invalid_json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payloadParsed = updateContentSchema.safeParse(json);
    if (!payloadParsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: payloadParsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
    }

    const TIMEOUT_MS = 10000;
    const updated = await Promise.race([
      updateFlashcardContent(supabase, idParsed.data.id, payloadParsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ]) as Awaited<ReturnType<typeof updateFlashcardContent>>;

    return new Response(JSON.stringify(updated), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/flashcards/[id]] PATCH failed", error);
    if (error instanceof UnauthorizedError) {
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: "Not found", code: "not_found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof SoftDeletedConflictError) {
      return new Response(JSON.stringify({ error: "Card is soft-deleted", code: "conflict_soft_deleted" }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof ConflictError) {
      return new Response(JSON.stringify({ error: "Conflict", code: "conflict" }), {
        status: 409,
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

export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const supabase = locals.supabase;
    const parsed = idParamSchema.safeParse(params);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Validation failed", code: "validation_failed", details: parsed.error.flatten() }),
        { status: 422, headers: { "Content-Type": "application/json" } }
      );
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
      return new Response(JSON.stringify({ error: "Unauthorized", code: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (error instanceof NotFoundError) {
      return new Response(JSON.stringify({ error: "Not found", code: "not_found" }), {
        status: 404,
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


