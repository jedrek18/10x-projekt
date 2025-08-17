import { Badge } from "../ui/badge";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { SourceChipProps } from "./types";

export function SourceChip({ source }: SourceChipProps) {
  const { language } = usePreferredLanguage();

  const getVariant = () => {
    switch (source) {
      case "manual":
        return "default";
      case "ai":
        return "secondary";
      case "ai_edited":
        return "outline";
      default:
        return "default";
    }
  };

  const getLabel = () => {
    switch (source) {
      case "manual":
        return t("manual", language);
      case "ai":
        return t("ai", language);
      case "ai_edited":
        return t("aiEdited", language);
      default:
        return source;
    }
  };

  return (
    <Badge variant={getVariant()} className="text-xs">
      {getLabel()}
    </Badge>
  );
}
