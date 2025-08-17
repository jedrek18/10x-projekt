import type { SupabaseClient } from "../../db/supabase.client";
import type { ProfileDTO, ProfileUpdateCommand } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export class NotFoundError extends Error {
  code = "not_found" as const;
}

export async function getCurrentProfile(supabase: TypedSupabase): Promise<ProfileDTO> {
  const { userId } = await assertAuthenticated(supabase);

  console.log("getCurrentProfile called for userId:", userId);

  // First try to get existing profile
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, is_admin, created_at")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.log("Profile not found, creating new profile for userId:", userId);
    // Profile doesn't exist, create it automatically
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        user_id: userId,
        is_admin: false,
        created_at: new Date().toISOString(),
      })
      .select("user_id, is_admin, created_at")
      .single();

    if (insertError) {
      console.error("Failed to create profile:", insertError);
      throw new Error(`Failed to create profile: ${insertError.message}`);
    }

    console.log("Profile created successfully for userId:", userId);
    return newProfile as ProfileDTO;
  }

  console.log("Existing profile found for userId:", userId);
  return data as ProfileDTO;
}

export async function updateCurrentProfile(
  supabase: TypedSupabase,
  _command: ProfileUpdateCommand
): Promise<ProfileDTO> {
  // MVP: No editable fields; simply return current profile after auth.
  return getCurrentProfile(supabase);
}
