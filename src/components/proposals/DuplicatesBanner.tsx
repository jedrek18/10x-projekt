import React, { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { t, tWithParams } from "@/lib/i18n";
import type { FlashcardBatchSaveSkippedItem } from "@/types";
import type { LanguageCode } from "@/lib/i18n";

interface DuplicatesBannerProps {
  skipped: FlashcardBatchSaveSkippedItem[];
  onClose?: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Banner displaying skipped items after batch save (e.g., duplicates)
 */
export function DuplicatesBanner({ skipped, onClose, language = "en", isHydrated = true }: DuplicatesBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!skipped || skipped.length === 0) {
    return null;
  }

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleClose = () => {
    onClose?.();
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>
              {skipped.length}{" "}
              {skipped.length === 1
                ? t("flashcardWas", isHydrated ? language : "en")
                : t("flashcardsWere", isHydrated ? language : "en")}{" "}
              {t("skipped", isHydrated ? language : "en")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="h-6 px-2 text-orange-600 hover:text-orange-800"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 px-2 text-orange-600 hover:text-orange-800"
            >
              {t("dismiss", isHydrated ? language : "en")}
            </Button>
          )}
        </div>

        {isExpanded && (
          <div className="mt-3 space-y-2">
            {skipped.map((item, index) => (
              <div key={index} className="p-2 bg-orange-100 rounded border border-orange-200">
                <div className="text-sm font-medium text-orange-900">{item.front}</div>
                <div className="text-xs text-orange-700">
                  {tWithParams("skippedReason", { reason: item.reason }, isHydrated ? language : "en")}
                </div>
              </div>
            ))}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
