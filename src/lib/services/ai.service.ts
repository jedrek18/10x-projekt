import type { SupabaseClient } from "../../db/supabase.client";
import type {
  AiGenerateCommand,
  AiGenerateResponse,
  AiGenerationProposalDTO,
  AiGenerateSseEvent,
  EventCreateCommand,
  UUID,
} from "../../types";
import { OpenRouterService } from "./openrouter.service";
import {
  TRANSLATION_SCHEMA,
  GRAMMAR_CORRECTION_SCHEMA,
  VOCABULARY_EXPLANATION_SCHEMA,
} from "../schemas/response-schemas";
import { DEFAULT_MODEL } from "../config/models";
import { logAISuccess, logAIError } from "./error-logger";

export type TypedSupabase = SupabaseClient;

export class UnauthorizedError extends Error {}

// Initialize OpenRouter service
let openRouterService: OpenRouterService | null = null;

function getOpenRouterService(): OpenRouterService {
  if (!openRouterService) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is required");
    }

    openRouterService = new OpenRouterService({
      apiKey,
      defaultModel: DEFAULT_MODEL,
      systemMessage: `Jesteś ekspertem w tworzeniu wysokiej jakości fiszek do nauki. Twoje zadania:

GENEROWANIE FISZEK:
- Twórz jasne, konkretne pytania (front) maksymalnie 100 znaków
- Pisz zwięzłe ale kompletne odpowiedzi (back) maksymalnie 200 znaków
- Mieszaj różne typy pytań: definicje, tłumaczenia, uzupełnianie luk, pytania o kontekst
- Unikaj oczywistych pytań, skup się na kluczowych pojęciach
- Dodawaj poziom trudności (easy/medium/hard) i tagi tematyczne

ZASADY:
- Zawsze odpowiadaj w języku tekstu wejściowego
- Używaj precyzyjnego i edukacyjnego języka
- Dostosowuj poziom trudności do kontekstu
- Zapewniaj różnorodność w typach pytań`,
      enableCache: true,
      cacheTtl: 3600,
      timeout: 120000, // Zwiększamy timeout do 2 minut
      maxRetries: 3,
    });
  }
  return openRouterService;
}

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

function normalizeProposalText(value: string, maxLength?: number): string {
  let normalized = value.replace(/\s+/g, " ").trim();

  if (maxLength && normalized.length > maxLength) {
    normalized = normalized.substring(0, maxLength - 3) + "...";
  }

  return normalized;
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

/**
 * Cleans AI response from markdown formatting to extract pure JSON
 */
function cleanAiResponse(content: string): string {
  // Remove markdown code blocks
  let cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "");

  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();

  // If the content still doesn't start with {, try to find JSON object
  if (!cleaned.startsWith("{")) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }
  }

  return cleaned;
}

// ============================================================================
// AI GENERATION FUNCTIONS
// ============================================================================

export async function generateProposals(
  supabase: TypedSupabase,
  command: AiGenerateCommand
): Promise<AiGenerateResponse> {
  const startTime = performance.now();

  try {
    const { userId } = await assertAuthenticated(supabase);
    const service = getOpenRouterService();

    // Clear cache to ensure fresh generation every time
    console.log("AI Service: Clearing OpenRouter cache before generation");
    service.clearCache();

    // Generate flashcards using OpenRouter with optimized prompt
    const optimizedPrompt = `Wygeneruj ${command.max_proposals} wysokiej jakości fiszek do nauki języków obcych z podanego tekstu.

ZASADY GENEROWANIA FISZEK:
1. Front (pytanie) - maksymalnie 100 znaków, jasne i konkretne pytanie
2. Back (odpowiedź) - maksymalnie 200 znaków, zwięzła ale kompletna odpowiedź
3. Różnorodność - mieszaj różne typy pytań: definicje, tłumaczenia, uzupełnianie luk, pytania o kontekst
4. Jakość - unikaj oczywistych pytań, skup się na kluczowych pojęciach
5. Język - używaj języka polskiego dla pytań i odpowiedzi

TEKST DO ANALIZY:
${command.source_text}

WAŻNE: Odpowiedz TYLKO w formacie JSON bez dodatkowego tekstu. Struktura:
{
  "flashcards": [
    {
      "front": "pytanie",
      "back": "odpowiedź",
      "difficulty": "easy|medium|hard",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

    const response = await service.sendMessage({
      userMessage: optimizedPrompt,
      // Usuwamy responseFormat, aby AI zwróciło zwykły tekst JSON
      parameters: {
        temperature: 0.6, // Niższa temperatura dla bardziej przewidywalnych wyników
        max_tokens: Math.min(3000, command.max_proposals * 150), // Dynamiczne dostosowanie tokenów
        top_p: 0.9,
        frequency_penalty: 0.1, // Zachęca do różnorodności
        presence_penalty: 0.1,
      },
      conversationId: userId,
    });

    // Parse the response
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content received");
    }

    console.log("AI Response content:", content);

    let parsedData;
    try {
      // Clean the response from markdown formatting
      const cleanedContent = cleanAiResponse(content);
      console.log("Cleaned AI response:", cleanedContent);

      parsedData = JSON.parse(cleanedContent);
      console.log("Parsed AI response:", JSON.stringify(parsedData, null, 2));
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      console.error("Raw content:", content);
      throw new Error(`Failed to parse AI response: ${error}`);
    }

    // Extract flashcards from the response with length validation
    const flashcards = parsedData.flashcards || [];
    console.log("Extracted flashcards count:", flashcards.length);

    // Usuwamy sprawdzanie długości - AI może zwrócić mniej fiszek niż żądane
    if (flashcards.length === 0) {
      console.warn("No flashcards found in AI response, but continuing...");
    }

    const items: AiGenerationProposalDTO[] = flashcards.map((card: { front?: string; back?: string }) => ({
      front: normalizeProposalText(card.front || "", 100), // Max 100 chars for front
      back: normalizeProposalText(card.back || "", 200), // Max 200 chars for back
    }));

    console.log("Items before deduplication:", items.length);
    const filtered = deduplicateProposals(items);
    console.log("Items after deduplication:", filtered.length);
    const request_id = generateUuidV4();

    // Log the generation event
    await logEventGeneration(supabase, userId, {
      event_name: "generation",
      request_id,
      properties: {
        source_text_length: command.source_text.length,
        max_proposals: command.max_proposals,
        returned_count: filtered.length,
        model: response.model,
      },
    });

    const processingTime = performance.now() - startTime;

    // Log success metrics
    logAISuccess("generate", {
      userId,
      requestId: request_id,
      inputLength: command.source_text.length,
      outputLength: filtered.reduce((sum, item) => sum + item.front.length + item.back.length, 0),
      model: response.model,
      processingTime,
    });

    return {
      items: filtered,
      returned_count: filtered.length,
      request_id,
    };
  } catch (error) {
    // Log error metrics
    logAIError(error as Error, "generate", "generateProposals", {
      userId: "unknown",
      requestId: "unknown",
      inputLength: command.source_text.length,
      fallbackUsed: false,
    });

    console.error("AI generation error:", error);
    // Usuwamy fallback do mocków - pozwalamy błędom się propagować
    throw error;
  }
}

export async function* generateProposalsStream(
  supabase: TypedSupabase,
  command: AiGenerateCommand,
  options?: { signal?: AbortSignal }
): AsyncGenerator<AiGenerateSseEvent> {
  try {
    const { userId } = await assertAuthenticated(supabase);
    const service = getOpenRouterService();
    const request_id = generateUuidV4();

    // Clear cache to ensure fresh generation every time
    console.log("AI Service: Clearing OpenRouter cache before stream generation");
    service.clearCache();

    // === JSONL PROMPT: każda linia to osobny obiekt JSON (1 fiszka) ===
    const optimizedPrompt = `Wygeneruj ${command.max_proposals} wysokiej jakości fiszek do nauki języków obcych z podanego tekstu.

FORMAT WYJŚCIA (KLUCZOWE):
- ZWRACAJ JSONL: jedna linia = jeden obiekt JSON, bez tablicy i bez dodatkowego tekstu.
- Każda linia dokładnie w formacie:
{"front":"...", "back":"...", "difficulty":"easy|medium|hard", "tags":["..."]}

ZASADY GENEROWANIA FISZEK:
1. Front (pytanie) - maksymalnie 100 znaków, jasne i konkretne pytanie
2. Back (odpowiedź) - maksymalnie 200 znaków, zwięzła ale kompletna odpowiedź
3. Różnorodność - mieszaj typy pytań: definicje, tłumaczenia, uzupełnianie luk, pytania o kontekst
4. Jakość - unikaj oczywistych pytań, skup się na kluczowych pojęciach
5. Język - używaj języka polskiego dla pytań i odpowiedzi
6. NIE używaj markdownu ani bloków kodu; żadnych wstępów ani podsumowań.

TEKST DO ANALIZY:
${command.source_text}`;

    // Use streaming API
    const stream = await service.sendMessageStream({
      userMessage: optimizedPrompt,
      parameters: {
        temperature: 0.6,
        max_tokens: Math.min(3000, command.max_proposals * 150),
        top_p: 0.9,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        // kluczowe: endpoint musi używać SSE/stream=true — zapewnia to OpenRouterService
      },
      conversationId: userId,
    });

    // === Parsowanie strumienia JSONL (1 linia = 1 fiszka) ===
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    // sseBuffer składa linie SSE ("data: {...}\n")
    let sseBuffer = "";
    // jsonlBuffer składa treść content (może przychodzić fragmentami)
    let jsonlBuffer = "";
    // przechowujemy rozpoczętą, ale niekompletną linię JSONL (bez newline)
    let carryLine = "";
    // unikalność fiszek
    const seen = new Set<string>();
    // licznik wyemitowanych fiszek
    let count = 0;
    let streamFinished = false;

    try {
      while (true) {
        if (options?.signal?.aborted) {
          const abortErr = new Error("Aborted");
          (abortErr as Error & { name: string }).name = "AbortError";
          throw abortErr;
        }

        const { done, value } = await reader.read();
        if (done) break;

        sseBuffer += decoder.decode(value, { stream: true });

        // przetwarzamy kompletne linie SSE
        let nlIdx: number;
        while ((nlIdx = sseBuffer.indexOf("\n")) !== -1) {
          const rawLine = sseBuffer.slice(0, nlIdx);
          sseBuffer = sseBuffer.slice(nlIdx + 1);

          const line = rawLine.trim();
          if (!line || line.startsWith(":")) continue; // komentarze keep-alive itp.
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6);
          if (data === "[DONE]") {
            streamFinished = true;
            break; // zewnętrzna pętla odczytu dokończy, bo reader.done==true
          }

          // obsługa delty OpenAI/OR
          try {
            const parsed = JSON.parse(data);
            const content = parsed?.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              jsonlBuffer += content;

              // z jsonlBuffer wyciągamy kompletne linie
              let jsonlNl: number;
              while ((jsonlNl = jsonlBuffer.indexOf("\n")) !== -1) {
                const oneLineRaw = jsonlBuffer.slice(0, jsonlNl);
                jsonlBuffer = jsonlBuffer.slice(jsonlNl + 1);

                // sklej z ewentualną nieskończoną poprzednią linią
                const oneLine = (carryLine + oneLineRaw).trim();
                carryLine = "";

                if (!oneLine) continue;

                // próbujemy sparsować pojedynczą linię JSON
                try {
                  const card = JSON.parse(oneLine) as {
                    front?: string;
                    back?: string;
                    difficulty?: string;
                    tags?: string[];
                  };

                  const item: AiGenerationProposalDTO = {
                    front: normalizeProposalText(card.front || "", 100),
                    back: normalizeProposalText(card.back || "", 200),
                  };

                  const key = `${item.front.toLowerCase()}|${item.back.toLowerCase()}`;
                  const valid = item.front && item.back && item.front.toLowerCase() !== item.back.toLowerCase();

                  if (valid && !seen.has(key)) {
                    seen.add(key);

                    // emitujemy pojedynczą fiszkę natychmiast
                    yield { type: "proposal", data: item } as const;
                    count += 1;
                    // i progres
                    yield { type: "progress", data: { count } } as const;
                  }
                } catch (e) {
                  // linia nie była kompletnym JSON (rzadkie) — odłóż do carry i czekaj na kolejne delty
                  carryLine = (carryLine ? carryLine + "\n" : "") + oneLineRaw;
                }
              }
            }
          } catch {
            // ignorujemy nietypowe/przerywające fragmenty SSE
          }
        }
      }

      // po zakończeniu strumienia spróbuj przetworzyć ostatnią linię (gdy brak trailing \n)
      const lastLine = (carryLine + jsonlBuffer).trim();
      if (lastLine) {
        try {
          const card = JSON.parse(lastLine) as { front?: string; back?: string };
          const item: AiGenerationProposalDTO = {
            front: normalizeProposalText(card.front || "", 100),
            back: normalizeProposalText(card.back || "", 200),
          };
          const key = `${item.front.toLowerCase()}|${item.back.toLowerCase()}`;
          const valid = item.front && item.back && item.front.toLowerCase() !== item.back.toLowerCase();
          if (valid && !seen.has(key)) {
            seen.add(key);
            yield { type: "proposal", data: item } as const;
            count += 1;
            yield { type: "progress", data: { count } } as const;
          }
        } catch {
          // jeśli ostatni fragment nie jest poprawnym JSON — po prostu pomiń
        }
      }

      if (!streamFinished) {
        console.warn("AI Service: Stream ended without [DONE] token");
      }
    } finally {
      reader.releaseLock();
    }

    // Log the generation event
    await logEventGeneration(supabase, userId, {
      event_name: "generation",
      request_id,
      properties: {
        source_text_length: command.source_text.length,
        max_proposals: command.max_proposals,
        returned_count: count,
        model: "streaming-jsonl",
      },
    });

    yield { type: "done", data: { returned_count: count, request_id } } as const;
    console.log("AI Service: Yielding done event:", { returned_count: count, request_id });
  } catch (error) {
    console.error("AI generation stream error:", error);
    // Usuwamy fallback do mocków - pozwalamy błędom się propagować
    throw error;
  }
}

// ============================================================================
// ADDITIONAL AI FUNCTIONS
// ============================================================================

export async function translateText(
  supabase: TypedSupabase,
  text: string,
  targetLanguage: string,
  userId?: string
): Promise<{ translation: string }> {
  try {
    if (!userId) {
      const auth = await assertAuthenticated(supabase);
      userId = auth.userId;
    }

    const service = getOpenRouterService();
    const response = await service.sendMessage({
      userMessage: `Przetłumacz następujący tekst na język ${targetLanguage}: ${text}`,
      responseFormat: TRANSLATION_SCHEMA,
      parameters: {
        temperature: 0.3,
        max_tokens: 500,
      },
      conversationId: userId,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No translation response received");
    }

    return JSON.parse(cleanAiResponse(content));
  } catch (error) {
    console.error("Translation error:", error);
    throw error;
  }
}

export async function correctGrammar(
  supabase: TypedSupabase,
  text: string,
  userId?: string
): Promise<{ corrected: string; explanations: string[] }> {
  try {
    if (!userId) {
      const auth = await assertAuthenticated(supabase);
      userId = auth.userId;
    }

    const service = getOpenRouterService();
    const response = await service.sendMessage({
      userMessage: `Popraw błędy gramatyczne w następującym tekście: ${text}`,
      responseFormat: GRAMMAR_CORRECTION_SCHEMA,
      parameters: {
        temperature: 0.2,
        max_tokens: 1000,
      },
      conversationId: userId,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No grammar correction response received");
    }

    return JSON.parse(cleanAiResponse(content));
  } catch (error) {
    console.error("Grammar correction error:", error);
    throw error;
  }
}

export async function explainVocabulary(
  supabase: TypedSupabase,
  word: string,
  context?: string,
  userId?: string
): Promise<{ definition: string; examples: string[]; synonyms: string[]; antonyms: string[] }> {
  try {
    if (!userId) {
      const auth = await assertAuthenticated(supabase);
      userId = auth.userId;
    }

    const service = getOpenRouterService();
    const contextText = context ? ` w kontekście: "${context}"` : "";
    const response = await service.sendMessage({
      userMessage: `Wyjaśnij słowo "${word}"${contextText}. Podaj definicję, przykłady użycia, synonimy i antonimy.`,
      responseFormat: VOCABULARY_EXPLANATION_SCHEMA,
      parameters: {
        temperature: 0.5,
        max_tokens: 800,
      },
      conversationId: userId,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No vocabulary explanation response received");
    }

    return JSON.parse(cleanAiResponse(content));
  } catch (error) {
    console.error("Vocabulary explanation error:", error);
    throw error;
  }
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
