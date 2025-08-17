import React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface CancelButtonProps {
  onClick: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Przycisk anulowania trwającej generacji.
 */
export function CancelButton({ onClick, language = "en", isHydrated = true }: CancelButtonProps) {
  return (
    <Button variant="outline" onClick={onClick} className="min-w-[100px]">
      {t("cancelButton", isHydrated ? language : "en")}
    </Button>
  );
}
