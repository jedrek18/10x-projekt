import { Badge } from "../ui/badge";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t, tWithParams } from "../../lib/i18n";
import type { FlashcardsToolbarProps } from "./types";

export function FlashcardsToolbar({ totalCount, page, pageSize }: FlashcardsToolbarProps) {
  const { language } = usePreferredLanguage();
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between py-4 border-b">
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          {totalCount === 0 ? (
            t("noFlashcards", language)
          ) : (
            <>
              {tWithParams(
                "showingItems",
                {
                  start: startIndex,
                  end: endIndex,
                  total: totalCount,
                },
                language
              )}
            </>
          )}
        </div>

        {totalCount > 0 && (
          <Badge variant="outline" className="text-xs">
            {t("sorting", language)}: {t("newest", language)}
          </Badge>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        {totalCount > 0 && (
          <>
            {tWithParams(
              "pageInfo",
              {
                page: page,
                total: Math.ceil(totalCount / pageSize),
              },
              language
            )}
          </>
        )}
      </div>
    </div>
  );
}
