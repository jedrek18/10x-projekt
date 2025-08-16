# Plan implementacji widoku Flashcards (Moje fiszki)

## 1. Przegląd
Widok „Moje fiszki” służy do przeglądania, edycji i usuwania zapisanych fiszek użytkownika oraz do ręcznego dodawania nowych. Zapewnia paginację (25/stronę), sortowanie malejąco po `created_at`, chip źródła (ai/ai_edited/manual), Undo usuwania (5 s), oraz CTA „Rozpocznij naukę teraz” zależne od stanu kolejki SRS.

Cele:
- Przegląd: lista 25/str., sort `created_at DESC` (US-006, US-020, US-026)
- Edycja i usuwanie fiszek (US-006, US-027, US-028)
- Ręczne dodawanie fiszek (US-007)
- Widoczność źródła (US-023)
- CTA do nauki, stan wg `/api/srs/queue` (US-008 – powiązane, oraz FR-014)
- Dostęp tylko dla zalogowanych (US-024)

## 2. Routing widoku
- Ścieżka: `/flashcards?page=:n`
- Dostęp: chroniony przez `AuthGuard`/middleware (`401` → redirect do `/auth/login` z powrotem do intencji; US-024)

## 3. Struktura komponentów
- `FlashcardsPage` (kontener strony)
  - `StudyNowCTA` (stała, top-right/sekcja nagłówka)
  - `ManualAddButton` → `ManualAddModal`
  - `FlashcardsListSection`
    - `FlashcardsToolbar` (liczniki X–Y z Z, sort readonly, info o źródłach)
    - `FlashcardTable` (desktop) / `FlashcardList` (mobile/tablet)
      - `FlashcardRowItem`
        - `SourceChip`
        - `RowActions` (Edit/Delete)
    - `Pagination`
  - `EditFlashcardModal`
  - `DeleteUndoSnackbar`
  - `NetworkBanner` (globalny)

## 4. Szczegóły komponentów
### FlashcardsPage
- Opis: Strona kontenerowa. Ładuje listę fiszek z API, utrzymuje stan paginacji, modali, undo i błędów. Odpowiada za odświeżanie CTA nauki po operacjach mutujących.
- Główne elementy: nagłówek z tytułem i `StudyNowCTA`, przycisk „Dodaj fiszkę”, sekcja listy, paginacja, modale.
- Obsługiwane interakcje: inicjalny fetch; zmiana strony; otwarcie/zamknięcie modali; po zapisie/edycji/usuń → refetch listy i (warunkowo) `/api/srs/queue`.
- Walidacja: w tym komponencie brak; delegowana do modali.
- Typy: `FlashcardDTO`, `SrsQueueResponse`, `FlashcardsPageState` (VM).
- Propsy: brak (to widok routowany).

### StudyNowCTA
- Opis: CTA „Rozpocznij naukę teraz”; aktywny, jeśli `/api/srs/queue` zwraca jakiekolwiek `due` lub `new` > 0.
- Elementy: `Button` (shadcn/ui), `Tooltip` (dlaczego disabled).
- Zdarzenia: click → nawigacja do `/study`.
- Walidacja: brak; logika enable/disable na podstawie `SrsQueueResponse.meta` i długości list.
- Typy: `SrsQueueResponse`.
- Propsy: `{ queue?: SrsQueueResponse, isLoading: boolean }`.

### ManualAddButton / ManualAddModal
- Opis: Dodanie nowej fiszki (manual). Modal z polami `front`/`back`, licznikami znaków, walidacją i obsługą błędów.
- Elementy: `Dialog`, `Form`, `Textarea` ×2, liczniki, `Button` Save/Cancel.
- Zdarzenia: open/close, input, submit (POST `/api/flashcards`).
- Walidacja (FE + BE):
  - `front` ≤ 200, `back` ≤ 500
  - oba wymagane, `front` != `back` po kanonikalizacji (serwerowa; FE: ostrzeżenie, BE: 422)
- Typy: `FlashcardCreateManualCommand`, `FlashcardDTO`, `ValidationError` (lokalny typ).
- Propsy (`ManualAddModalProps`): `{ open: boolean, onOpenChange(open: boolean): void, onSuccess(created: FlashcardDTO): void }`.

### EditFlashcardModal
- Opis: Edycja treści istniejącej fiszki (tylko `front`/`back`).
- Elementy: `Dialog`, `Form`, `Textarea`, liczniki, `Button` Save/Cancel.
- Zdarzenia: open/close, input, submit (PATCH `/api/flashcards/{id}`).
- Walidacja: identyczna jak w dodawaniu; co najmniej jedno z pól zmienione (FE refine), BE: 422.
- Typy: `FlashcardUpdateContentCommand`, `FlashcardDTO`.
- Propsy (`EditFlashcardModalProps`): `{ card: FlashcardDTO | null, open: boolean, onOpenChange(open:boolean): void, onSuccess(updated: FlashcardDTO): void }`.

### FlashcardsToolbar
- Opis: Pasek narzędzi nad listą: licznik zakresu X–Y z Z, (opcjonalnie) przełącznik widoku, info o sortowaniu.
- Elementy: `Text`, `Badge`, (opcjonalnie) `Select` sort – w MVP sort stały.
- Zdarzenia: brak (MVP).
- Walidacja: n/d.
- Typy: `{ totalCount: number, page: number, pageSize: number }`.
- Propsy: jw.

### FlashcardTable / FlashcardList
- Opis: Lista fiszek. Tabela na desktopie, lista kart na mniejszych szerokościach.
- Elementy: `Table`/`List`, kolumny: Front (truncate), Source (`SourceChip`), Created At, Actions.
- Zdarzenia: kliknięcia akcji z wierszy.
- Walidacja: n/d.
- Typy: `FlashcardListItemVM[]`.
- Propsy: `{ items: FlashcardListItemVM[], onEdit(card: FlashcardDTO): void, onDelete(card: FlashcardDTO): void }`.

### FlashcardRowItem + RowActions
- Opis: Wiersz/karta w liście z akcjami.
- Elementy: `SourceChip`, `Button` Edit, `Button` Delete, loader stanu akcji.
- Zdarzenia: Edit → otwiera `EditFlashcardModal`; Delete → enqueue undo i (po 5 s) DELETE.
- Walidacja: n/d.
- Typy: `FlashcardListItemVM`.
- Propsy: `{ item: FlashcardListItemVM, onEdit(card), onDelete(card) }`.

### SourceChip
- Opis: Wizualne oznaczenie źródła fiszki: `ai` | `ai_edited` | `manual`.
- Elementy: `Badge` (shadcn/ui), kolor wg źródła.
- Zdarzenia: brak.
- Walidacja: n/d.
- Typy: `FlashcardSource`.
- Propsy: `{ source: FlashcardSource }`.

### Pagination
- Opis: Nawigacja stronami (25/str.).
- Elementy: `Pagination` (shadcn/ui) lub własna: Prev/Next + numery (pełna dla ≤7 stron).
- Zdarzenia: zmiana strony → aktualizacja query param `page` i refetch.
- Walidacja: strona w zakresie 1..`totalPages`.
- Typy: `{ page, totalPages }`.
- Propsy: `{ page: number, totalPages: number, onPageChange(next: number): void }`.

### DeleteUndoSnackbar
- Opis: Snackbar z przyciskiem Undo (5 s). Po upływie czasu wykonywany jest `DELETE` (soft delete). Optymistycznie usuwa z listy natychmiast.
- Elementy: `Toast`/`Snackbar` z licznikiem czasu, przycisk Undo.
- Zdarzenia: Undo → anuluje pending delete i przywraca do listy; Timeout → wywołuje API DELETE.
- Walidacja: n/d.
- Typy: `UndoEntryVM`.
- Propsy: `{ entry: UndoEntryVM | null, onUndo(): void }`.

## 5. Typy
Nowe typy ViewModel i pomocnicze (rozszerzają istniejące z `src/types.ts`).

```ts
// VM elementu listy
export interface FlashcardListItemVM extends FlashcardDTO {
  isPendingDelete: boolean;      // w trakcie okna Undo
  isMutating: boolean;           // zapis/edycja/usuwanie
  error?: string | null;         // błąd akcji na elemencie
}

// Stan strony
export interface FlashcardsPageState {
  page: number;                  // >=1
  pageSize: number;              // 25
  totalCount: number;            // z nagłówków
  order: 'created_at.desc' | 'created_at.asc';
  items: FlashcardListItemVM[];
  isLoadingList: boolean;
  listError?: string | null;
  isSubmitting: boolean;         // globalne blokady przy mutacjach hurtem (brak w MVP)
}

// Formularze
export interface ManualAddFormVM {
  front: string;
  back: string;
  frontCount: number;            // grapheme-safe
  backCount: number;
  errors: Partial<Record<'front' | 'back', string>>;
  isSubmitting: boolean;
}

export interface EditFormVM extends ManualAddFormVM {
  id: UUID;
}

// Undo mechanizm
export interface UndoEntryVM {
  id: UUID;                      // id fiszki
  expiresAt: number;             // ms epoch
}
```

Wykorzystanie istniejących typów:
- `FlashcardDTO`, `FlashcardCreateManualCommand`, `FlashcardUpdateContentCommand`, `FlashcardSource`
- `SrsQueueResponse`

## 6. Zarządzanie stanem
- Hooki niestandardowe:
  - `useFlashcardsList()`
    - Odpowiedzialność: pobieranie listy (GET), totalCount z nagłówków, paginacja, mutacje (POST/PATCH/DELETE) z optymistyką, refetch po sukcesie.
    - API: `{ state, fetchPage(page), add(cmd), edit(id, cmd), removeWithUndo(item), undoLast(), refresh(), setPageFromUrl() }`
  - `useUndoManager({ delayMs=5000 })`
    - Trzyma `UndoEntryVM | null`, uruchamia timer; zapewnia `enqueue(id)`, `undo()` i callback `onTimeout(id)`.
  - `useCharacterCounter()`
    - Grapheme-safe liczenie znaków (Unicode) dla `front`/`back` + ograniczenia 200/500.
  - `useStudyCtaState()`
    - Pobiera `/api/srs/queue`, expose `{ queue, isLoading, refresh }`.
- Stan na stronę: `FlashcardsPageState` w `FlashcardsPage` + lokalne stany modali/formularzy. Query param `page` synchronizowany z `useSearchParams`/routerem.

## 7. Integracja API
- GET `/api/flashcards?limit=25&offset=:offset&order=created_at.desc`
  - Odpowiedź: `FlashcardDTO[]` + nagłówki: `X-Total-Count` (preferowane) lub `Content-Range` (fallback)
  - FE: wylicz `totalPages = ceil(totalCount/25)`; jeśli `page > totalPages` i `totalPages>0` → przejdź do `totalPages`.
- POST `/api/flashcards`
  - Body: `FlashcardCreateManualCommand` `{ front, back }`
  - 201: `FlashcardDTO`; 422: walidacja; 409: duplikat.
- PATCH `/api/flashcards/{id}`
  - Body: `FlashcardUpdateContentCommand` `{ front?, back? }`
  - 200: `FlashcardDTO`; 422/404/409.
- DELETE `/api/flashcards/{id}`
  - 204: bez treści; 404.
- GET `/api/srs/queue`
  - 200: `SrsQueueResponse` (używane tylko do stanu CTA); refresh po mutacjach.

Nagłówki i błędy mapować do czytelnych komunikatów UI (toasty/inline).

## 8. Interakcje użytkownika
- Otwórz `/flashcards` → lista ładuje się; jeśli pusta → „Brak fiszek” + zachęta do dodania lub generacji.
- Paginacja: klik „Następna/Poprzednia” lub numer strony → aktualizacja `?page=` → refetch.
- Dodaj ręcznie: klik „Dodaj fiszkę” → wypełnij → walidacja live (liczniki) → Zapis → zamknięcie modala, toast sukcesu, wstawka do listy (na początku) i refresh CTA.
- Edytuj: klik „Edit” przy wierszu → modal → walidacje → Zapis → aktualizacja wiersza; porządek listy bez zmian (US-020).
- Usuń: klik „Delete” → natychmiast znika z listy (optymistycznie), pokazuje `DeleteUndoSnackbar` (5 s). Undo → przywraca. Brak Undo → po 5 s wywołanie DELETE; po sukcesie refresh CTA.
- CTA „Rozpocznij naukę teraz”: aktywne gdy `queue.due.length + queue.new.length > 0`; klik → `/study`.

## 9. Warunki i walidacja
- Pola formularzy (FE):
  - `front` wymagane, długość ≤ 200 (grapheme-safe)
  - `back` wymagane, długość ≤ 500
  - Ostrzeżenie, jeśli po uproszczeniu (`trim`, kompresja spacji, lower) `front === back` (ostateczna walidacja po stronie BE → 422)
- Paginacja: `page ≥ 1`; jeśli `page > totalPages` → korekta do `totalPages`.
- Edycja: co najmniej jedno z `front|back` zmienione względem oryginału.
- CTA: disabled jeśli brak kart do nauki; tooltip z powodem.

## 10. Obsługa błędów
- 401 Unauthorized: globalny `AuthGuard` → redirect do loginu, zachowanie intencji (powrót do `/flashcards`).
- 422 Validation Failed: pokaż inline przy polach + opis; blokuj przycisk „Zapisz”.
- 409 Conflict (duplikat): toast ostrzegawczy + wskazanie kolizji; w edycji: nie zmieniaj listy.
- 404 Not Found (edycja/usunięcie soft-deleted): toast z informacją, refetch listy.
- Sieć/offline: `NetworkBanner`; przy mutacjach pokaż błąd i przywróć stan optymistyczny.
- DELETE failure po oknie Undo: pokaż toast błędu i przywróć element do listy (refetch lub lokalnie).

## 11. Kroki implementacji
1. Routing i osłona dostępu
   - Dodaj stronę `src/pages/flashcards/index.astro` (Astro) i zamontuj komponent React `FlashcardsPage`.
   - Upewnij się, że `AuthGuard`/middleware wymusza zalogowanie (401 → redirect).
2. Infrastruktura API FE
   - Dodaj klienta HTTP/reuse `src/lib/http.ts` do wywołań `/api/flashcards` i `/api/srs/queue` z obsługą nagłówków.
   - Przygotuj mapowanie błędów (422/409/404/401) na struktury UI.
3. Hooki i typy
   - Zaimplementuj `useFlashcardsList`, `useUndoManager`, `useCharacterCounter`, `useStudyCtaState` w `src/lib` (np. `src/lib/hooks/flashcards.ts`).
   - Dodaj VM typy do `src/types.ts` lub lokalnie w module komponentów (preferencja: lokalnie w `src/components/flashcards/types.ts`).
4. Komponenty UI
   - `StudyNowCTA`, `ManualAddModal`, `EditFlashcardModal`, `FlashcardsToolbar`, `SourceChip`, `FlashcardTable`/`FlashcardList`, `Pagination`, `DeleteUndoSnackbar`.
   - Wykorzystaj shadcn/ui (`Button`, `Dialog`, `Table`, `Badge`, `Toast`, `Tooltip`).
5. Widok `FlashcardsPage`
   - Sklej hooki i komponenty; synchronizuj `?page=` z routerem.
   - Na mount: fetch listy i `useStudyCtaState.refresh()`.
6. Walidacje i liczniki
   - Zaimplementuj liczenie graphemów i limity 200/500 (reaktywne komunikaty).
7. Mutacje i optymistyczne UI
   - Manual add: po sukcesie insert do początku listy; jeśli lista pełna → ewentualnie usuń ostatni element lub zrób refetch.
   - Edit: aktualizuj wiersz lokalnie + refetch w tle.
   - Delete: optymistyczne usunięcie; po 5 s wyślij DELETE; obsłuż błędy i Undo.
   - Po każdej mutacji: `useStudyCtaState.refresh()`.
8. Paginacja i liczby
   - Odczyt `X-Total-Count`/`Content-Range`; wylicz strony; zabezpiecz wyjście poza zakres.
9. A11y i klawiszologia
   - Focus trap w modalach; `Esc` zamyka; `Enter` submit; przyciski z `aria-label`; skróty: `a` otwiera „Dodaj fiszkę”.
10. Testy i wykończenie
   - Testy integracyjne (cypress/playwright) scenariuszy: paginacja, add, edit, delete+undo, błędy 422/409.
   - Dymki/tooltipy i toasty dla wszystkich ścieżek; przegląd błędów lintera; dostępność.

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

 