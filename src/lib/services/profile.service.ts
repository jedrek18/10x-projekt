import type { SupabaseClient } from "../../db/supabase.client";
import type { ProfileDTO, ProfileUpdateCommand } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export class NotFoundError extends Error {
  code = "not_found" as const;
}

export async function getCurrentProfile(supabase: TypedSupabase): Promise<ProfileDTO> {
  const { userId } = await assertAuthenticated(supabase);
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, is_admin, created_at")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new NotFoundError("Profile not found");
  }
  return data as ProfileDTO;
}

export async function updateCurrentProfile(
  supabase: TypedSupabase,
  _command: ProfileUpdateCommand
): Promise<ProfileDTO> {
  // MVP: No editable fields; simply return current profile after auth.
  return getCurrentProfile(supabase);
}
