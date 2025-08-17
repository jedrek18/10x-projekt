import React from "react";
import { Progress } from "@/components/ui/progress";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { QueueMetaVM } from "./types";

interface GoalProgressBarProps {
  meta: QueueMetaVM;
}

export const GoalProgressBar = React.memo(function GoalProgressBar({ meta }: GoalProgressBarProps) {
  const { language } = usePreferredLanguage();
  const progressPercentage = meta.daily_goal > 0 ? Math.min((meta.reviews_done_today / meta.daily_goal) * 100, 100) : 0;

  const isOverGoal = meta.reviews_done_today > meta.daily_goal;
  const displayPercentage = isOverGoal ? 100 : progressPercentage;
  const displayLabel = isOverGoal ? `${meta.reviews_done_today} (100%+)` : `${Math.round(progressPercentage)}%`;

  return (
    <div className="w-32 space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground">{t("progress", language)}</span>
        <span className="font-medium">{displayLabel}</span>
      </div>
      <Progress
        value={displayPercentage}
        className="h-2"
        aria-label={`${t("dailyProgress", language)}: ${meta.reviews_done_today} ${t("of", language)} ${meta.daily_goal} ${t("reviewsCompleted", language)}`}
      />
    </div>
  );
});
