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
      systemMessage: `Jesteś ekspertem w tworzeniu wysokiej jakości fiszek do nauki języków obcych. Twoje zadania:

GENEROWANIE FISZEK:
- Twórz jasne, konkretne pytania (front) maksymalnie 100 znaków
- Pisz zwięzłe ale kompletne odpowiedzi (back) maksymalnie 200 znaków
- Mieszaj różne typy pytań: definicje, tłumaczenia, uzupełnianie luk, pytania o kontekst
- Unikaj oczywistych pytań, skup się na kluczowych pojęciach
- Dodawaj poziom trudności (easy/medium/hard) i tagi tematyczne

INNE FUNKCJE:
- Tłumaczenie tekstów z wysoką dokładnością
- Korekta gramatyczna z wyjaśnieniami
- Wyjaśnianie słownictwa z przykładami
- Analiza tekstów pod kątem trudności

ZASADY:
- Zawsze odpowiadaj w języku polskim
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
  let cleaned = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // If the content still doesn't start with {, try to find JSON object
  if (!cleaned.startsWith('{')) {
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
  command: AiGenerateCommand,
  options?: { signal?: AbortSignal }
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

    const items: AiGenerationProposalDTO[] = flashcards.map((card: any) => ({
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
    const processingTime = performance.now() - startTime;

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

    console.log("AI Stream Response content:", content);

    let parsedData;
    try {
      // Clean the response from markdown formatting
      const cleanedContent = cleanAiResponse(content);
      console.log("Cleaned AI response:", cleanedContent);
      
      parsedData = JSON.parse(cleanedContent);
      console.log("Parsed AI stream response:", JSON.stringify(parsedData, null, 2));
    } catch (error) {
      console.error("Failed to parse AI stream response:", error);
      console.error("Raw content:", content);
      throw new Error(`Failed to parse AI response: ${error}`);
    }

    // Extract flashcards and stream them with length validation
    const flashcards = parsedData.flashcards || [];
    console.log("Extracted flashcards count (stream):", flashcards.length);

    // Usuwamy sprawdzanie długości - AI może zwrócić mniej fiszek niż żądane
    if (flashcards.length === 0) {
      console.warn("No flashcards found in AI stream response, but continuing...");
    }

    const items: AiGenerationProposalDTO[] = flashcards.map((card: any) => ({
      front: normalizeProposalText(card.front || "", 100), // Max 100 chars for front
      back: normalizeProposalText(card.back || "", 200), // Max 200 chars for back
    }));

    console.log("Items before deduplication (stream):", items.length);
    const filtered = deduplicateProposals(items);
    console.log("Items after deduplication (stream):", filtered.length);

    let count = 0;
    for (const item of filtered) {
      if (options?.signal?.aborted) {
        const abortErr = new Error("Aborted");
        (abortErr as any).name = "AbortError";
        throw abortErr;
      }
      console.log("AI Service: Yielding proposal event:", item);
      yield { type: "proposal", data: item } as const;
      count += 1;
      console.log("AI Service: Yielding progress event:", count);
      yield { type: "progress", data: { count } } as const;
    }

    // Log the generation event
    await logEventGeneration(supabase, userId, {
      event_name: "generation",
      request_id,
      properties: {
        source_text_length: command.source_text.length,
        max_proposals: command.max_proposals,
        returned_count: count,
        model: response.model,
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
): Promise<any> {
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

export async function correctGrammar(supabase: TypedSupabase, text: string, userId?: string): Promise<any> {
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
): Promise<any> {
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
