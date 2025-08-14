import { z } from "zod";

/**
 * Validation schemas for AI generation endpoints.
 */

export const generateSchema = z.object({
  source_text: z
    .string()
    .transform((v) => (v == null ? "" : v))
    .pipe(z.string().min(1000).max(10000)),
  max_proposals: z
    .number()
    .catch((val) => (typeof val === "string" ? Number(val) : val))
    .pipe(z.number().int().min(10).max(50)),
});

export type GenerateCommand = z.infer<typeof generateSchema>;


