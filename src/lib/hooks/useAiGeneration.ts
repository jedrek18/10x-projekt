import { useCallback, useRef } from "react";
import type { AiGenerateCommand, AiGenerationProposalDTO, AiGenerateSseEvent, UUID } from "@/types";

export interface AiGenerationCallbacks {
  onProposal: (proposal: AiGenerationProposalDTO) => void;
  onProgress: (count: number) => void;
  onDone: (returnedCount: number, requestId: UUID) => void;
  onError: (message: string) => void;
  signal?: AbortSignal;
}

export interface AiGenerationOptions {
  timeout?: number; // Timeout for SSE fallback (default: 5000ms)
  endpoint?: string; // API endpoint (default: /api/ai/generate)
}

/**
 * Hook do zarządzania generacją AI z obsługą SSE i fallbackiem REST.
 *
 * Funkcjonalności:
 * - Próba SSE (Server-Sent Events) jako preferowany tryb
 * - Fallback do REST po 5 sekundach braku odpowiedzi
 * - Parsowanie zdarzeń SSE (proposal, progress, done, error)
 * - Obsługa AbortController dla anulowania żądań
 * - Symulacja progresu w trybie REST
 *
 * @param options - Opcje konfiguracyjne
 * @param options.timeout - Timeout dla fallbacku SSE->REST (domyślnie 5000ms)
 * @param options.endpoint - Endpoint API (domyślnie /api/ai/generate)
 *
 * @returns Obiekt z metodami start() i abort()
 *
 * @example
 * ```tsx
 * const { start, abort } = useAiGeneration();
 *
 * start(command, {
 *   onProposal: (proposal) => console.log('Nowa propozycja:', proposal),
 *   onProgress: (count) => console.log('Postęp:', count),
 *   onDone: (returnedCount, requestId) => console.log('Zakończono:', returnedCount),
 *   onError: (message) => console.error('Błąd:', message),
 * });
 * ```
 */
export function useAiGeneration(options: AiGenerationOptions = {}) {
  const { timeout = 5000, endpoint = "/api/ai/generate" } = options;

  const abortControllerRef = useRef<AbortController | null>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const parseSseEvent = useCallback((line: string): AiGenerateSseEvent | null => {
    try {
      if (line.startsWith("data: ")) {
        const jsonData = line.slice(6);
        if (jsonData === "[DONE]") return null;
        console.log("Parsing SSE data:", jsonData);
        const parsed = JSON.parse(jsonData);
        console.log("Parsed SSE event:", parsed);
        return parsed;
      } else if (line.startsWith(": ")) {
        console.log("SSE: Received ping/heartbeat:", line);
        return null;
      } else if (line === ":ok") {
        console.log("SSE: Received ok signal");
        return null;
      }
      // If line doesn't start with "data: " or other known prefixes, ignore it silently
      // (ping, heartbeat, ok signals are handled above)
      // Other lines like empty lines or unknown formats are ignored
      // This includes lines that don't match any known pattern
      // No need to log these as they are expected and harmless
      // The function will return null if no valid event is found
      // This is the end of the line processing logic
    } catch (error) {
      console.warn("Failed to parse SSE event:", error);
    }
    return null;
  }, []);

  const start = useCallback(
    async (command: AiGenerateCommand, callbacks: AiGenerationCallbacks) => {
      const { onProposal, onProgress, onDone, onError, signal } = callbacks;

      // Abort any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const abortController = abortControllerRef.current;

      // Combine with external signal
      const combinedSignal = signal ? AbortSignal.any([abortController.signal, signal]) : abortController.signal;

      try {
        // Try SSE first
        const sseResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(command),
          signal: combinedSignal,
        });

        if (!sseResponse.ok) {
          throw new Error(`HTTP ${sseResponse.status}: ${sseResponse.statusText}`);
        }

        if (sseResponse.headers.get("content-type")?.includes("text/event-stream")) {
          // SSE mode
          const reader = sseResponse.body?.getReader();
          if (!reader) {
            throw new Error("No response body for SSE");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          // Set fallback timeout
          fallbackTimeoutRef.current = setTimeout(() => {
            console.warn("SSE timeout, falling back to REST");
            abortController.abort();
          }, timeout);

          try {
            while (true) {
              const { done, value } = await reader.read();

              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              console.log("SSE: Processing lines:", lines.length, "buffer remaining:", buffer.length);

              for (const line of lines) {
                if (line.trim() === "") {
                  console.log("SSE: Skipping empty line");
                  continue;
                }

                const event = parseSseEvent(line);
                if (!event) {
                  console.log("SSE: No event parsed from line:", line);
                  continue;
                }

                // Clear fallback timeout on any event
                if (fallbackTimeoutRef.current) {
                  clearTimeout(fallbackTimeoutRef.current);
                  fallbackTimeoutRef.current = null;
                }

                console.log("SSE Event received:", event.type, event.data);
                switch (event.type) {
                  case "proposal":
                    console.log("Processing proposal:", event.data);
                    onProposal(event.data);
                    break;
                  case "progress":
                    console.log("Processing progress:", event.data.count);
                    onProgress(event.data.count);
                    break;
                  case "done":
                    console.log("Processing done:", event.data.returned_count, event.data.request_id);
                    onDone(event.data.returned_count, event.data.request_id);
                    return;
                  case "error":
                    console.log("Processing error:", event.data.message);
                    onError(event.data.message);
                    return;
                }
              }
            }
          } finally {
            reader.releaseLock();
            if (fallbackTimeoutRef.current) {
              clearTimeout(fallbackTimeoutRef.current);
              fallbackTimeoutRef.current = null;
            }
          }
        } else {
          // Fallback to REST
          const restResponse = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(command),
            signal: combinedSignal,
          });

          if (!restResponse.ok) {
            const errorText = await restResponse.text();
            throw new Error(`HTTP ${restResponse.status}: ${errorText}`);
          }

          const result = await restResponse.json();

          // Simulate progress events
          for (let i = 0; i < result.items.length; i++) {
            onProposal(result.items[i]);
            onProgress(i + 1);
            // Small delay to simulate streaming
            await new Promise((resolve) => setTimeout(resolve, 100));
          }

          onDone(result.returned_count, result.request_id);
        }
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          // Request was aborted, don't call onError
          return;
        }

        console.error("AI generation error:", error);
        onError(error instanceof Error ? error.message : "Unknown error occurred");
      }
    },
    [endpoint, timeout, parseSseEvent]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
  }, []);

  return {
    start,
    abort,
  };
}
