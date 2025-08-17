import { FlashcardRowItem } from "./FlashcardRowItem";
import { Skeleton } from "../ui/skeleton";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { FlashcardTableProps } from "./types";

export function FlashcardTable({ items, onEdit, onDelete }: FlashcardTableProps) {
  const { language } = usePreferredLanguage();

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-muted-foreground">
          <p className="text-lg font-medium mb-2">{t("noFlashcards", language)}</p>
          <p className="text-sm">{t("addFirstFlashcard", language)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => (
        <FlashcardRowItem key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

// Komponent do wyświetlania skeleton loading
export function FlashcardTableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
