export const prerender = false;

import type { APIRoute } from "astro";
import { profileUpdateCommandSchema } from "../../lib/validation/profile";
import { getCurrentProfile, updateCurrentProfile, NotFoundError } from "../../lib/services/profile.service";
import { UnauthorizedError } from "../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../lib/http";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const supabase = locals.supabase;
    const profile = await getCurrentProfile(supabase);
    return json(profile, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/me] GET failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not Found", "not_found", 404);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const json = await request.json().catch(() => null);
    if (json == null || typeof json !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = profileUpdateCommandSchema.safeParse(json);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    // MVP: No editable fields; ensure payload didn't sneak forbidden props (zod .strict() already enforces this)
    const updated = await updateCurrentProfile(supabase, parsed.data);
    return json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/me] PATCH failed", error);
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if (error instanceof NotFoundError) {
      return errorJson("Not Found", "not_found", 404);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
