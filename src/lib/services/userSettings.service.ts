import type { SupabaseClient } from "../../db/supabase.client";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export class NotFoundError extends Error {
  code = "not_found" as const;
}

export async function ensureUserSettingsExists(supabase: TypedSupabase): Promise<UserSettingsDTO> {
  const { userId } = await assertAuthenticated(supabase);

  // First try to get existing settings
  const { data: existing, error: selectError } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    return existing as UserSettingsDTO;
  }

  // If not found, insert default row
  const { data: inserted, error: insertError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId })
    .select()
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create user settings: ${insertError?.message || "Unknown error"}`);
  }

  return inserted as UserSettingsDTO;
}

export async function getUserSettings(supabase: TypedSupabase): Promise<UserSettingsDTO> {
  const { userId } = await assertAuthenticated(supabase);
  const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).single();
  if (error || !data) {
    throw new NotFoundError("user_settings row not found");
  }
  return data as UserSettingsDTO;
}

export async function updateUserSettings(
  supabase: TypedSupabase,
  command: UserSettingsUpdateCommand
): Promise<UserSettingsDTO> {
  const { userId } = await assertAuthenticated(supabase);

  const { error: updateError } = await supabase.from("user_settings").update(command).eq("user_id", userId);
  if (updateError) {
    // 23514 check constraint violations → treat as validation errors at route layer
    const err = new Error(updateError.message);
    (err as any).code = (updateError as any)?.code;
    throw err;
  }

  // Return the latest view
  return getUserSettings(supabase);
}
