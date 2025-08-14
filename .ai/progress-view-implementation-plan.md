## API Endpoint Implementation Plan: User Daily Progress

### 1. Przegląd punktu końcowego
- **Cel**: Udostępnić dzienny postęp użytkownika (UTC) dla pojedynczej daty lub zakresu dat oraz umożliwić aktualizację pola `goal_override` dla konkretnego dnia.
- **Endpoints**:
  - GET `/api/progress` – odczyt listy rekordów postępu.
  - PATCH `/api/progress/{date}` – ustawienie/aktualizacja `goal_override` z upsertem po `(user_id, date_utc)`.
- **DB**: Tabela `user_daily_progress` (PK: `(user_id, date_utc)`), z RLS self-only oraz triggerem aktualizującym `updated_at`.
- **Stack**: Astro 5 (API routes), TypeScript 5, Supabase (PostgREST), Zod (walidacja), RLS.

### 2. Szczegóły żądania
- **Metody i URL**
  - GET `/api/progress?date=YYYY-MM-DD` lub `/api/progress?start=YYYY-MM-DD&end=YYYY-MM-DD`
  - PATCH `/api/progress/{date}` (np. `/api/progress/2025-08-13`)
- **Parametry**
  - GET (wzajemnie wykluczające warianty):
    - Wariant A (pojedyncza data): `date` (wymagane)
    - Wariant B (zakres dat): `start` i `end` (wymagane oba)
  - PATCH: `date` (parametr ścieżki, wymagany)
- **Body**
  - GET: brak
  - PATCH: `{ "goal_override": number (int, >= 0) | null }`
- **Nagłówki**: `Content-Type: application/json` dla PATCH; autoryzacja przez sesję Supabase (middleware dostarcza `locals.user`).

### 3. Wykorzystywane typy
- **DTO i Command** (lokalizacja: `src/types.ts`):

```ts
export type DailyProgressItemDTO = {
  user_id: string;
  date_utc: string; // YYYY-MM-DD (UTC)
  reviews_done: number;
  new_introduced: number;
  goal_override: number | null;
  created_at: string; // ISO
  updated_at: string; // ISO
};

export type GetProgressResponseDTO = {
  items: DailyProgressItemDTO[];
};

export type UpdateGoalOverrideCommand = {
  goal_override: number | null;
};

export type ErrorResponseDTO = {
  error: string;
  details?: unknown;
};
```

- **Schematy walidacji** (Zod; lokalizacja: `src/lib/validation/progress.schemas.ts`):

```ts
import { z } from 'zod';

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => !Number.isNaN(Date.parse(s + 'T00:00:00.000Z')), 'invalid_date');

export const getQuerySchema = z
  .union([
    z.object({ date: dateSchema }),
    z
      .object({ start: dateSchema, end: dateSchema })
      .refine((v) => v.start <= v.end, { message: 'start_gt_end' })
  ])
  .refine((v) => {
    if ('date' in v) return true;
    const start = new Date(v.start + 'T00:00:00.000Z');
    const end = new Date(v.end + 'T00:00:00.000Z');
    const days = Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1;
    return days <= 366;
  }, { message: 'range_too_large' });

export const patchBodySchema = z.object({
  goal_override: z.number().int().min(0).nullable(),
});
```

### 4. Szczegóły odpowiedzi
- **GET 200**: `GetProgressResponseDTO`

```json
{
  "items": [
    {
      "user_id": "uuid",
      "date_utc": "2025-08-13",
      "reviews_done": 12,
      "new_introduced": 5,
      "goal_override": null,
      "created_at": "2025-08-13T00:00:00.000Z",
      "updated_at": "2025-08-13T12:34:56.789Z"
    }
  ]
}
```

- **PATCH 200**: zwraca upsertowany/zmodyfikowany rekord `DailyProgressItemDTO`.

- **Kody statusu**:
  - 200: sukces (GET, PATCH)
  - 400: nieprawidłowe daty/parametry zapytania
  - 401: nieautoryzowany dostęp
  - 422: walidacja body PATCH nieudana
  - 500: błąd serwera

### 5. Przepływ danych
- **GET `/api/progress`**
  1. Middleware zapewnia `locals.supabase` i `locals.user` (sesja wymagana).
  2. Walidacja query (Zod): dopuszczalny tylko jeden wariant (pojedyncza data lub zakres), `start <= end`, limit 366 dni.
  3. Budowa zapytania do `user_daily_progress` filtrowanego po `user_id` z sesji:
     - Wariant A: `eq('date_utc', date)`
     - Wariant B: `gte('date_utc', start).lte('date_utc', end)`
     - Zawsze: `eq('user_id', userId).order('date_utc', { ascending: true })`
  4. Zwracany jest `items: DailyProgressItemDTO[]`.

- **PATCH `/api/progress/{date}`**
  1. Middleware dostarcza `locals.supabase` i `locals.user`.
  2. Walidacja parametru `date` oraz body `{ goal_override }` (Zod).
  3. Upsert po `(user_id, date_utc)` z `onConflict: 'user_id,date_utc'`, `select().single()` aby zwrócić rekord.
  4. Zwrócenie zaktualizowanego rekordu z 200.

### 6. Względy bezpieczeństwa
- **Autoryzacja i RLS**: brak przyjmowania `user_id` z klienta; używamy `locals.user`. RLS self-only na `user_daily_progress` (kwerendy i upserty tylko własnych rekordów).
- **Walidacja wejścia**: format dat `YYYY-MM-DD`, poprawność kalendarzowa, `start <= end`, limit zakresu, `goal_override` jako `int >= 0 | null`.
- **Ochrona przed nadużyciami**: limit zakresu (np. do 366 dni) ogranicza rozmiar odpowiedzi i koszty.
- **Prywatność**: brak danych innych użytkowników; rozważ `Cache-Control: private, max-age=0` dla odpowiedzi.

### 7. Obsługa błędów
- **Mapowanie błędów**:
  - 400: niepoprawne query (format daty/range, oba warianty naraz, brak wymaganych parametrów, zbyt duży zakres).
  - 401: brak sesji użytkownika.
  - 422: niepoprawne body PATCH (np. `goal_override` ujemny/nie-int/nie-null).
  - 500: błędy Supabase/nieoczekiwane wyjątki.
- **Forma odpowiedzi błędu** (`ErrorResponseDTO`): `{ "error": string, "details"?: unknown }`.
- **Logowanie błędów**: opcjonalny serwis `src/lib/services/error-logger.ts` zapisujący do tabeli `app_errors` (jeżeli istnieje), z łagodną degradacją do `console.error`.

### 8. Rozważania dotyczące wydajności
- PK `(user_id, date_utc)` pokrywa zapytania po równości i zakresie. Dodatkowe indeksy nie są wymagane.
- Limit zakresu chroni przed dużymi odpowiedziami i długimi skanami.
- Jedno zapytanie na żądanie; brak N+1.
- Ewentualna projekcja kolumn do minimalnie potrzebnych w przyszłości.

### 9. Kroki implementacji
1. **Typy i schematy**
   - Dodaj do `src/types.ts`: `DailyProgressItemDTO`, `GetProgressResponseDTO`, `UpdateGoalOverrideCommand`, `ErrorResponseDTO`.
   - Utwórz `src/lib/validation/progress.schemas.ts` z `dateSchema`, `getQuerySchema`, `patchBodySchema` (Zod).
2. **Serwis domenowy** (`src/lib/services/progress.service.ts`)
   - `fetchDailyProgress(supabase, userId, params)`
     - Buduje zapytanie `.from('user_daily_progress')` z `eq('user_id', userId)` i filtrem po dacie/zakresie; `order('date_utc', { ascending: true })`.
   - `upsertGoalOverride(supabase, userId, date, goalOverride)`
     - `.upsert({ user_id: userId, date_utc: date, goal_override: goalOverride }, { onConflict: 'user_id,date_utc' }).select().single()`.
   - Używaj typu klienta z `src/db/supabase.client.ts` (nie z `@supabase/supabase-js`).
3. **Logger (opcjonalnie)** (`src/lib/services/error-logger.ts`)
   - `logError({ endpoint, userId, message, details, stack })` → insert do `app_errors` (jeśli istnieje) lub `console.error`.
4. **Endpointy Astro**
   - `src/pages/api/progress/index.ts`
     - `export const prerender = false`
     - `export async function GET({ locals, url }: APIContext)`
     - Kroki: auth guard (401), walidacja query (400), wywołanie serwisu, zwrot `{ items }` (200). W `catch` → 500 i logowanie.
   - `src/pages/api/progress/[date].ts`
     - `export const prerender = false`
     - `export async function PATCH({ locals, params, request }: APIContext)`
     - Kroki: auth guard (401), walidacja `params.date` i body (422), `upsertGoalOverride`, zwrot rekordu (200). W `catch` → 500 i logowanie.
5. **Middleware**
   - Upewnij się, że `src/middleware/index.ts` wstrzykuje `locals.supabase` i `locals.user` zgodnie z polityką projektu. W endpointach nie importuj klienta bezpośrednio; używaj `locals`.
6. **Testy**
   - Jednostkowe: walidacja dat, zakresów, skrajne przypadki (limit 366), walidacja body PATCH.
   - Integracyjne: GET (pojedyncza data/zakres), PATCH (`goal_override` liczba i `null`), scenariusze 401/400/422/500.
7. **Dokumentacja i przykłady** (np. `README.md`)

```bash
# GET single date
curl -H "Authorization: Bearer <token>" \
  "/api/progress?date=2025-08-13"

# GET range
curl -H "Authorization: Bearer <token>" \
  "/api/progress?start=2025-08-01&end=2025-08-13"

# PATCH goal_override
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"goal_override":30}' \
  "/api/progress/2025-08-13"
```
8. **Weryfikacja bezpieczeństwa**
   - Potwierdź RLS self-only na `user_daily_progress` w Supabase.
   - Zweryfikuj, że `user_id` jest zawsze pobierany z sesji (`locals.user`).
9. **Wdrożenie i smoke testy**
   - Deploy, następnie szybkie testy: GET dla zakresu i PATCH z `null` i liczbą; weryfikacja aktualizacji `updated_at` przez trigger.


