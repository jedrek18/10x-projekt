import type { SupabaseClient } from "../../db/supabase.client";

interface ErrorPayload {
  endpoint: string;
  message?: string;
  details?: unknown;
  error?: unknown;
}

export async function logError(supabase: SupabaseClient | undefined, payload: ErrorPayload): Promise<void> {
  try {
    if (!supabase) return;
    let userId: string | null = null;
    try {
      const { data } = await supabase.auth.getUser();
      userId = data?.user?.id ?? null;
    } catch {}
    const safeMessage = payload.message ?? (payload.error as any)?.message ?? "unknown";
    const safeStack = (payload.error as any)?.stack ?? null;
    await supabase.from("app_errors").insert({
      user_id: userId,
      endpoint: payload.endpoint,
      message: safeMessage,
      details: payload.details ?? null,
      stack: safeStack,
    } as any);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[error-logger] failed to log error", e, payload);
  }
}
