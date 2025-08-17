import React from "react";
import { LanguageSelector } from "../Landing/LanguageSelector";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";
import { t } from "../../lib/i18n";
import type { LanguageCode } from "../../lib/i18n";

export interface I18nSelectorProps {
  value: LanguageCode;
  onChange: (lang: LanguageCode) => void;
}

export function I18nSelector({ value, onChange }: I18nSelectorProps) {
  const { language } = usePreferredLanguage();

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{t("languageLabel", language)}</label>
      <LanguageSelector value={value} onChange={onChange} />
    </div>
  );
}
