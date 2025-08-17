import React, { useState, useCallback, useEffect } from "react";
import { useProposalsSession } from "./hooks/useProposalsSession";
import { useIdempotencyKey } from "./hooks/useIdempotencyKey";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { saveBatch } from "./services/proposalsApi";
import { LocalCacheBadge } from "./LocalCacheBadge";
import { DuplicatesBanner } from "./DuplicatesBanner";
import { BulkActionsBar } from "./BulkActionsBar";
import { ProposalList } from "./ProposalList";
import { SaveResultModal } from "./SaveResultModal";
import { useToast } from "@/lib/hooks/useToast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { SaveState, BulkActionFlags } from "./types";
import type { AiGenerationProposalDTO, UUID } from "@/types";
import type { LanguageCode } from "@/lib/i18n";

interface ProposalsViewProps {
  onGoToStudy?: () => void;
  onSaveSuccess?: () => void;
  generatedProposals?: AiGenerationProposalDTO[];
  requestId?: UUID;
  maxProposals?: number;
  isRestoringFromCache?: boolean;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Main proposals view component integrating all sub-components and hooks
 */
export function ProposalsView({
  onGoToStudy,
  onSaveSuccess,
  generatedProposals,
  requestId,
  maxProposals,
  isRestoringFromCache,
  language = "en",
  isHydrated = true,
}: ProposalsViewProps) {
  const [saveState, setSaveState] = useState<SaveState>({ loading: false });
  const [showDuplicatesBanner, setShowDuplicatesBanner] = useState(false);
  const [showRejectConfirmDialog, setShowRejectConfirmDialog] = useState(false);
  const { toast } = useToast();

  // Custom hooks
  const {
    session,
    ttlInfo,
    counts,
    done,
    replaceFromGenerate,
    markAccepted,
    markEdited,
    deleteItem,
    toggleSelect,
    toggleSelectAll,
    rejectAll,
    getAcceptedItems,
    canSave,
    persist,
    clear,
  } = useProposalsSession();

  const { key: idempotencyKey, clearKey } = useIdempotencyKey(session?.requestId);

  // Initialize session with generated proposals if provided
  useEffect(() => {
    if (generatedProposals && generatedProposals.length > 0 && requestId && maxProposals) {
      // Only replace if we don't already have a session with the same requestId
      if (!session || session.requestId !== requestId) {
        replaceFromGenerate(generatedProposals, requestId, maxProposals);
      }
    }
  }, [generatedProposals, requestId, maxProposals, session?.requestId]);

  // Handle save accepted items
  async function handleSaveAccepted() {
    if (!session || !idempotencyKey || !canSave()) return;

    setSaveState({ loading: true, error: undefined });

    try {
      const acceptedItems = getAcceptedItems();
      if (acceptedItems.length === 0) {
        setSaveState({ loading: false });
        toast({
          title: t("noItemsToSave", isHydrated ? language : "en"),
          description: t("noItemsToSaveDescription", isHydrated ? language : "en"),
          variant: "destructive",
        });
        return;
      }

      const result = await saveBatch(acceptedItems, { idempotencyKey });

      if (result.success && result.data) {
        setSaveState({ loading: false, result: result.data });
        clearKey();
        clear();

        if (result.data.skipped && result.data.skipped.length > 0) {
          setShowDuplicatesBanner(true);
        }

        toast({
          title: t("saveSuccessful", isHydrated ? language : "en"),
          description: `${result.data.saved.length} ${result.data.saved.length === 1 ? t("flashcardSaved", isHydrated ? language : "en") : t("flashcardsSaved", isHydrated ? language : "en")}.`,
        });
      } else {
        setSaveState({
          loading: false,
          error: result.error?.message || t("saveFailed", isHydrated ? language : "en"),
        });

        // Handle specific error cases
        if (result.error?.code === "unauthorized") {
          // Redirect to login - handled by parent component
          return;
        }

        toast({
          title: t("saveFailed", isHydrated ? language : "en"),
          description: result.error?.message || t("saveFailed", isHydrated ? language : "en"),
          variant: "destructive",
        });
      }
    } catch (error) {
      setSaveState({
        loading: false,
        error: t("networkError", isHydrated ? language : "en"),
      });
      toast({
        title: t("networkError", isHydrated ? language : "en"),
        description: t("networkErrorDescription", isHydrated ? language : "en"),
        variant: "destructive",
      });
    }
  }

  // Handle save all items
  async function handleSaveAll() {
    if (!session || !idempotencyKey) return;

    setSaveState({ loading: true, error: undefined });

    try {
      // Get all non-deleted items and mark them as accepted
      const allItems = session.items.filter((item) => item.status !== "deleted");

      if (allItems.length === 0) {
        setSaveState({ loading: false });
        toast({
          title: t("allProposalsDeleted", isHydrated ? language : "en"),
          description: t("allProposalsDeletedDescription", isHydrated ? language : "en"),
          variant: "destructive",
        });
        return;
      }

      // Create the batch save request directly
      const itemsToSave = allItems.map((item) => ({
        front: item.front,
        back: item.back,
        source: item.status === "edited" ? "ai_edited" : ("ai" as const),
      }));

      const result = await saveBatch(itemsToSave, { idempotencyKey });

      if (result.success && result.data) {
        setSaveState({ loading: false, result: result.data });
        clearKey();
        clear();

        if (result.data.skipped && result.data.skipped.length > 0) {
          setShowDuplicatesBanner(true);
        }

        toast({
          title: t("saveSuccessful", isHydrated ? language : "en"),
          description: `${result.data.saved.length} ${result.data.saved.length === 1 ? t("flashcardSaved", isHydrated ? language : "en") : t("flashcardsSaved", isHydrated ? language : "en")}.`,
        });
      } else {
        setSaveState({
          loading: false,
          error: result.error?.message || t("saveFailed", isHydrated ? language : "en"),
        });

        // Handle specific error cases
        if (result.error?.code === "unauthorized") {
          // Redirect to login - handled by parent component
          return;
        }

        toast({
          title: t("saveFailed", isHydrated ? language : "en"),
          description: result.error?.message || t("saveFailed", isHydrated ? language : "en"),
          variant: "destructive",
        });
      }
    } catch (error) {
      setSaveState({
        loading: false,
        error: t("networkError", isHydrated ? language : "en"),
      });
      toast({
        title: t("networkError", isHydrated ? language : "en"),
        description: t("networkErrorDescription", isHydrated ? language : "en"),
        variant: "destructive",
      });
    }
  }

  // Handle reject all items
  const handleRejectAll = useCallback(() => {
    if (!session) return;
    setShowRejectConfirmDialog(true);
  }, [session]);

  // Handle confirm reject all
  const handleConfirmRejectAll = useCallback(() => {
    try {
      // Clear the session
      clear();

      // Show success message
      toast({
        title: t("allProposalsRejected", isHydrated ? language : "en"),
        description: t("allProposalsRejectedDescription", isHydrated ? language : "en"),
      });

      // Call parent callback if provided
      onSaveSuccess?.();
    } catch (error) {
      console.error("Error rejecting all proposals:", error);
      toast({
        title: t("errorRejectingProposals", isHydrated ? language : "en"),
        description: t("errorRejectingProposalsDescription", isHydrated ? language : "en"),
        variant: "destructive",
      });
    } finally {
      setShowRejectConfirmDialog(false);
    }
  }, [clear, onSaveSuccess, toast]);

  // Handle cancel reject all
  const handleCancelRejectAll = useCallback(() => {
    setShowRejectConfirmDialog(false);
  }, []);

  // Calculate disabled flags for bulk actions
  const disabledFlags: BulkActionFlags = {
    saveAccepted: !done || saveState.loading || !canSave(),
    saveAll: !done || saveState.loading,
    rejectAll: saveState.loading, // Allow reject all even when not done, but not during save
    selectAll: !done || saveState.loading,
  };

  // Keyboard shortcuts handlers
  const keyboardHandlers = {
    onEdit: (id?: string) => {
      // Edit functionality is handled within ProposalCard
    },
    onDelete: (id?: string) => {
      if (id) {
        deleteItem(id);
      }
    },
    onToggleSelect: (id?: string) => {
      if (id) {
        toggleSelect(id);
      }
    },
    onSelectAll: toggleSelectAll,
    onSaveAccepted: handleSaveAccepted,
    onSaveAll: handleSaveAll,
    onRejectAll: handleRejectAll,
  };

  // Initialize keyboard shortcuts
  useKeyboardShortcuts(keyboardHandlers, {
    enabled: done && !saveState.loading,
    selectedItemIds: session?.items.filter((item) => item.selected).map((item) => item.id) || [],
  });

  // Handle item change (from ProposalCard)
  const handleItemChange = useCallback(
    (updated: any) => {
      if (updated.status === "edited") {
        markEdited(updated.id, updated.front, updated.back);
      } else {
        // For all other status changes, use toggleSelect
        toggleSelect(updated.id);
      }
    },
    [markEdited, toggleSelect]
  );

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setSaveState({ loading: false, error: undefined, result: undefined });
    // Clear parent cache after modal is closed
    onSaveSuccess?.();
  }, [onSaveSuccess]);

  // Handle go to study
  const handleGoToStudy = useCallback(() => {
    setSaveState({ loading: false, error: undefined, result: undefined });
    // Clear parent cache before going to study
    onSaveSuccess?.();
    onGoToStudy?.();
  }, [onSaveSuccess, onGoToStudy]);

  // Handle duplicates banner close
  const handleDuplicatesBannerClose = useCallback(() => {
    setShowDuplicatesBanner(false);
  }, []);

  // Persist session periodically
  useEffect(() => {
    if (session) {
      const interval = setInterval(persist, 5 * 60 * 1000); // Every 5 minutes
      return () => clearInterval(interval);
    }
  }, [session, persist]);

  // Show empty state if no session
  if (!session) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg font-medium">{t("noProposalsSession", isHydrated ? language : "en")}</p>
          <p className="text-sm">{t("noProposalsSessionDescription", isHydrated ? language : "en")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cache badge - only show when actually restoring from cache */}
      {isRestoringFromCache && (
        <LocalCacheBadge ttlInfo={ttlInfo} onClear={clear} language={language} isHydrated={isHydrated} />
      )}

      {/* Duplicates banner */}
      {showDuplicatesBanner && saveState.result?.skipped && (
        <DuplicatesBanner
          skipped={saveState.result.skipped}
          onClose={handleDuplicatesBannerClose}
          language={language}
          isHydrated={isHydrated}
        />
      )}

      {/* Bulk actions */}
      <BulkActionsBar
        counts={counts}
        disabledFlags={disabledFlags}
        onSaveAccepted={handleSaveAccepted}
        onSaveAll={handleSaveAll}
        onRejectAll={handleRejectAll}
        onToggleSelectAll={toggleSelectAll}
        language={language}
        isHydrated={isHydrated}
      />

      {/* Proposals list */}
      <ProposalList
        items={session.items}
        done={done}
        onItemChange={handleItemChange}
        onDeleteItem={deleteItem}
        language={language}
        isHydrated={isHydrated}
      />

      {/* Save result modal */}
      <SaveResultModal
        result={saveState.result}
        onClose={handleModalClose}
        onGoToStudy={handleGoToStudy}
        language={language}
        isHydrated={isHydrated}
      />

      {/* Reject all confirmation dialog */}
      <Dialog open={showRejectConfirmDialog} onOpenChange={setShowRejectConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectAllTitle", isHydrated ? language : "en")}</DialogTitle>
            <DialogDescription>{t("rejectAllDescription", isHydrated ? language : "en")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRejectAll}>
              {t("cancel", isHydrated ? language : "en")}
            </Button>
            <Button variant="destructive" onClick={handleConfirmRejectAll}>
              {t("rejectAllConfirm", isHydrated ? language : "en")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
