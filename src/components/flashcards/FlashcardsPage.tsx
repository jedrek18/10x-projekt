import { useState, useEffect, useCallback } from "react";
import { Button } from "../ui/button";
import { Plus } from "lucide-react";
import { StudyNowCTA } from "./StudyNowCTA";
import { FlashcardsToolbar } from "./FlashcardsToolbar";
import { FlashcardTable, FlashcardTableSkeleton } from "./FlashcardTable";
import { Pagination } from "./Pagination";
import { ManualAddModal } from "./ManualAddModal";
import { EditFlashcardModal } from "./EditFlashcardModal";
import { DeleteUndoSnackbar } from "./DeleteUndoSnackbar";
import { useFlashcardsList, useUndoManager, useStudyCtaState } from "../../lib/hooks/flashcards";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { FlashcardDTO } from "../../types";
import type { FlashcardListItemVM } from "./types";

export function FlashcardsPage() {
  const { language, isHydrated } = usePreferredLanguage();

  // Hooki
  const { state, fetchPage, add, edit, removeWithUndo, undoLast, refresh, setPageFromUrl } = useFlashcardsList();

  const { entry: undoEntry, enqueue: enqueueUndo, undo: undoDelete } = useUndoManager();
  const {
    queue,
    isLoading: isStudyLoading,
    refresh: refreshStudyCta,
    clearCache: clearStudyCache,
  } = useStudyCtaState();

  // Stan modali
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardDTO | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Synchronizacja z URL - tylko przy pierwszym załadowaniu
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get("page");
    const page = pageParam ? parseInt(pageParam, 10) : 1;

    if (page !== state.page) {
      setPageFromUrl(page);
    } else {
      fetchPage(page);
    }
  }, []); // Puste zależności - tylko przy mount

  // Synchronizacja URL z aktualną stroną
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const currentPageParam = urlParams.get("page");
    const currentPage = currentPageParam ? parseInt(currentPageParam, 10) : 1;

    if (currentPage !== state.page) {
      const url = new URL(window.location.href);
      url.searchParams.set("page", state.page.toString());
      window.history.pushState({}, "", url.toString());
    }
  }, [state.page]);

  // Automatyczne ładowanie nowej strony po zmianie numeru strony
  useEffect(() => {
    if (state.page > 0) {
      fetchPage(state.page);
    }
  }, [state.page, fetchPage]);

  // Reakcja na zmianę języka
  useEffect(() => {
    // Wymuś ponowne renderowanie komponentów przy zmianie języka
    // Nie odświeżamy API, tylko komponenty
    // Możemy dodać force re-render jeśli potrzebne
  }, [language]);

  // Obsługa zmiany strony
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (typeof window === "undefined") {
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("page", newPage.toString());
      window.history.pushState({}, "", url.toString());
      fetchPage(newPage);
    },
    [fetchPage]
  );

  // Obsługa dodawania fiszki
  const handleAddSuccess = useCallback(
    async (created: FlashcardDTO) => {
      await refreshStudyCta();
      clearStudyCache(); // Wyczyść cache kolejki SRS
      // Odśwież listę aby pokazać nową fiszkę
      await fetchPage(1);
    },
    [refreshStudyCta, clearStudyCache, fetchPage]
  );

  // Obsługa edycji fiszki
  const handleEdit = useCallback((card: FlashcardDTO) => {
    setEditingCard(card);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSuccess = useCallback(
    async (updated: FlashcardDTO) => {
      await refreshStudyCta();
      clearStudyCache(); // Wyczyść cache kolejki SRS
      // Odśwież listę aby pokazać zaktualizowaną fiszkę
      await fetchPage(state.page);
    },
    [refreshStudyCta, clearStudyCache, fetchPage, state.page]
  );

  // Obsługa usuwania fiszki
  const handleDelete = useCallback(
    async (card: FlashcardListItemVM) => {
      removeWithUndo(card);
      enqueueUndo(card.id);
      clearStudyCache(); // Wyczyść cache kolejki SRS po usunięciu
    },
    [removeWithUndo, enqueueUndo, clearStudyCache]
  );

  // Obsługa cofania usuwania
  const handleUndo = useCallback(async () => {
    if (undoEntry) {
      undoDelete();
      await undoLast(undoEntry.id);
      clearStudyCache(); // Wyczyść cache kolejki SRS po przywróceniu
    }
  }, [undoEntry, undoDelete, undoLast, clearStudyCache]);

  // Obsługa timeout undo
  useEffect(() => {
    if (!undoEntry) return;

    const timeout = setTimeout(async () => {
      try {
        // Fiszka już została usunięta w removeWithUndo, więc tylko odświeżamy stan
        await refreshStudyCta();
        clearStudyCache(); // Wyczyść cache kolejki SRS
        // Odśwież listę aby pokazać aktualny stan po usunięciu
        // Używamy aktualnej wartości strony ze stanu
        await fetchPage(state.page);
      } catch (error) {
        console.error("Failed to refresh after undo timeout:", error);
        await fetchPage(state.page);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [undoEntry, refreshStudyCta, clearStudyCache, fetchPage, state.page]);

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {/* Nagłówek */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">{t("myFlashcards", isHydrated ? language : "en")}</h1>
          <p className="text-muted-foreground mt-1">{t("manageFlashcards", isHydrated ? language : "en")}</p>
        </div>
        <StudyNowCTA queue={queue} isLoading={isStudyLoading} />
      </div>

      {/* Przycisk dodawania */}
      <div className="mb-6">
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>{t("addFlashcard", isHydrated ? language : "en")}</span>
        </Button>
      </div>

      {/* Toolbar */}
      <FlashcardsToolbar totalCount={state.totalCount} page={state.page} pageSize={state.pageSize} />

      {/* Lista fiszek */}
      <div className="mt-4">
        {state.isLoadingList ? (
          <FlashcardTableSkeleton />
        ) : state.listError ? (
          <div className="text-center py-12">
            <div className="text-destructive">
              <p className="text-lg font-medium mb-2">{t("loadingError", isHydrated ? language : "en")}</p>
              <p className="text-sm mb-4">{state.listError}</p>
              <Button onClick={async () => await fetchPage(state.page)} variant="outline">
                {t("tryAgain", isHydrated ? language : "en")}
              </Button>
            </div>
          </div>
        ) : (
          <FlashcardTable items={state.items} onEdit={handleEdit} onDelete={handleDelete} />
        )}
      </div>

      {/* Paginacja */}
      {state.totalCount > 0 && (
        <div className="mt-6">
          <Pagination
            page={state.page}
            totalPages={Math.ceil(state.totalCount / state.pageSize)}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Modale */}
      <ManualAddModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} onSuccess={handleAddSuccess} />

      <EditFlashcardModal
        card={editingCard}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={handleEditSuccess}
      />

      {/* Snackbar undo */}
      <DeleteUndoSnackbar entry={undoEntry} onUndo={handleUndo} />
    </div>
  );
}
