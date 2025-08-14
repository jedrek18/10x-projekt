import { z } from "zod";

/**
 * Validation schemas and helpers for Admin API endpoints
 */

export const auditLogsQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((value) => (value == null || value === "" ? undefined : Number(value)))
      .pipe(z.number().int().min(1).max(100))
      .optional(),
    offset: z
      .string()
      .optional()
      .transform((value) => (value == null || value === "" ? undefined : Number(value)))
      .pipe(z.number().int().min(0))
      .optional(),
    action: z.string().min(1).max(128).optional(),
    user_id: z.string().uuid().optional(),
    card_id: z.string().uuid().optional(),
  })
  .transform((input) => ({
    limit: input.limit ?? 50,
    offset: input.offset ?? 0,
    action: input.action,
    user_id: input.user_id,
    card_id: input.card_id,
  }));

export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;
