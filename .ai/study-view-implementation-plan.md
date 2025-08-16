## Plan implementacji widoku Study

## 1. Przegląd
Widok Study realizuje dzienną naukę w oparciu o SRS: najpierw wszystkie karty due (stany `learning`/`review`), a następnie do 10 nowych (ograniczone ustawieniami użytkownika). Użytkownik przegląda front, odsłania back i ocenia kartę w skali Anki (0–3), co aktualizuje harmonogram. Widok działa stabilnie w warunkach offline (cache kolejki + outbox ocen), wspiera skróty klawiaturowe, a11y i pokazuje postęp względem dziennego celu.

## 2. Routing widoku
- **Ścieżka:** `/study`
- **Plik strony:** `src/pages/study.astro`
- **Dostęp:** chroniony przez `AuthGuard` (po braku sesji → redirect do `/auth/login` z powrotem po zalogowaniu; US-024)
- **SSR/prerender:** `export const prerender = false` (widok zależny od sesji i dynamicznych danych)

## 3. Struktura komponentów
```text
StudyPage (Astro)
└─ <StudyApp /> (React, client:load)
   ├─ StudyQueueLoader
   │  ├─ NetworkBanner
   │  ├─ OfflineOutboxIndicator
   │  ├─ QueueHeader
   │  │  └─ GoalProgressBar
   │  │     └─ IncreaseGoalAction
   │  └─ StudyStage
   │     ├─ StudyCard (front/back + reveal)
   │     └─ RatingPanel (0/1/2/3)
   ├─ KeyboardShortcutsHelp (modal)
   └─ GlobalErrorBoundary
```

## 4. Szczegóły komponentów
### StudyApp
- **Opis:** Punkt wejścia dla części React; konfiguruje konteksty (online status, outbox, i18n), renderuje `StudyQueueLoader` oraz globalne UI pomocnicze.
- **Elementy:** `<OnlineStatusProvider>`, `<OutboxProvider>`, `<StudyQueueLoader />`, `<KeyboardShortcutsHelp />`.
- **Interakcje:** globalny handler skrótów (`?`/`h`), focus management.
- **Walidacja:** brak.
- **Typy:** `StudyViewState`, konteksty `OnlineStatusContext`, `OutboxContext`.
- **Propsy:** brak (root).

### StudyQueueLoader
- **Opis:** Pobiera kolejkę dnia z `/api/srs/queue`, buforuje ją (IndexedDB/LocalStorage), zarządza stanami ładowania, błędów, offline, i dostarcza bieżącą kartę do `StudyStage`.
- **Elementy:** `NetworkBanner`, `OfflineOutboxIndicator`, `QueueHeader` (z `GoalProgressBar` i `IncreaseGoalAction`), `StudyStage`.
- **Interakcje:** auto-retry przy powrocie online; ponowne pobranie kolejki po ocenach lub zmianie celu.
- **Walidacja:** `goal_hint` (opcjonalny int ≥ 0) przed dołączeniem do query; obsługa `401` (US-024), stabilność przy `503/timeout` (US-015/US-029).
- **Typy:** `SrsQueueResponse`, `SrsQueueItemVM`, `QueueMetaVM`, `StudyViewState`.
- **Propsy:** opcjonalnie `initialGoalHint?: number`.

### StudyStage
- **Opis:** Steruje prezentacją pojedynczej karty, jej ujawnieniem (front → back) i ścieżką oceny. Orkiestruje `StudyCard` i `RatingPanel`.
- **Elementy:** `StudyCard`, `RatingPanel`.
- **Interakcje:** Space/Enter → reveal, `1–4` → ocena; po ocenie auto-advance do następnej karty.
- **Walidacja:** wymusza poprawny zakres `rating ∈ {0,1,2,3}`; brak oceny, gdy brak aktywnej karty.
- **Typy:** `ReviewRating`, `SrsReviewCommand`, `SrsReviewResultDTO`.
- **Propsy:** `{ item: SrsQueueItemVM | null, onRated: (res: SrsReviewResultDTO) => void }`.

### StudyCard
- **Opis:** Prezentacja aktualnej karty: front (zawsze), back (po reveal). Zapewnia focus ring, ARIA i tryb `prefers-reduced-motion`.
- **Elementy:** kontener, sekcja front, sekcja back (aria-hidden do czasu reveal), przycisk „Pokaż odpowiedź”.
- **Interakcje:** przycisk „Pokaż” i skróty Space/Enter.
- **Walidacja:** brak (prezentacja).
- **Typy:** `SrsQueueCardDTO` (częściowo), `SrsQueueItemVM`.
- **Propsy:** `{ item: SrsQueueItemVM, revealed: boolean, onReveal: () => void }`.

### RatingPanel
- **Opis:** Panel ocen 0–3 (Again/Hard/Good/Easy) ze skrótami `1–4`, czytelnymi etykietami i tooltipami.
- **Elementy:** 4 przyciski (Shadcn/Button), układ dostępny z klawiatury.
- **Interakcje:** kliknięcie lub skrót klawiszowy → `onRate(rating)`.
- **Walidacja:** `rating` musi być jednym z `0|1|2|3`.
- **Typy:** `ReviewRating`.
- **Propsy:** `{ disabled: boolean, onRate: (rating: ReviewRating) => void }`.

### GoalProgressBar
- **Opis:** Pasek postępu dziennego celu z etykietami (0…100% z cap „100%+”).
- **Elementy:** progress + label; pokazuje `reviews_done` względem `daily_goal` (z `goal_override` jeśli ustawione).
- **Interakcje:** brak (prezentacja).
- **Walidacja:** wartości liczbowe ≥ 0; capowanie powyżej 100%.
- **Typy:** `QueueMetaVM`.
- **Propsy:** `{ meta: QueueMetaVM }`.

### IncreaseGoalAction
- **Opis:** Akcja jednorazowego zwiększenia celu dziennego (US-009) → `PATCH /api/progress/{date}`.
- **Elementy:** przycisk Shadcn/Button + modal potwierdzenia.
- **Interakcje:** klik → formularz z nową wartością (walidacja 1–200), submit → PATCH, po sukcesie odświeżenie meta/queue.
- **Walidacja:** `goal_override ∈ [1,200] | null`.
- **Typy:** `UserDailyProgressUpdateCommand` (poziom API), lokalny ViewModel z datą.
- **Propsy:** `{ dateUtc: string, currentGoal: number, onUpdated: (newGoal: number) => void }`.

### OfflineOutboxIndicator
- **Opis:** Wskaźnik liczby oczekujących ocen do wysłania (US-029). Klik otwiera podgląd.
- **Elementy:** badge z liczbą w outboxie; lista w modalu.
- **Interakcje:** klik → modal; automatyczne wysyłanie przy powrocie online.
- **Walidacja:** brak.
- **Typy:** `OutboxItem`, `OutboxStats`.
- **Propsy:** `{ count: number }`.

### NetworkBanner
- **Opis:** Globalny baner stanu sieci (offline/timeout/503) z aria-live (US-015).
- **Elementy:** alert (Shadcn/Alert) z ikoną i komunikatem.
- **Interakcje:** ukrywanie/pokazywanie wg stanu.
- **Walidacja:** brak.
- **Typy:** status online `boolean`, opcjonalny `lastError?: string`.
- **Propsy:** `{ online: boolean, lastError?: string }`.

### KeyboardShortcutsHelp
- **Opis:** Modal pomocy (`?`/`h`) z listą skrótów (US-019).
- **Elementy:** dialog + tabela skrótów.
- **Interakcje:** otwórz/zamknij; focus trap.
- **Walidacja:** brak.
- **Typy:** brak specyficznych.
- **Propsy:** `{ open: boolean, onOpenChange: (v: boolean) => void }`.

## 5. Typy
- **DTO (z `src/types.ts`):**
  - `SrsQueueResponse`, `SrsQueueCardDTO`, `SrsQueueMetaDTO`
  - `SrsPromoteNewCommand`, `SrsPromoteNewResponse`
  - `SrsReviewCommand`, `SrsReviewResultDTO`, `ReviewRating`, `UUID`
  - `UserDailyProgressUpdateCommand`

- **ViewModel (nowe, FE):**
  - `SrsQueueItemVM`:
    - `id: UUID`
    - `front: string`
    - `back: string | null`
    - `state: 'new'|'learning'|'review'|'relearning'`
    - `due_at: string | null`
    - `revealed: boolean` (UI)
    - `pending: boolean` (ocena w toku)
  - `QueueMetaVM`:
    - `due_count: number`
    - `new_selected: number`
    - `daily_goal: number`
    - `reviews_done_today: number` (pochodzi z `/api/progress` lub zliczane lokalnie w sesji)
  - `OutboxItem`:
    - `card_id: UUID`
    - `rating: ReviewRating`
    - `queued_at: ISODateTimeString`
    - `attempts: number`
  - `StudyViewState`:
    - `status: 'idle'|'loading'|'ready'|'error'`
    - `items: SrsQueueItemVM[]`
    - `currentIndex: number`
    - `meta: QueueMetaVM`
    - `lastError?: string`

## 6. Zarządzanie stanem
- **Hooki niestandardowe:**
  - `useOnlineStatus()` — śledzi `navigator.onLine`, eventy `online/offline`.
  - `useOutbox()` — kolejkuje `OutboxItem` w IndexedDB/LocalStorage; API: `enqueue(item)`, `flush()`, `stats`.
  - `useStudyQueue()` — pobiera/cachuje kolejkę (`SrsQueueResponse` → `SrsQueueItemVM[]`), trzyma `currentIndex`, `reveal()`, `advance()`, `rate(rating)`.
  - `useKeyboardShortcuts()` — rejestruje skróty: Space/Enter (reveal), `1–4` (rate), `?`/`h` (help).
- **Źródła stanu:** React state + konteksty; cache kolejki: IndexedDB (preferowane) z TTL ~30 min; fallback LocalStorage.
- **Aktualizacja po ocenie:** Optymistyczna — natychmiastowe `advance()`; jeżeli offline → do outboxu; przy błędzie trwałym (np. 401) cofnięcie lub komunikat i wymuszenie logowania (US-029/US-024).

## 7. Integracja API
- **GET `/api/srs/queue`** (`SrsQueueResponse`)
  - Query: opcjonalnie `goal_hint` (int ≥ 0). Mapowanie odpowiedzi do `items` i `meta`.
- **POST `/api/srs/review`** (`SrsReviewCommand` → `SrsReviewResultDTO`)
  - Body: `{ card_id, rating }` z `rating ∈ {0,1,2,3}`.
  - Po 200: aktualizuj licznik postępu i ewentualnie odśwież meta.
  - Błędy: `422`, `404`, `401`.
- **PATCH `/api/progress/{date}`** (`UserDailyProgressUpdateCommand` → 200)
  - Zwiększenie `goal_override` na dziś; po sukcesie odśwież `QueueMetaVM`.
- **POST `/api/srs/promote-new`** (opcjonalnie, gdy chcemy jawnie promować nowe przed/po queue)
  - Body: `{ count?: number }`; po sukcesie możliwy refresh queue.

## 8. Interakcje użytkownika
- **Reveal:** Space/Enter lub klik „Pokaż odpowiedź” → `revealed=true`.
- **Ocena:** Klawisze `1–4` lub klik w RatingPanel → wysyłka oceny (online) lub enqueue (offline), auto-advance do następnej karty.
- **Zwiększ cel:** Klik w `IncreaseGoalAction` → modal → PATCH → odświeżenie postępu (US-009).
- **Pomoc:** `?`/`h` otwiera modal skrótów (US-019).
- **Nawigacja fokusowa:** Wszystkie przyciski fokusowalne, widoczny focus ring.

## 9. Warunki i walidacja
- **Rating:** dozwolone tylko `0|1|2|3`; inne wartości blokowane na FE i odrzucone przez API (422).
- **Brak aktywnej karty:** Rating disabled; komunikat „Kolejka ukończona”. CTA do `/flashcards` lub `/generate` (US-008 zakończenie ścieżki).
- **Cel dzienny:** Pasek postępu capowany przy 100%+; akcja zwiększenia waliduje zakres `1–200`.
- **Offline:** Generowanie/ocena online gate’owane; w offline rating trafia do outboxu (baner informacyjny) i oznacza kartę jako przetworzoną lokalnie (US-029).
- **A11y:** aria-live dla banerów; skróty z etykietami; `prefers-reduced-motion` dla reveal.

## 10. Obsługa błędów
- **401 unauthorized:** zapisz intencję (bieżąca karta + pending outbox), wymuś logowanie, po sukcesie dokończ flush outboxu i kontynuuj (US-024/US-029).
- **404 not_found:** karta nie istnieje/soft-deleted — pomiń kartę, pokaż toast i przejdź do następnej.
- **422 validation_failed:** rating poza zakresem — błąd programistyczny; log i blokada akcji.
- **503/timeout:** pokaż `NetworkBanner` i daj przycisk ponów.
- **Offline:** outbox kolejkowany; automatyczne `flush()` przy `online`.

## 11. Kroki implementacji
1. Routing: utwórz `src/pages/study.astro` z `prerender=false` i mountem `<StudyApp client:load />`. Zastosuj `AuthGuard` w Astro layout/middleware (`src/middleware/index.ts`).
2. Struktura katalogów: `src/components/study/` z plikami TSX: `StudyApp.tsx`, `StudyQueueLoader.tsx`, `StudyStage.tsx`, `StudyCard.tsx`, `RatingPanel.tsx`, `GoalProgressBar.tsx`, `IncreaseGoalAction.tsx`, `OfflineOutboxIndicator.tsx`, `KeyboardShortcutsHelp.tsx`, `NetworkBanner.tsx`.
3. Typy: dodaj ViewModel-e w `src/types.ts` lub lokalnie w `src/components/study/types.ts` (preferowane lokalnie, by nie zanieczyszczać globalnego kontraktu API).
4. Hooki: zaimplementuj `useOnlineStatus`, `useOutbox` (IndexedDB/LocalStorage), `useStudyQueue`, `useKeyboardShortcuts` w `src/components/study/hooks/`.
5. Integracja API: użyj `src/lib/http.ts` do wywołań; zbuduj klienta dla `/api/srs/queue`, `/api/srs/review`, `/api/progress/{date}`; dodaj nagłówki auth wg `supabase.client.ts` jeśli potrzebne.
6. UI i a11y: zaimplementuj reveal z `prefers-reduced-motion`, focus management, aria-live w banerach; klawiszologia (`1–4`, Space/Enter, `?`/`h`).
7. Offline/outbox: zapisuj oceny lokalnie gdy offline; testuj automatyczny flush i odporność na 401/5xx.
8. Postęp celu: pobieraj/pokazuj meta z queue; wdroż `IncreaseGoalAction` z PATCH i odświeżeniem meta.
9. Stany skrajne: pusta kolejka, tylko due, tylko new, powyżej celu dziennego → odpowiednie CTA i komunikaty.
10. Testy E2E/integ.: scenariusze ocen online/offline, 401 w trakcie, zwiększenie celu, pusta kolejka, skróty klawiaturowe.


