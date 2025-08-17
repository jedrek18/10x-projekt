# API Endpoint Implementation Plan: Flashcards (CRUD & Batch Save)

## 1. Przegląd punktu końcowego

Zarządzanie fiszkami użytkownika: lista, tworzenie, odczyt, edycja treści, soft-delete oraz wsadowy zapis propozycji AI z idempotencją.

Realizacja przez Astro Server Endpoints i Supabase PostgREST/RPC. RLS wymusza dostęp tylko do własnych rekordów; soft-delete ukrywa rekordy w listach.

## 2. Szczegóły żądania

### 2.1 GET `/api/flashcards`

- Metoda HTTP: GET
- Struktura URL: `/api/flashcards?limit&offset&order`
- Parametry:
  - Wymagane: brak
  - Opcjonalne:
    - `limit` (domyślnie 25)
    - `offset` (domyślnie 0)
    - `order` ∈ `created_at.desc|created_at.asc` (domyślnie `.desc`)
- Request Body: brak

### 2.2 POST `/api/flashcards`

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: brak
- Request Body: `{ front: string, back: string }`

### 2.3 GET `/api/flashcards/{id}`

- Metoda HTTP: GET
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id: UUID`
  - Opcjonalne: brak
- Request Body: brak

### 2.4 PATCH `/api/flashcards/{id}`

- Metoda HTTP: PATCH
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id: UUID`
  - Opcjonalne: brak
- Request Body: `{ front?: string, back?: string }` (co najmniej jedno z pól)

### 2.5 DELETE `/api/flashcards/{id}`

- Metoda HTTP: DELETE
- Struktura URL: `/api/flashcards/[id]`
- Parametry:
  - Wymagane: `id: UUID`
  - Opcjonalne: brak
- Request Body: brak

### 2.6 POST `/api/flashcards:batch-save`

- Metoda HTTP: POST
- Struktura URL: `/api/flashcards:batch-save`
- Nagłówki: `Idempotency-Key: <uuid>` (zalecane)
- Parametry: brak
- Request Body: `{ items: Array<{ front: string, back: string, source: 'ai' | 'ai_edited' }> }`

## 3. Wykorzystywane typy

- DTO/Commands z `src/types.ts`:
  - `FlashcardDTO`
  - `FlashcardCreateManualCommand`
  - `FlashcardUpdateContentCommand`
  - `FlashcardBatchSaveRequest`
  - `FlashcardBatchSaveResponse`
  - `UUID`

## 3. Szczegóły odpowiedzi

### GET `/api/flashcards`

- 200: `[FlashcardDTO]` + nagłówki `X-Total-Count`, `Link` (opcjonalnie) lub `Content-Range` wg PostgREST
- 401: unauthorized

### POST `/api/flashcards`

- 201: `FlashcardDTO` (z `source="manual"` i domyślnymi polami SRS)
- 422: `validation_failed` (limit długości, `front != back` po kanonikalizacji)
- 409: `conflict` (duplikat `(user_id, content_hash)`)
- 401: unauthorized

### GET `/api/flashcards/{id}`

- 200: `FlashcardDTO`
- 404: `not_found` (nie istnieje/nie należy/do soft-deleted)
- 401: unauthorized

### PATCH `/api/flashcards/{id}`

- 200: `FlashcardDTO` (po edycji treści)
- 409: `conflict_soft_deleted` (edycja soft-deleted)
- 422: `validation_failed`
- 404: `not_found`
- 401: unauthorized

### DELETE `/api/flashcards/{id}`

- 204: bez treści
- 404: `not_found`
- 401: unauthorized

### POST `/api/flashcards:batch-save`

- 201: `FlashcardBatchSaveResponse`
- 422: `validation_failed` (dowolny niepoprawny element)
- 409: `conflict` (duplikaty w treści żądania; zwrócone w `skipped`)
- 401: unauthorized

## 4. Przepływ danych

- Wszystkie endpointy używają `context.locals.supabase` (zdefiniowane w `src/middleware/index.ts`).
- Lista i CRUD: zapytania PostgREST: `supabase.from('flashcards')...` z RLS (`user_id = auth.uid()` i `deleted_at IS NULL`).
- Soft delete: wywołanie RPC `delete_flashcard` (SECURITY DEFINER) przez `supabase.rpc('delete_flashcard', { card_id })` → ustawia `deleted_at`, zapis do `audit_log`.
- Batch save: iteracja po `items` z walidacją i upsertami; deduplikacja przez unikalny indeks `(user_id, content_hash) WHERE deleted_at IS NULL`. Rejestrowanie do `event_log` (`event_name='save'`, `properties` z licznikami i opcjonalnie włączenie listy `saved/skipped` w `properties` dla idempotencji).
- Paginacja: `range(offset, offset+limit-1)`; odczyt `count` z `select('*', { count: 'exact', head: true })` dla nagłówków.

## 5. Względy bezpieczeństwa

- Autoryzacja: Supabase JWT wymagany (401 gdy brak/niepoprawny). RLS zabezpiecza rekordy per użytkownik.
- Soft-delete i SRS tylko przez RPC; zwykły UPDATE ograniczony grantami kolumn.
- Idempotencja: `Idempotency-Key` + `request_id`; przy powtórzeniu zwracamy poprzedni wynik (lookup przez `(user_id, request_id)` w `event_log`).
- Walidacja wejścia Zod, limity znaków zgodnie z DB CHECK, `front != back` po kanonikalizacji serwerowej.

## 6. Obsługa błędów

- Mapowanie kodów:
  - 400: błędne query params (`limit`, `offset`, `order`)
  - 401: brak/niepoprawny token
  - 404: brak zasobu / brak uprawnień (RLS)
  - 409: konflikt deduplikacji lub edycja soft-deleted
  - 422: naruszenie walidacji
  - 500: niespodziewane błędy
- Brak osobnej tabeli błędów; log do serwera i (dla operacji poprzez RPC) audyt w `audit_log`.

## 7. Rozważania dotyczące wydajności

- Indeksy wg planu DB: `(user_id, created_at DESC, id DESC)`, `(user_id, content_hash)`; częściowe indeksy dla selekcji.
- Batch insert: użyć pojedynczego `insert([...])` z `onConflict` tam gdzie możliwe; w razie konfliktów odczyt „skipped”.
- Limit odpowiedzi i stronicowanie; minimalny wybór kolumn w listach jeśli zajdzie potrzeba.
- Unikać N+1: brak joinów poza samą tabelą; ewentualne pola SRS są w tym samym rekordzie.

## 8. Etapy wdrożenia

1. Struktura plików API (Astro):
   - `src/pages/api/flashcards/index.ts` (GET, POST)
   - `src/pages/api/flashcards/[id].ts` (GET, PATCH, DELETE)
   - `src/pages/api/flashcards:batch-save.ts` (POST)
   - W każdym: `export const prerender = false;` oraz `export async function GET/POST/...`
2. Walidacja (Zod) w `src/lib/validation/flashcards.ts`:
   - `createManualSchema` { front, back }
   - `updateContentSchema` { front?, back? } (refine: co najmniej jedno)
   - `listQuerySchema` { limit?, offset?, order? }
   - `batchSaveSchema` { items: [{ front, back, source }] }
3. Serwisy w `src/lib/services/flashcards.service.ts`:
   - `listFlashcards(supabase, { limit, offset, order })`
   - `createManualFlashcard(supabase, cmd)`
   - `getFlashcardById(supabase, id)`
   - `updateFlashcardContent(supabase, id, cmd)`
   - `softDeleteFlashcard(supabase, id)` (rpc)
   - `batchSaveFlashcards(supabase, request, idempotencyKey?)` (zlicza `saved/skipped`, zapisuje `event_log`)
4. Mapowanie błędów Supabase → kody HTTP zgodnie z tabelą w specyfikacji (409 z naruszenia unikalności, 422 z CHECK itp.).
5. Dodanie nagłówków stronicowania (`X-Total-Count`, `Link` lub `Content-Range`).
6. Testy integracyjne endpointów oraz przypadków brzegowych (duże treści, duplikaty, soft-deleted).
7. Hardening: weryfikacja, że `context.locals.supabase` jest ustawione (middleware istnieje).
