## API Endpoint Implementation Plan: /api/me (GET, PATCH)

### 1. Przegląd punktu końcowego
- **Cel**: Udostępnienie profilu aktualnie zalogowanego użytkownika oraz możliwość aktualizacji wyłącznie pól dopuszczonych do edycji przez użytkownika (MVP: brak pól edytowalnych).
- **Zasób**: `profiles` (PostgreSQL/Supabase) z aktywnym RLS: `USING (user_id = auth.uid())`.
- **Zgodność z projektem**: Astro API routes, Supabase (RLS), Zod do walidacji, logika w `src/lib/services`.

### 2. Szczegóły żądania
- **Metody HTTP**: 
  - GET `/api/me`
  - PATCH `/api/me`
- **Parametry**:
  - **Wymagane**: brak parametrów ścieżki i query (tożsamość użytkownika wynika z sesji/JWT).
  - **Opcjonalne**: brak.
- **Nagłówki**:
  - `Authorization: Bearer <jwt>` lub cookies Supabase (SSR) – wymagane do identyfikacji użytkownika.
  - `Content-Type: application/json` dla `PATCH`.
- **Body**:
  - GET: brak.
  - PATCH: `{}` (MVP nie dopuszcza pól edytowalnych). W przyszłości: tylko pola przyszłościowo bezpieczne; nigdy `is_admin`.

### 3. Wykorzystywane typy
- **DTO**:
  - `ProfileDTO` (z `src/types.ts`): `{ user_id: UUID; is_admin: boolean; created_at: ISODateTimeString }`.
- **Command modele**:
  - `ProfileUpdateCommand` (z `src/types.ts`): `Record<string, never>` (MVP: puste body).
- **Walidacja Zod**:
  - `ProfileUpdateCommandSchema = z.object({}).strict()` – odrzuca wszelkie nieznane pola (gwarantuje 400 dla nadmiarowych danych).

### 4. Szczegóły odpowiedzi
- **200 OK (GET)**: `{ "user_id": "uuid", "is_admin": false, "created_at": "2025-08-13T10:00:00Z" }`
- **200 OK (PATCH)**: Zwraca zaktualizowany `ProfileDTO` (w MVP identyczny jak przed zmianą, bo brak edytowalnych pól).
- **Kody błędów**:
  - 400 `validation_failed` – nieprawidłowe body (np. pola nieznane).
  - 401 `unauthorized` – brak sesji/JWT lub nieważny token.
  - 403 `forbidden` – próba zmiany `is_admin` lub innych niedozwolonych pól.
  - 404 `not_found` – profil nie istnieje (opcjonalnie; jeżeli nie zakładamy automatycznego bootstrapu rekordu).
  - 500 `server_error` – nieoczekiwany błąd serwera/SDK.

### 5. Przepływ danych
- Klient → GET `/api/me` → Middleware wstrzykuje per-request Supabase → Handler `GET` pobiera `auth.getUser()` → `select` z tabeli `profiles` (RLS) → serializacja do `ProfileDTO` → 200/404.
- Klient → PATCH `/api/me` → Walidacja Zod (puste body, `strict`) → kontrola braku `is_admin` → (MVP: brak update) → odczyt aktualnego profilu → 200.
- Autoryzacja/RLS: Identyfikacja użytkownika po sesji/JWT; RLS wymusza `user_id = auth.uid()`.

### 6. Względy bezpieczeństwa
- **Uwierzytelnianie**: Wymagane. Dla SSR użyć per-request klienta Supabase z nagłówkami/cookies, nie globalnego singletona bez kontekstu sesji.
- **Autoryzacja**: RLS w `profiles` ogranicza dostęp do własnego rekordu; warstwa API dodatkowo blokuje `is_admin`.
- **Walidacja**: Zod `.strict()` dla `PATCH` (odrzucenie nieznanych pól). `Content-Type` musi być `application/json`.
- **Minimalizacja danych**: Zwracać tylko `user_id`, `is_admin`, `created_at`.
- **Nagłówki**: Nie logować/echo tokenów. Skonfigurować CORS i `Cache-Control: no-store` dla odpowiedzi.

### 7. Obsługa błędów
- Mapowanie błędów SDK Supabase na kody HTTP:
  - Brak sesji/JWT → 401.
  - Naruszenie RLS/403 od bazy → 403.
  - Walidacja Zod → 400 (payload `{ code: 'validation_failed', issues: [...] }`).
  - Brak rekordu (opcjonalnie) → 404.
  - Inne błędy → 500 z generycznym komunikatem i szczegółami w logach serwera.
- **Rejestrowanie błędów**: W MVP log serwerowy. Jeżeli istnieje tabela audytowa/telemetrii (np. `audit_log`/`events`), rejestrować wyłącznie 5xx.

### 8. Wydajność
- Zapytania jednotabelowe, pojedynczy rekord – koszt minimalny.
- Używać `select('user_id, is_admin, created_at').single()` zamiast `*`.
- Brak cache po stronie serwera (dane użytkownika). Ewentualnie SWR po kliencie.

### 9. Kroki implementacji
1) **Middleware per-request Supabase** (`src/middleware/index.ts`)
   - Twórz klienta per żądanie z przekazaniem nagłówka `Authorization` lub użyj `@supabase/ssr` (`createServerClient`) wraz z `Astro.cookies`.
   - Ustaw w `context.locals.supabase` klient skojarzony z żądaniem.
2) **Serwis profilu** `src/lib/services/profile.service.ts`
   - `getCurrentProfile(supabase): Promise<ProfileDTO>` – `from('profiles').select('user_id, is_admin, created_at').single()` → mapuj do `ProfileDTO`.
   - `updateCurrentProfile(supabase, cmd: ProfileUpdateCommand): Promise<ProfileDTO>` – w MVP tylko walidacja i zwrot aktualnego profilu; w przyszłości ograniczona `update` (nigdy `is_admin`).
3) **Schematy** `src/lib/schemas/profile.ts`
   - `export const ProfileUpdateCommandSchema = z.object({}).strict()`.
4) **Endpoint** `src/pages/api/me.ts`
   - `export const prerender = false`.
   - `export const GET: APIRoute` – pobierz klienta z `locals`, sprawdź `auth.getUser()`, 401 jeśli brak; w przeciwnym razie odczyt profilu i 200.
   - `export const PATCH: APIRoute` – guard `Content-Type`, parse JSON, Zod `.strict()`; jeśli body zawiera `is_admin` → 403; w MVP zwróć aktualny `ProfileDTO` 200.
5) **Standaryzacja błędów**
   - `{ code: string; message?: string; details?: unknown }` dla odpowiedzi błędów.
   - Walidacja: `{ code: 'validation_failed', issues }` (400).
6) **Testy ręczne**
   - `GET /api/me` bez tokena → 401.
   - `GET /api/me` z tokenem bez rekordu → 404 (jeśli obsługujemy) lub 200 po bootstrapie.
   - `PATCH /api/me {}` → 200.
   - `PATCH /api/me { "is_admin": true }` → 403.
