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
  timeout?: number; // Timeout dla fallbacku SSE->REST (domyślnie 5000ms)
  endpoint?: string; // Endpoint API (domyślnie /api/ai/generate)
}

/** Łączy wiele AbortSignal w jeden (zastępnik AbortSignal.any). */
function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", onAbort, { once: true });
  }
  // Sprzątanie listenerów po abort (niekonieczne, ale schludnie)
  controller.signal.addEventListener("abort", () => signals.forEach((s) => s.removeEventListener("abort", onAbort)), {
    once: true,
  });
  return controller.signal;
}

/**
 * Hook do zarządzania generacją AI z obsługą SSE (nowy stream JSONL) i fallbackiem REST.
 *
 * - Najpierw próbuje SSE (Server-Sent Events)
 * - Jeśli przez `timeout` nie ma **żadnej** aktywności SSE (nawet pingów), przełącza się na REST
 * - Parsuje zdarzenia SSE typu: proposal, progress, done, error
 * - Ma AbortController do anulowania żądań
 * - W trybie REST symuluje progres
 */
export function useAiGeneration(options: AiGenerationOptions = {}) {
  const { timeout = 60000, endpoint = "/api/ai/generate" } = options;

  const abortControllerRef = useRef<AbortController | null>(null);
  const fallbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sseReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const finishedRef = useRef(false); // zapobiega podwójnym zakończeniom

  const parseSseEvent = useCallback((line: string): AiGenerateSseEvent | null => {
    try {
      const trimmed = line.trim();
      if (!trimmed) return null;

      // Komentarze SSE (heartbeat): ": ..." (np. ": ok", ": ping")
      if (trimmed.startsWith(":")) {
        // heartbeat – aktywność SSE, ale bez eventu
        return null;
      }

      // Standardowa linia z danymi:
      if (trimmed.startsWith("data: ")) {
        const jsonData = trimmed.slice(6);
        if (jsonData === "[DONE]") return null;

        const parsed = JSON.parse(jsonData);
        if (parsed && parsed.type && parsed.data) {
          return parsed as AiGenerateSseEvent;
        }
      }
    } catch (error) {
      // cicha tolerancja pojedynczych nieudanych linii
    }
    return null;
  }, []);

  const start = useCallback(
    async (command: AiGenerateCommand, callbacks: AiGenerationCallbacks) => {
      const { onProposal, onProgress, onDone, onError, signal: externalSignal } = callbacks;

      // Anuluj trwające żądanie
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Reset flagi zakończenia
      finishedRef.current = false;

      // Nowy kontroler dla całej operacji
      abortControllerRef.current = new AbortController();
      const rootAbortController = abortControllerRef.current;

      // Osobny kontroler tylko dla SSE (umożliwia lokalne przerwanie SSE bez kończenia całej operacji)
      const sseAbortController = new AbortController();

      // Sygnał łączony (zewn. + root + sse)
      const sseSignal = externalSignal
        ? combineSignals([rootAbortController.signal, externalSignal, sseAbortController.signal])
        : combineSignals([rootAbortController.signal, sseAbortController.signal]);

      // Funkcja porządkowa (czyści timery/reader)
      const cleanup = () => {
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        if (sseReaderRef.current) {
          // nie rzucamy czekając na ewentualny błąd cancel
          sseReaderRef.current.cancel().catch(() => {});
          sseReaderRef.current = null;
        }
      };

      // Wyjście końcowe (zabezp. przed podwójnym wołaniem)
      const finishOnce = (fn: () => void) => {
        if (finishedRef.current) return;
        finishedRef.current = true;
        cleanup();
        fn();
      };

      /** REST fallback – uruchamiany po braku aktywności SSE */
      const runRestFallback = async () => {
        if (finishedRef.current) return;

        try {
          // Zatrzymaj tylko odczyt SSE (nie abortuj całej operacji)
          sseAbortController.abort();

          const restResponse = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(command),
            signal: externalSignal
              ? combineSignals([rootAbortController.signal, externalSignal])
              : rootAbortController.signal,
          });

          if (!restResponse.ok) {
            const errorText = await restResponse.text().catch(() => "");
            throw new Error(`HTTP ${restResponse.status}: ${errorText || restResponse.statusText}`);
          }

          const result = await restResponse.json();

          // Symulacja progresu
          for (let i = 0; i < (result.items?.length || 0); i++) {
            if (finishedRef.current) return;
            onProposal(result.items[i]);
            onProgress(i + 1);
            await new Promise((r) => setTimeout(r, 100));
          }

          finishOnce(() => onDone(result.returned_count, result.request_id));
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            // anulowane z zewnątrz – nic nie rób
            return;
          }
          finishOnce(() => onError(err instanceof Error ? err.message : "Unknown error (REST fallback)"));
        }
      };

      try {
        // --- PRÓBA SSE ---
        const sseResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify(command),
          signal: sseSignal,
        });

        if (!sseResponse.ok) {
          // nieudane SSE – od razu REST (bez czekania)
          await runRestFallback();
          return;
        }

        const isSse = sseResponse.headers.get("content-type")?.includes("text/event-stream");
        if (!isSse || !sseResponse.body) {
          // serwer nie wspiera SSE – REST
          await runRestFallback();
          return;
        }

        // Reader SSE
        const reader = sseResponse.body.getReader();
        sseReaderRef.current = reader;

        const decoder = new TextDecoder();
        let buffer = "";
        let gotAnyActivity = false;

        // Ustaw fallback: jeśli przez `timeout` nie ma żadnej aktywności SSE, przejdź na REST
        fallbackTimeoutRef.current = setTimeout(() => {
          if (!gotAnyActivity && !finishedRef.current) {
            // brak aktywności – odpalamy fallback
            runRestFallback();
          }
        }, timeout);

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const raw of lines) {
              const line = raw.trim();
              if (!line) continue;

              // Każda aktywność SSE (data: ... lub : ping/ok) kasuje timer fallbacku
              if (!gotAnyActivity) {
                gotAnyActivity = true;
                if (fallbackTimeoutRef.current) {
                  clearTimeout(fallbackTimeoutRef.current);
                  fallbackTimeoutRef.current = null;
                }
              }

              const event = parseSseEvent(line);
              if (!event) continue;

              if (finishedRef.current) return;

              switch (event.type) {
                case "proposal":
                  onProposal(event.data);
                  break;
                case "progress":
                  onProgress(event.data.count);
                  break;
                case "done":
                  finishOnce(() => onDone(event.data.returned_count, event.data.request_id));
                  return;
                case "error":
                  finishOnce(() => onError(event.data.message));
                  return;
              }
            }
          }

          // Strumień skończony bez "done" — uznaj jako błąd (żeby UI nie wisiał)
          if (!finishedRef.current) {
            finishOnce(() => onError("Stream ended unexpectedly"));
          }
        } finally {
          reader.releaseLock();
        }
      } catch (error) {
        // Jeśli błąd to AbortError z root/external – nie raportuj (to świadome anulowanie)
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

        // Nieudane SSE (np. sieć) – REST fallback
        if (!finishedRef.current) {
          await runRestFallback();
        }
      }
    },
    [endpoint, timeout, parseSseEvent]
  );

  const abort = useCallback(() => {
    finishedRef.current = true; // blokada dalszych callbacków
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    if (sseReaderRef.current) {
      sseReaderRef.current.cancel().catch(() => {});
      sseReaderRef.current = null;
    }
  }, []);

  return { start, abort };
}
