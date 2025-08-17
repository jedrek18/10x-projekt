# Plan implementacji widoku Autoryzacja (Logowanie/Rejestracja)

## 1. Przegląd

Widok Autoryzacja dostarcza formularze logowania i rejestracji oparte o Supabase Auth. Celem jest szybkie i bezpieczne uzyskanie 7‑dniowej sesji użytkownika oraz przekierowanie do poprzednio żądanej akcji lub domyślnie do `Moje fiszki`.

Zgodność z PRD/US:

- Rejestracja i logowanie email+hasło (US-011; FR-015).
- Sesja 7 dni, wielosesyjność (US-012; FR-016).
- Po sukcesie redirect do poprzedniej intencji lub `Moje fiszki` (US-024).
- Gating dostępu do widoków chronionych: `/generate`, `/proposals`, `/flashcards`, `/study`, `/settings`, `/account` → redirect do `/auth/login?redirect=...` (US-024).
- Wylogowanie kończy bieżącą sesję; po zmianie hasła wszystkie sesje unieważniane (US-018; implementacja poza tym widokiem w `Account`).
- Brak weryfikacji email/resetu hasła w MVP (PRD ograniczenia).

## 2. Routing widoku

- `GET /auth/login` – Logowanie
- `GET /auth/signup` – Rejestracja
- Obsługa parametru `?redirect=/ścieżka/docelowa` dla powrotu do intencji po zalogowaniu.
- Jeśli użytkownik jest już zalogowany, automatyczny redirect do `redirect` lub `/flashcards`.

## 3. Struktura komponentów

- `src/pages/auth/login.astro`
  - mountuje `<LoginForm />` (React)
- `src/pages/auth/signup.astro`
  - mountuje `<SignupForm />` (React)
- `src/components/auth/AuthLayout.astro` (opcjonalnie) – wspólny układ dla login/signup
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/SignupForm.tsx`
- `src/components/auth/PasswordField.tsx` – pole hasła z przełącznikiem widoczności
- `src/components/auth/AuthRedirectGuard.tsx` – redirect jeśli sesja już istnieje
- `src/components/common/FormError.tsx`, `FormField.tsx` (opcjonalnie) – prezentacja błędów/pól

Hierarchia (drzewo):

- `AuthLayout`
  - `LoginForm` lub `SignupForm`
    - `PasswordField`
    - `FormError`

## 4. Szczegóły komponentów

### AuthLayout

- Opis: Minimalny layout strony auth z tytułem, opisem i slotem na formularz. Zapewnia spójną ramę, responsywność i dostępność (focus management).
- Główne elementy: nagłówek, kontener formularza, link do przełączenia widoku (login ⇄ signup), miejsce na komunikat przychodzący z `redirect` (np. „Zaloguj się, aby kontynuować”).
- Obsługiwane interakcje: brak (prezentacyjny).
- Obsługiwana walidacja: brak.
- Typy: brak własnych.
- Propsy: `{ title: string; subtitle?: string; children: ReactNode; messageFromRedirect?: string }`.

### LoginForm

- Opis: Formularz logowania email+hasło z integracją `supabaseClient.auth.signInWithPassword`.
- Główne elementy: `form`, pola `email`, `password`, checkbox „Pokaż hasło”, przycisk `Zaloguj`, link do rejestracji.
- Obsługiwane interakcje:
  - `submit`: próba logowania; stan `isSubmitting`; blokada przycisku; spinner.
  - `input`: czyszczenie błędów pól.
  - `Enter` w polach wysyła formularz.
- Obsługiwana walidacja (client-side):
  - `email` wymagany, format email.
  - `password` wymagane, długość min. 8.
- Typy:
  - DTO: `AuthSignInCommand` z `src/types.ts`.
  - ViewModel: `LoginFormValues`, `AuthFormState` (sekcja 5).
- Propsy: `{ redirectTo?: string }` (ustawiane z query param `redirect`).

### SignupForm

- Opis: Formularz rejestracji email+hasło (x2) z integracją `supabaseClient.auth.signUp`.
- Główne elementy: `form`, pola `email`, `password`, `confirmPassword`, checkbox „Pokaż hasło”, przycisk `Załóż konto`, link do logowania.
- Obsługiwane interakcje:
  - `submit`: próba rejestracji; stan `isSubmitting`.
  - `input`: walidacje na bieżąco; czyszczenie błędów.
- Obsługiwana walidacja (client-side):
  - `email` wymagany, format email.
  - `password` wymagane, min. 8.
  - `confirmPassword` musi równać się `password`.
- Typy:
  - DTO: `AuthSignUpCommand` z `src/types.ts`.
  - ViewModel: `SignupFormValues`, `AuthFormState` (sekcja 5).
- Propsy: `{ redirectTo?: string }`.

### PasswordField

- Opis: Pole hasła z możliwością pokazania/ukrycia, wspólne dla obu formularzy; wbudowane a11y (etykiety, `aria-describedby` na błędy).
- Główne elementy: `input[type=password|text]`, przycisk „Pokaż/Ukryj”.
- Obsługiwane interakcje: `onToggleVisibility`, `onChange`.
- Obsługiwana walidacja: delegowana do formularza.
- Typy: `{ id: string; name: string; value: string; onChange: (e)=>void; error?: string; label?: string }`.
- Propsy: jak wyżej.

### AuthRedirectGuard

- Opis: Komponent efektowy; wykrywa aktywną sesję i przekierowuje z `/auth/*` na `redirectTo || /flashcards`.
- Główne elementy: `useEffect` z odczytem sesji Supabase.
- Obsługiwane interakcje: redirect po wykryciu sesji.
- Obsługiwana walidacja: brak.
- Typy: `{ redirectTo?: string }`.
- Propsy: `{ redirectTo?: string; children?: ReactNode }` (renderuje `children` tylko gdy brak sesji).

## 5. Typy

- Z istniejących:
  - `AuthSignInCommand`: `{ email: string; password: string }`
  - `AuthSignUpCommand`: `{ email: string; password: string }`
- Nowe ViewModel/stan formularza:
  - `type LoginFormValues = { email: string; password: string }`
  - `type SignupFormValues = { email: string; password: string; confirmPassword: string }`
  - `type FieldErrors<T> = Partial<Record<keyof T | "form", string>>`
  - `type AuthFormState<T> = { values: T; errors: FieldErrors<T>; isSubmitting: boolean; redirectTo?: string }`

## 6. Zarządzanie stanem

- Lokalny stan komponentów React (hooki `useState`, `useEffect`).
- Dedykowany hook `useAuthForm<T>()` (opcjonalnie) abstrahujący wspólne zachowania (zmiana pól, submit, błędy, blokady).
- Źródło `redirectTo`:
  - z query param `redirect` lub
  - z `localStorage.getItem('auth:intendedPath')` ustawianego przez `AuthGuard` przy próbie wejścia na ścieżki chronione.
- Po sukcesie logowania/rejestracji: czyszczenie `auth:intendedPath` i `window.location.assign(redirectTo || '/flashcards')`.

## 7. Integracja API

- Biblioteka: `@supabase/supabase-js` (klient istnieje: `src/db/supabase.client.ts` → `supabaseClient`).
- Logowanie:
  - Wywołanie: `supabaseClient.auth.signInWithPassword({ email, password })`.
  - Sukces: obecność `data.session`; błędy w `error`.
- Rejestracja:
  - Wywołanie: `supabaseClient.auth.signUp({ email, password })`.
  - W PRD brak weryfikacji email – traktujemy sukces jako zalogowanego użytkownika, jeśli sesja zwrócona; jeśli nie, wykonujemy `signInWithPassword` po udanej rejestracji.
- Wyjście (poza zakresem tego widoku): `supabaseClient.auth.signOut()` w widoku Konto.
- SSR: `src/middleware/index.ts` już tworzy klienta serwerowego i zarządza cookies; FE używa klienta przeglądarkowego (persist session domyślnie). Sesje trwają 7 dni wg konfiguracji Supabase.

## 8. Interakcje użytkownika

- Wypełnij pola i naciśnij `Zaloguj` / `Załóż konto`.
- Naciśnięcie Enter wysyła formularz.
- Błędy walidacji pokazują się inline; `aria-live` dla komunikatów globalnych.
- Przycisk submit blokuje się i pokazuje spinner podczas `isSubmitting`.
- Link pod formularzem przełącza między login/signup (zachowuje `redirect`).
- Po sukcesie – redirect do intencji lub `/flashcards` (US-024).
- Po już aktywnej sesji na `/auth/*` – natychmiastowy redirect do `redirect || /flashcards` (US-024).

## 9. Warunki i walidacja

- Email: wymagany; regex: prosty RFC5322-lite lub `HTML5 type=email` + dodatkowy check niepusty.
- Hasło: wymagane; min. 8 znaków (PRD: „walidacja podstawowa”).
- Rejestracja: `confirmPassword === password`.
- Blokada submitu dopóki formularz nie jest poprawny.
- Po stronie API: błędy `auth.invalid_credentials` i inne – mapowane na komunikaty w `errors.form`.
- Gating (US-024): brak sesji ⇒ `AuthGuard` zapisuje intencję (`auth:intendedPath`) i redirectuje na `/auth/login?redirect=...`.

## 10. Obsługa błędów

- Błędy sieci: toast/banner „Problem z połączeniem. Spróbuj ponownie.”; możliwość ponowienia.
- Złe dane logowania: komunikat globalny „Nieprawidłowy email lub hasło”.
- Próba wejścia na stronę chronioną: na loginie wyświetl subtelny komunikat wynikający z `redirect` (np. „Zaloguj się, aby kontynuować akcję”).
- Niespójność sesji (brak session po signUp): fallback do `signInWithPassword` i powtórny redirect.
- A11y: komunikaty błędów w `aria-live="polite"`, powiązanie `aria-describedby`.
- US-018: Po zmianie hasła (z widoku `Account`) wszystkie sesje wygaszane – po wykryciu 401 na stronach chronionych wymuś login (z zachowaniem intencji), nie dotyczy bezpośrednio tego widoku, ale informację pokaż przy kolejnym logowaniu.

## 11. Kroki implementacji

1. Routing:
   - Utwórz `src/pages/auth/login.astro` i `src/pages/auth/signup.astro` z mountem React (`client:only="react"`).
   - Odczytuj `redirect` z query i przekazuj do odpowiedniego formularza.
2. Layout:
   - Dodaj `src/components/auth/AuthLayout.astro` (opcjonalnie) z jednolitym UI.
3. Komponenty formularzy:
   - Zaimplementuj `LoginForm.tsx` i `SignupForm.tsx` w `src/components/auth/` z Tailwind 4 i dostępnością.
   - Użyj istniejącego `src/components/ui/button.tsx` dla przycisków.
   - Dodaj `PasswordField.tsx` (pokaz/ukryj hasło).
4. Walidacje:
   - Zaimplementuj lokalne walidacje (email, min 8 znaków, potwierdzenie hasła) i blokadę submitu.
5. Integracja z Supabase:
   - Importuj `supabaseClient` i wywołuj `auth.signInWithPassword` / `auth.signUp`.
   - Obsłuż `isSubmitting`, błędy i redirect na sukces.
6. Redirect guard:
   - Dodaj `AuthRedirectGuard.tsx` renderowany w stronach `login.astro` i `signup.astro` – jeśli jest aktywna sesja, redirect do `redirect || '/flashcards'`.
7. Obsługa intencji i gating (US-024):
   - Zaimplementuj (lub upewnij się, że istnieje) globalny `AuthGuard` dla ścieżek chronionych, który zapisuje intencję w `localStorage['auth:intendedPath']` i redirectuje na `/auth/login?redirect=...`.
   - Na login/signup odczytaj `redirect` i po sukcesie wróć do intencji.
8. UX/A11y:
   - Dodaj `aria-live` dla komunikatów, focus na pierwszym polu; obsługa Enter.
   - Dodaj link przełączenia (login ⇄ signup) z zachowaniem `redirect` w query.
9. i18n (PL/EN):
   - Przygotuj prosty słownik dla etykiet i komunikatów (budując pod przyszłe rozszerzenia), bazując na `navigator.language` lub ustawieniach użytkownika (po zalogowaniu).
10. Testy manualne scenariuszy:

- Logowanie poprawne/niepoprawne; rejestracja; redirect z intencją; redirect przy już zalogowanym; zachowanie Enter; komunikaty błędów; dostępność.
- Gating US-024: wejście na `/study` bez sesji → redirect do `/auth/login?redirect=/study` → login → powrót na `/study`.
- US-018 (poza widokiem, scenariusz ścieżki): po zmianie hasła na innym urządzeniu – w aktywnej sesji próba wejścia na stronę chronioną skutkuje 401 i redirectem do `/auth/login` z zachowaniem intencji.
