import { z } from "zod";

/**
 * Validation schemas for SRS (Study) endpoints.
 */

export const queueQuerySchema = z
  .object({
    goal_hint: z.coerce.number().int().min(1).max(1000).optional(),
  })
  .partial();

export const promoteNewSchema = z.object({
  count: z.coerce.number().int().min(0).max(100).optional(),
});

export const reviewSchema = z.object({
  card_id: z.string().uuid(),
  rating: z.coerce.number().int().min(0).max(3),
});

export type QueueQueryValidated = z.infer<typeof queueQuerySchema>;
export type PromoteNewValidated = z.infer<typeof promoteNewSchema>;
export type ReviewValidated = z.infer<typeof reviewSchema>;
