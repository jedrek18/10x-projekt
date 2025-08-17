export const prerender = false;

import type { APIRoute } from "astro";
import { translationSchema } from "../../../lib/validation/ai";
import { assertAuthenticated, translateText, UnauthorizedError } from "../../../lib/services/ai.service";
import { json, errorJson, validationFailed } from "../../../lib/http";
import { rateLimit } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = locals.supabase;
    const { userId } = await assertAuthenticated(supabase);

    // Rate limiting
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
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

    const parsed = translationSchema.safeParse(json);
    if (!parsed.success) {
      return validationFailed(parsed.error.flatten());
    }

    const { text, targetLanguage, sourceLanguage } = parsed.data;

    // Add source language to the prompt if provided
    const prompt = sourceLanguage 
      ? `Przetłumacz następujący tekst z języka ${sourceLanguage} na język ${targetLanguage}: ${text}`
      : `Przetłumacz następujący tekst na język ${targetLanguage}: ${text}`;

    const result = await translateText(supabase, text, targetLanguage, userId);

    return json(result, 200);
  } catch (error) {
    console.error("[api/ai/translate] POST failed", error);
    
    if (error instanceof UnauthorizedError) {
      return errorJson("Unauthorized", "unauthorized", 401);
    }
    
    if (error instanceof Error) {
      if (error.message.includes('Rate limit')) {
        return errorJson("Rate limit exceeded", "rate_limit_exceeded", 429);
      }
      if (error.message.includes('Invalid API key')) {
        return errorJson("Service temporarily unavailable", "service_unavailable", 503);
      }
    }
    
    return errorJson("Internal Server Error", "server_error", 500);
  }
};
