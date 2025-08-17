import type { EventCreateCommand } from "../../types";

/**
 * Client-side helper to log telemetry events.
 * Uses fetch to POST to `/api/events` and ignores errors by default.
 */
export async function logClientEvent(event: EventCreateCommand): Promise<void> {
  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      credentials: "include",
    });
  } catch {
    // Intentionally ignore client-side errors; telemetry is best-effort.
  }
}
