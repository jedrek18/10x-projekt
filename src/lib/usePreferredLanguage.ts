import { useCallback, useEffect, useState } from "react";
import { DEFAULT_LANGUAGE, LOCAL_STORAGE_KEY, sanitizeLanguage, detectBrowserLanguage } from "./i18n";
import type { LanguageCode } from "./i18n";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function usePreferredLanguage(): {
  language: LanguageCode;
  setLanguage: (l: LanguageCode) => void;
  isHydrated: boolean;
} {
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize language after hydration to avoid SSR mismatch
  useEffect(() => {
    if (!isBrowser()) return;

    try {
      const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      const valid = sanitizeLanguage(stored);
      const initialLanguage = valid ?? detectBrowserLanguage();

      if (initialLanguage !== language) {
        setLanguageState(initialLanguage);
      }
    } catch {
      // ignore storage errors
    }

    setIsHydrated(true);
  }, [language]);

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
    const onLanguageChange = (e: CustomEvent) => {
      if (e.detail?.language) {
        setLanguageState(e.detail.language);
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("app:language-changed", onLanguageChange as EventListener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("app:language-changed", onLanguageChange as EventListener);
    };
  }, []);

  return { language, setLanguage, isHydrated };
}
