import { Button } from "../ui/button";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { SourceChip } from "./SourceChip";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { FlashcardRowItemProps } from "./types";

export function FlashcardRowItem({ item, onEdit, onDelete }: FlashcardRowItemProps) {
  const { language } = usePreferredLanguage();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(language === "pl" ? "pl-PL" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="flex items-center justify-between p-4 border-b hover:bg-muted/50 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" title={item.front}>
              {truncateText(item.front, 60)}
            </h3>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={item.back}>
              {truncateText(item.back, 80)}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <SourceChip source={item.source} />
            <span className="text-xs text-muted-foreground">{formatDate(item.created_at)}</span>
          </div>
        </div>

        {item.error && <p className="text-xs text-destructive mt-1">{item.error}</p>}
      </div>

      <div className="flex items-center space-x-2 ml-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(item)}
          disabled={item.isMutating}
          className="h-8 w-8 p-0"
          title={t("editFlashcard", language)}
        >
          {item.isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item)}
          disabled={item.isMutating || item.isPendingDelete}
          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          title={t("deleteFlashcard", language)}
        >
          {item.isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
