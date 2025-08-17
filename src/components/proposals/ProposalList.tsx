import React, { useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProposalCard } from "./ProposalCard";
import { t } from "@/lib/i18n";
import type { ProposalVM } from "./types";
import type { LanguageCode } from "@/lib/i18n";

interface ProposalListProps {
  items: ProposalVM[];
  done: boolean;
  onItemChange: (updated: ProposalVM) => void;
  onDeleteItem: (id: string) => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * List of proposal cards with progressive reveal and keyboard navigation
 */
export function ProposalList({
  items,
  done,
  onItemChange,
  onDeleteItem,
  language = "en",
  isHydrated = true,
}: ProposalListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!listRef.current || !done) return;

      const visibleItems = items.filter((item) => item.status !== "deleted");
      const currentIndex = focusedIndex;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusedIndex(Math.min(currentIndex + 1, visibleItems.length - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusedIndex(Math.max(currentIndex - 1, 0));
          break;
        case "Home":
          event.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          event.preventDefault();
          setFocusedIndex(visibleItems.length - 1);
          break;
        case "Escape":
          event.preventDefault();
          setFocusedIndex(-1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [items, done, focusedIndex]);

  // Focus management
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const visibleItems = items.filter((item) => item.status !== "deleted");
      const targetItem = visibleItems[focusedIndex];
      if (targetItem) {
        const element = listRef.current.querySelector(`[data-proposal-id="${targetItem.id}"]`);
        if (element instanceof HTMLElement) {
          element.focus();
        }
      }
    }
  }, [focusedIndex, items]);

  // Show skeletons while loading
  if (!done) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-6 w-20" />
              <div className="flex gap-1">
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
                <Skeleton className="h-8 w-8" />
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-16 mb-2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Show empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg font-medium">{t("noProposalsSession", isHydrated ? language : "en")}</p>
          <p className="text-sm">{t("noProposalsSessionDescription", isHydrated ? language : "en")}</p>
        </div>
      </div>
    );
  }

  // Show only non-deleted items
  const visibleItems = items.filter((item) => item.status !== "deleted");

  if (visibleItems.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500">
          <p className="text-lg font-medium">{t("allProposalsDeleted", isHydrated ? language : "en")}</p>
          <p className="text-sm">{t("allProposalsDeletedDescription", isHydrated ? language : "en")}</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={listRef} className="space-y-4" role="list" aria-label="Proposals list">
      {visibleItems.map((item, index) => (
        <div
          key={item.id}
          data-proposal-id={item.id}
          tabIndex={0}
          className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
          onFocus={() => setFocusedIndex(index)}
        >
          <ProposalCard
            item={item}
            disabled={!done}
            onChange={onItemChange}
            onDelete={() => onDeleteItem(item.id)}
            language={language}
            isHydrated={isHydrated}
          />
        </div>
      ))}
    </div>
  );
}
