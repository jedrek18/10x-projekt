# API Endpoint Implementation Plan: Study / SRS

## 1. Przegląd punktu końcowego

Budowanie kolejki nauki, promowanie „nowych” kart na dziś oraz rejestrowanie ocen z aktualizacją harmonogramu SRS. Operacje realizowane przez RPC (SECURITY DEFINER) i/lub selekcje zoptymalizowane indeksami.

## 2. Szczegóły żądania

### 2.1 GET `/api/srs/queue`

- Metoda: GET
- URL: `/api/srs/queue?goal_hint`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: `goal_hint: number`
- Body: brak

### 2.2 POST `/api/srs/promote-new`

- Metoda: POST
- URL: `/api/srs/promote-new`
- Parametry: brak
- Body: `{ count?: number }`

### 2.3 POST `/api/srs/review`

- Metoda: POST
- URL: `/api/srs/review`
- Parametry: brak
- Body: `{ card_id: UUID, rating: 0|1|2|3 }`

## 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `SrsQueueResponse`, `SrsQueueCardDTO`, `SrsQueueMetaDTO`
  - `SrsPromoteNewCommand`, `SrsPromoteNewResponse`
  - `SrsReviewCommand`, `SrsReviewResultDTO`, `ReviewRating`, `UUID`

## 3. Szczegóły odpowiedzi

### GET `/api/srs/queue`

- 200: `SrsQueueResponse`
- 401: unauthorized

### POST `/api/srs/promote-new`

- 200: `SrsPromoteNewResponse`
- 401: unauthorized

### POST `/api/srs/review`

- 200: `SrsReviewResultDTO`
- 422: `validation_failed` (rating poza 0–3)
- 404: `not_found` (karta nie istnieje/soft-deleted)
- 401: unauthorized

## 4. Przepływ danych

- Użycie `context.locals.supabase`.
- Kolejka: Edge Function/RPC `build_queue` agreguje due + nowe (FIFO), na podstawie `user_settings`, `user_daily_progress`, indeksów `(user_id, due_at)` i `(user_id, introduced_on)`; alternatywnie selekcje i logika w warstwie aplikacji jeśli brak RPC.
- Promocja: RPC `promote_new_cards_for_today` ustawia `introduced_on = current_date UTC`, zwiększa `user_daily_progress.new_introduced` i zwraca listę `promoted` oraz `remaining_allowance`.
- Review: RPC `review_flashcard` aktualizuje kolumny SRS (Open Spaced Repetition), zwiększa `user_daily_progress.reviews_done`, wpis do `audit_log`.

## 5. Względy bezpieczeństwa

- Supabase JWT obowiązkowe; RLS chroni rekordy użytkownika.
- RPC działają jako `SECURITY DEFINER`, ale weryfikują `auth.uid()` i własność przed modyfikacjami.
- Walidacja wejścia (Zod): `count` ≥ 0; `rating` ∈ {0,1,2,3}.

## 6. Obsługa błędów

- 400: nieprawidłowy `goal_hint` lub `count` (typ/zasięg)
- 401: nieautoryzowany
- 404: karta nieznaleziona/soft-deleted (RLS/stan)
- 422: walidacja komend
- 500: błędy nieoczekiwane / RPC

## 7. Rozważania dotyczące wydajności

- Wykorzystanie indeksów częściowych dla `due` i selekcji nowych.
- Ograniczenie liczby „new” do `min(settings.new_limit, 10)` oraz pozostałego allowance.
- Zwracanie minimalnego niezbędnego zestawu kolumn dla kolejki (opcjonalnie bez `back` do momentu ujawnienia).

## 8. Etapy wdrożenia

1. Pliki API:
   - `src/pages/api/srs/queue.ts` (GET)
   - `src/pages/api/srs/promote-new.ts` (POST)
   - `src/pages/api/srs/review.ts` (POST)
   - W każdym: `export const prerender = false;`
2. Walidacja (Zod) w `src/lib/validation/srs.ts`:
   - `queueQuerySchema` { goal_hint?: number }
   - `promoteNewSchema` { count?: number }
   - `reviewSchema` { card_id: UUID, rating: 0|1|2|3 }
3. Serwis `src/lib/services/srs.service.ts`:
   - `buildQueue(supabase, goalHint?)`
   - `promoteNew(supabase, cmd)` (rpc)
   - `reviewCard(supabase, cmd)` (rpc)
4. Mapowanie błędów RPC na HTTP; testy przypadków: brak allowance, rating=3, karta w stanie `new` itd.
