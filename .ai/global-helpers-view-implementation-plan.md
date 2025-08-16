# Plan implementacji widoku Globalne warstwy pomocnicze

## 1. Przegląd
Zestaw globalnych, współdzielonych warstw UI i komponentów, które zapewniają:
- **AuthGuard**: bramkowanie dostępu do chronionych ścieżek, zachowanie intencji i powrót po logowaniu.
- **NetworkBanner**: globalny baner informujący o stanie online/offline i problemach sieciowych.
- **GlobalErrorBoundary**: globalne przechwytywanie błędów runtime w wyspach React i prezentacja przyjaznego widoku błędu.
- **HelpShortcutsModal**: modal z listą skrótów klawiaturowych (globalnych oraz dla widoków Proposals/Study), wywoływany `?`/`h`.
- **NotFound**: strona 404.
- (Integracja) **Toast/Alert system**: aria-live dla komunikatów, wpięty globalnie.

Widok/moduł wspiera wymagania z PRD: US-019 (A11y/klawiszologia), US-015 (błędy), US-024–US-025 (gating i powrót do intencji), FR-021–FR-022 (stany ładowania/ARIA), FR-020 (błędy i stany wyjątkowe).

## 2. Routing widoku
- `404` (NotFound): `src/pages/404.astro`
- Pozostałe warstwy są globalne (bez własnych ścieżek); montowane w layoucie `src/layouts/Layout.astro` oraz egzekwowane w `src/middleware/index.ts`.

## 3. Struktura komponentów
- `src/layouts/Layout.astro`
  - `AuthGuard` (warunkowo, per-strona chroniona)
  - `NetworkBanner`
  - `HelpShortcutsModal` (portal)
  - `Toaster` (shadcn/ui)
  - `GlobalErrorBoundary` (owija slot z wyspami React)
- `src/pages/404.astro` (NotFound)

Drzewo (wysoki poziom):
```
Layout.astro
├─ AuthGuard (opcjonalnie, na stronach chronionych)
├─ NetworkBanner
├─ GlobalErrorBoundary
│  └─ <slot> (treść stron / wyspy React)
├─ HelpShortcutsModal (portal)
└─ Toaster
```

## 4. Szczegóły komponentów
### AuthGuard
- Opis: Bramka dostępu do ścieżek chronionych. Sprawdza sesję (po stronie middleware i/lub klienta), przy braku – przekierowuje do `/auth/login` z zachowaniem intencji powrotu. Integruje obsługę `401` (z `src/lib/http.ts`).
- Główne elementy: wrapper nad zawartością; komunikaty stanu (opcjonalnie skeleton/redirect info).
- Obsługiwane interakcje:
  - Automatyczne przekierowanie do logowania przy braku sesji.
  - Po zalogowaniu – powrót do zapamiętanej intencji (ścieżka + kontekst).
- Walidacja:
  - Warunek: istnienie sesji użytkownika. Weryfikacja via `GET /api/me` (zwraca `ProfileDTO`).
  - Warunek: `401` z dowolnego chronionego wywołania → zapis intencji i redirect do `/auth/login`.
- Typy: `ProfileDTO` (z `src/types.ts`), `AuthIntent` (nowy VM, opis w sekcji Typy).
- Propsy:
  - `require={true}`: czy wymagana sesja (domyślnie true na stronach chronionych).
  - `redirectTo?: string` (domyślnie `/auth/login`).
  - `rememberIntent?: boolean` (domyślnie true).

### NetworkBanner
- Opis: Pasek u góry aplikacji sygnalizujący offline, problemy sieciowe (timeout/503) i wskazówki (np. „próbujemy ponowić”).
- Główne elementy: stały baner (sticky/top), ikona statusu, krótkie komunikaty, link do szczegółów/ponów.
- Obsługiwane interakcje:
  - Reaguje na eventy `online`/`offline` przeglądarki.
  - Subskrybuje kanał błędów HTTP z `src/lib/http.ts` (np. `http.on('network-error', meta)`).
- Walidacja: brak; stan pochodny z hooków i emisji błędów.
- Typy: `NetworkStatusVM`, `HttpErrorMeta` (nowe VM/typy).
- Propsy:
  - `status: NetworkStatusVM`
  - `lastError?: HttpErrorMeta`
  - `onRetry?: () => void`

### GlobalErrorBoundary
- Opis: React Error Boundary dla wysp React; wyświetla przyjazny ekran błędu i opcję odświeżenia/zgłoszenia.
- Główne elementy: kontener błędu, szczegóły (ograniczone), przyciski „Odśwież”, „Zgłoś problem”.
- Obsługiwane interakcje: „Odśwież stronę”, „Skopiuj szczegóły” (opcjonalnie do schowka).
- Walidacja: brak; chroni render-tree.
- Typy: `FallbackErrorInfo` (VM) – m.in. `message`, `componentStack?`.
- Propsy: `children` (node), `onError?(error: Error, info?: unknown)`.

### HelpShortcutsModal
- Opis: Globalny modal z listą skrótów klawiaturowych; otwierany `?` lub `h`. Prezentuje sekcje: Global, Proposals, Study.
- Główne elementy: dialog modalny (portal), lista skrótów (tabela/siatka), wyszukiwarka w tekście (opcjonalnie), przycisk zamknięcia `Esc`.
- Obsługiwane interakcje: `?`/`h` otwiera; `Esc` zamyka; fokus-trap; `Tab` cykluje po elementach.
- Walidacja: a11y – focus management, `aria-modal`, `role="dialog"`, opisy skrótów czytelne dla screen readerów.
- Typy: `ShortcutItem`, `ShortcutGroup` (VM).
- Propsy:
  - `groups: ShortcutGroup[]`
  - `isOpen: boolean`
  - `onOpenChange: (open: boolean) => void`

### NotFound (404)
- Opis: Strona błędu 404 z linkiem powrotu i krótkim komunikatem.
- Główne elementy: hero/ikona 404, opis, `Link` do `/` i do ostatnio odwiedzanej chronionej sekcji (jeśli dostępna).
- Obsługiwane interakcje: nawigacja linkami.
- Walidacja: brak.
- Typy: brak nowych.
- Propsy: brak.

### Toaster (integracja)
- Opis: Globalny provider/portal powiadomień (shadcn/ui). Wykorzystywany przez AuthGuard/NetworkBanner i resztę UI.
- Główne elementy: kontener, aria-live polite/assertive, warianty `info/success/warn/error`.
- Obsługiwane interakcje: zamknięcie, fokusowalny przycisk „Szczegóły” (opcjonalnie).
- Walidacja: a11y (aria-live), redukcja ruchu.
- Typy: `ToastMessage` (VM).
- Propsy: `position?`, `duration?`.

## 5. Typy
Nowe typy (ViewModel) do umieszczenia w `src/types.ts` lub w dedykowanym pliku `src/types.viewmodels.ts`:

```ts
// Global network status prezentowany w banerze
export interface NetworkStatusVM {
  online: boolean;                // navigator.onLine
  lastChangeAt: ISODateTimeString; // znacznik czasu zmiany statusu
}

// Metadane błędu sieciowego z warstwy http
export interface HttpErrorMeta {
  code: number;                    // np. 401, 503, 522
  message: string;                 // skrócony opis
  op: "generate" | "save" | "review" | "settings" | "auth" | "other";
  retryAfterMs?: number;           // jeśli znane
  requestId?: UUID;                // jeśli zwrócone w nagłówkach
}

// Intencja powrotu po logowaniu
export interface AuthIntent {
  returnTo: string;                // pełna ścieżka (z query)
  action?: string;                 // nazwa akcji (opcjonalna)
  payload?: Json;                  // kontekst (opcjonalny)
  createdAt: ISODateTimeString;
}

// Error boundary fallback
export interface FallbackErrorInfo {
  message: string;
  componentStack?: string;
}

// Skróty w modalu pomocy
export interface ShortcutItem {
  key: string;                     // np. "?", "h", "1", "Del"
  description: string;             // krótki opis działania
}

export interface ShortcutGroup {
  scope: "global" | "proposals" | "study";
  items: ShortcutItem[];
}

// Toaster
export interface ToastMessage {
  id: string;
  title?: string;
  description: string;
  variant: "info" | "success" | "warning" | "error";
  durationMs?: number;
}
```

Z istniejących typów: `UUID`, `ISODateTimeString`, `Json`, `ProfileDTO` (z `src/types.ts`).

## 6. Zarządzanie stanem
- `useNetworkStatus()` – hook nasłuchujący `online/offline`, zwraca `NetworkStatusVM`. Wewnętrzny `useEffect` rejestruje/usuwa listenerów; aktualizuje `lastChangeAt`.
- `useHttpErrorChannel()` – hook subskrybujący kanał zdarzeń z `src/lib/http.ts` (EventEmitter/Subject) i zwracający ostatni `HttpErrorMeta` (z resetem po czasie).
- `useAuthIntent()` – zapis/odczyt `AuthIntent` w `sessionStorage` (preferowane) lub `localStorage`; metody `saveIntent`, `consumeIntent`.
- `useHotkeys()` – rejestracja globalnych skrótów `?`/`h`/`Esc` z poszanowaniem focusu w polach input/textarea; integracja z `HelpShortcutsModal`.
- `GlobalProviders` – lekka warstwa dostawców (Toaster, kontekst skrótów), montowana w `Layout.astro`.

## 7. Integracja API
- Sprawdzenie sesji: `GET /api/me` → `ProfileDTO`.
  - Żądanie: bez body.
  - Odpowiedź (200): `ProfileDTO` (m.in. `user_id`, `is_admin`, `created_at`).
  - Odpowiedź (401): brak sesji → AuthGuard zapisuje `AuthIntent` i przekierowuje do `/auth/login?returnTo=...`.
- Kanał błędów sieciowych: integracja z `src/lib/http.ts` (brak zmian w API zewnętrznym). W `http.ts` dodajemy emisję `network-error` dla timeoutów/5xx/`navigator.onLine === false`.

## 8. Interakcje użytkownika
- `?` lub `h` otwiera HelpShortcutsModal; `Esc` zamyka; fokus wraca do aktywnego elementu.
- Utrata sieci: NetworkBanner pokazuje „offline”; przywrócenie – „online, odświeżono” (krótkie info, auto-hide).
- Wystąpienie błędu HTTP (np. 503): NetworkBanner pokazuje komunikat; opcja „Ponów” jeśli dostępna.
- `401` podczas akcji chronionej: UI zachowuje intencję (ścieżka + parametry), wyświetla toast i przekierowuje do logowania. Po sukcesie logowania – powrót i ponowienie tylko, jeśli bezpieczne (GET/idempotentne).
- Błąd wyspy React: GlobalErrorBoundary pokazuje ekran z przyciskiem „Odśwież”.

## 9. Warunki i walidacja
- **Gating chronionych ścieżek**: wymagana sesja. Weryfikacja w `src/middleware/index.ts` (SSR redirect) oraz klientowo (AuthGuard) dla degradacji łagodnej.
- **Offline**: 
  - Generacja/Zapis/Nauka – zablokowane przy `online=false` (przycisk disabled + tooltip) zgodnie z PRD; Study może działać z cache – poza zakresem tego modułu, ale baner informuje.
- **A11y**: 
  - HelpShortcutsModal: `role="dialog"`, focus-trap, `aria-labelledby/aria-describedby`.
  - Toaster: `aria-live` polite/assertive.
- **Idempotencja powrotu**: `AuthIntent` kasowany po użyciu; chronić przed pętlą redirectów.

## 10. Obsługa błędów
- **401**: zapis intencji → redirect do loginu → po sukcesie powrót. Toast informujący: „Sesja wygasła — zaloguj się ponownie”.
- **Offline**: baner + disabled CTA, brak automatycznych powtórzeń generacji (zgodnie z PRD). Po `online` – opcjonalny toast: „Połączono ponownie”.
- **Timeout/503**: baner + przycisk „Ponów” (jeśli operacja wspiera retry); odwołanie do fallbacków na poziomie widoków (Generacja ma własny fallback REST — tylko informujemy globalnie).
- **Runtime error w wyspie**: GlobalErrorBoundary prezentuje fallback i oferuje odświeżenie strony.

## 11. Kroki implementacji
1. Utwórz folder `src/components/global/` i dodaj:
   - `AuthGuard.tsx`
   - `NetworkBanner.tsx`
   - `GlobalErrorBoundary.tsx`
   - `HelpShortcutsModal.tsx`
   - `GlobalProviders.tsx` (Toaster, kontekst skrótów)
2. Dodaj stronę `src/pages/404.astro` (NotFound) zgodnie z brandem i dostępnością.
3. Rozszerz `src/lib/http.ts` o kanał zdarzeń błędów (EventEmitter/observable) i eksport hooka `useHttpErrorChannel`/interfejsu.
4. Dodaj hooki do `src/lib/`:
   - `useNetworkStatus.ts`
   - `useHotkeys.ts`
   - `useAuthIntent.ts`
5. Zaimplementuj `AuthGuard`:
   - Sprawdzenie sesji przez `GET /api/me` (na mount) z krótkim cache.
   - Reakcja na `401` z warstwy `http.ts` → zapis `AuthIntent` w `sessionStorage` → redirect do `/auth/login?returnTo=...`.
6. Zaimplementuj `NetworkBanner`:
   - Integracja z `useNetworkStatus` i `useHttpErrorChannel`.
   - Prezentacja odpowiednich komunikatów i wariantów (offline/5xx/timeout).
7. Zaimplementuj `GlobalErrorBoundary` (React 19) z przechwytywaniem błędów i fallbackiem.
8. Zaimplementuj `HelpShortcutsModal`:
   - Konfiguracja grup skrótów (Global/Proposals/Study) zgodnie z UI-planem.
   - Rejestracja `?`/`h` i `Esc` przez `useHotkeys` (z poszanowaniem inputów).
9. Włącz `GlobalProviders` i komponenty globalne w `src/layouts/Layout.astro` (pod `<body>`): NetworkBanner, HelpShortcutsModal, Toaster, ErrorBoundary wrapper na `<slot />`.
10. Uzupełnij `src/middleware/index.ts` o twarde bramkowanie ścieżek chronionych (redirect 302 do loginu z `returnTo`). Lista ścieżek: `/generate`, `/proposals`, `/flashcards`, `/study`, `/settings`, `/account`, API zapisu/nauki.
11. Dodaj lekkie testy E2E/integracyjne (opcjonalnie w tym etapie):
    - Offline → baner widoczny, CTA disabled.
    - 401 z API → redirect do loginu + po zalogowaniu powrót.
    - `?`/`h` → modal pomocy otwiera się i zamyka `Esc`.
12. Dokumentacja krótkich skrótów i zachowań w pliku README (sekcja „Skróty i warstwy globalne”).


