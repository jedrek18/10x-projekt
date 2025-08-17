import React from "react";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface GenerateButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Przycisk inicjujący proces generacji. Obsługuje stany disabled i loading.
 */
export function GenerateButton({
  disabled = false,
  loading = false,
  onClick,
  language = "en",
  isHydrated = true,
}: GenerateButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled || loading} className="min-w-[120px]" aria-busy={loading}>
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {t("generatingButton", isHydrated ? language : "en")}
        </>
      ) : (
        t("generateButton", isHydrated ? language : "en")
      )}
    </Button>
  );
}
