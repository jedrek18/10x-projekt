import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { t, tWithParams } from "@/lib/i18n";
import type { TTLInfo } from "./types";
import type { LanguageCode } from "@/lib/i18n";

interface LocalCacheBadgeProps {
  ttlInfo?: TTLInfo | null;
  onClear: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Badge informing about restored state from cache and remaining TTL
 */
export function LocalCacheBadge({ ttlInfo, onClear, language = "en", isHydrated = true }: LocalCacheBadgeProps) {
  const [remainingTime, setRemainingTime] = useState<string>("");

  // Update remaining time every minute
  useEffect(() => {
    if (!ttlInfo) return;

    const updateTime = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(ttlInfo.expiresAt).getTime();
      const remaining = Math.max(0, expiresAt - now);

      if (remaining <= 0) {
        setRemainingTime("");
        return;
      }

      const hours = Math.floor(remaining / (1000 * 60 * 60));
      const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

      if (hours > 0) {
        setRemainingTime(`${hours}h ${minutes}m`);
      } else {
        setRemainingTime(`${minutes}m`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [ttlInfo]);

  if (!ttlInfo || !remainingTime) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
        {t("cacheRestored", isHydrated ? language : "en")}
      </Badge>
      <span className="text-sm text-blue-700">
        {tWithParams("sessionExpiresIn", { time: remainingTime }, isHydrated ? language : "en")}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="ml-auto h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
        aria-label={t("clearCache", isHydrated ? language : "en")}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
