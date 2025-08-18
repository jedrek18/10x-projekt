export const prerender = false;

import type { APIRoute } from "astro";
import { grammarCorrectionSchema } from "../../../lib/validation/ai";
import { assertAuthenticated, correctGrammar, UnauthorizedError } from "../../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../../lib/http";
import { rateLimit } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const { userId } = await assertAuthenticated(supabase);

    // Rate limiting
    const identifier = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const { limited } = await rateLimit(identifier);

    if (limited) {
      return errorJson("Rate limit exceeded", "rate_limit_exceeded", 429);
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return errorJson("Unsupported Media Type", "unsupported_media_type", 415);
    }

    const json = await request.json().catch(() => null);
    if (!json || typeof json !== "object") {
      return errorJson("Invalid JSON body", "invalid_json", 400);
    }

    const parsed = grammarCorrectionSchema.safeParse(json);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const { text, language, includeExplanations } = parsed.data;

    // Build prompt based on parameters
    let prompt = `Popraw błędy gramatyczne w następującym tekście`;
    if (language) {
      prompt += ` (język: ${language})`;
    }
    prompt += `: ${text}`;

    if (includeExplanations) {
      prompt += `\n\nDla każdej poprawki podaj wyjaśnienie dlaczego została wprowadzona.`;
    }

    const result = await correctGrammar(supabase, text, userId);

    return json(result, 200);
  } catch (error) {
    console.error("[api/ai/grammar] POST failed", error);

    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }

    if (error instanceof Error) {
      if (error.message.includes("Rate limit")) {
        return errorJson("Rate limit exceeded", "rate_limit_exceeded", 429);
      }
      if (error.message.includes("Invalid API key")) {
        return errorJson("Service temporarily unavailable", "service_unavailable", 503);
      }
    }

    return errorJson("Internal Server Error", "server_error", 500);
  }
};
