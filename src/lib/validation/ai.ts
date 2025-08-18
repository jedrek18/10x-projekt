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

// ============================================================================
// TRANSLATION SCHEMAS
// ============================================================================

export const translationSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(5000, "Text too long (max 5000 characters)"),
  targetLanguage: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format"),
  sourceLanguage: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format")
    .optional(),
});

export type TranslationCommand = z.infer<typeof translationSchema>;

// ============================================================================
// GRAMMAR CORRECTION SCHEMAS
// ============================================================================

export const grammarCorrectionSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(2000, "Text too long (max 2000 characters)"),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format")
    .optional(),
  includeExplanations: z.boolean().default(true),
});

export type GrammarCorrectionCommand = z.infer<typeof grammarCorrectionSchema>;

// ============================================================================
// VOCABULARY EXPLANATION SCHEMAS
// ============================================================================

export const vocabularyExplanationSchema = z.object({
  word: z.string().min(1, "Word cannot be empty").max(100, "Word too long (max 100 characters)"),
  context: z.string().max(500, "Context too long (max 500 characters)").optional(),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format")
    .optional(),
  includeExamples: z.boolean().default(true),
  includeSynonyms: z.boolean().default(true),
});

export type VocabularyExplanationCommand = z.infer<typeof vocabularyExplanationSchema>;

// ============================================================================
// TEXT ANALYSIS SCHEMAS
// ============================================================================

export const textAnalysisSchema = z.object({
  text: z.string().min(1, "Text cannot be empty").max(10000, "Text too long (max 10000 characters)"),
  analysisType: z.enum(["complexity", "keywords", "topics", "reading_time", "all"]).default("all"),
  language: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format")
    .optional(),
});

export type TextAnalysisCommand = z.infer<typeof textAnalysisSchema>;

// ============================================================================
// STUDY RECOMMENDATION SCHEMAS
// ============================================================================

export const studyRecommendationSchema = z.object({
  userLevel: z.enum(["beginner", "intermediate", "advanced"]).default("intermediate"),
  targetLanguage: z
    .string()
    .min(2, "Language code must be at least 2 characters")
    .max(10, "Language code too long")
    .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, "Invalid language code format"),
  focusAreas: z
    .array(z.enum(["vocabulary", "grammar", "pronunciation", "listening", "reading", "writing"]))
    .min(1, "At least one focus area must be selected")
    .max(6, "Too many focus areas selected"),
  availableTime: z.number().min(5, "Minimum 5 minutes").max(480, "Maximum 8 hours").optional(),
  includeResources: z.boolean().default(true),
});

export type StudyRecommendationCommand = z.infer<typeof studyRecommendationSchema>;
