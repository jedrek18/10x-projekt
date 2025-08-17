import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface NetworkBannerProps {
  online: boolean;
  lastError?: string;
}

export function NetworkBanner({ online, lastError }: NetworkBannerProps) {
  const { language } = usePreferredLanguage();

  if (online && !lastError) {
    return null;
  }

  return (
    <Alert variant={online ? "default" : "destructive"} className="mb-4" aria-live="polite" aria-atomic="true">
      {online ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
      <AlertDescription>
        {!online && t("networkOfflineDescription", language)}
        {online && lastError && `${t("connectionProblem", language)}: ${lastError}`}
      </AlertDescription>
    </Alert>
  );
}
