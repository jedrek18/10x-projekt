import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { RotateCcw, Minus, Check, Plus } from "lucide-react";
import { t, tWithParams } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { ReviewRating } from "../../types";

interface RatingPanelProps {
  disabled: boolean;
  onRate: (rating: ReviewRating) => void;
}

const ratings: {
  value: ReviewRating;
  labelKey: string;
  descriptionKey: string;
  icon: React.ComponentType<{ className?: string }>;
  variant: "destructive" | "secondary" | "default" | "outline";
  shortcut: string;
}[] = [
  {
    value: 0,
    labelKey: "again",
    descriptionKey: "againDescription",
    icon: RotateCcw,
    variant: "destructive",
    shortcut: "1",
  },
  {
    value: 1,
    labelKey: "hard",
    descriptionKey: "hardDescription",
    icon: Minus,
    variant: "secondary",
    shortcut: "2",
  },
  {
    value: 2,
    labelKey: "good",
    descriptionKey: "goodDescription",
    icon: Check,
    variant: "default",
    shortcut: "3",
  },
  {
    value: 3,
    labelKey: "easy",
    descriptionKey: "easyDescription",
    icon: Plus,
    variant: "outline",
    shortcut: "4",
  },
];

export const RatingPanel = React.memo(function RatingPanel({ disabled, onRate }: RatingPanelProps) {
  const { language } = usePreferredLanguage();

  const handleRate = (rating: ReviewRating) => {
    if (!disabled) {
      onRate(rating);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6">
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold mb-2">{t("howWellDidYouKnow", language)}</h3>
          <p className="text-sm text-muted-foreground">{t("rateYourKnowledge", language)}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <TooltipProvider>
            {ratings.map((rating) => {
              const Icon = rating.icon;
              return (
                <Tooltip key={rating.value}>
                  <TooltipTrigger asChild>
                    <Button
                      variant={rating.variant}
                      size="lg"
                      className="h-20 flex flex-col gap-1"
                      onClick={() => handleRate(rating.value)}
                      disabled={disabled}
                      aria-label={`${rating.label}: ${rating.description}`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{t(rating.labelKey, language)}</span>
                      <kbd className="text-xs opacity-70">{rating.shortcut}</kbd>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t(rating.descriptionKey, language)}</p>
                    <p className="text-xs opacity-70">{tWithParams("press", { key: rating.shortcut }, language)}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {disabled && (
          <div className="text-center mt-4">
            <p className="text-sm text-muted-foreground">{t("processingRating", language)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
