## Plan implementacji widoku Generate

## 1. Przegląd
Widok Generate umożliwia zalogowanemu użytkownikowi wklejenie tekstu źródłowego (1000–10000 znaków), ustawienie liczby proponowanych fiszek (10–50, domyślnie 30) i uruchomienie generacji propozycji przez AI. Widok zapewnia walidację długości wejścia, licznik znaków, skrót klawiaturowy (Ctrl+Enter), wskaźnik postępu (strumieniowanie SSE) oraz bezpieczny fallback do odpowiedzi non-SSE (REST) po 5 s braku zdarzeń. Start nowej generacji czyści istniejącą sesję propozycji (OneActiveSessionGuard). Po zakończeniu generacji następuje przeniesienie do widoku Proposals.

## 2. Routing widoku
- **Ścieżka:** `/generate`
- **Dostęp:** tylko zalogowani (AuthGuard/RequireSession). Gość → redirect do `/auth/login` z powrotem po sukcesie.
- **SSR:** `export const prerender = false;` dla strony Astro.

## 3. Struktura komponentów
```
GeneratePage (Astro)
└─ RequireSession (React wrapper)
   └─ GenerateView (React)
      ├─ TextAreaWithCounter
      ├─ SliderProposalsCount
      ├─ ControlsBar
      │  ├─ GenerateButton
      │  └─ CancelButton
      ├─ GenerationStatus (progress + skeletons + fallback timer)
      └─ OneActiveSessionGuard (Modal)
```

## 4. Szczegóły komponentów
### GeneratePage (Astro)
- **Opis:** Strona routingu `/generate`. Łączy layout, `RequireSession` i wyspę React `GenerateView`.
- **Elementy:** kontener layoutu, `<GenerateView client:load />`.
- **Zdarzenia:** brak (delegacja do React).
- **Walidacja:** bramkowanie dostępu przez `RequireSession`.
- **Typy:** brak własnych (kompozycja).
- **Propsy:** brak.

### RequireSession (React)
- **Opis:** Ochrona widoku. Sprawdza sesję z `supabase.client.ts`. Przy braku sesji: redirect do `/auth/login` z zachowaniem intencji powrotu.
- **Elementy:** wrapper renderujący dzieci lub komunikat ładowania.
- **Zdarzenia:** obsługa 401 → redirect.
- **Walidacja:** wymagana aktywna sesja.
- **Typy:** none (wewnętrznie korzysta z klienta Supabase).
- **Propsy:** `children: ReactNode`.

### GenerateView (React, kontener logiki)
- **Opis:** Główny komponent formularza i procesu generacji. Zarządza stanem, walidacją, SSE/REST, lokalnym przechowywaniem ustawień suwaka i kontrolą pojedynczej aktywnej sesji propozycji.
- **Elementy:** `TextAreaWithCounter`, `SliderProposalsCount`, `ControlsBar`, `GenerationStatus`, `OneActiveSessionGuard`.
- **Zdarzenia:**
  - `onChange(sourceText)` → przelicza licznik, waliduje.
  - `onChange(maxProposals)` → waliduje zakres, zapisuje w LocalStorage.
  - `onGenerate()` → jeśli istnieje aktywna sesja propozycji w LocalStorage → pokazuje `OneActiveSessionGuard`; w przeciwnym razie startuje generację.
  - `onCancel()` → abortuje trwającą generację.
  - Obsługa skrótu `Ctrl+Enter` → `onGenerate()`.
- **Walidacja:**
  - `sourceText` długość 1000–10000 (liczenie graphem-safe).
  - `maxProposals` 10–50.
- **Typy:** `GenerateFormState`, `GenerationProgress`, `GenerateViewModel` (sekcja 5).
- **Propsy:** brak (strona samowystarczalna).

### TextAreaWithCounter
- **Opis:** Pole tekstowe z licznikiem znaków (graphem), wskazujące brakujące/przekroczone znaki i stany błędu.
- **Elementy:** `<textarea>`, licznik, komunikaty walidacji (aria-live polite), opcjonalny hint i skrót `Ctrl+Enter`.
- **Zdarzenia:** `onChange`, `onKeyDown(Ctrl+Enter)` → delegacja do rodzica.
- **Walidacja:** 1000–10000 znaków; komunikat: „Brakuje X znaków” lub „Przekroczono o X znaków”.
- **Typy:** `TextCounterState` (sekcja 5).
- **Propsy:** `{ value: string; count: number; min: number; max: number; onChange: (v: string) => void; onSubmitShortcut: () => void; error?: string | null; }`.

### SliderProposalsCount
- **Opis:** Suwak wyboru liczby propozycji (10–50, domyślnie 30). Wartość pamiętana lokalnie.
- **Elementy:** komponent slider z etykietą i aktualną wartością.
- **Zdarzenia:** `onChange(value)`.
- **Walidacja:** zakres 10–50 (blokada przy wyjściu poza zakres).
- **Typy:** prymitywy liczbowe.
- **Propsy:** `{ value: number; min: number; max: number; onChange: (v: number) => void; }`.

### ControlsBar
- **Opis:** Pasek akcji. Renderuje `GenerateButton` i `CancelButton` zależnie od stanu.
- **Elementy:** dwa przyciski, miejsce na pomoc/skrót.
- **Zdarzenia:** klik `Generate`/`Cancel`.
- **Walidacja:** `Generate` disabled gdy input nie spełnia warunków lub offline.
- **Typy:** prymitywy.
- **Propsy:** `{ canGenerate: boolean; isGenerating: boolean; onGenerate: () => void; onCancel: () => void; }`.

### GenerateButton / CancelButton
- **Opis:** Przyciski sterujące procesem. `Generate` inicjuje SSE/REST. `Cancel` abortuje trwającą generację.
- **Elementy:** przyciski `Button` z `aria-busy`/`disabled`.
- **Zdarzenia:** kliknięcia.
- **Walidacja:** stany disabled wg rodzica.
- **Typy:** brak dodatkowych.
- **Propsy:** `{ disabled?: boolean; loading?: boolean; onClick: () => void; }`.

### GenerationStatus
- **Opis:** Sekcja statusu generacji: skeletony od startu, licznik napływu propozycji (`progress.count`), wskaźnik trybu SSE/REST, komunikaty o fallbacku po 5 s.
- **Elementy:** skeleton list, licznik, tag trybu („Streaming”/„Batch”), bannery informacyjne.
- **Zdarzenia:** brak (prezentacja danych stanu).
- **Walidacja:** brak.
- **Typy:** `GenerationProgress`.
- **Propsy:** `{ isGenerating: boolean; progress: GenerationProgress | null; }`.

### OneActiveSessionGuard (Modal)
- **Opis:** Potwierdzenie rozpoczęcia nowej generacji, która wyczyści lokalny cache propozycji z poprzedniej sesji (TTL 24 h).
- **Elementy:** modal z opisem, przyciski `Kontynuuj` / `Anuluj`.
- **Zdarzenia:** `onConfirm()` → czyści cache i startuje generację; `onCancel()` → zamyka modal.
- **Walidacja:** brak.
- **Typy:** prymitywy.
- **Propsy:** `{ open: boolean; onConfirm: () => void; onCancel: () => void; }`.

## 5. Typy
- **Istniejące (z `src/types.ts`):**
  - `AiGenerateCommand` `{ source_text: string; max_proposals: number; }`
  - `AiGenerationProposalDTO` `{ front: string; back: string; }`
  - `AiGenerateResponse` `{ items: AiGenerationProposalDTO[]; returned_count: number; request_id: UUID; }`
  - `AiGenerateSseEvent` (`proposal` | `progress` | `done` | `error`)
  - `UUID`

- **Nowe (ViewModels/stan):**
  - `TextCounterState`:
    - `graphemeCount: number`
    - `minRequired: number` (1000)
    - `maxAllowed: number` (10000)
    - `isUnderMin: boolean`
    - `isOverMax: boolean`
    - `delta: number` (ujemne = brakuje, dodatnie = przekroczono)
  - `GenerationProgress`:
    - `mode: "sse" | "rest"`
    - `receivedCount: number` (z `progress.count` lub długości listy w trybie REST)
    - `returnedCount?: number` (z `done` albo z REST)
    - `startedAt: number` (ms, do obliczania czasu)
    - `fallbackArmedAt: number` (ms, po 5 s bez eventu przełączamy na REST)
  - `GenerateFormState`:
    - `sourceText: string`
    - `maxProposals: number` (10–50)
    - `counter: TextCounterState`
    - `isValid: boolean`
    - `violations: { field: "sourceText" | "maxProposals"; message: string }[]`
  - `GenerateViewModel` (agregat do renderu):
    - `form: GenerateFormState`
    - `isGenerating: boolean`
    - `progress: GenerationProgress | null`
    - `requestId?: UUID`
    - `error?: { code: string; message: string } | null`

- **Lokalny cache:**
  - `LocalStorageKeys`:
    - `proposalsMaxKey = "generate:max_proposals"` (bez TTL)
    - `proposalsSessionKey = "proposals:session"` (TTL 24h; utrzymywane przez widok Proposals)

## 6. Zarządzanie stanem
- **useState w `GenerateView`:**
  - `sourceText`, `maxProposals` (inicjalizacja z LocalStorage, domyślnie 30)
  - `counter` (aktualizowany przy zmianie tekstu via `grapheme`-safe licznik)
  - `isGenerating`, `progress`, `requestId`, `error`
- **Custom hooks:**
  - `useGraphemeCounter(text: string)` → zwraca `TextCounterState` (preferencja `Intl.Segmenter` z fallbackiem do prostego `.length`).
  - `useLocalStorage<T>(key, initial)` → prosty hook do zapisu/odczytu `maxProposals`.
  - `useAiGeneration()` → kapsułkuje logikę SSE/REST:
    - `start(command: AiGenerateCommand, opts: { onProposal, onProgress, onDone, onError, signal })`
    - Próbuje streaming (fetch + ReadableStream z `text/event-stream`), po 5 s bez eventu przełącza na REST.
    - Zwraca `abort()`.

## 7. Integracja API
- **Endpoint:** `POST /api/ai/generate`
- **Żądanie:** `AiGenerateCommand`
  - `source_text`: 1000–10000
  - `max_proposals`: 10–50
- **SSE (preferowane):**
  - Nagłówek: `Accept: text/event-stream`
  - Zdarzenia:
    - `proposal` → `{ front, back }` (inkrementujemy `receivedCount`)
    - `progress` → `{ count }` (aktualizujemy licznik)
    - `done` → `{ returned_count, request_id }` (zapis `requestId`, nawigacja do `/proposals`)
    - `error` → `{ message }` (przerwij, pokaż błąd)
- **Fallback REST:**
  - Bez nagłówka `Accept` SSE. Odpowiedź: `AiGenerateResponse`.
  - Po uzyskaniu: zapis `requestId`, przeniesienie do `/proposals`.
- **Nawigacja:** Po sukcesie przekazujemy kontekst (np. `requestId`) przez `sessionStorage` lub query param (preferowane: `sessionStorage.setItem("proposals:lastRequestId", id)`).

## 8. Interakcje użytkownika
- **Wklejenie/edycja tekstu:** licznik i walidacja w czasie rzeczywistym; komunikaty aria-live.
- **Ustawienie suwaka:** pamiętane lokalnie; walidacja zakresu.
- **Ctrl+Enter / klik Generate:**
  - Jeśli brak aktywnej sesji propozycji → start generacji.
  - Jeśli istnieje sesja → `OneActiveSessionGuard` (potwierdzenie i czyszczenie cache po akceptacji).
- **Anulowanie:** `Cancel` → abortuje żądanie; UI wraca do stanu gotowości.
- **Offline:** `Generate` disabled (tooltip „Brak połączenia”).

## 9. Warunki i walidacja
- **sourceText:** min 1000, max 10000 graphem; blokada przycisku i wyraźny komunikat z różnicą (X znaków). Zgodne z walidacją serwera (422 przy naruszeniu).
- **maxProposals:** 10–50; slider technicznie nie przekroczy zakresu. Zgodne z API.
- **Auth:** wymagana sesja (401 → redirect przez guard).
- **SSE timeout:** brak eventów 5 s → fallback REST (baner informacyjny „Strumieniowanie niedostępne, przełączono na tryb batch”).

## 10. Obsługa błędów
- **422 validation_failed:** Pokaż błędy inline, podświetl pola; nie wysyłaj ponownie, dopóki FE walidacja nie przejdzie.
- **401 unauthorized:** Guard przekierowuje do logowania z powrotem do `/generate`; zachowaj `sourceText` i `maxProposals` w stanie/LocalStorage.
- **408 request_timeout / 503 upstream_unavailable:** Pokaż baner z możliwością ponowienia; zachowaj wprowadzone dane.
- **429 too_many_requests:** Komunikat o ograniczeniu; wyłącz `Generate` na krótki backoff (np. 10–30 s z odliczaniem).
- **Network offline:** Globalny `NetworkBanner`; `Generate` disabled; licznik i edycja pozostają aktywne.
- **SSE przerwane:** Spróbuj jednokrotnie REST; jeśli błąd, pokaż toast i pozostaw użytkownika w widoku z możliwością ponowienia.

## 11. Kroki implementacji
1. Dodaj stronę `src/pages/generate.astro` z `prerender = false` i mountem React `GenerateView` oraz wrapperem `RequireSession`.
2. Utwórz komponent `GenerateView` w `src/components/generate/GenerateView.tsx` z lokalnym stanem, skrótami klawiaturowymi i walidacją.
3. Zaimplementuj `TextAreaWithCounter` i `SliderProposalsCount` w `src/components/generate/` korzystając z `shadcn/ui` i Tailwind.
4. Dodaj `ControlsBar` z `GenerateButton` i `CancelButton` (`src/components/ui/button.tsx` jako baza stylów).
5. Zaimplementuj `GenerationStatus` (skeletony, licznik napływu, oznaczenie trybu SSE/REST, komunikaty o fallbacku).
6. Dodaj `OneActiveSessionGuard` (modal) korzystając z komponentów dialogu z `shadcn/ui`.
7. Napisz hook `useGraphemeCounter` (preferuj `Intl.Segmenter`; fallback do `.length`).
8. Napisz hook `useLocalStorage` dla `maxProposals`.
9. Napisz hook `useAiGeneration` (SSE via `fetch` + `ReadableStream` i parser SSE; fallback REST po 5 s). Obsłuż `AbortController` i zwróć `abort`.
10. Spięcie: `onGenerate` buduje `AiGenerateCommand` i woła `useAiGeneration.start`; podczas `proposal/progress/done` aktualizuje stan UI; na `done` zapisuje `requestId` do `sessionStorage` i nawigacja do `/proposals`.
11. A11y: dodaj `aria-live` do liczników i błędów; `aria-busy` podczas generacji; focus management (po błędzie fokus na pole).
12. i18n: przygotuj teksty w PL/EN; klucze w prostym słowniku (MVP).
13. Stany brzegowe: offline, 401, 422, 429, 408/503 — dodaj bannery/toasty i blokady przycisków.
14. Testy ręczne i jednostkowe (parsowanie SSE, walidacja inputu, fallback po 5 s, abort działa, `Ctrl+Enter`).
15. Telemetria: brak jawnego wywołania FE (serwer rejestruje na zakończenie). Opcjonalnie debug logi w dev.


