import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { StudyNowCTAProps } from "./types";

export function StudyNowCTA({ queue, isLoading }: StudyNowCTAProps) {
  const { language } = usePreferredLanguage();
  const hasCardsToStudy = queue && (queue.due.length > 0 || queue.new.length > 0);
  const isDisabled = isLoading || !hasCardsToStudy;

  const handleClick = () => {
    if (!isDisabled) {
      window.location.href = "/study";
    }
  };

  const tooltipContent = isLoading
    ? t("checkingCards", language)
    : !hasCardsToStudy
      ? t("noCardsToStudy", language)
      : t("startStudy", language);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button onClick={handleClick} disabled={isDisabled} className="ml-auto">
            {t("startStudy", language)}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
