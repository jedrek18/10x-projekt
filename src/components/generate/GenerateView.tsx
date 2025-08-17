import React, { useState, useEffect, useCallback, useRef } from "react";
import { TextAreaWithCounter } from "./TextAreaWithCounter";
import { SliderProposalsCount } from "./SliderProposalsCount";
import { ControlsBar } from "./ControlsBar";
import { GenerationStatus } from "./GenerationStatus";
import { OneActiveSessionGuard } from "./OneActiveSessionGuard";
import { ErrorBanner } from "./ErrorBanner";
import { NetworkStatus } from "./NetworkStatus";
import { useGraphemeCounter } from "@/lib/hooks/useGraphemeCounter";
import { useLocalStorage } from "@/lib/hooks/useLocalStorage";
import { useAiGeneration } from "@/lib/hooks/useAiGeneration";
import { usePreferredLanguage } from "@/lib/usePreferredLanguage";
import { t, tWithParams } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ProposalsView } from "../proposals/ProposalsView";
import type { AiGenerateCommand, AiGenerationProposalDTO, UUID } from "@/types";

// Local storage keys
const LOCAL_STORAGE_KEYS = {
  sourceTextKey: "generate:source_text",
  proposalsMaxKey: "generate:max_proposals",
  proposalsSessionKey: "proposals.session.v1",
} as const;

// Text counter state
export interface TextCounterState {
  graphemeCount: number;
  minRequired: number;
  maxAllowed: number;
  isUnderMin: boolean;
  isOverMax: boolean;
  delta: number; // negative = missing, positive = exceeded
}

// Generation progress state
export interface GenerationProgress {
  mode: "sse" | "rest";
  receivedCount: number;
  returnedCount?: number;
  startedAt: number;
  fallbackArmedAt: number;
}

// Form state
export interface GenerateFormState {
  sourceText: string;
  maxProposals: number;
  counter: TextCounterState;
  isValid: boolean;
  violations: { field: "sourceText" | "maxProposals"; message: string }[];
}

// View model for rendering
export interface GenerateViewModel {
  form: GenerateFormState;
  isGenerating: boolean;
  progress: GenerationProgress | null;
  requestId?: UUID;
  error?: { code: string; message: string } | null;
}

/**
 * Główny komponent formularza i procesu generacji.
 *
 * Funkcjonalności:
 * - Walidacja tekstu źródłowego (1000-10000 znaków)
 * - Zarządzanie liczbą propozycji (10-50)
 * - Integracja z API AI (SSE + REST fallback)
 * - Obsługa stanów błędów i offline
 * - Kontrola pojedynczej aktywnej sesji propozycji
 * - Skróty klawiaturowe (Ctrl+Enter)
 * - Dostępność (ARIA attributes)
 *
 * @example
 * ```tsx
 * <GenerateView />
 * ```
 */
export function GenerateView() {
  // Form state
  const [sourceText, setSourceText] = useLocalStorage(LOCAL_STORAGE_KEYS.sourceTextKey, "");
  const [maxProposals, setMaxProposals] = useLocalStorage(LOCAL_STORAGE_KEYS.proposalsMaxKey, 30);

  // Ensure sourceText is loaded from localStorage on mount (only once)
  useEffect(() => {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.sourceTextKey);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && parsed !== sourceText) {
          setSourceText(parsed);
        }
      } catch (error) {
        console.warn("Failed to parse stored sourceText:", error);
      }
    }
  }, []); // Empty dependency array - run only once on mount

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [requestId, setRequestId] = useState<UUID | undefined>(undefined);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [generatedProposals, setGeneratedProposals] = useState<AiGenerationProposalDTO[]>([]);

  // Modal state
  const [showSessionGuard, setShowSessionGuard] = useState(false);
  const [showProposals, setShowProposals] = useLocalStorage("generate:show_proposals", false);
  const [isRestoringFromCache, setIsRestoringFromCache] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const isInitialLoadRef = useRef(true);

  // Network state
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // i18n
  const { language, isHydrated } = usePreferredLanguage();

  // Custom hooks
  const graphemeCount = useGraphemeCounter(sourceText);
  const { start: startGeneration, abort: abortGeneration } = useAiGeneration();

  // Check if we should show proposals on mount (if there's a valid session)
  useEffect(() => {
    // Don't restore if we've already generated in this session
    if (hasGenerated) {
      return;
    }

    const sessionData = localStorage.getItem(LOCAL_STORAGE_KEYS.proposalsSessionKey);
    if (sessionData) {
      try {
        const session = JSON.parse(sessionData);
        const now = new Date().getTime();
        const expiresAt = new Date(session.ttlExpiresAt).getTime();

        // Check if session is still valid
        if (now < expiresAt && session.items && session.items.length > 0) {
          // Show proposals view - ProposalsView will handle loading the session
          setShowProposals(true);
          setRequestId(session.requestId);
          // Reset hasGenerated when restoring from cache
          setHasGenerated(false);
        } else {
          // Clear expired session
          localStorage.removeItem(LOCAL_STORAGE_KEYS.proposalsSessionKey);
          setShowProposals(false);
        }
      } catch (error) {
        console.warn("Failed to restore proposals session:", error);
        setShowProposals(false);
      }
    }

    // Mark initial load as complete
    isInitialLoadRef.current = false;
  }, [setShowProposals, hasGenerated, setHasGenerated]);

  // Calculate text counter state
  const calculateTextCounter = useCallback(
    (text: string): TextCounterState => {
      const minRequired = 1000;
      const maxAllowed = 10000;
      const isUnderMin = graphemeCount < minRequired;
      const isOverMax = graphemeCount > maxAllowed;
      const delta = isUnderMin ? graphemeCount - minRequired : isOverMax ? graphemeCount - maxAllowed : 0;

      return {
        graphemeCount,
        minRequired,
        maxAllowed,
        isUnderMin,
        isOverMax,
        delta,
      };
    },
    [graphemeCount]
  );

  // Validate form
  const validateForm = useCallback(
    (text: string, proposals: number): GenerateFormState => {
      const counter = calculateTextCounter(text);
      const violations: { field: "sourceText" | "maxProposals"; message: string }[] = [];

      if (counter.isUnderMin) {
        violations.push({
          field: "sourceText",
          message: tWithParams("minLength", { min: counter.minRequired }, isHydrated ? language : "en"),
        });
      } else if (counter.isOverMax) {
        violations.push({
          field: "sourceText",
          message: tWithParams("maxLength", { max: counter.maxAllowed }, isHydrated ? language : "en"),
        });
      }

      if (proposals < 10 || proposals > 50) {
        violations.push({
          field: "maxProposals",
          message: tWithParams("range", { min: 10, max: 50 }, isHydrated ? language : "en"),
        });
      }

      return {
        sourceText: text,
        maxProposals: proposals,
        counter,
        isValid: violations.length === 0,
        violations,
      };
    },
    [calculateTextCounter, language, isHydrated]
  );

  // Get current form state
  const formState = validateForm(sourceText, maxProposals);

  // Handle text change
  const handleTextChange = useCallback(
    (text: string) => {
      setSourceText(text);
      // Also save directly to localStorage as backup
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.sourceTextKey, JSON.stringify(text));
      } catch (error) {
        console.warn("Failed to save to localStorage directly:", error);
      }
      setError(null); // Clear errors when user starts typing
    },
    [setSourceText, setError]
  );

  // Handle proposals count change
  const handleProposalsChange = useCallback(
    (count: number) => {
      setMaxProposals(count);
      setError(null);
    },
    [setMaxProposals, setError]
  );

  // Check for active session
  const checkActiveSession = useCallback(() => {
    const sessionData = localStorage.getItem(LOCAL_STORAGE_KEYS.proposalsSessionKey);
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        const now = Date.now();
        if (parsed.expiresAt && now < parsed.expiresAt) {
          return true;
        }
      } catch {
        // Invalid JSON, ignore
      }
    }
    return false;
  }, []);

  // Start generation process
  const handleStartGeneration = useCallback(() => {
    if (!formState.isValid) return;

    // Reset cache restoration flag when starting new generation
    setIsRestoringFromCache(false);
    setHasGenerated(true);

    setIsGenerating(true);
    setProgress({
      mode: "sse",
      receivedCount: 0,
      startedAt: Date.now(),
      fallbackArmedAt: Date.now() + 5000, // 5 seconds
    });
    setError(null);

    const command: AiGenerateCommand = {
      source_text: sourceText,
      max_proposals: maxProposals,
    };

    // Clear previous proposals
    setGeneratedProposals([]);

    startGeneration(command, {
      onProposal: (proposal) => {
        setGeneratedProposals((prev) => [...prev, proposal]);
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                receivedCount: prev.receivedCount + 1,
              }
            : null
        );
      },
      onProgress: (count) => {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                receivedCount: count,
              }
            : null
        );
      },
      onDone: (returnedCount, requestId) => {
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                returnedCount,
              }
            : null
        );
        setRequestId(requestId);
        setIsGenerating(false);

        // Save requestId to sessionStorage for proposals page
        sessionStorage.setItem("proposals:lastRequestId", requestId);

        // Show proposals view instead of navigating
        setShowProposals(true);
      },
      onError: (message) => {
        setError({ code: "generation_failed", message });
        setIsGenerating(false);
        setProgress(null);
        setGeneratedProposals([]);
      },
    });
  }, [
    formState.isValid,
    sourceText,
    maxProposals,
    startGeneration,
    setIsRestoringFromCache,
    setHasGenerated,
    setIsGenerating,
    setProgress,
    setError,
    setGeneratedProposals,
    setRequestId,
    setShowProposals,
  ]);

  // Handle generate button click
  const handleGenerate = useCallback(() => {
    if (!formState.isValid) return;

    if (checkActiveSession()) {
      setShowSessionGuard(true);
      return;
    }

    handleStartGeneration();
  }, [formState.isValid, checkActiveSession, handleStartGeneration]);

  // Handle session guard confirmation
  const handleSessionGuardConfirm = useCallback(() => {
    // Clear existing session
    localStorage.removeItem(LOCAL_STORAGE_KEYS.proposalsSessionKey);
    setShowSessionGuard(false);
    handleStartGeneration();
  }, [handleStartGeneration, setShowSessionGuard]);

  // Handle session guard cancel
  const handleSessionGuardCancel = useCallback(() => {
    setShowSessionGuard(false);
  }, [setShowSessionGuard]);

  // Handle cancel generation
  const handleCancel = useCallback(() => {
    abortGeneration();
    setIsGenerating(false);
    setProgress(null);
    setRequestId(undefined);
    setError(null);
  }, [abortGeneration, setIsGenerating, setProgress, setRequestId, setError]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        handleGenerate();
      }
    },
    [handleGenerate]
  );

  // Handle error dismiss
  const handleErrorDismiss = useCallback(() => {
    setError(null);
  }, [setError]);

  // Handle retry
  const handleRetry = useCallback(() => {
    setError(null);
    handleStartGeneration();
  }, [handleStartGeneration, setError]);

  // Handle clear cache
  const handleClearCache = useCallback(() => {
    localStorage.removeItem(LOCAL_STORAGE_KEYS.sourceTextKey);
    localStorage.removeItem(LOCAL_STORAGE_KEYS.proposalsSessionKey);
    localStorage.removeItem("generate:show_proposals");
    setSourceText("");
    setShowProposals(false);
    setGeneratedProposals([]);
    setRequestId(undefined);
    setIsRestoringFromCache(false);
    setHasGenerated(false);
    isInitialLoadRef.current = false;
  }, [setSourceText, setShowProposals, setGeneratedProposals, setRequestId, setIsRestoringFromCache, setHasGenerated]);

  return (
    <div className="space-y-6" onKeyDown={handleKeyDown} aria-busy={isGenerating} aria-live="polite">
      <NetworkStatus onOnlineChange={setIsOnline} language={language} isHydrated={isHydrated} />

      <ErrorBanner
        error={error}
        onRetry={handleRetry}
        onDismiss={handleErrorDismiss}
        language={language}
        isHydrated={isHydrated}
      />

      {/* Generate interface - always visible */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("generateTitle", isHydrated ? language : "en")}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">{t("generateSubtitle", isHydrated ? language : "en")}</p>
      </div>

      <div className="space-y-6">
        <TextAreaWithCounter
          value={sourceText}
          count={formState.counter.graphemeCount}
          min={formState.counter.minRequired}
          max={formState.counter.maxAllowed}
          onChange={handleTextChange}
          onSubmitShortcut={handleGenerate}
          error={formState.violations.find((v) => v.field === "sourceText")?.message || null}
          language={language}
          isHydrated={isHydrated}
        />

        <SliderProposalsCount
          value={maxProposals}
          min={10}
          max={50}
          onChange={handleProposalsChange}
          language={language}
          isHydrated={isHydrated}
        />

        <div className="flex items-center justify-between">
          <ControlsBar
            canGenerate={formState.isValid && !isGenerating && isOnline}
            isGenerating={isGenerating}
            onGenerate={handleGenerate}
            onCancel={handleCancel}
            language={language}
            isHydrated={isHydrated}
          />
          {(sourceText || showProposals) && (
            <Button variant="outline" size="sm" onClick={handleClearCache} className="ml-4">
              {t("clearCacheButton", isHydrated ? language : "en")}
            </Button>
          )}
        </div>

        <GenerationStatus isGenerating={isGenerating} progress={progress} />
      </div>

      <OneActiveSessionGuard
        open={showSessionGuard}
        onConfirm={handleSessionGuardConfirm}
        onCancel={handleSessionGuardCancel}
      />

      {/* Proposals view */}
      {showProposals && (
        <div className="mt-8 border-t pt-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("reviewProposalsTitle", isHydrated ? language : "en")}
            </h2>
            <p className="text-gray-600">{t("reviewProposalsSubtitle", isHydrated ? language : "en")}</p>
          </div>
          <ProposalsView
            generatedProposals={generatedProposals}
            requestId={requestId}
            maxProposals={maxProposals}
            isRestoringFromCache={isRestoringFromCache}
            language={language}
            isHydrated={isHydrated}
            onGoToStudy={() => {
              setShowProposals(false);
              // Navigate to study page
              window.location.href = "/flashcards";
            }}
            onSaveSuccess={() => {
              // Clear cache after successful save
              handleClearCache();
            }}
          />
        </div>
      )}
    </div>
  );
}
