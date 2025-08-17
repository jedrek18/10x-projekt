import type { SupabaseClient } from "../../db/supabase.client";
import type { GetProgressResponseDTO, UserDailyProgressDTO } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export async function fetchDailyProgress(
  supabase: TypedSupabase,
  params: { date?: string; start?: string; end?: string }
): Promise<GetProgressResponseDTO> {
  const { userId } = await assertAuthenticated(supabase);
  let query = supabase
    .from("user_daily_progress")
    .select("*")
    .eq("user_id", userId)
    .order("date_utc", { ascending: true });

  if (params.date) {
    query = query.eq("date_utc", params.date);
  } else if (params.start && params.end) {
    query = query.gte("date_utc", params.start).lte("date_utc", params.end);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to fetch progress: ${error.message}`);
  }
  return { items: (data as UserDailyProgressDTO[]) ?? [] };
}

export async function upsertGoalOverride(
  supabase: TypedSupabase,
  dateUtc: string,
  goalOverride: number | null
): Promise<UserDailyProgressDTO> {
  const { userId } = await assertAuthenticated(supabase);
  const { data, error } = await supabase
    .from("user_daily_progress")
    .upsert({ user_id: userId, date_utc: dateUtc, goal_override: goalOverride }, { onConflict: "user_id,date_utc" })
    .select("*")
    .single();

  if (error) {
    // 23514 = check constraint violation, treat as validation error
    if ((error as any)?.code === "23514") {
      const err = new Error("Validation failed");
      (err as any).code = "validation_failed";
      throw err;
    }
    throw new Error(`Failed to upsert goal_override: ${error.message}`);
  }
  return data as UserDailyProgressDTO;
}
