import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GenerationProgress } from "./GenerateView";

export interface GenerationStatusProps {
  isGenerating: boolean;
  progress: GenerationProgress | null;
}

/**
 * Sekcja statusu generacji: skeletony od startu, licznik napływu propozycji,
 * wskaźnik trybu SSE/REST, komunikaty o fallbacku.
 */
export const GenerationStatus = memo(function GenerationStatus({ isGenerating, progress }: GenerationStatusProps) {
  const elapsedTime = useMemo(() => {
    if (!progress) return 0;
    return Date.now() - progress.startedAt;
  }, [progress?.startedAt]);

  const isFallbackArmed = useMemo(() => {
    if (!progress) return false;
    return Date.now() >= progress.fallbackArmedAt;
  }, [progress?.fallbackArmedAt]);

  const showFallbackMessage = useMemo(() => {
    if (!progress) return false;
    return isFallbackArmed && progress.mode === "sse" && progress.receivedCount === 0;
  }, [isFallbackArmed, progress?.mode, progress?.receivedCount]);

  const skeletonItems = useMemo(() => {
    if (!progress) return [];
    return Array.from({ length: Math.min(progress.receivedCount + 3, 10) }).map((_, index) => (
      <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      </div>
    ));
  }, [progress?.receivedCount]);

  if (!isGenerating || !progress) {
    return null;
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header with mode indicator */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Status generacji</h3>
            <div className="flex items-center gap-2">
              <Badge variant={progress.mode === "sse" ? "default" : "secondary"}>
                {progress.mode === "sse" ? "Streaming" : "Batch"}
              </Badge>
              <span className="text-sm text-gray-500">{Math.round(elapsedTime / 1000)}s</span>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Otrzymane propozycje:</span>
              <span className="font-medium">
                {progress.receivedCount}
                {progress.returnedCount && ` / ${progress.returnedCount}`}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: progress.returnedCount
                    ? `${(progress.receivedCount / progress.returnedCount) * 100}%`
                    : progress.receivedCount > 0
                      ? "10%"
                      : "0%",
                }}
              />
            </div>
          </div>

          {/* Fallback message */}
          {showFallbackMessage && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-800">
                  Strumieniowanie niedostępne, przełączono na tryb batch...
                </span>
              </div>
            </div>
          )}

          {/* Skeletons for proposals */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Generowane fiszki:</h4>
            <div className="grid gap-3">{skeletonItems}</div>
          </div>

          {/* Status message */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">
                {progress.mode === "sse" ? "Otrzymuję propozycje..." : "Przetwarzam żądanie..."}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {progress.mode === "sse"
                ? "Fiszki są generowane w czasie rzeczywistym"
                : "Generowanie może potrwać kilka sekund"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
