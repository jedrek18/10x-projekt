import { useState, useCallback } from "react";
import type { SrsQueueItemVM, QueueMetaVM, StudyViewState, OutboxItem } from "../types";
import type { SrsQueueResponse, SrsReviewCommand, SrsReviewResultDTO, ReviewRating } from "../../../types";
import { useLocalStorage } from "../../../lib/hooks/useLocalStorage";

const QUEUE_CACHE_KEY = "study_queue_cache";
const QUEUE_CACHE_TTL = 30 * 60 * 1000; // 30 minut
const SESSION_PROGRESS_KEY = "study_session_progress";
const SESSION_DATE_KEY = "study_session_date";

export function useStudyQueue(outboxEnqueue?: (item: OutboxItem) => void) {
  const [state, setState] = useState<StudyViewState>({
    status: "idle",
    items: [],
    currentIndex: 0,
    meta: {
      due_count: 0,
      new_selected: 0,
      daily_goal: 0,
      reviews_done_today: 0,
    },
  });

  // Śledzenie postępu sesji z persystencją
  const [sessionProgress, setSessionProgress] = useLocalStorage<number>(SESSION_PROGRESS_KEY, 0);
  const [sessionDate, setSessionDate] = useLocalStorage<string>(SESSION_DATE_KEY, "");

  // Sprawdź czy data się zmieniła i zresetuj postęp jeśli potrzeba
  const [isDateChecked, setIsDateChecked] = useState(false);
  if (!isDateChecked) {
    const today = new Date().toISOString().split("T")[0];
    if (sessionDate !== today) {
      setSessionProgress(0);
      setSessionDate(today);
    }
    setIsDateChecked(true);
  }

  // Zapisywanie postępu sesji
  const updateSessionProgress = useCallback((newProgress: number) => {
    setSessionProgress(newProgress);
    setSessionDate(new Date().toISOString().split("T")[0]);
  }, [setSessionProgress, setSessionDate]);

  // Pobieranie kolejki z API
  const fetchQueue = useCallback(
    async (goalHint?: number) => {
      setState((prev) => ({ ...prev, status: "loading" }));

      try {
        // Użyj postępu sesji zamiast pobierać z API
        const reviewsDoneToday = sessionProgress;

        const params = goalHint !== undefined ? `?goal_hint=${goalHint}` : "";
        const response = await fetch(`/api/srs/queue${params}`);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Unauthorized - please log in");
          }
          throw new Error(`Failed to fetch queue: ${response.status}`);
        }

        const data: SrsQueueResponse = await response.json();

        // Mapowanie do ViewModel
        const items: SrsQueueItemVM[] = [
          ...data.due.map((card) => ({
            id: card.id,
            front: card.front,
            back: card.back,
            state: card.state,
            due_at: card.due_at,
            revealed: false,
            pending: false,
          })),
          ...data.new.map((card) => ({
            id: card.id,
            front: card.front,
            back: card.back,
            state: card.state,
            due_at: card.due_at,
            revealed: false,
            pending: false,
          })),
        ];

        const meta: QueueMetaVM = {
          due_count: data.meta.due_count,
          new_selected: data.meta.new_selected,
          daily_goal: data.meta.daily_goal,
          reviews_done_today: reviewsDoneToday,
        };

        // Cache'owanie
        const cacheData = {
          data,
          timestamp: Date.now(),
        };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(QUEUE_CACHE_KEY, JSON.stringify(cacheData));
        }

        setState({
          status: "ready",
          items,
          currentIndex: 0,
          meta,
        });
      } catch (error) {
        console.error("Failed to fetch queue:", error);
        setState((prev) => ({
          ...prev,
          status: "error",
          lastError: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    },
    [sessionProgress]
  );

  // Ładowanie z cache
  const loadFromCache = useCallback(async () => {
    try {
      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(QUEUE_CACHE_KEY);
        if (cached) {
          const { data, timestamp }: { data: SrsQueueResponse; timestamp: number } = JSON.parse(cached);

          // Sprawdź czy cache jest aktualny
          if (Date.now() - timestamp < QUEUE_CACHE_TTL) {
            const items: SrsQueueItemVM[] = [
              ...data.due.map((card) => ({
                id: card.id,
                front: card.front,
                back: card.back,
                state: card.state,
                due_at: card.due_at,
                revealed: false,
                pending: false,
              })),
              ...data.new.map((card) => ({
                id: card.id,
                front: card.front,
                back: card.back,
                state: card.state,
                due_at: card.due_at,
                revealed: false,
                pending: false,
              })),
            ];

            // Użyj postępu sesji zamiast pobierać z API
            const currentProgress = sessionProgress;

            const meta: QueueMetaVM = {
              due_count: data.meta.due_count,
              new_selected: data.meta.new_selected,
              daily_goal: data.meta.daily_goal,
              reviews_done_today: currentProgress,
            };

            setState({
              status: "ready",
              items,
              currentIndex: 0,
              meta,
            });
            return true;
          }
        }
      }
    } catch (error) {
      console.error("Failed to load from cache:", error);
    }
    return false;
  }, [sessionProgress]);

  // Czyszczenie cache
  const clearCache = useCallback(() => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(QUEUE_CACHE_KEY);
        console.log("Study queue cache cleared");
      }
    } catch (error) {
      console.error("Failed to clear study queue cache:", error);
    }
  }, []);

  // Ujawnienie karty
  const reveal = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "ready" || prev.currentIndex >= prev.items.length) {
        return prev;
      }

      const newItems = [...prev.items];
      newItems[prev.currentIndex] = {
        ...newItems[prev.currentIndex],
        revealed: true,
      };

      return {
        ...prev,
        items: newItems,
      };
    });
  }, []);

  // Przejście do następnej karty
  const advance = useCallback(() => {
    setState((prev) => {
      if (prev.status !== "ready") return prev;

      const nextIndex = prev.currentIndex + 1;
      if (nextIndex >= prev.items.length) {
        // Kolejka ukończona - spróbuj pobrać więcej kart
        return {
          ...prev,
          status: "loading",
        };
      }

      return {
        ...prev,
        currentIndex: nextIndex,
      };
    });
  }, []);

  // Ocenienie karty
  const rate = useCallback(
    async (rating: ReviewRating) => {
      if (state.status !== "ready" || state.currentIndex >= state.items.length) {
        throw new Error("Cannot rate card: queue not ready or no items available");
      }

      const currentItem = state.items[state.currentIndex];

      // Oznacz jako pending
      setState((prev) => {
        const newItems = [...prev.items];
        newItems[prev.currentIndex] = {
          ...newItems[prev.currentIndex],
          pending: true,
        };
        return { ...prev, items: newItems };
      });

      try {
        const command: SrsReviewCommand = {
          card_id: currentItem.id,
          rating,
        };

        const response = await fetch("/api/srs/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          throw new Error(`Review failed: ${response.status}`);
        }

        const result: SrsReviewResultDTO = await response.json();

        // Aktualizuj postęp sesji
        updateSessionProgress(sessionProgress + 1);

        // Aktualizuj postęp w stanie
        setState((prev) => ({
          ...prev,
          meta: {
            ...prev.meta,
            reviews_done_today: prev.meta.reviews_done_today + 1,
          },
        }));

        // Przejdź do następnej karty
        advance();

        return result;
      } catch (error) {
        console.error("Failed to rate card:", error);

        // Jeśli offline lub błąd sieci, dodaj do outboxu
        if (
          outboxEnqueue &&
          (error instanceof TypeError || (error instanceof Error && error.message.includes("fetch")))
        ) {
          const outboxItem: OutboxItem = {
            card_id: currentItem.id,
            rating,
            queued_at: new Date().toISOString(),
            attempts: 0,
          };
          outboxEnqueue(outboxItem);

          // Aktualizuj postęp sesji
          updateSessionProgress(sessionProgress + 1);

          // Aktualizuj postęp lokalnie
          setState((prev) => ({
            ...prev,
            meta: {
              ...prev.meta,
              reviews_done_today: prev.meta.reviews_done_today + 1,
            },
          }));

          // Przejdź do następnej karty
          advance();

          // Zwróć symulowany wynik dla outboxu
          return {
            card_id: currentItem.id,
            state: currentItem.state,
            due_at: currentItem.due_at,
            interval_days: 1,
            ease_factor: 2.5,
            reps: 1,
            lapses: 0,
            last_reviewed_at: new Date().toISOString(),
            last_rating: rating,
          } as SrsReviewResultDTO;
        } else {
          // Usuń pending status dla innych błędów
          setState((prev) => {
            const newItems = [...prev.items];
            newItems[prev.currentIndex] = {
              ...newItems[prev.currentIndex],
              pending: false,
            };
            return { ...prev, items: newItems };
          });
        }
        throw error;
      }
    },
    [
      state.status,
      state.currentIndex,
      state.items.length,
      state.items,
      advance,
      outboxEnqueue,
      sessionProgress,
      updateSessionProgress,
    ]
  );

  return {
    state,
    fetchQueue,
    loadFromCache,
    clearCache,
    reveal,
    advance,
    rate,
    sessionProgress,
    updateDailyGoal: (newGoal: number) => {
      setState((prev) => ({
        ...prev,
        meta: {
          ...prev.meta,
          daily_goal: newGoal,
        },
      }));
    },
  };
}
