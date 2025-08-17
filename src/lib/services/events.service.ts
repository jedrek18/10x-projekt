import type { SupabaseClient } from "../../db/supabase.client";
import type { EventCreateCommand } from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

/**
 * Insert a telemetry event for the authenticated user.
 * Relies on RLS to enforce `user_id = auth.uid()` constraints.
 */
export async function createEvent(supabase: TypedSupabase, cmd: EventCreateCommand): Promise<void> {
  const { userId } = await assertAuthenticated(supabase);
  const { error } = await supabase.from("event_log").insert({
    user_id: userId,
    event_name: cmd.event_name,
    request_id: cmd.request_id,
    properties: cmd.properties ?? {},
  });
  if (error) {
    throw new Error(`Failed to create event: ${error.message}`);
  }
}
