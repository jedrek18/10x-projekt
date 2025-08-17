import { useState, useEffect, useCallback, useRef } from "react";
import type {
  FlashcardDTO,
  FlashcardCreateManualCommand,
  FlashcardUpdateContentCommand,
  SrsQueueResponse,
  UUID,
} from "../../types";
import type { FlashcardListItemVM, FlashcardsPageState, UndoEntryVM } from "../../components/flashcards/types";
import { getTotalCountFromHeaders, mapApiError } from "../http";

// Hook do zarządzania listą fiszek
export function useFlashcardsList() {
  const [state, setState] = useState<FlashcardsPageState>({
    page: 1,
    pageSize: 25,
    totalCount: 0,
    order: "created_at.desc",
    items: [],
    isLoadingList: false,
    listError: null,
    isSubmitting: false,
  });

  // Ref do przechowywania aktualnej wartości strony
  const currentPageRef = useRef(state.page);
  currentPageRef.current = state.page;

  const fetchPage = useCallback(async (page: number) => {
    setState((prev) => ({ ...prev, isLoadingList: true, listError: null }));

    try {
      const offset = (page - 1) * 25; // Stała wartość pageSize
      const response = await fetch(`/api/flashcards?limit=25&offset=${offset}&order=created_at.desc`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const { message } = mapApiError(response.status, errorData);
        throw new Error(message);
      }

      const items: FlashcardDTO[] = await response.json();
      const apiTotalCount = getTotalCountFromHeaders(response);

      const vmItems: FlashcardListItemVM[] = items.map((item) => ({
        ...item,
        isPendingDelete: false,
        isMutating: false,
        error: null,
      }));

      setState((prev) => ({
        ...prev,
        page,
        totalCount: apiTotalCount,
        items: vmItems,
        isLoadingList: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoadingList: false,
        listError: error instanceof Error ? error.message : "Nieoczekiwany błąd",
      }));
    }
  }, []); // Brak zależności - funkcja jest stabilna

  const add = useCallback(
    async (cmd: FlashcardCreateManualCommand) => {
      setState((prev) => ({ ...prev, isSubmitting: true }));

      try {
        const response = await fetch("/api/flashcards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const { message } = mapApiError(response.status, errorData);
          throw new Error(message);
        }

        const created: FlashcardDTO = await response.json();

        // Odśwież listę aby pokazać nową fiszkę
        setState((prev) => ({ ...prev, isSubmitting: false }));

        // Odśwież pierwszą stronę po dodaniu
        await fetchPage(1);

        return created;
      } catch (error) {
        setState((prev) => ({ ...prev, isSubmitting: false }));
        throw error;
      }
    },
    [fetchPage]
  );

  const edit = useCallback(
    async (id: UUID, cmd: FlashcardUpdateContentCommand) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) => (item.id === id ? { ...item, isMutating: true, error: null } : item)),
      }));

      let currentPage = 1;
      setState((prev) => {
        currentPage = prev.page;
        return prev;
      });

      try {
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cmd),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const { message } = mapApiError(response.status, errorData);
          throw new Error(message);
        }

        const updated: FlashcardDTO = await response.json();

        // Odśwież listę aby pokazać zaktualizowaną fiszkę
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) => (item.id === id ? { ...item, isMutating: false, error: null } : item)),
        }));

        // Odśwież aktualną stronę po edycji
        await fetchPage(currentPage);

        return updated;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          items: prev.items.map((item) =>
            item.id === id
              ? { ...item, isMutating: false, error: error instanceof Error ? error.message : "Błąd" }
              : item
          ),
        }));
        throw error;
      }
    },
    [fetchPage]
  );

  const removeWithUndo = useCallback((item: FlashcardListItemVM) => {
    // Optymistyczne usunięcie
    setState((prev) => {
      const newItems = prev.items.filter((i) => i.id !== item.id);
      const newTotalCount = prev.totalCount - 1;

      // Sprawdź, czy po usunięciu ostatniego elementu z aktualnej strony
      // należy przejść na poprzednią stronę
      let newPage = prev.page;
      if (newItems.length === 0 && newTotalCount > 0) {
        // Jeśli nie ma już elementów na aktualnej stronie i są jeszcze jakieś elementy
        newPage = Math.max(1, prev.page - 1);
      }

      return {
        ...prev,
        items: newItems,
        totalCount: newTotalCount,
        page: newPage,
      };
    });

    // Rzeczywiste usunięcie z API
    fetch(`/api/flashcards/${item.id}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
      })
      .catch((error) => {
        console.error("Failed to delete flashcard:", error);
        // Przywróć element w przypadku błędu
        setState((prev) => ({
          ...prev,
          items: [...prev.items, item],
          totalCount: prev.totalCount + 1,
        }));
      });
  }, []);

  const undoLast = useCallback(
    async (id: UUID) => {
      try {
        // Przywróć fiszkę z soft-delete
        const response = await fetch(`/api/flashcards/${id}`, {
          method: "PUT",
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Odśwież listę aby pokazać przywróconą fiszkę
        await fetchPage(state.page);
      } catch (error) {
        console.error("Failed to restore flashcard:", error);
        // W przypadku błędu, odśwież listę aby pokazać aktualny stan
        await fetchPage(state.page);
      }
    },
    [fetchPage, state.page]
  );

  const refresh = useCallback(
    async (page?: number) => {
      const targetPage = page ?? currentPageRef.current;
      await fetchPage(targetPage);
    },
    [fetchPage]
  );

  const setPageFromUrl = useCallback(
    (page: number) => {
      setState((prev) => {
        if (page !== prev.page) {
          fetchPage(page);
        }
        return prev;
      });
    },
    [fetchPage]
  );

  return {
    state,
    fetchPage,
    add,
    edit,
    removeWithUndo,
    undoLast,
    refresh,
    setPageFromUrl,
  };
}

// Hook do zarządzania mechanizmem Undo
export function useUndoManager(delayMs = 5000) {
  const [entry, setEntry] = useState<UndoEntryVM | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const enqueue = useCallback(
    (id: UUID) => {
      // Wyczyść poprzedni timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      const expiresAt = Date.now() + delayMs;
      setEntry({ id, expiresAt });

      // Ustaw timer
      timeoutRef.current = setTimeout(() => {
        setEntry(null);
      }, delayMs);
    },
    [delayMs]
  );

  const undo = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setEntry(null);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return { entry, enqueue, undo };
}

// Hook do liczenia znaków (grapheme-safe)
export function useCharacterCounter() {
  const countGraphemes = useCallback((text: string): number => {
    // Używamy Intl.Segmenter dla poprawnego liczenia graphemów
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter("pl", { granularity: "grapheme" });
      return Array.from(segmenter.segment(text)).length;
    }
    // Fallback dla starszych przeglądarek
    return text.length;
  }, []);

  return { countGraphemes };
}

// Hook do stanu CTA nauki
export function useStudyCtaState() {
  const [queue, setQueue] = useState<SrsQueueResponse | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/srs/queue");
      if (response.ok) {
        const data: SrsQueueResponse = await response.json();
        setQueue(data);
      }
    } catch (error) {
      console.error("Failed to fetch SRS queue:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { queue, isLoading, refresh };
}
