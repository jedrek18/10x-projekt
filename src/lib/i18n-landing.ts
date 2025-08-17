export type LanguageCode = "pl" | "en";

export interface LandingCopy {
  title: string;
  subtitle: string;
  ctaLogin: string;
  ctaSignup: string;
  languageLabel: string;
  policy: string;
}

export type I18nDictionary = Record<LanguageCode, LandingCopy>;

export const DEFAULT_LANGUAGE: LanguageCode = "en";
export const LOCAL_STORAGE_KEY = "app.lang";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

export function sanitizeLanguage(value: unknown): LanguageCode | null {
  if (value === "pl" || value === "en") return value;
  return null;
}

export function detectBrowserLanguage(): LanguageCode {
  if (!isBrowser()) return DEFAULT_LANGUAGE;
  try {
    const navLang = (navigator.language || navigator.languages?.[0] || "en").toLowerCase();
    if (navLang.startsWith("pl")) return "pl";
    return "en";
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function getInitialLanguage(): LanguageCode {
  if (!isBrowser()) return DEFAULT_LANGUAGE;
  try {
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const valid = sanitizeLanguage(stored);
    if (valid) return valid;
  } catch {
    // ignore storage errors
  }
  return detectBrowserLanguage();
}

export const landingCopy: I18nDictionary = {
  en: {
    title: "Master anything with spaced repetition",
    subtitle: "Create flashcards, review efficiently, and track your daily progress.",
    ctaLogin: "Log in",
    ctaSignup: "Sign up",
    languageLabel: "Language",
    policy: "Privacy & Terms",
  },
  pl: {
    title: "Opanuj dowolny temat z powtórkami rozłożonymi w czasie",
    subtitle: "Twórz fiszki, ucz się efektywnie i śledź dzienny postęp.",
    ctaLogin: "Zaloguj",
    ctaSignup: "Zarejestruj",
    languageLabel: "Język",
    policy: "Prywatność i regulamin",
  },
};
