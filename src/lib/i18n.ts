export type LanguageCode = "pl" | "en";

export interface AppCopy {
  // Landing page
  title: string;
  subtitle: string;
  ctaLogin: string;
  ctaSignup: string;
  languageLabel: string;
  policy: string;

  // Auth
  login: string;
  signup: string;
  loginTitle: string;
  signupTitle: string;
  loginSubtitle: string;
  signupSubtitle: string;
  noAccount: string;
  haveAccount: string;
  email: string;
  password: string;
  confirmPassword: string;
  emailRequired: string;
  passwordRequired: string;
  confirmPasswordRequired: string;
  invalidEmail: string;
  invalidEmailFormat: string;
  passwordTooShort: string;
  passwordsMustMatch: string;
  invalidCredentials: string;
  accountCreated: string;
  accountCreatedButLoginFailed: string;
  registrationError: string;
  emailAlreadyExists: string;
  weakPassword: string;
  showPassword: string;
  hidePassword: string;

  // Navigation
  settings: string;
  logout: string;
  user: string;

  // Flashcards
  myFlashcards: string;
  manageFlashcards: string;
  addFlashcard: string;
  editFlashcard: string;
  deleteFlashcard: string;
  noFlashcards: string;
  addFirstFlashcard: string;
  front: string;
  back: string;
  frontPlaceholder: string;
  backPlaceholder: string;
  source: string;
  created: string;
  actions: string;
  save: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  undo: string;
  undoDelete: string;
  undoTimeLeft: string;

  // Study
  studyNow: string;
  startStudy: string;
  noCardsToStudy: string;
  checkingCards: string;

  // Pagination
  showing: string;
  showingItems: string;
  of: string;
  items: string;
  previous: string;
  next: string;
  sorting: string;
  newest: string;
  pageInfo: string;

  // Messages
  loading: string;
  loadingError: string;
  tryAgain: string;
  error: string;
  success: string;
  addFlashcardError: string;
  unexpectedError: string;
  adding: string;
  flashcardAdded: string;
  flashcardUpdated: string;
  flashcardDeleted: string;
  flashcardRestored: string;

  // Validation
  required: string;
  minLength: string;
  maxLength: string;
  frontRequired: string;
  backRequired: string;
  frontBackDifferent: string;

  // Sources
  manual: string;
  ai: string;
  aiEdited: string;
  import: string;
}

export type I18nDictionary = Record<LanguageCode, AppCopy>;

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

export const appCopy: I18nDictionary = {
  en: {
    // Landing page
    title: "Master anything with spaced repetition",
    subtitle: "Create flashcards, review efficiently, and track your daily progress.",
    ctaLogin: "Log in",
    ctaSignup: "Sign up",
    languageLabel: "Language",
    policy: "Privacy & Terms",

    // Auth
    login: "Log in",
    signup: "Sign up",
    loginTitle: "Log in",
    signupTitle: "Sign up",
    loginSubtitle: "Enter your credentials to continue",
    signupSubtitle: "Create a new account to get started",
    noAccount: "Don't have an account?",
    haveAccount: "Already have an account?",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm Password",
    emailRequired: "Email is required",
    passwordRequired: "Password is required",
    confirmPasswordRequired: "Password confirmation is required",
    invalidEmail: "Invalid email address",
    invalidEmailFormat: "Invalid email format",
    passwordTooShort: "Password must be at least 8 characters",
    passwordsMustMatch: "Passwords must match",
    invalidCredentials: "Invalid email or password",
    accountCreated: "Account created successfully",
    accountCreatedButLoginFailed: "Account created but login failed. Please try logging in.",
    registrationError: "Registration error occurred",
    emailAlreadyExists: "Account with this email already exists",
    weakPassword: "Password is too weak",
    showPassword: "Show password",
    hidePassword: "Hide password",

    // Navigation
    settings: "Settings",
    logout: "Logout",
    user: "User",

    // Flashcards
    myFlashcards: "My Flashcards",
    manageFlashcards: "Manage your flashcards and add new ones",
    addFlashcard: "Add Flashcard",
    editFlashcard: "Edit Flashcard",
    deleteFlashcard: "Delete Flashcard",
    noFlashcards: "No flashcards",
    addFirstFlashcard: "Add your first flashcard or generate them with AI",
    front: "Front",
    back: "Back",
    frontPlaceholder: "Enter front text...",
    backPlaceholder: "Enter back text...",
    source: "Source",
    created: "Created",
    actions: "Actions",
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    edit: "Edit",
    undo: "Undo",
    undoDelete: "Undo Delete",
    undoTimeLeft: "Undo time left",

    // Study
    studyNow: "Study Now",
    startStudy: "Start Study",
    noCardsToStudy: "No cards to study",
    checkingCards: "Checking available cards...",

    // Pagination
    showing: "Showing",
    showingItems: "Showing {start}–{end} of {total} items",
    of: "of",
    items: "items",
    previous: "Previous",
    next: "Next",
    sorting: "Sorting",
    newest: "Newest",
    pageInfo: "Page {page} of {total}",

    // Messages
    loading: "Loading...",
    loadingError: "Loading Error",
    tryAgain: "Try Again",
    error: "Error",
    success: "Success",
    addFlashcardError: "Failed to add flashcard",
    unexpectedError: "An unexpected error occurred",
    adding: "Adding...",
    flashcardAdded: "Flashcard added successfully",
    flashcardUpdated: "Flashcard updated successfully",
    flashcardDeleted: "Flashcard deleted successfully",
    flashcardRestored: "Flashcard restored",

    // Validation
    required: "This field is required",
    minLength: "Minimum length is {min} characters",
    maxLength: "Maximum length is {max} characters",
    frontRequired: "Front text is required",
    backRequired: "Back text is required",
    frontBackDifferent: "Front and back must be different",

    // Sources
    manual: "Manual",
    ai: "AI",
    aiEdited: "AI (edited)",
    import: "Import",
  },
  pl: {
    // Landing page
    title: "Opanuj dowolny temat z powtórkami rozłożonymi w czasie",
    subtitle: "Twórz fiszki, ucz się efektywnie i śledź dzienny postęp.",
    ctaLogin: "Zaloguj",
    ctaSignup: "Zarejestruj",
    languageLabel: "Język",
    policy: "Prywatność i regulamin",

    // Auth
    login: "Zaloguj się",
    signup: "Załóż konto",
    loginTitle: "Zaloguj się",
    signupTitle: "Załóż konto",
    loginSubtitle: "Wprowadź swoje dane, aby kontynuować",
    signupSubtitle: "Utwórz nowe konto, aby rozpocząć naukę",
    noAccount: "Nie masz konta?",
    haveAccount: "Masz już konto?",
    email: "Email",
    password: "Hasło",
    confirmPassword: "Potwierdź hasło",
    emailRequired: "Email jest wymagany",
    passwordRequired: "Hasło jest wymagane",
    confirmPasswordRequired: "Potwierdzenie hasła jest wymagane",
    invalidEmail: "Nieprawidłowy adres email",
    invalidEmailFormat: "Nieprawidłowy format email",
    passwordTooShort: "Hasło musi mieć co najmniej 8 znaków",
    passwordsMustMatch: "Hasła muszą być identyczne",
    invalidCredentials: "Nieprawidłowy email lub hasło",
    accountCreated: "Konto zostało utworzone",
    accountCreatedButLoginFailed: "Konto zostało utworzone, ale wystąpił problem z logowaniem. Spróbuj się zalogować.",
    registrationError: "Wystąpił błąd podczas rejestracji",
    emailAlreadyExists: "Konto z tym adresem email już istnieje",
    weakPassword: "Hasło jest za słabe",
    showPassword: "Pokaż hasło",
    hidePassword: "Ukryj hasło",

    // Navigation
    settings: "Ustawienia",
    logout: "Wyloguj",
    user: "Użytkownik",

    // Flashcards
    myFlashcards: "Moje fiszki",
    manageFlashcards: "Zarządzaj swoimi fiszkami i dodawaj nowe",
    addFlashcard: "Dodaj fiszkę",
    editFlashcard: "Edytuj fiszkę",
    deleteFlashcard: "Usuń fiszkę",
    noFlashcards: "Brak fiszek",
    addFirstFlashcard: "Dodaj swoją pierwszą fiszkę lub wygeneruj je za pomocą AI",
    front: "Przód",
    back: "Tył",
    frontPlaceholder: "Wprowadź tekst z przodu...",
    backPlaceholder: "Wprowadź tekst z tyłu...",
    source: "Źródło",
    created: "Utworzono",
    actions: "Akcje",
    save: "Zapisz",
    cancel: "Anuluj",
    close: "Zamknij",
    delete: "Usuń",
    edit: "Edytuj",
    undo: "Cofnij",
    undoDelete: "Cofnij usunięcie",
    undoTimeLeft: "Pozostało czasu",

    // Study
    studyNow: "Ucz się teraz",
    startStudy: "Rozpocznij naukę",
    noCardsToStudy: "Brak fiszek do nauki",
    checkingCards: "Sprawdzanie dostępnych fiszek...",

    // Pagination
    showing: "Pokazano",
    showingItems: "Pokazuję {start}–{end} z {total} elementów",
    of: "z",
    items: "elementów",
    previous: "Poprzednia",
    next: "Następna",
    sorting: "Sortowanie",
    newest: "Najnowsze",
    pageInfo: "Strona {page} z {total}",

    // Messages
    loading: "Ładowanie...",
    loadingError: "Błąd ładowania",
    tryAgain: "Spróbuj ponownie",
    error: "Błąd",
    success: "Sukces",
    addFlashcardError: "Nie udało się dodać fiszki",
    unexpectedError: "Wystąpił nieoczekiwany błąd",
    adding: "Dodawanie...",
    flashcardAdded: "Fiszka została dodana",
    flashcardUpdated: "Fiszka została zaktualizowana",
    flashcardDeleted: "Fiszka została usunięta",
    flashcardRestored: "Fiszka została przywrócona",

    // Validation
    required: "To pole jest wymagane",
    minLength: "Minimalna długość to {min} znaków",
    maxLength: "Maksymalna długość to {max} znaków",
    frontRequired: "Tekst z przodu jest wymagany",
    backRequired: "Tekst z tyłu jest wymagany",
    frontBackDifferent: "Przód i tył muszą być różne",

    // Sources
    manual: "Ręczne",
    ai: "AI",
    aiEdited: "AI (edytowane)",
    import: "Import",
  },
};

export function t(key: keyof AppCopy, lang: LanguageCode = DEFAULT_LANGUAGE): string {
  return appCopy[lang]?.[key] || appCopy[DEFAULT_LANGUAGE][key] || key;
}

export function tWithParams(
  key: keyof AppCopy,
  params: Record<string, string | number>,
  lang: LanguageCode = DEFAULT_LANGUAGE
): string {
  let text = t(key, lang);
  Object.entries(params).forEach(([param, value]) => {
    text = text.replace(`{${param}}`, String(value));
  });
  return text;
}
