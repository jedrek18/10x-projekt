import { defineMiddleware } from "astro:middleware";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "../db/database.types";
import type { SupabaseClient } from "../db/supabase.client";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const onRequest = defineMiddleware((context, next) => {
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
  return next();
});
