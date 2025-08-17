import type { UUID, FlashcardBatchSaveItem, FlashcardBatchSaveResponse } from "@/types";

/**
 * Proposal status for UI state management
 */
export type ProposalStatus = "pending" | "accepted" | "edited" | "deleted";

/**
 * Validation errors for proposal content
 */
export interface ValidationErrors {
  front?: string;
  back?: string;
}

/**
 * View model for a single proposal
 */
export interface ProposalVM {
  id: string;
  front: string;
  back: string;
  status: ProposalStatus;
  selected: boolean;
  sourceCandidate: Extract<FlashcardBatchSaveItem["source"], "ai" | "ai_edited">;
  errors?: ValidationErrors;
  frontCount: number;
  backCount: number;
}

/**
 * View model for proposals session
 */
export interface ProposalsSessionVM {
  requestId: UUID;
  requestedMax: number;
  receivedCount: number;
  done: boolean;
  items: ProposalVM[];
  createdAt: string;
  ttlExpiresAt: string;
}

/**
 * Save operation state
 */
export interface SaveState {
  loading: boolean;
  error?: string;
  result?: FlashcardBatchSaveResponse;
}

/**
 * TTL information for cache management
 */
export interface TTLInfo {
  expiresAt: string;
  remainingMs: number;
}

/**
 * Counts for bulk actions
 */
export interface ProposalCounts {
  total: number;
  accepted: number;
  selected: number;
  deleted: number;
}

/**
 * Disabled flags for bulk actions
 */
export interface BulkActionFlags {
  saveAccepted: boolean;
  saveAll: boolean;
  rejectAll: boolean;
  selectAll: boolean;
}
