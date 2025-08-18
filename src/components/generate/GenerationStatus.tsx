import React, { memo, useMemo, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { GenerationProgress } from "./GenerateView";

export interface GenerationStatusProps {
  isGenerating: boolean;
  progress: GenerationProgress | null;
  /** docelowa liczba fiszek (np. maxProposals) – 100% paska = targetCount */
  targetCount: number;
}

/**
 * Status generacji: licznik napływu propozycji, tryb SSE/REST, pasek postępu do targetCount.
 * Skeletony usunięte – lista fiszek jest w ProposalsView (otwierana przy pierwszej fiszce).
 */
export const GenerationStatus = memo(function GenerationStatus({
  isGenerating,
  progress,
  targetCount,
}: GenerationStatusProps) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!isGenerating || !progress) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isGenerating, !!progress]);

  const elapsedTimeSec = useMemo(() => {
    if (!progress) return 0;
    return Math.round((now - progress.startedAt) / 1000);
  }, [now, progress?.startedAt]);

  if (!isGenerating || !progress) return null;

  const safeTarget = Math.max(1, targetCount || 1);
  const pct = Math.min(100, Math.max(0, (progress.receivedCount / safeTarget) * 100));

  const isRestFallbackMsg = progress.mode === "rest" && progress.receivedCount === 0;

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
              <span className="text-sm text-gray-500">{elapsedTimeSec}s</span>
            </div>
          </div>

          {/* Progress indicator to targetCount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Otrzymane propozycje:</span>
              <span className="font-medium">
                {progress.receivedCount} / {safeTarget}
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>

          {/* Fallback message (pokazuj tylko gdy REST i jeszcze nic nie przyszło) */}
          {isRestFallbackMsg && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-800">
                  Strumieniowanie niedostępne, przełączono na tryb batch...
                </span>
              </div>
            </div>
          )}

          {/* Krótki opis stanu */}
          <div className="text-center py-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm font-medium text-gray-700">
                {progress.mode === "sse" ? "Otrzymuję propozycje..." : "Przetwarzam żądanie..."}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {progress.mode === "sse"
                ? "Fiszki pojawiają się na bieżąco w podglądzie."
                : "Generowanie może potrwać chwilę – wynik pojawi się poniżej."}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
