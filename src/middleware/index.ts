import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../db/database.types";
import type { SupabaseClient } from "../db/supabase.client";
import { rateLimitPatchUserSettings } from "../lib/rate-limit";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const onRequest = defineMiddleware(async (context, next) => {
  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => context.cookies.get(name)?.value,
      set: (name, value, options) => {
        context.cookies.set(name, value, { ...options, path: options?.path ?? "/" });
      },
      remove: (name, options) => {
        context.cookies.delete(name, { path: options?.path ?? "/" });
      },
    },
    headers: {
      Authorization: context.request.headers.get("authorization") ?? undefined,
    },
  }) as unknown as SupabaseClient;

  context.locals.supabase = supabase;

  // Simple rate limiting for PATCH /api/user-settings (fixed window, in-memory)
  try {
    const url = new URL(context.request.url);
    if (context.request.method === "PATCH" && url.pathname === "/api/user-settings") {
      const ip = context.clientAddress || context.request.headers.get("x-forwarded-for") || undefined;
      const result = rateLimitPatchUserSettings(ip);
      if (result.limited) {
        return new Response(JSON.stringify({ error: "Too Many Requests", code: "rate_limited" }), {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...(result.retryAfterSeconds ? { "Retry-After": String(result.retryAfterSeconds) } : {}),
          },
        });
      }
    }
  } catch {}
  return next();
});
