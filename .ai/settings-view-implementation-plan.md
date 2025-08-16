# Plan implementacji widoku Settings

## 1. Przegląd
Widok Settings służy do zarządzania ustawieniami użytkownika wpływającymi na naukę oraz dostępność UI:
- **Ustawienia nauki:** `daily_goal` (1–200), `new_limit` (0–50).
- **Preferencje UI:** wybór języka interfejsu (PL/EN), przełącznik wysokiego kontrastu.
Widok jest dostępny wyłącznie dla zalogowanych użytkowników i komunikuje się z `/api/user-settings` (GET/PATCH).

## 2. Routing widoku
- **Ścieżka:** `/settings`
- **Dostęp:** chroniony przez `AuthGuard/RequireSession` (gość → redirect do logowania z zachowaniem intencji powrotu)
- **Plik strony:** `src/pages/settings.astro` (ładuje kontener React `UserSettingsView`)

## 3. Struktura komponentów
```
SettingsPage (Astro)
└─ UserSettingsView (React)
   ├─ UserSettingsForm
   │  ├─ NumberField (daily_goal)
   │  ├─ NumberField (new_limit)
   │  └─ SaveButton
   ├─ I18nSelector
   ├─ HighContrastToggle
   ├─ InlineAlert / NetworkBanner
   └─ Toast / Alert
```

## 4. Szczegóły komponentów
### SettingsPage (Astro)
- **Opis:** Strona osadzająca layout (`src/layouts/Layout.astro`) i punkt montowania React.
- **Główne elementy:** nagłówek, opis sekcji, `<UserSettingsView />`.
- **Obsługiwane interakcje:** brak (delegacja do React).
- **Obsługiwana walidacja:** n/d.
- **Typy:** n/d.
- **Propsy:** n/d.

### UserSettingsView (kontener)
- **Opis:** Zarządza cyklem życia: pobranie ustawień, stany `loading/saving/error`, zapis oraz preferencje UI.
- **Główne elementy:** sekcja formularza, sekcja preferencji UI, alerty/banery, przyciski.
- **Obsługiwane interakcje:**
  - Mount → `GET /api/user-settings`
  - Submit formularza → `PATCH /api/user-settings`
  - Zmiana języka → update kontekstu i `localStorage`
  - Zmiana kontrastu → update atrybutu na `<html>` i `localStorage`
- **Obsługiwana walidacja:** delegowana do `UserSettingsForm` + mapowanie `422` z API.
- **Typy:** `UserSettingsDTO`, `UserSettingsUpdateCommand`, `SettingsViewModel`.
- **Propsy:** n/d.

### UserSettingsForm
- **Opis:** Formularz z kontrolkami liczbowymi i walidacją lokalną.
- **Główne elementy:**
  - `NumberField` dla `daily_goal` (min=1, max=200, step=1)
  - `NumberField` dla `new_limit` (min=0, max=50, step=1)
  - Etykiety, opisy, komunikaty błędów, `SaveButton` z loading/disabled
- **Obsługiwane interakcje:** wpisywanie, `blur`, Enter (submit), klik Zapisz.
- **Obsługiwana walidacja:**
  - `daily_goal`: int 1–200
  - `new_limit`: int 0–50
  - Co najmniej jedno pole zmienione (inaczej Save disabled)
- **Typy:** `UserSettingsFormState`, `UserSettingsFormErrors`, `UserSettingsUpdateCommand`.
- **Propsy:**
  - `initial: UserSettingsDTO`
  - `onSubmit: (payload: UserSettingsUpdateCommand) => Promise<void>`
  - `busy?: boolean`

### NumberField (re-używalny)
- **Opis:** Pole liczbowe z etykietą, opisem, walidacją i komunikatem błędu.
- **Główne elementy:** `<label>`, `<input type="number">`, `<p id=...>` (opis/błąd).
- **Obsługiwane interakcje:** `onChange`, `onBlur`, Enter.
- **Obsługiwana walidacja:** min/max/int-only na podstawie propsów.
- **Typy:** `NumberFieldProps`.
- **Propsy:**
  - `label: string`
  - `value: number | ""`
  - `onChange: (value: number | "") => void`
  - `min?: number`, `max?: number`, `step?: number`
  - `description?: string`
  - `error?: string`
  - `inputId?: string`

### SaveButton
- **Opis:** Przycisk zapisu ze stanami `disabled` i `loading`.
- **Główne elementy:** `Button` z `src/components/ui/button.tsx`.
- **Obsługiwane interakcje:** klik, Enter (submit).
- **Obsługiwana walidacja:** disabled gdy formularz niezmieniony/niepoprawny.
- **Typy:** n/d.
- **Propsy:** `disabled?: boolean`, `loading?: boolean`, `onClick: () => void`.

### I18nSelector
- **Opis:** Przełącznik języka UI (PL/EN); zapis w `localStorage` i aktualizacja kontekstu.
- **Główne elementy:** `select` lub przyciski.
- **Obsługiwane interakcje:** `onChange`.
- **Obsługiwana walidacja:** n/d.
- **Typy:** `UiLanguage = "pl" | "en"`.
- **Propsy:** `value: UiLanguage`, `onChange: (lang: UiLanguage) => void`.

### HighContrastToggle
- **Opis:** Przełącznik trybu wysokiego kontrastu; ustawia np. `data-high-contrast` na `<html>` i zapisuje w `localStorage`.
- **Główne elementy:** switch/checkbox z etykietą.
- **Obsługiwane interakcje:** `onChange(enabled)`.
- **Obsługiwana walidacja:** n/d.
- **Typy:** `boolean`.
- **Propsy:** `enabled: boolean`, `onChange: (enabled: boolean) => void`.

### InlineAlert / Toast
- **Opis:** Komunikaty o stanie (sukces/błąd); aria-live.
- **Główne elementy:** wrapper z `role="alert"`.
- **Obsługiwane interakcje:** auto-hide dla sukcesu; dismiss na klik.
- **Obsługiwana walidacja:** n/d.
- **Typy:** `AlertKind = "info" | "success" | "warning" | "error"`.
- **Propsy:** `kind`, `message`, `onClose?`.

## 5. Typy
- Z istniejących (`src/types.ts`):
  - `UserSettingsDTO` — `{ user_id: UUID, daily_goal: number, new_limit: number, created_at: ISODateTimeString, updated_at: ISODateTimeString }`.
  - `UserSettingsUpdateCommand = Partial<{ daily_goal: number; new_limit: number }>`.
- Nowe typy ViewModel (FE):
  - `SettingsViewModel`:
    - `settings: UserSettingsDTO | null`
    - `loading: boolean`
    - `saving: boolean`
    - `error: string | null`
    - `lastSavedAt?: number`
    - `ui: { language: UiLanguage; highContrast: boolean }`
  - `UserSettingsFormState`:
    - `daily_goal: number | ""`
    - `new_limit: number | ""`
    - `dirty: boolean`
  - `UserSettingsFormErrors`:
    - `daily_goal?: string`
    - `new_limit?: string`
  - `NumberFieldProps` jak wyżej.
  - `UiLanguage = "pl" | "en"`.

## 6. Zarządzanie stanem
- `UserSettingsView` utrzymuje `SettingsViewModel` w `useState`:
  - `settings` ładowane `useEffect` na mount (GET), błąd → alert.
  - `formState` synchronizowane z `settings` po udanym GET.
  - `saving` blokuje wielokrotne zapisy; przycisk Save disabled.
  - Preferencje UI: `useUiPreferences()` (localStorage + side-effect na `<html>`), trzymane lokalnie.
- Custom hooki:
  - `useUserSettings()`:
    - `load(): Promise<UserSettingsDTO>` — GET `/api/user-settings`
    - `update(cmd: UserSettingsUpdateCommand): Promise<UserSettingsDTO>` — PATCH `/api/user-settings`
    - Zapewnia obsługę błędów i mapowanie `422` na pola
  - `useUiPreferences()`:
    - `language, setLanguage`
    - `highContrast, setHighContrast`

## 7. Integracja API
- **Endpointy:** `GET /api/user-settings`, `PATCH /api/user-settings`.
- **Żądania i odpowiedzi:**
  - GET → `200: UserSettingsDTO`; `401` (redirect do loginu); `408` (timeout) → komunikat i retry.
  - PATCH (`application/json` z `UserSettingsUpdateCommand`) →
    - `200: UserSettingsDTO`
    - `401` (redirect)
    - `422 validation_failed` (zakresy / brak pól) → błędy inline
    - `429 rate_limited` (nagłówek `Retry-After`) → baner + czasowa blokada
    - `408 request_timeout` → komunikat + retry
- **Konwencja błędów:** `{ error, code, details? }`.

## 8. Interakcje użytkownika
- Zmiana `daily_goal` / `new_limit` → walidacja natychmiastowa, oznaczenie `dirty`.
- Zapis (klik/Enter) → PATCH; sukces: toast „Zapisano”, `dirty = false`.
- Zmiana języka → zapis w preferencjach, aktualizacja UI.
- Przełącznik kontrastu → natychmiastowy efekt na `<html>`, zapis preferencji.
- Błędy → komunikaty inline, focus na pierwszym błędnym polu.

## 9. Warunki i walidacja
- **FE:**
  - `daily_goal`: int 1–200; wymagane tylko gdy zmieniane.
  - `new_limit`: int 0–50; wymagane tylko gdy zmieniane.
  - Payload musi mieć ≥1 pole (inaczej Save disabled).
- **BE (`422`):** te same reguły; mapować `details` na pola.
- **A11y:** `label`/`id`, `aria-describedby`, aria-live dla statusów.

## 10. Obsługa błędów
- `401 unauthorized` → redirect do `/auth/login` z powrotem do `/settings` po sukcesie.
- `422 validation_failed` → błędy per pole + alert nad formularzem.
- `429 rate_limited` → baner z treścią i blokadą Save do czasu `Retry-After`.
- `408 request_timeout` → alert i opcja ponów.
- `5xx` → ogólny błąd i retry.
- Offline: banner, Save disabled z tooltipem; lokalne utrzymanie formularza.

## 11. Kroki implementacji
1. Dodaj stronę `src/pages/settings.astro` i osadź `UserSettingsView` (React) w `Layout.astro`.
2. Utwórz katalog `src/components/settings/` i komponenty: `UserSettingsView.tsx`, `UserSettingsForm.tsx`, `NumberField.tsx`, `I18nSelector.tsx`, `HighContrastToggle.tsx`, opcj. `InlineAlert.tsx`.
3. Dodaj hooki: `useUserSettings.ts` (GET/PATCH z obsługą kodów 401/422/429/408) oraz `useUiPreferences.ts` (localStorage + efekt na `<html>`).
4. Zaimplementuj walidację FE w `UserSettingsForm` (min/max/int-only, disabled Save gdy brak zmian/błędy).
5. Ujednolić styling Tailwind 4; użyć `Button` z `src/components/ui/button.tsx`.
6. Dodać toasty/alerty (aria-live) i focus management dla błędów.
7. Testy manualne scenariuszy: brak sesji, wczytanie, zapisy niepoprawne/prawidłowe, `429`, `408`.
8. (Opcjonalnie) Testy jednostkowe komponentów/hooków.
