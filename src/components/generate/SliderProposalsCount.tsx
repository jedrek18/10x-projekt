import React, { memo } from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { t, tWithParams } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface SliderProposalsCountProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Suwak wyboru liczby propozycji (10-50, domyślnie 30). Wartość pamiętana lokalnie.
 */
export const SliderProposalsCount = memo(function SliderProposalsCount({
  value,
  min,
  max,
  onChange,
  language = "en",
  isHydrated = true,
}: SliderProposalsCountProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
    }
  };

  const getSliderColor = () => {
    const percentage = ((value - min) / (max - min)) * 100;
    return `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${percentage}%, #e5e7eb ${percentage}%, #e5e7eb 100%)`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor="proposals-slider" className="text-base font-medium">
          {t("proposalsCount", isHydrated ? language : "en")}
        </Label>
        <Badge variant="secondary" className="text-sm">
          {value} {t("items", isHydrated ? language : "en")}
        </Badge>
      </div>

      <div className="space-y-2">
        <input
          id="proposals-slider"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          style={{
            background: getSliderColor(),
          }}
          aria-describedby="slider-description"
        />

        <div className="flex justify-between text-xs text-gray-500">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>

      <div id="slider-description" className="text-xs text-gray-500">
        <p>{t("proposalsCountDescription", isHydrated ? language : "en")}</p>
      </div>
    </div>
  );
});
