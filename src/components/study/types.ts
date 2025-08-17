import type { UUID, ReviewRating, ISODateTimeString } from "../../types";

/**
 * ViewModel dla elementu kolejki SRS
 */
export interface SrsQueueItemVM {
  id: UUID;
  front: string;
  back: string | null;
  state: "new" | "learning" | "review" | "relearning";
  due_at: string | null;
  revealed: boolean; // UI state
  pending: boolean; // ocena w toku
}

/**
 * ViewModel dla metadanych kolejki
 */
export interface QueueMetaVM {
  due_count: number;
  new_selected: number;
  daily_goal: number;
  reviews_done_today: number; // pochodzi z /api/progress lub zliczane lokalnie w sesji
}

/**
 * Element w outboxie (oceny oczekujące na wysłanie)
 */
export interface OutboxItem {
  card_id: UUID;
  rating: ReviewRating;
  queued_at: ISODateTimeString;
  attempts: number;
}

/**
 * Statystyki outboxu
 */
export interface OutboxStats {
  count: number;
  items: OutboxItem[];
}

/**
 * Stan widoku study
 */
export interface StudyViewState {
  status: "idle" | "loading" | "ready" | "error";
  items: SrsQueueItemVM[];
  currentIndex: number;
  meta: QueueMetaVM;
  lastError?: string;
}

/**
 * Kontekst stanu online
 */
export interface OnlineStatusContext {
  online: boolean;
  lastError?: string;
}

/**
 * Kontekst outboxu
 */
export interface OutboxContext {
  enqueue: (item: OutboxItem) => void;
  flush: () => Promise<void>;
  stats: OutboxStats;
}
