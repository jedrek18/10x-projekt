import { useState, useEffect, useCallback } from "react";
import type { OutboxItem, OutboxStats } from "../types";

const OUTBOX_STORAGE_KEY = "study_outbox";
const OUTBOX_TTL = 30 * 60 * 1000; // 30 minut

export function useOutbox() {
  const [items, setItems] = useState<OutboxItem[]>([]);

  // Ładowanie outboxu z LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(OUTBOX_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as OutboxItem[];
        // Filtruj przeterminowane elementy
        const now = new Date().toISOString();
        const valid = parsed.filter((item) => new Date(item.queued_at).getTime() > Date.now() - OUTBOX_TTL);
        setItems(valid);

        // Zapisz oczyszczoną listę jeśli były przeterminowane
        if (valid.length !== parsed.length) {
          localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(valid));
        }
      }
    } catch (error) {
      console.error("Failed to load outbox from localStorage:", error);
    }
  }, []);

  // Zapisywanie do LocalStorage
  const saveToStorage = useCallback((newItems: OutboxItem[]) => {
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(newItems));
    } catch (error) {
      console.error("Failed to save outbox to localStorage:", error);
    }
  }, []);

  // Dodawanie elementu do outboxu
  const enqueue = useCallback(
    (item: OutboxItem) => {
      setItems((prev) => {
        const newItems = [...prev, item];
        saveToStorage(newItems);
        return newItems;
      });
    },
    [saveToStorage]
  );

  // Wysyłanie elementów z outboxu
  const flush = useCallback(async () => {
    if (items.length === 0) return;

    const itemsToSend = [...items];
    setItems([]);
    saveToStorage([]);

    // Wysyłanie ocen do API
    for (const item of itemsToSend) {
      try {
        const response = await fetch("/api/srs/review", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            card_id: item.card_id,
            rating: item.rating,
          }),
        });

        if (!response.ok) {
          throw new Error(`Review failed: ${response.status}`);
        }
      } catch (error) {
        console.error("Failed to send review from outbox:", error);
        // Przywróć nieudane elementy z zwiększonym licznikiem prób
        const failedItem = { ...item, attempts: item.attempts + 1 };
        setItems((prev) => {
          const newItems = [...prev, failedItem];
          saveToStorage(newItems);
          return newItems;
        });
      }
    }
  }, [items, saveToStorage]);

  const stats: OutboxStats = {
    count: items.length,
    items: [...items],
  };

  return { enqueue, flush, stats };
}
