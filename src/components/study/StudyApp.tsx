import React, { createContext, useContext, useState, useEffect } from "react";
import { StudyQueueLoader } from "./StudyQueueLoader";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useOutbox } from "./hooks/useOutbox";
import type { OnlineStatusContext, OutboxContext } from "./types";

// Konteksty
const OnlineStatusContext = createContext<OnlineStatusContext>({ online: true });
const OutboxContext = createContext<OutboxContext>({
  enqueue: () => {},
  flush: async () => {},
  stats: { count: 0, items: [] },
});

// Hooki do używania kontekstów
export const useOnlineStatusContext = () => useContext(OnlineStatusContext);
export const useOutboxContext = () => useContext(OutboxContext);

export function StudyApp() {
  const { online, lastError, setLastError } = useOnlineStatus();
  const { enqueue, flush, stats: outboxStats } = useOutbox();
  const [helpOpen, setHelpOpen] = useState(false);

  // Obsługa skrótów klawiaturowych
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Pomoc: ? lub h
      if (event.key === "?" || event.key === "h") {
        event.preventDefault();
        setHelpOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const onlineStatusValue: OnlineStatusContext = {
    online,
    lastError,
  };

  const outboxValue: OutboxContext = {
    enqueue,
    flush,
    stats: outboxStats,
  };

  return (
    <OnlineStatusContext.Provider value={onlineStatusValue}>
      <OutboxContext.Provider value={outboxValue}>
        <div className="space-y-6">
          <StudyQueueLoader />
          <KeyboardShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
        </div>
      </OutboxContext.Provider>
    </OnlineStatusContext.Provider>
  );
}
