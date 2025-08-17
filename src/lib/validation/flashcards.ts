import { z } from "zod";

/**
 * Validation schemas for Flashcards endpoints.
 */

const nonEmptyTrimmed = z
  .string()
  .transform((v) => (v == null ? "" : v))
  .pipe(z.string().trim().min(1).max(1000));

export const listQuerySchema = z
  .object({
    limit: z
      .number()
      .catch((val) => (typeof val === "string" ? Number(val) : val))
      .pipe(z.number().int().min(1).max(100))
      .default(25),
    offset: z
      .number()
      .catch((val) => (typeof val === "string" ? Number(val) : val))
      .pipe(z.number().int().min(0))
      .default(0),
    order: z.enum(["created_at.desc", "created_at.asc"]).default("created_at.desc"),
  })
  .partial()
  .transform((v) => ({
    limit: v.limit ?? 25,
    offset: v.offset ?? 0,
    order: v.order ?? "created_at.desc",
  }));

export const createManualSchema = z.object({
  front: nonEmptyTrimmed,
  back: nonEmptyTrimmed,
});

export const updateContentSchema = z
  .object({
    front: nonEmptyTrimmed.optional(),
    back: nonEmptyTrimmed.optional(),
  })
  .refine((obj) => obj.front != null || obj.back != null, {
    message: "At least one of 'front' or 'back' must be provided",
    path: ["front"],
  });

export const batchSaveSchema = z.object({
  items: z
    .array(
      z.object({
        front: nonEmptyTrimmed,
        back: nonEmptyTrimmed,
        source: z.enum(["ai", "ai_edited"]),
      })
    )
    .min(1)
    .max(100),
});

export type ListQuery = z.infer<typeof listQuerySchema>;
export type CreateManualValidated = z.infer<typeof createManualSchema>;
export type UpdateContentValidated = z.infer<typeof updateContentSchema>;
export type BatchSaveValidated = z.infer<typeof batchSaveSchema>;
