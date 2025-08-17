import React, { useEffect } from "react";
import { NetworkBanner } from "./NetworkBanner";
import { OfflineOutboxIndicator } from "./OfflineOutboxIndicator";
import { QueueHeader } from "./QueueHeader";
import { StudyStage } from "./StudyStage";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useOutbox } from "./hooks/useOutbox";
import { useStudyQueue } from "./hooks/useStudyQueue";
import { t } from "../../lib/i18n";
import { usePreferredLanguage } from "../../lib/usePreferredLanguage";

interface StudyQueueLoaderProps {
  initialGoalHint?: number;
}

export function StudyQueueLoader({ initialGoalHint }: StudyQueueLoaderProps) {
  const { language } = usePreferredLanguage();
  const { online, lastError } = useOnlineStatus();
  const { stats: outboxStats, flush, enqueue } = useOutbox();
  const { state, fetchQueue, loadFromCache, rate, sessionProgress, updateDailyGoal } = useStudyQueue(enqueue);

  // Ładowanie kolejki przy montowaniu komponentu
  useEffect(() => {
    const loadQueue = async () => {
      // Próbuj załadować z cache najpierw
      const cached = await loadFromCache();

      if (!cached && online) {
        // Jeśli nie ma cache i jest online, pobierz z API
        await fetchQueue(initialGoalHint);
      } else if (!cached && !online) {
        // Jeśli nie ma cache i offline, pokaż błąd
        // TODO: Obsługa stanu offline bez cache
      }
    };

    loadQueue();
  }, [online, initialGoalHint, fetchQueue, loadFromCache]);

  // Wymuszenie odświeżenia cache przy każdym wejściu na stronę nauki
  useEffect(() => {
    if (online) {
      // Zawsze odśwież cache gdy użytkownik wchodzi na stronę nauki
      // aby upewnić się że ma najświeższe dane po operacjach na fiszkach
      fetchQueue(initialGoalHint);
    }
  }, [online, initialGoalHint, fetchQueue]);

  // Automatyczne wysyłanie outboxu przy powrocie online
  useEffect(() => {
    if (online && outboxStats.count > 0) {
      flush();
    }
  }, [online, outboxStats.count, flush]);

  // Obsługa błędów
  if (state.status === "error") {
    return (
      <div className="space-y-4">
        <NetworkBanner online={online} lastError={state.lastError} />
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold text-destructive mb-2">{t("failedToLoadStudyQueue", language)}</h2>
          <p className="text-muted-foreground mb-4">{state.lastError || t("unexpectedError", language)}</p>
          <button onClick={() => fetchQueue(initialGoalHint)} className="btn btn-primary" disabled={!online}>
            {t("tryAgain", language)}
          </button>
        </div>
      </div>
    );
  }

  // Stan ładowania
  if (state.status === "loading") {
    return (
      <div className="space-y-4">
        <NetworkBanner online={online} lastError={lastError} />
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t("loadingStudyQueue", language)}</p>
        </div>
      </div>
    );
  }

  // Stan gotowy
  if (state.status === "ready") {
    const currentItem = state.items[state.currentIndex] || null;
    const isQueueComplete = state.currentIndex >= state.items.length;

    return (
      <div className="space-y-4">
        <NetworkBanner online={online} lastError={lastError} />

        <div className="flex justify-between items-center">
          <OfflineOutboxIndicator stats={outboxStats} />
        </div>

        <QueueHeader meta={state.meta} sessionProgress={sessionProgress} onGoalUpdated={updateDailyGoal} />

        {isQueueComplete ? (
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">{t("studySessionComplete", language)}</h2>
            <p className="text-muted-foreground mb-4">{t("studySessionCompleteDescription", language)}</p>
            <div className="space-x-4">
              <a href="/flashcards" className="btn btn-primary">
                {t("manageFlashcards", language)}
              </a>
              <a href="/generate" className="btn btn-outline">
                {t("generateNewCards", language)}
              </a>
            </div>
          </div>
        ) : (
          <StudyStage
            item={currentItem}
            rate={rate}
            onRated={(result: any) => {
              // Po ocenie karty, przejdź do następnej
              console.log("Card rated:", result);
              // useStudyQueue.advance() zostanie wywołane automatycznie przez rate()
            }}
          />
        )}
      </div>
    );
  }

  // Stan bezczynny
  return (
    <div className="space-y-4">
      <NetworkBanner online={online} lastError={lastError} />
      <div className="text-center py-8">
        <p className="text-muted-foreground">{t("initializingStudySession", language)}</p>
      </div>
    </div>
  );
}
