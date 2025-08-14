import { z } from "zod";
import { EVENT_PROPERTIES_MAX_BYTES } from "../config";

// Generic JSON value schema to validate Supabase JSON-compatible payloads
const jsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(jsonValueSchema), z.record(jsonValueSchema)])
);

/**
 * Validation schema for telemetry event creation.
 * - event_name constrained to allowed values
 * - request_id must be a UUID
 * - properties optional JSON with size limit (~8KB)
 */
export const eventCreateSchema = z.object({
  event_name: z.enum(["generation", "save"]),
  request_id: z.string().uuid(),
  properties: jsonValueSchema
    .optional()
    .refine((val) => {
      if (val == null) return true;
      try {
        const json = JSON.stringify(val);
        // Enforce a conservative size cap for properties (configurable)
        return new TextEncoder().encode(json).length <= EVENT_PROPERTIES_MAX_BYTES;
      } catch {
        return false;
      }
    }, { message: "properties is too large or not serializable" }),
});

export type EventCreateValidated = z.infer<typeof eventCreateSchema>;


