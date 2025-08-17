import type { SupabaseClient } from "../../db/supabase.client";
import type {
  SrsQueueResponse,
  SrsPromoteNewCommand,
  SrsPromoteNewResponse,
  SrsReviewCommand,
  SrsReviewResultDTO,
  UUID,
  FlashcardState,
} from "../../types";
import { assertAuthenticated } from "./ai.service";
import { getCurrentProfile } from "./profile.service";
import {
  SRS_DEFAULT_DAILY_GOAL,
  SRS_DEFAULT_NEW_LIMIT,
  SRS_MAX_NEW_PER_DAY_CAP,
  SRS_MIN_EASE_FACTOR,
  SRS_SHORT_RELEARNING_MINUTES,
} from "../config";

export type TypedSupabase = SupabaseClient;

export class ValidationError extends Error {
  code = "validation_failed" as const;
}

export class NotFoundError extends Error {
  code = "not_found" as const;
}

function getTodayUtcDateString(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export async function buildQueue(supabase: TypedSupabase, goalHint?: number): Promise<SrsQueueResponse> {
  const { userId } = await assertAuthenticated(supabase);

  // Ensure user profile exists
  await getCurrentProfile(supabase);

  // Fetch settings
  const { data: settings } = await supabase
    .from("user_settings")
    .select("daily_goal,new_limit")
    .eq("user_id", userId)
    .maybeSingle();

  // Defaults if user has no settings yet
  const userDailyGoal = Math.max(1, settings?.daily_goal ?? goalHint ?? SRS_DEFAULT_DAILY_GOAL);
  const userNewLimit = Math.max(0, Math.min(settings?.new_limit ?? SRS_DEFAULT_NEW_LIMIT, 100));

  // Progress for today
  const today = getTodayUtcDateString();
  const { data: progress } = await supabase
    .from("user_daily_progress")
    .select("goal_override,reviews_done")
    .eq("user_id", userId)
    .eq("date_utc", today)
    .maybeSingle();

  const effectiveDailyGoal = Math.max(1, progress?.goal_override ?? userDailyGoal);
  const reviewsDoneToday = progress?.reviews_done ?? 0;
  const remainingForToday = Math.max(effectiveDailyGoal - reviewsDoneToday, 0);

  // Due cards - limit to remaining daily goal
  const { data: dueCardsRaw } = await supabase
    .from("flashcards")
    .select("id,front,back,state,due_at")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .not("due_at", "is", null)
    .lte("due_at", nowIso())
    .order("due_at", { ascending: true })
    .limit(remainingForToday); // Limit to remaining daily goal instead of 200

  const due = (dueCardsRaw ?? []).map((c) => ({
    id: c.id as UUID,
    front: c.front,
    back: c.back,
    state: c.state as FlashcardState,
    due_at: c.due_at,
  }));

  // Candidate new cards (not yet introduced) - fill remaining slots
  const remainingAfterDue = Math.max(remainingForToday - due.length, 0);
  const maxNewToShow = Math.max(0, Math.min(userNewLimit, SRS_MAX_NEW_PER_DAY_CAP, remainingAfterDue));

  const { data: newCardsRaw } = await supabase
    .from("flashcards")
    .select("id,front,back,state")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("introduced_on", null)
    .eq("state", "new")
    .order("created_at", { ascending: true })
    .limit(maxNewToShow);

  const newCards = (newCardsRaw ?? []).map((c) => ({
    id: c.id as UUID,
    front: c.front,
    back: c.back,
    state: c.state as FlashcardState,
    due_at: null,
  }));

  return {
    due,
    new: newCards,
    meta: {
      due_count: due.length,
      new_selected: newCards.length,
      daily_goal: effectiveDailyGoal,
    },
  };
}

export async function promoteNew(supabase: TypedSupabase, cmd: SrsPromoteNewCommand): Promise<SrsPromoteNewResponse> {
  const { userId } = await assertAuthenticated(supabase);

  // Ensure user profile exists
  await getCurrentProfile(supabase);

  const today = getTodayUtcDateString();
  const { data: settings } = await supabase
    .from("user_settings")
    .select("new_limit")
    .eq("user_id", userId)
    .maybeSingle();
  const newLimit = Math.max(0, Math.min(settings?.new_limit ?? SRS_DEFAULT_NEW_LIMIT, 100));

  const { data: progress } = await supabase
    .from("user_daily_progress")
    .select("new_introduced")
    .eq("user_id", userId)
    .eq("date_utc", today)
    .maybeSingle();

  const introduced = progress?.new_introduced ?? 0;
  const remainingAllowance = Math.max(newLimit - introduced, 0);
  const requested = cmd?.count == null ? remainingAllowance : Math.max(0, Math.min(cmd.count, 100));
  const toPromote = Math.max(0, Math.min(requested, remainingAllowance, SRS_MAX_NEW_PER_DAY_CAP));

  if (toPromote === 0) {
    return { promoted: [], remaining_allowance: remainingAllowance };
  }

  const { data: candidates } = await supabase
    .from("flashcards")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .is("introduced_on", null)
    .eq("state", "new")
    .order("created_at", { ascending: true })
    .limit(toPromote);

  const ids = (candidates ?? []).map((c) => c.id as UUID);
  if (ids.length === 0) {
    return { promoted: [], remaining_allowance: remainingAllowance };
  }

  // Mark cards as introduced today
  const { error: updErr } = await supabase
    .from("flashcards")
    .update({ introduced_on: today })
    .in("id", ids)
    .eq("user_id", userId)
    .is("deleted_at", null);
  if (updErr) {
    throw new Error(`Failed to promote new cards: ${updErr.message}`);
  }

  // Optimistic concurrency: attempt guarded update; if no row exists, insert; if concurrent change happened, best effort re-read
  let updated = false;
  {
    const { data: updData, error: updErr } = await supabase
      .from("user_daily_progress")
      .update({ new_introduced: introduced + ids.length })
      .eq("user_id", userId)
      .eq("date_utc", today)
      .eq("new_introduced", introduced)
      .select("user_id")
      .maybeSingle();
    if (updErr) {
      throw new Error(`Failed to update progress: ${updErr.message}`);
    }
    updated = !!updData;
  }
  if (!updated) {
    const { error: insErr } = await supabase
      .from("user_daily_progress")
      .upsert({ user_id: userId, date_utc: today, new_introduced: introduced + ids.length } as any);
    if (insErr) {
      throw new Error(`Failed to upsert progress: ${insErr.message}`);
    }
  }

  // Audit log for promotion
  try {
    await supabase.from("audit_log").insert({
      acted_by: userId,
      action: "promote_new",
      card_id: null,
      details: { count: ids.length, card_ids: ids },
      target_user_id: userId,
    } as any);
  } catch {}

  const remaining = Math.max(remainingAllowance - ids.length, 0);
  return { promoted: ids.map((id) => ({ id, source: "ai" })) as any, remaining_allowance: remaining };
}

export async function reviewCard(supabase: TypedSupabase, cmd: SrsReviewCommand): Promise<SrsReviewResultDTO> {
  const { userId } = await assertAuthenticated(supabase);

  // Ensure user profile exists
  await getCurrentProfile(supabase);

  if (cmd.rating < 0 || cmd.rating > 3) {
    throw new ValidationError("rating must be between 0 and 3");
  }

  const { data: card } = await supabase
    .from("flashcards")
    .select("id,state,due_at,interval_days,ease_factor,reps,lapses,last_reviewed_at,last_rating")
    .eq("id", cmd.card_id)
    .eq("user_id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!card) {
    throw new NotFoundError("Card not found");
  }

  const now = new Date();
  const nowStr = now.toISOString();

  // Basic SM-2 like adjustments (simplified)
  let ease = card.ease_factor ?? 2.5;
  let interval = card.interval_days ?? 0;
  let state: FlashcardState = card.state as FlashcardState;
  let dueAt: string | null = null;
  const reps = (card.reps ?? 0) + 1;
  let lapses = card.lapses ?? 0;

  if (cmd.rating === 0) {
    ease = Math.max(SRS_MIN_EASE_FACTOR, ease - 0.3);
    interval = 0;
    lapses += 1;
    state = "relearning";
    dueAt = new Date(now.getTime() + SRS_SHORT_RELEARNING_MINUTES * 60 * 1000).toISOString();
  } else if (cmd.rating === 1) {
    ease = Math.max(SRS_MIN_EASE_FACTOR, ease - 0.2);
    interval = Math.max(1, Math.round(interval * 0.5));
    state = state === "new" ? "learning" : "learning";
    dueAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 1 day
  } else if (cmd.rating === 2) {
    ease = Math.max(SRS_MIN_EASE_FACTOR, ease);
    interval = interval <= 0 ? 1 : Math.round(interval * ease);
    state = "review";
    dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();
  } else if (cmd.rating === 3) {
    ease = Math.max(SRS_MIN_EASE_FACTOR, ease + 0.1);
    interval = interval <= 0 ? 2 : Math.round(interval * ease + 1);
    state = "review";
    dueAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000).toISOString();
  }

  const { error: updateErr } = await supabase.rpc("update_flashcard_srs_rpc", {
    card_id: cmd.card_id,
    new_state: state,
    new_due_at: dueAt,
    new_interval_days: interval,
    new_ease_factor: ease,
    new_reps: reps,
    new_lapses: lapses,
    new_last_reviewed_at: nowStr,
    new_last_rating: cmd.rating,
  });
  if (updateErr) {
    throw new Error(`Failed to update card: ${updateErr.message}`);
  }

  // Increment reviews_done for today with optimistic concurrency
  const today = getTodayUtcDateString();
  const { data: prog } = await supabase
    .from("user_daily_progress")
    .select("reviews_done")
    .eq("user_id", userId)
    .eq("date_utc", today)
    .maybeSingle();
  const reviewsDone = (prog?.reviews_done ?? 0) + 1;
  {
    const { error: updErr } = await supabase
      .from("user_daily_progress")
      .update({ reviews_done: reviewsDone })
      .eq("user_id", userId)
      .eq("date_utc", today)
      .eq("reviews_done", prog?.reviews_done ?? 0);
    if (updErr) {
      // fallback: upsert (best effort)
      await supabase
        .from("user_daily_progress")
        .upsert({ user_id: userId, date_utc: today, reviews_done: reviewsDone } as any);
    }
  }

  // Audit log for review
  try {
    await supabase.from("audit_log").insert({
      acted_by: userId,
      action: "review",
      card_id: cmd.card_id,
      details: { rating: cmd.rating, new_state: state, due_at: dueAt },
      target_user_id: userId,
    } as any);
  } catch {}

  return {
    card_id: cmd.card_id as UUID,
    state,
    due_at: dueAt,
    interval_days: interval,
    ease_factor: ease,
    reps,
    lapses,
    last_reviewed_at: nowStr,
    last_rating: cmd.rating,
  };
}
