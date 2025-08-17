import React, { useState, useEffect, useCallback } from "react";
import { StudyCard } from "./StudyCard";
import { RatingPanel } from "./RatingPanel";
import { useToast } from "../../lib/hooks/useToast";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { SrsQueueItemVM } from "./types";
import type { SrsReviewResultDTO, ReviewRating } from "../../types";

interface StudyStageProps {
  item: SrsQueueItemVM | null;
  rate: (rating: ReviewRating) => Promise<SrsReviewResultDTO>;
  onRated: (result: SrsReviewResultDTO) => void;
}

export function StudyStage({ item, rate, onRated }: StudyStageProps) {
  const { language } = usePreferredLanguage();
  const [revealed, setRevealed] = useState(false);
  const { toast } = useToast();

  const handleRate = useCallback(
    async (rating: 0 | 1 | 2 | 3) => {
      if (!item) return;

      try {
        const result = await rate(rating);
        onRated(result);
      } catch (error) {
        console.error("Failed to rate card:", error);
        toast({
          title: t("error", language),
          description: error instanceof Error ? error.message : t("unexpectedError", language),
          variant: "destructive",
        });
      }
    },
    [item, rate, onRated, toast]
  );

  const handleReveal = useCallback(async () => {
    if (!item) return;

    // Back content is already available from the SRS queue
    setRevealed(true);
  }, [item]);

  // Reset revealed state when item changes
  useEffect(() => {
    setRevealed(false);
  }, [item?.id]);

  // Obsługa skrótów klawiaturowych
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!item) return;

      // Reveal: Space/Enter
      if ((event.key === " " || event.key === "Enter") && !revealed) {
        event.preventDefault();
        handleReveal();
        return;
      }

      // Rating: 1-4 (tylko po reveal)
      if (revealed && ["1", "2", "3", "4"].includes(event.key)) {
        event.preventDefault();
        const rating = (parseInt(event.key) - 1) as 0 | 1 | 2 | 3;
        handleRate(rating);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, revealed, handleRate, handleReveal]);

  if (!item) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("noCardsToStudy", language)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StudyCard item={item} revealed={revealed} onReveal={handleReveal} />

      {revealed && <RatingPanel disabled={item.pending} onRate={handleRate} />}
    </div>
  );
}
