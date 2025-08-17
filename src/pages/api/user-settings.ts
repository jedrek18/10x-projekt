export const prerender = false;

import type { APIRoute } from "astro";
import { userSettingsPatchSchema } from "../../lib/validation/user-settings";
import { ensureUserSettingsExists, getUserSettings, updateUserSettings } from "../../lib/services/userSettings.service";
import { json, errorJson, validationFailed } from "../../lib/http";
import { UnauthorizedError } from "../../lib/services/ai.service";
import { logError } from "../../lib/services/error-logger";

export const GET: APIRoute = async ({ locals }) => {
  try {
    const supabase = locals.supabase;
    // Ensure a row exists for this user, then return it.
    const TIMEOUT_MS = 10000;
    const settings = (await Promise.race([
      ensureUserSettingsExists(supabase),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof ensureUserSettingsExists>>;
    return json(settings, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/user-settings] GET failed", error);
    try {
      await logError(locals?.supabase, { endpoint: "/api/user-settings", error });
    } catch {}
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
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

    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = userSettingsPatchSchema.safeParse(body);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const TIMEOUT_MS = 10000;
    const updated = (await Promise.race([
      updateUserSettings(supabase, parsed.data),
      new Promise((_, reject) => {
        const err = new Error("Request timeout");
        (err as any).name = "AbortError";
        setTimeout(() => reject(err), TIMEOUT_MS);
      }),
    ])) as Awaited<ReturnType<typeof updateUserSettings>>;
    return json(updated, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[api/user-settings] PATCH failed", error);
    try {
      await logError(locals?.supabase, { endpoint: "/api/user-settings", error });
    } catch {}
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    if ((error as any)?.code === "23514") {
      // DB check constraint violation → validation failed
      return errorJson("Validation failed", "validation_failed", 422);
    }
    if ((error as Error)?.name === "AbortError") {
      return errorJson("Request timeout", "timeout", 408);
    }
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
