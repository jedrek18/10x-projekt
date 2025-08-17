import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Eye } from "lucide-react";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import type { SrsQueueItemVM } from "./types";

interface StudyCardProps {
  item: SrsQueueItemVM;
  revealed: boolean;
  onReveal: () => void;
}

export const StudyCard = React.memo(function StudyCard({ item, revealed, onReveal }: StudyCardProps) {
  const { language } = usePreferredLanguage();
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    setPrefersReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="p-6 space-y-6">
        {/* Front side - zawsze widoczny */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t("question", language)}</h3>
          <div className="text-lg leading-relaxed min-h-[4rem] flex items-center">{item.front}</div>
        </div>

        {/* Back side - widoczny po reveal */}
        <div
          className={`space-y-2 transition-all duration-300 ${prefersReducedMotion ? "" : "transform"} ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
          }`}
          aria-hidden={!revealed}
        >
          <h3 className="text-sm font-medium text-muted-foreground">{t("answer", language)}</h3>
          <div className="text-lg leading-relaxed min-h-[4rem] flex items-center p-4 bg-muted rounded-lg">
            {item.back || t("noAnswerProvided", language)}
          </div>
        </div>

        {/* Przycisk reveal - widoczny tylko przed reveal */}
        {!revealed && (
          <div className="flex justify-center pt-4">
            <Button onClick={onReveal} size="lg" className="gap-2" aria-label={t("showAnswer", language)}>
              <Eye className="h-4 w-4" />
              {t("showAnswer", language)}
            </Button>
          </div>
        )}

        {/* Informacje o karcie */}
        <div className="pt-4 border-t text-sm text-muted-foreground">
          <div className="flex justify-between items-center">
            <span>
              {t("card", language)} {item.id.slice(0, 8)}...
            </span>
            <span className="capitalize">{item.state}</span>
          </div>
          {item.due_at && (
            <div className="text-xs mt-1">
              {t("due", language)}: {new Date(item.due_at).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
