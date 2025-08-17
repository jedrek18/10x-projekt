import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, BookOpen } from "lucide-react";
import { t, tWithParams } from "@/lib/i18n";
import type { FlashcardBatchSaveResponse } from "@/types";
import type { LanguageCode } from "@/lib/i18n";

interface SaveResultModalProps {
  result?: FlashcardBatchSaveResponse;
  onClose: () => void;
  onGoToStudy: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Modal displaying save results with CTA to study
 */
export function SaveResultModal({
  result,
  onClose,
  onGoToStudy,
  language = "en",
  isHydrated = true,
}: SaveResultModalProps) {
  if (!result) return null;

  const { saved, skipped } = result;
  const hasSkipped = skipped && skipped.length > 0;

  return (
    <Dialog open={!!result} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {t("saveCompleted", isHydrated ? language : "en")}
          </DialogTitle>
          <DialogDescription>{t("saveCompletedDescription", isHydrated ? language : "en")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {saved.length}{" "}
                  {saved.length === 1
                    ? t("flashcardSaved", isHydrated ? language : "en")
                    : t("flashcardsSaved", isHydrated ? language : "en")}
                </span>
              </div>
              <Badge className="bg-green-100 text-green-800">{t("success", isHydrated ? language : "en")}</Badge>
            </div>
            {saved.length > 0 && (
              <div className="text-sm text-green-700">{t("flashcardsReadyForStudy", isHydrated ? language : "en")}</div>
            )}
          </div>

          {/* Skipped items */}
          {hasSkipped && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800">
                  {skipped.length}{" "}
                  {skipped.length === 1
                    ? t("flashcardSkipped", isHydrated ? language : "en")
                    : t("flashcardsSkipped", isHydrated ? language : "en")}
                </span>
              </div>
              <p className="text-sm text-orange-700 mb-3">{t("skippedDescription", isHydrated ? language : "en")}</p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {skipped.slice(0, 8).map((item, index) => (
                  <div key={index} className="text-xs text-orange-600 p-2 bg-orange-100 rounded border">
                    <div className="font-medium break-words">{item.front}</div>
                    <div className="text-orange-500 mt-1">
                      {tWithParams("skippedReason", { reason: item.reason }, isHydrated ? language : "en")}
                    </div>
                  </div>
                ))}
                {skipped.length > 8 && (
                  <div className="text-xs text-orange-500 text-center py-2">
                    {tWithParams("andMore", { count: skipped.length - 8 }, isHydrated ? language : "en")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button onClick={onGoToStudy} className="flex items-center gap-2" size="lg">
              <BookOpen className="h-4 w-4" />
              {t("goToStudy", isHydrated ? language : "en")}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t("close", isHydrated ? language : "en")}
            </Button>
          </div>

          {/* Additional info */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            <p>
              {saved.length > 0
                ? t("flashcardsReadyForStudy", isHydrated ? language : "en")
                : t("noFlashcardsSaved", isHydrated ? language : "en")}
              {hasSkipped && ` ${t("skippedItemsCanBeReviewed", isHydrated ? language : "en")}`}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
