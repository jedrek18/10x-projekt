# Plan implementacji widoku Account

## 1. Przegląd

Widok Account służy do operacji na koncie użytkownika zalogowanego: zmiana hasła, wylogowanie i trwałe usunięcie konta (z kaskadowym usunięciem danych aplikacji). Wymogi: po zmianie hasła unieważnić wszystkie aktywne sesje; przy usunięciu konta użytkownik musi potwierdzić decyzję i podać hasło; dostęp tylko dla zalogowanych.

## 2. Routing widoku

- Ścieżka: `/account`
- Dostęp: chroniony przez AuthGuard (wymagane zalogowanie). Przy braku sesji → redirect do `/auth/login` z zachowaniem intencji powrotu.
- Layout: `src/layouts/Layout.astro`

## 3. Struktura komponentów

- `src/pages/account.astro` (kontener strony)
  - `AccountPage` (React, kluczowy komponent logiki)
    - `ChangePasswordForm`
    - `SignOutButton`
    - `DeleteAccountSection`
      - `DeleteAccountModal`
    - (opcjonalnie) `SessionInfoCard` (informacje o koncie/sesji)

## 4. Szczegóły komponentów

### AccountPage

- Opis: Główny komponent widoku. Odpowiada za gate’owanie dostępu, scalenie sekcji (zmiana hasła, wylogowanie, usuwanie konta), obsługę toastów i błędów globalnych.
- Główne elementy: nagłówek, sekcje formularzy, „Danger zone” z usuwaniem konta.
- Obsługiwane interakcje:
  - Render i ochrona trasy (sprawdzenie sesji)
  - Przekazywanie callbacków do akcji: onPasswordChanged, onSignedOut, onAccountDeleted
- Walidacja: brak własnej walidacji domenowej (deleguje do dzieci); weryfikuje stan sesji (401 → redirect).
- Typy: `AuthChangePasswordCommand`, `AuthDeleteAccountCommand`, wewnętrzne VM (patrz sekcja 5).
- Propsy: brak (otrzymuje kontekst via hooki) lub opcjonalnie `onRequireLogin?: () => void`.

### ChangePasswordForm

- Opis: Formularz zmiany hasła. Wymaga podania bieżącego hasła, nowego hasła oraz potwierdzenia nowego hasła. Po sukcesie wymusza unieważnienie wszystkich sesji i wylogowanie użytkownika.
- Główne elementy:
  - Pola: `current_password` (password), `new_password` (password), `confirm_password` (password)
  - Przycisk Submit (Shadcn `Button`), ewentualnie `Form`, `Input`, `Label`, `FormMessage`
- Obsługiwane interakcje:
  - Submit → reautoryzacja przez `signInWithPassword` (email + current_password) → `updateUser({ password: new_password })` → `signOut({ scope: 'global' })` → redirect do loginu
- Walidacja (frontend):
  - `current_password`: wymagane
  - `new_password`: wymagane, min. 8 znaków (UI), różne od `current_password`
  - `confirm_password`: musi równać się `new_password`
  - W trakcie żądania: disabled, spinner, blokada wielokliku
- Walidacja (zgodna z API):
  - 401 przy błędnych danych reautoryzacji → komunikat „Nieprawidłowe obecne hasło”
  - Inne błędy Supabase Auth (np. sieć, 429) → toast błędu
- Typy: używa `AuthChangePasswordCommand` (z `types.ts`) jako model żądania; lokalny VM rozszerzony o `confirm_password`.
- Propsy:
  - `onSuccess?: () => void`
  - `onError?: (error: Error) => void`

### SignOutButton

- Opis: Przycisk wylogowania bieżącej sesji (lub wszystkich sesji – opcja).
- Główne elementy: `Button` z akcją.
- Obsługiwane interakcje:
  - Klik → `supabase.auth.signOut()` (domyślnie bieżąca sesja) lub `signOut({ scope: 'global' })` jeśli chcemy logikę „wyloguj z każdego urządzenia”.
- Walidacja: brak (poza disabled podczas requestu).
- Propsy:
  - `scope?: 'local' | 'global'` (domyślnie `'local'`)
  - `onSignedOut?: () => void`

### DeleteAccountSection

- Opis: Sekcja „Danger zone” z informacją o konsekwencjach i przyciskiem otwierającym modal potwierdzenia usunięcia konta.
- Główne elementy: `Card`/`Alert`, `Button` (open modal)
- Obsługiwane interakcje: otwarcie modala.
- Walidacja: brak (logika w modalu).
- Propsy: `onDeleted?: () => void`

### DeleteAccountModal

- Opis: Modal potwierdzenia usunięcia konta. Wprowadza silne zabezpieczenia: wymagane hasło, fraza „USUŃ”, cooldown 30 s przed aktywacją przycisku.
- Główne elementy:
  - Pole `password` (password)
  - Pole `confirm_phrase` (text) z placeholderem „USUŃ”
  - Licznik czasu (30 s) i disabled przycisku dopóki timer nie dobiegnie końca
  - Przyciski: „Anuluj”, „Usuń konto”
- Obsługiwane interakcje:
  - Start modala → wystartowanie timera 30 s
  - Submit → reautoryzacja `signInWithPassword` (email + password) → `DELETE /api/auth/account` (edge function) → `signOut({ scope: 'global' })` → redirect do landing/login
- Walidacja (frontend):
  - `confirm_phrase` dokładnie „USUŃ” (wielkie litery)
  - `password` wymagane
  - Cooldown 30 s musi się skończyć przed aktywacją Submit
- Walidacja (API):
  - 401 przy błędnym haśle (reauth) → komunikat o błędnym haśle
  - 403/409/500 z `/api/auth/account` → odpowiednie komunikaty i log błędu
- Typy: używa `AuthDeleteAccountCommand` (puste) dla wywołania; lokalny VM przechowuje `password`, `confirm_phrase`, `cooldownEndsAt`.
- Propsy:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onDeleted?: () => void`

### SessionInfoCard (opcjonalnie)

- Opis: Prezentuje podstawowe dane profilu/sesji (email, data utworzenia, informacja o wielosesyjności). Nie jest wymagane w MVP, ale pomaga UX.
- Dane: z `supabase.auth.getUser()` i/lub `GET /api/me`.
- Propsy: brak.

## 5. Typy

### Reużywalne DTO (z `src/types.ts`)

- `AuthChangePasswordCommand`: `{ current_password: string; new_password: string }`
- `AuthDeleteAccountCommand`: `{}` (alias `EmptyObject`)
- `ProfileDTO`: do ewentualnego wyświetlenia informacji na karcie sesji

### Nowe ViewModel-e (FE-only)

```ts
// Dla ChangePasswordForm
export interface ChangePasswordFormModel {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface ChangePasswordFormErrors {
  current_password?: string;
  new_password?: string;
  confirm_password?: string;
  form?: string; // komunikaty ogólne (np. sieć)
}

// Dla DeleteAccountModal
export interface DeleteAccountFormModel {
  password: string;
  confirm_phrase: string; // musi być "USUŃ"
}

export interface DeleteAccountUiState {
  isOpen: boolean;
  isSubmitting: boolean;
  cooldownEndsAt: number | null; // timestamp ms
  error?: string;
}

// Widok ogólny
export interface AccountViewState {
  isBusy: boolean; // globalny busy do blokady całej strony podczas krytycznych akcji
}
```

## 6. Zarządzanie stanem

- Lokalny stan per komponent (React state) + niestandardowe hooki:
  - `useCooldown(seconds: number)`: zarządza odliczaniem (zwraca `remaining`, `start()`, `reset()`, `isActive`). Używany w `DeleteAccountModal`.
  - `useAuthGuard()`: sprawdza bieżącą sesję przez `supabase.auth.getSession()`; w razie braku sesji → redirect i przechowanie intencji.
  - `useToast()` (z systemu toastów Shadcn/niestandardowego) do sygnalizacji sukcesów/błędów.
- Brak potrzeby globalnego store (Zustand/Redux) dla MVP; operacje są atomowe.

## 7. Integracja API

### Supabase Auth (klient)

- Zmiana hasła:
  1. `const { data: { user } } = await supabase.auth.getUser()` → potrzebny email.
  2. Reautoryzacja: `await supabase.auth.signInWithPassword({ email: user.email!, password: current_password })`.
  3. Aktualizacja: `await supabase.auth.updateUser({ password: new_password })`.
  4. Unieważnienie sesji: `await supabase.auth.signOut({ scope: 'global' })`.

- Wylogowanie: `await supabase.auth.signOut()` lub `signOut({ scope: 'global' })` (zgodnie z UI).

### REST (Edge Function) – kasowanie konta

- Endpoint: `DELETE /api/auth/account`
- Nagłówki: `Authorization: Bearer <JWT>` (uzyskany od Supabase)
- Body: `{}`
- Odpowiedź: `204 No Content` przy sukcesie
- Po sukcesie: `supabase.auth.signOut({ scope: 'global' })` → redirect do `/`

## 8. Interakcje użytkownika

- Zmiana hasła:
  - Użytkownik wypełnia formularz → Submit → walidacje FE → reautoryzacja (błąd → komunikat) → aktualizacja hasła → global sign-out → redirect do logowania + toast „Hasło zmienione. Zaloguj się ponownie”.
- Wylogowanie:
  - Klik przycisku → signOut → redirect do `/auth/login`.
- Usunięcie konta:
  - Otwórz modal → timer 30 s → wprowadź hasło i frazę „USUŃ” → Submit → reauth → DELETE `/api/auth/account` → signOut global → redirect do landing + toast „Konto usunięte”.

## 9. Warunki i walidacja

- Guard dostępu: sesja wymagana do wyświetlenia `/account`.
- ChangePasswordForm:
  - `current_password`: required
  - `new_password`: required, min 8, różne od current
  - `confirm_password`: równe `new_password`
  - Obsługa błędów 401 (reauth), sieć/timeout
- DeleteAccountModal:
  - `password`: required
  - `confirm_phrase === 'USUŃ'`
  - Cooldown min. 30 s od otwarcia modala
  - Obsługa błędów 401 (reauth), 4xx/5xx z `/api/auth/account`

## 10. Obsługa błędów

- 401 / brak sesji: natychmiastowy redirect do loginu, zachowanie intencji powrotu.
- Reautoryzacja nieudana: komunikat przy polu hasła („Nieprawidłowe hasło”).
- Błędy sieci (timeout/offline): banner globalny + możliwość ponowienia.
- 429 (rate limit Auth/Edge): toast z prośbą o spróbowanie za chwilę.
- 5xx z `/api/auth/account`: toast błędu + log w konsoli; przy wielokrotnym niepowodzeniu pokaż kontakt/wskazówkę.
- Dostępność: wszystkie komunikaty w aria-live, modale z focus trap; klawisze `Esc` zamyka modal.

## 11. Kroki implementacji

1. Routing i gate’owanie:
   - Utwórz `src/pages/account.astro` z mountem React (`AccountPage`) i osadź w `Layout.astro`.
   - Zaimplementuj `useAuthGuard()` lub wykorzystaj istniejący mechanizm (redirect gdy brak sesji).
2. Komponenty UI:
   - Stwórz katalog `src/components/account/` i komponenty: `AccountPage.tsx`, `ChangePasswordForm.tsx`, `SignOutButton.tsx`, `DeleteAccountSection.tsx`, `DeleteAccountModal.tsx` (+ opcjonalnie `SessionInfoCard.tsx`).
   - Użyj Shadcn/ui: `Button`, `Input`, `Label`, `Form`, `Dialog`, `Alert`, `Separator`.
3. Logika Supabase Auth:
   - Wstrzyknij `supabaseClient` z `src/db/supabase.client.ts` do komponentów.
   - Zaimplementuj sekwencję reautoryzacji → update password → signOut global w `ChangePasswordForm`.
4. Edge Function wywołanie kasowania konta:
   - Dodaj klienta HTTP (fetch) do `DELETE /api/auth/account` z nagłówkiem `Authorization` (token z `supabase.auth.getSession()`).
   - Po sukcesie → `signOut({ scope: 'global' })` → redirect.
5. Walidacje i UX:
   - Dodaj walidacje synchroniczne w formularzach; pokaż błędy polowe i ogólne (toasty).
   - Zaimplementuj cooldown 30 s w `DeleteAccountModal` (`useCooldown`).
6. A11y i i18n:
   - Focus management w modalu; aria-live dla toastów; etykiety i opisy.
   - Teksty w PL/EN (prosty mechanizm i18n lub placeholdery pod późniejszą integrację).
7. Stany brzegowe i testy manualne:
   - Sprawdź 401/wygaśnięcie sesji; odłącz sieć (offline) i powrót.
   - Sprawdź niepoprawne hasło przy reautoryzacji.
8. Telemetria (opcjonalnie dla MVP UI):
   - Można emitować eventy: `events.save`/`events.generation` nie dotyczą Account; pomiń lub dodaj minimalne logi UI.

## Dodatkowe mapowanie na PRD i User Stories

- US-011/US-012: Dostęp i sesje – widok chroniony, sesje 7 dni (zarządzane przez Supabase), operacje Auth.
- US-013: Zmiana hasła i usunięcie konta – formularz zmiany hasła z reautoryzacją i globalnym wylogowaniem; modal usuwania konta z potwierdzeniem i cooldownem.
- US-018: Wylogowanie – przycisk wyloguj; po zmianie hasła wylogowanie ze wszystkich urządzeń.

## Drzewo komponentów (wysokopoziomowe)

```
AccountPage
├── SessionInfoCard (opcjonalnie)
├── ChangePasswordForm
├── SignOutButton
└── DeleteAccountSection
    └── DeleteAccountModal
```
