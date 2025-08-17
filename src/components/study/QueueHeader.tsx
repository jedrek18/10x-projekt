import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { GoalProgressBar } from "./GoalProgressBar";
import { IncreaseGoalAction } from "./IncreaseGoalAction";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { QueueMetaVM } from "./types";

interface QueueHeaderProps {
  meta: QueueMetaVM;
  sessionProgress?: number;
  onGoalUpdated?: (newGoal: number) => void;
}

export function QueueHeader({ meta, sessionProgress, onGoalUpdated }: QueueHeaderProps) {
  const { language } = usePreferredLanguage();
  const totalCards = meta.due_count + meta.new_selected;
  // Użyj postępu sesji jeśli dostępny, w przeciwnym razie użyj postępu z API
  const effectiveProgress = sessionProgress !== undefined ? sessionProgress : meta.reviews_done_today;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Informacje o kolejce */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">{t("studyQueue", language)}</h2>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-medium">{totalCards}</span> {t("cardsAvailable", language)}
              </span>
              {meta.due_count > 0 && (
                <span>
                  <span className="font-medium">{meta.due_count}</span> {t("dueForReview", language)}
                </span>
              )}
              {meta.new_selected > 0 && (
                <span>
                  <span className="font-medium">{meta.new_selected}</span> {t("newCards", language)}
                </span>
              )}
            </div>
          </div>

          {/* Postęp i akcje */}
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">{t("dailyProgress", language)}</div>
              <div className="text-lg font-semibold">
                {effectiveProgress} / {meta.daily_goal}
              </div>
            </div>

            <GoalProgressBar meta={{ ...meta, reviews_done_today: effectiveProgress }} />

            <IncreaseGoalAction
              dateUtc={new Date().toISOString().split("T")[0]}
              currentGoal={meta.daily_goal}
              onUpdated={(newGoal: number) => {
                // Aktualizuj cel w stanie komponentu
                onGoalUpdated?.(newGoal);
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
