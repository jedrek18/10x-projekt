import type { SupabaseClient } from "../../db/supabase.client";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export class NotFoundError extends Error {
  code = "not_found" as const;
}

export async function ensureUserSettingsExists(supabase: TypedSupabase): Promise<UserSettingsDTO> {
  const { userId } = await assertAuthenticated(supabase);

  // Insert default row if missing (ignore on conflict)
  const { error: insertError } = await supabase
    .from("user_settings")
    .insert({ user_id: userId } as any)
    .onConflict("user_id")
    .ignore();
  if (insertError) {
    // Ignore 23505 duplicate errors defensively; otherwise surface
    if ((insertError as any)?.code !== "23505") {
      throw insertError;
    }
  }

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) {
    throw new NotFoundError("user_settings row not found");
  }
  return data as UserSettingsDTO;
}

export async function getUserSettings(supabase: TypedSupabase): Promise<UserSettingsDTO> {
  const { userId } = await assertAuthenticated(supabase);
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
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

  const { error: updateError } = await supabase
    .from("user_settings")
    .update(command)
    .eq("user_id", userId);
  if (updateError) {
    // 23514 check constraint violations → treat as validation errors at route layer
    const err = new Error(updateError.message);
    (err as any).code = (updateError as any)?.code;
    throw err;
  }

  // Return the latest view
  return getUserSettings(supabase);
}


