import { useState, useEffect, useCallback } from "react";

/**
 * Hook do zarządzania danymi w localStorage z obsługą serializacji JSON.
 *
 * Funkcjonalności:
 * - Automatyczna serializacja/deserializacja JSON
 * - Synchronizacja między zakładkami (storage event)
 * - Obsługa błędów parsowania
 * - TypeScript support z generykami
 *
 * @param key - Klucz w localStorage
 * @param initialValue - Wartość początkowa
 * @returns Tuple [wartość, setter] podobny do useState
 *
 * @example
 * ```tsx
 * const [count, setCount] = useLocalStorage('counter', 0);
 * const [user, setUser] = useLocalStorage<User>('user', null);
 * ```
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Always start with initialValue to avoid hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(JSON.parse(item));
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
    setIsHydrated(true);
  }, [key]);

  // Return a wrapped version of useState's setter function that persists the new value to localStorage
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        // Allow value to be a function so we have the same API as useState
        const valueToStore = value instanceof Function ? value(storedValue) : value;

        // Save state
        setStoredValue(valueToStore);

        // Save to local storage only after hydration
        if (isHydrated && typeof window !== "undefined") {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, isHydrated]
  );

  // Listen for changes to this localStorage key in other tabs/windows
  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") {
      return;
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, isHydrated]);

  return [storedValue, setValue];
}
