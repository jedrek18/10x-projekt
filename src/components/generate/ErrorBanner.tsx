import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";
import type { LanguageCode } from "@/lib/i18n";

export interface ErrorBannerProps {
  error: { code: string; message: string } | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  language?: LanguageCode;
  isHydrated?: boolean;
}

/**
 * Komponent wyświetlający błędy z odpowiednimi akcjami w zależności od typu błędu.
 */
export function ErrorBanner({ error, onRetry, onDismiss, language = "en", isHydrated = true }: ErrorBannerProps) {
  if (!error) return null;

  const getErrorConfig = (code: string) => {
    switch (code) {
      case "validation_failed":
        return {
          variant: "destructive" as const,
          title: t("validationFailed", isHydrated ? language : "en"),
          description: error.message,
          showRetry: false,
          showDismiss: true,
        };
      case "unauthorized":
        return {
          variant: "destructive" as const,
          title: t("unauthorized", isHydrated ? language : "en"),
          description: t("unauthorizedDescription", isHydrated ? language : "en"),
          showRetry: false,
          showDismiss: false,
        };
      case "too_many_requests":
        return {
          variant: "destructive" as const,
          title: t("tooManyRequests", isHydrated ? language : "en"),
          description: t("tooManyRequestsDescription", isHydrated ? language : "en"),
          showRetry: true,
          showDismiss: true,
        };
      case "request_timeout":
      case "upstream_unavailable":
        return {
          variant: "destructive" as const,
          title: t("connectionProblem", isHydrated ? language : "en"),
          description: t("connectionProblemDescription", isHydrated ? language : "en"),
          showRetry: true,
          showDismiss: true,
        };
      case "generation_failed":
        return {
          variant: "destructive" as const,
          title: t("generationFailed", isHydrated ? language : "en"),
          description: error.message,
          showRetry: true,
          showDismiss: true,
        };
      default:
        return {
          variant: "destructive" as const,
          title: t("error", isHydrated ? language : "en"),
          description: error.message,
          showRetry: true,
          showDismiss: true,
        };
    }
  };

  const config = getErrorConfig(error.code);

  return (
    <Alert variant={config.variant} className="mb-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {error.code}
            </Badge>
            <span className="font-medium">{config.title}</span>
          </div>
          <AlertDescription>{config.description}</AlertDescription>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {config.showRetry && onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              {t("retry", isHydrated ? language : "en")}
            </Button>
          )}
          {config.showDismiss && onDismiss && (
            <Button variant="ghost" size="sm" onClick={onDismiss}>
              {t("dismiss", isHydrated ? language : "en")}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
