import React from "react";
import { GenerateButton } from "./GenerateButton";
import { CancelButton } from "./CancelButton";
import { t } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface ControlsBarProps {
  canGenerate: boolean;
  isGenerating: boolean;
  onGenerate: () => void;
  onCancel: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Pasek akcji. Renderuje GenerateButton i CancelButton zależnie od stanu.
 */
export function ControlsBar({
  canGenerate,
  isGenerating,
  onGenerate,
  onCancel,
  language = "en",
  isHydrated = true,
}: ControlsBarProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center gap-4">
        <GenerateButton
          disabled={!canGenerate}
          loading={isGenerating}
          onClick={onGenerate}
          language={language}
          isHydrated={isHydrated}
        />

        {isGenerating && <CancelButton onClick={onCancel} language={language} isHydrated={isHydrated} />}
      </div>

      <div className="text-sm text-gray-500">
        {isGenerating ? (
          <span>{t("generatingButton", isHydrated ? language : "en")}...</span>
        ) : (
          <span className="ml-2">{t("useShortcut", isHydrated ? language : "en")}</span>
        )}
      </div>
    </div>
  );
}
