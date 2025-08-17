import type { SupabaseClient } from "../../db/supabase.client";
import type {
  AiGenerateCommand,
  AiGenerateResponse,
  AiGenerationProposalDTO,
  AiGenerateSseEvent,
  EventCreateCommand,
  UUID,
} from "../../types";

export type TypedSupabase = SupabaseClient;

export class UnauthorizedError extends Error {}

function generateUuidV4(): UUID {
  // Non-crypto fallback for server context; upstream request_id is for telemetry only
  // and does not need to be unpredictable.
  const tpl = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
  return tpl.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  }) as UUID;
}

export async function assertAuthenticated(supabase: TypedSupabase): Promise<{ userId: string }> {
  const { data: authUser, error } = await supabase.auth.getUser();
  if (error || !authUser?.user) {
    throw new UnauthorizedError("Unauthorized");
  }
  return { userId: authUser.user.id };
}

function normalizeProposalText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function deduplicateProposals(items: AiGenerationProposalDTO[]): AiGenerationProposalDTO[] {
  const seen = new Set<string>();
  const result: AiGenerationProposalDTO[] = [];
  for (const item of items) {
    const front = normalizeProposalText(item.front);
    const back = normalizeProposalText(item.back);
    if (!front || !back || front.toLowerCase() === back.toLowerCase()) {
      continue;
    }
    const key = `${front.toLowerCase()}|${back.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ front, back });
  }
  return result;
}

export async function generateProposals(
  _supabase: TypedSupabase,
  command: AiGenerateCommand,
  _options?: { signal?: AbortSignal }
): Promise<AiGenerateResponse> {
  // Placeholder for real LLM call. For now, synthesize deterministic items based on input.
  const baseText = command.source_text.slice(0, 120);
  const items: AiGenerationProposalDTO[] = Array.from({ length: command.max_proposals }).map((_, idx) => ({
    front: normalizeProposalText(`${baseText} — Q${idx + 1}`),
    back: normalizeProposalText(`Answer for segment ${idx + 1}`),
  }));

  const filtered = deduplicateProposals(items);
  const request_id = generateUuidV4();
  return {
    items: filtered,
    returned_count: filtered.length,
    request_id,
  };
}

export async function* generateProposalsStream(
  _supabase: TypedSupabase,
  command: AiGenerateCommand,
  options?: { signal?: AbortSignal }
): AsyncGenerator<AiGenerateSseEvent> {
  const request_id = generateUuidV4();
  const baseText = command.source_text.slice(0, 120);
  const raw: AiGenerationProposalDTO[] = Array.from({ length: command.max_proposals }).map((_, idx) => ({
    front: normalizeProposalText(`${baseText} — Q${idx + 1}`),
    back: normalizeProposalText(`Answer for segment ${idx + 1}`),
  }));
  const items = deduplicateProposals(raw);

  let count = 0;
  for (const item of items) {
    if (options?.signal?.aborted) {
      const abortErr = new Error("Aborted");
      (abortErr as any).name = "AbortError";
      throw abortErr;
    }
    yield { type: "proposal", data: item } as const;
    count += 1;
    yield { type: "progress", data: { count } } as const;
  }

  yield { type: "done", data: { returned_count: count, request_id } } as const;
}

export async function logEventGeneration(
  supabase: TypedSupabase,
  userId: string,
  payload: Pick<EventCreateCommand, "event_name" | "request_id" | "properties">
): Promise<void> {
  const { error } = await supabase.from("event_log").insert({
    user_id: userId,
    event_name: payload.event_name,
    request_id: payload.request_id,
    properties: payload.properties ?? {},
  });
  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to log event", error);
  }
}
