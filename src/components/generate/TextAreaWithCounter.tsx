import React, { memo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { t, tWithParams } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface TextAreaWithCounterProps {
  value: string;
  count: number;
  min: number;
  max: number;
  onChange: (value: string) => void;
  onSubmitShortcut: () => void;
  error?: string | null;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Pole tekstowe z licznikiem znaków (grapheme), wskazujące brakujące/przekroczone znaki i stany błędu.
 */
export const TextAreaWithCounter = memo(function TextAreaWithCounter({
  value,
  count,
  min,
  max,
  onChange,
  onSubmitShortcut,
  error,
  language = "en",
  isHydrated = true,
}: TextAreaWithCounterProps) {
  const isUnderMin = count < min;
  const isOverMax = count > max;
  const delta = isUnderMin ? count - min : isOverMax ? count - max : 0;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === "Enter") {
      e.preventDefault();
      onSubmitShortcut();
    }
  };

  const getCounterColor = () => {
    if (isOverMax) return "text-red-600";
    if (isUnderMin) return "text-orange-600";
    if (count >= min && count <= max) return "text-green-600";
    return "text-gray-500";
  };

  const getCounterText = () => {
    if (isUnderMin) {
      return tWithParams("minLength", { min }, isHydrated ? language : "en");
    }
    if (isOverMax) {
      return tWithParams("maxLength", { max }, isHydrated ? language : "en");
    }
    return `${count} / ${max}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="source-text" className="text-base font-medium">
          {t("sourceText", isHydrated ? language : "en")}
        </Label>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {t("generateShortcut", isHydrated ? language : "en")}
          </Badge>
          <span className={`text-sm font-medium ${getCounterColor()}`}>{getCounterText()}</span>
        </div>
      </div>

      <Textarea
        id="source-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("sourceTextPlaceholder", isHydrated ? language : "en")}
        className={`min-h-[200px] resize-y ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
        aria-describedby={error ? "text-error" : undefined}
        aria-invalid={!!error}
      />

      {error && (
        <div id="text-error" className="text-sm text-red-600" aria-live="polite">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-500">
        <p>{t("sourceTextRequirements", isHydrated ? language : "en")}:</p>
        <ul className="list-disc list-inside space-y-1 mt-1">
          <li>{tWithParams("minCharacters", { min: min.toLocaleString() }, isHydrated ? language : "en")}</li>
          <li>{tWithParams("maxCharacters", { max: max.toLocaleString() }, isHydrated ? language : "en")}</li>
          <li>{t("useShortcut", isHydrated ? language : "en")}</li>
        </ul>
      </div>
    </div>
  );
});
