import type { Json, Tables, TablesInsert } from "./db/database.types";

/**
 * Shared primitives
 */
export type UUID = string;
export type ISODateString = string; // e.g., 2025-08-13
export type ISODateTimeString = string; // e.g., 2025-08-13T09:00:00Z
export type EmptyObject = Record<string, never>;

/**
 * Flashcard enums (DB stores as TEXT; we constrain at the API boundary)
 */
export type FlashcardSource = "manual" | "ai" | "ai_edited";
export type FlashcardState = "new" | "learning" | "review" | "relearning";
export type ReviewRating = 0 | 1 | 2 | 3; // 0=Again, 1=Hard, 2=Good, 3=Easy

/**
 * Profile
 */
export type ProfileDTO = Pick<Tables<"profiles">, "user_id" | "is_admin" | "created_at">;

// MVP: no user-editable fields; PATCH body is an empty object.
export type ProfileUpdateCommand = EmptyObject;

/**
 * User Settings
 */
export type UserSettingsDTO = Tables<"user_settings">;

export type UserSettingsUpdateCommand = Partial<Pick<Tables<"user_settings">, "daily_goal" | "new_limit">>;

/**
 * User Daily Progress
 */
export type UserDailyProgressDTO = Tables<"user_daily_progress">;

export interface UserDailyProgressUpdateCommand {
  /**
   * Update/clear the goal override for the provided `date_utc` (route param). Use `null` to clear.
   */
  goal_override: number | null;
}

/**
 * Flashcards
 */
export type FlashcardDTO = Tables<"flashcards">;

export type FlashcardCreateManualCommand = Pick<TablesInsert<"flashcards">, "front" | "back">;

/**
 * Update only content fields. At least one of `front`/`back` should be provided (not enforceable in type).
 */
export type FlashcardUpdateContentCommand = Partial<Pick<Tables<"flashcards">, "front" | "back">>;

/**
 * Batch Save of AI proposals
 */
export interface FlashcardBatchSaveItem {
  front: TablesInsert<"flashcards">["front"];
  back: TablesInsert<"flashcards">["back"];
  source: Extract<FlashcardSource, "ai" | "ai_edited">;
}

export interface FlashcardBatchSaveRequest {
  items: FlashcardBatchSaveItem[];
}

export interface FlashcardBatchSaveSavedItem {
  id: UUID;
  source: Extract<FlashcardSource, "ai" | "ai_edited">;
}

export interface FlashcardBatchSaveSkippedItem {
  front: string;
  reason: "duplicate" | string;
}

export interface FlashcardBatchSaveResponse {
  saved: FlashcardBatchSaveSavedItem[];
  skipped: FlashcardBatchSaveSkippedItem[];
}

/**
 * SRS / Study Queue
 */
export interface SrsQueueCardDTO {
  id: UUID;
  front: string;
  /** Back may be elided until reveal. */
  back: string | null;
  state: FlashcardState;
  /** Present for due/review states, otherwise null. */
  due_at: ISODateTimeString | null;
}

export interface SrsQueueMetaDTO {
  due_count: number;
  new_selected: number;
  daily_goal: number;
}

export interface SrsQueueResponse {
  due: SrsQueueCardDTO[];
  new: SrsQueueCardDTO[];
  meta: SrsQueueMetaDTO;
}

export interface SrsPromoteNewCommand {
  /** Optional hint for how many new to promote (server caps by allowance). */
  count?: number;
}

export interface SrsPromoteNewResponse {
  promoted: UUID[];
  remaining_allowance: number;
}

export interface SrsReviewCommand {
  card_id: UUID;
  rating: ReviewRating;
}

export type SrsReviewResultDTO = Pick<
  Tables<"flashcards">,
  "state" | "due_at" | "interval_days" | "ease_factor" | "reps" | "lapses" | "last_reviewed_at" | "last_rating"
> & { card_id: UUID };

/**
 * AI Generation (no persistence of proposals)
 */
export interface AiGenerateCommand {
  source_text: string;
  max_proposals: number;
}

export type AiGenerationProposalDTO = Pick<Tables<"flashcards">, "front" | "back">;

export interface AiGenerateResponse {
  items: AiGenerationProposalDTO[];
  returned_count: number;
  request_id: UUID;
}

// SSE stream events (if streaming is used)
export interface AiGenerateSseEventProposal {
  type: "proposal";
  data: AiGenerationProposalDTO;
}

export interface AiGenerateSseEventProgress {
  type: "progress";
  data: { count: number };
}

export interface AiGenerateSseEventDone {
  type: "done";
  data: { returned_count: number; request_id: UUID };
}

export interface AiGenerateSseEventError {
  type: "error";
  data: { message: string };
}

export type AiGenerateSseEvent =
  | AiGenerateSseEventProposal
  | AiGenerateSseEventProgress
  | AiGenerateSseEventDone
  | AiGenerateSseEventError;

/**
 * Events (telemetry)
 */
export interface EventCreateCommand {
  event_name: "generation" | "save";
  request_id: UUID;
  properties?: Json;
}

/**
 * Admin
 */
export type AdminAuditLogDTO = Tables<"audit_log">;

export type AdminKpiTotalsDTO = Tables<"kpi_totals">;

/**
 * Auth (pass-through helpers)
 */
export interface AuthSignUpCommand {
  email: string;
  password: string;
}

export interface AuthSignInCommand {
  email: string;
  password: string;
}

export type AuthSignOutCommand = EmptyObject;

export interface AuthChangePasswordCommand {
  current_password: string;
  new_password: string;
}

export type AuthDeleteAccountCommand = EmptyObject;

/**
 * Health
 */
export interface HealthDTO {
  status: "ok";
  time: ISODateTimeString;
}
