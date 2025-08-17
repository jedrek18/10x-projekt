import type { FlashcardDTO, FlashcardSource, UUID, SrsQueueResponse } from "../../types";

// VM elementu listy
export interface FlashcardListItemVM extends FlashcardDTO {
  isPendingDelete: boolean; // w trakcie okna Undo
  isMutating: boolean; // zapis/edycja/usuwanie
  error?: string | null; // błąd akcji na elemencie
}

// Stan strony
export interface FlashcardsPageState {
  page: number; // >=1
  pageSize: number; // 25
  totalCount: number; // z nagłówków
  order: "created_at.desc" | "created_at.asc";
  items: FlashcardListItemVM[];
  isLoadingList: boolean;
  listError?: string | null;
  isSubmitting: boolean; // globalne blokady przy mutacjach hurtem (brak w MVP)
}

// Formularze
export interface ManualAddFormVM {
  front: string;
  back: string;
  frontCount: number; // grapheme-safe
  backCount: number;
  errors: Partial<Record<"front" | "back", string>>;
  isSubmitting: boolean;
}

export interface EditFormVM extends ManualAddFormVM {
  id: UUID;
}

// Undo mechanizm
export interface UndoEntryVM {
  id: UUID; // id fiszki
  expiresAt: number; // ms epoch
}

// Props dla komponentów
export interface StudyNowCTAProps {
  queue?: SrsQueueResponse;
  isLoading: boolean;
}

export interface ManualAddModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (created: FlashcardDTO) => void;
}

export interface EditFlashcardModalProps {
  card: FlashcardDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: FlashcardDTO) => void;
}

export interface FlashcardsToolbarProps {
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface FlashcardTableProps {
  items: FlashcardListItemVM[];
  onEdit: (card: FlashcardDTO) => void;
  onDelete: (card: FlashcardListItemVM) => void;
}

export interface FlashcardRowItemProps {
  item: FlashcardListItemVM;
  onEdit: (card: FlashcardDTO) => void;
  onDelete: (card: FlashcardDTO) => void;
}

export interface SourceChipProps {
  source: FlashcardSource;
}

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (next: number) => void;
}

export interface DeleteUndoSnackbarProps {
  entry: UndoEntryVM | null;
  onUndo: () => void;
}
