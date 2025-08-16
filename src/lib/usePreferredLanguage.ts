import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LOCAL_STORAGE_KEY, sanitizeLanguage } from "./i18n-landing";
import type { LanguageCode } from "./i18n-landing";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function usePreferredLanguage(): { language: LanguageCode; setLanguage: (l: LanguageCode) => void } {
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    if (!isBrowser()) return DEFAULT_LANGUAGE;
    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const valid = sanitizeLanguage(stored);
      return valid ?? DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState((prev) => {
      if (prev === next) return prev;
      if (!isBrowser()) return next;
      try {
        window.localStorage.setItem(LOCAL_STORAGE_KEY, next);
      } catch {
        // ignore storage write failures
      }
      try {
        document.documentElement.lang = next;
      } catch {
        // ignore DOM errors
      }
      window.dispatchEvent(new CustomEvent("app:language-changed", { detail: { language: next } }));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isBrowser()) return;
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  useEffect(() => {
    if (!isBrowser()) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== LOCAL_STORAGE_KEY) return;
      const valid = sanitizeLanguage(e.newValue);
      if (valid) setLanguageState(valid);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return { language, setLanguage };
}


