import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { StudyNowCTAProps } from "./types";

export function StudyNowCTA({ queue, isLoading }: StudyNowCTAProps) {
  const { language, isHydrated } = usePreferredLanguage();
  const hasCardsToStudy = queue && (queue.due.length > 0 || queue.new.length > 0);
  const isDisabled = isLoading || !hasCardsToStudy;

  const handleClick = () => {
    if (!isDisabled && typeof window !== "undefined") {
      window.location.href = "/study";
    }
  };

  const tooltipContent = isLoading
    ? t("checkingCards", isHydrated ? language : "en")
    : !hasCardsToStudy
      ? t("noCardsToStudy", isHydrated ? language : "en")
      : t("startStudy", isHydrated ? language : "en");

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleClick} disabled={isDisabled} className="ml-auto">
            {t("startStudy", isHydrated ? language : "en")}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
