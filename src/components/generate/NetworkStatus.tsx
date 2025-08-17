import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { t } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface NetworkStatusProps {
  onOnlineChange?: (isOnline: boolean) => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Komponent monitorujący stan połączenia sieciowego i wyświetlający odpowiednie komunikaty.
 */
export function NetworkStatus({ onOnlineChange, language = "en", isHydrated = true }: NetworkStatusProps) {
  const [isOnline, setIsOnline] = useState(true); // Start with true to avoid hydration mismatch

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return;
    }

    // Set initial state after hydration to avoid mismatch
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      onOnlineChange?.(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      onOnlineChange?.(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [onOnlineChange]);

  if (isOnline) {
    return null;
  }

  return (
    <Alert variant="destructive" className="mb-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
        <AlertDescription>{t("networkOfflineDescription", isHydrated ? language : "en")}</AlertDescription>
      </div>
    </Alert>
  );
}
