import type { SupabaseClient } from "../../db/supabase.client";
import type {
  FlashcardDTO,
  FlashcardCreateManualCommand,
  FlashcardUpdateContentCommand,
  FlashcardBatchSaveRequest,
  FlashcardBatchSaveResponse,
  FlashcardBatchSaveSavedItem,
  FlashcardBatchSaveSkippedItem,
  UUID,
} from "../../types";
import { assertAuthenticated } from "./ai.service";

export type TypedSupabase = SupabaseClient;

export class ValidationError extends Error {
  code = "validation_failed" as const;
}

export class ConflictError extends Error {
  code = "conflict" as const;
}

export class NotFoundError extends Error {
  code = "not_found" as const;
}

export class SoftDeletedConflictError extends Error {
  code = "conflict_soft_deleted" as const;
}

async function canonicalizeText(supabase: TypedSupabase, text: string): Promise<string> {
  const { data, error } = await supabase.rpc("canonicalize_text", { t: text });
  if (error) {
    throw new Error(`Failed to canonicalize text: ${error.message}`);
  }
  return (data as string) ?? text.trim();
}

export async function listFlashcards(
  supabase: TypedSupabase,
  params: { limit: number; offset: number; order: "created_at.desc" | "created_at.asc" }
): Promise<{ items: FlashcardDTO[]; count: number }>
{
  await assertAuthenticated(supabase);
  const ascending = params.order === "created_at.asc";
  const rangeStart = params.offset;
  const rangeEnd = params.offset + params.limit - 1;
  const query = supabase
    .from("flashcards")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending })
    .order("id", { ascending: !ascending })
    .range(rangeStart, rangeEnd);

  const { data, error, count } = await query;
  if (error) {
    throw new Error(`Failed to list flashcards: ${error.message}`);
  }
  return { items: (data as FlashcardDTO[]) ?? [], count: count ?? 0 };
}

export async function createManualFlashcard(
  supabase: TypedSupabase,
  command: FlashcardCreateManualCommand
): Promise<FlashcardDTO>
{
  const { userId } = await assertAuthenticated(supabase);
  const frontCanon = await canonicalizeText(supabase, command.front);
  const backCanon = await canonicalizeText(supabase, command.back);
  if (frontCanon.toLowerCase() === backCanon.toLowerCase()) {
    throw new ValidationError("front and back must differ after canonicalization");
  }

  const insertPayload = {
    user_id: userId,
    front: command.front.trim(),
    back: command.back.trim(),
    source: "manual" as const,
  } as const;

  const { data, error } = await supabase
    .from("flashcards")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    // Unique violation -> conflict (e.g., duplicate content_hash)
    if ((error as any)?.code === "23505" || (error as any)?.code === "409") {
      throw new ConflictError(error.message);
    }
    // Constraint violation -> validation failed
    if ((error as any)?.code === "23514") {
      throw new ValidationError(error.message);
    }
    throw new Error(`Failed to create flashcard: ${error.message}`);
  }

  return data as FlashcardDTO;
}

export async function getFlashcardById(
  supabase: TypedSupabase,
  id: UUID
): Promise<FlashcardDTO>
{
  await assertAuthenticated(supabase);
  const { data, error } = await supabase
    .from("flashcards")
    .select("*")
    .eq("id", id)
    .single();
  if (error) {
    throw new NotFoundError("Flashcard not found");
  }
  return data as FlashcardDTO;
}

export async function updateFlashcardContent(
  supabase: TypedSupabase,
  id: UUID,
  command: FlashcardUpdateContentCommand
): Promise<FlashcardDTO>
{
  const current = await getFlashcardById(supabase, id);
  if (current.deleted_at) {
    throw new SoftDeletedConflictError("Cannot edit a soft-deleted card");
  }

  const nextFront = command.front != null ? command.front.trim() : undefined;
  const nextBack = command.back != null ? command.back.trim() : undefined;

  // Validate canonicalized inequality when both provided or when one equals current counterpart
  const frontCanon = await canonicalizeText(supabase, nextFront ?? current.front);
  const backCanon = await canonicalizeText(supabase, nextBack ?? current.back);
  if (frontCanon.toLowerCase() === backCanon.toLowerCase()) {
    throw new ValidationError("front and back must differ after canonicalization");
  }

  const { data, error } = await supabase
    .from("flashcards")
    .update({
      ...(nextFront != null ? { front: nextFront } : {}),
      ...(nextBack != null ? { back: nextBack } : {}),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    if ((error as any)?.code === "23505" || (error as any)?.code === "409") {
      throw new ConflictError(error.message);
    }
    if ((error as any)?.code === "23514") {
      throw new ValidationError(error.message);
    }
    // If update returned error but record exists, treat as generic failure
    throw new Error(`Failed to update flashcard: ${error.message}`);
  }

  if (!data) {
    // If no row returned, treat as not found
    throw new NotFoundError("Flashcard not found");
  }

  return data as FlashcardDTO;
}

export async function softDeleteFlashcard(
  supabase: TypedSupabase,
  id: UUID
): Promise<void>
{
  // Ensure the card exists and is owned by the user (enforced by RLS)
  await getFlashcardById(supabase, id);
  const { error } = await supabase.rpc("delete_flashcard", { card_id: id });
  if (error) {
    throw new Error(`Failed to soft-delete: ${error.message}`);
  }
}

function generateUuidV4(): UUID {
  const tpl = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return tpl.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
}

export async function batchSaveFlashcards(
  supabase: TypedSupabase,
  request: FlashcardBatchSaveRequest,
  idempotencyKey?: string
): Promise<FlashcardBatchSaveResponse>
{
  const { userId } = await assertAuthenticated(supabase);

  const requestId: UUID = (idempotencyKey as UUID) ?? generateUuidV4();

  // Idempotency: return previous response if present
  if (idempotencyKey) {
    const { data: existing, error: existingErr } = await supabase
      .from("event_log")
      .select("properties, request_id")
      .eq("event_name", "save")
      .eq("request_id", requestId)
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existingErr && existing && (existing.properties as any)?.response) {
      return (existing.properties as any).response as FlashcardBatchSaveResponse;
    }
  }

  // Deduplicate within request using canonicalization
  const seen = new Set<string>();
  const uniqueItems = [] as { index: number; front: string; back: string; source: "ai" | "ai_edited"; key: string }[];
  const skipped: FlashcardBatchSaveSkippedItem[] = [];

  for (let i = 0; i < request.items.length; i++) {
    const item = request.items[i];
    // Canonicalize to build a deterministic key
    // Note: canonicalization RPC may be expensive in a loop; run sequentially given small max (100)
    const frontCanon = await canonicalizeText(supabase, item.front);
    const backCanon = await canonicalizeText(supabase, item.back);
    const key = `${frontCanon.toLowerCase()}|${backCanon.toLowerCase()}`;
    if (seen.has(key)) {
      skipped.push({ front: item.front, reason: "duplicate" });
      continue;
    }
    seen.add(key);
    uniqueItems.push({ index: i, front: item.front.trim(), back: item.back.trim(), source: item.source, key });
  }

  // Attempt insert while ignoring duplicates against existing rows
  let saved: FlashcardBatchSaveSavedItem[] = [];
  if (uniqueItems.length > 0) {
    const rows = uniqueItems.map((u) => ({
      user_id: userId,
      front: u.front,
      back: u.back,
      source: u.source,
    }));

    // Use upsert to leverage onConflict and ignore duplicates
    const { data, error } = await supabase
      .from("flashcards")
      .upsert(rows, { onConflict: "user_id,content_hash", ignoreDuplicates: true })
      .select("id, source");

    if (error) {
      // If constraint violations or others, surface as validation errors
      if ((error as any)?.code === "23514") {
        throw new ValidationError(error.message);
      }
      throw new Error(`Failed to batch save: ${error.message}`);
    }

    const inserted = (data ?? []) as { id: UUID; source: string; front?: string; back?: string }[];
    saved = inserted.map((row) => ({ id: row.id as UUID, source: (row.source as any) }));

    // Build set of canonical keys that ended up in DB from this request,
    // so we can identify which uniqueItems were not inserted (duplicates in DB).
    const insertedKeys = new Set<string>();
    for (const row of inserted) {
      const rowFront = typeof row.front === "string" ? row.front : "";
      const rowBack = typeof row.back === "string" ? row.back : "";
      const f = await canonicalizeText(supabase, rowFront);
      const b = await canonicalizeText(supabase, rowBack);
      insertedKeys.add(`${f.toLowerCase()}|${b.toLowerCase()}`);
    }

    for (const u of uniqueItems) {
      if (!insertedKeys.has(u.key)) {
        skipped.push({ front: u.front, reason: "duplicate" });
      }
    }
  }

  const response: FlashcardBatchSaveResponse = { saved, skipped };

  // Log telemetry event; store response in properties for idempotency replay
  try {
    await supabase.from("event_log").insert({
      user_id: userId,
      event_name: "save",
      request_id: requestId,
      properties: { response },
    });
  } catch {
    // ignore telemetry failures
  }

  return response;
}


