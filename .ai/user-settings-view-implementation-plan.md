## API Endpoint Implementation Plan: User Settings (`/api/user-settings`)

### 1. Przegląd punktu końcowego
- **Cel**: Odczyt i aktualizacja ustawień użytkownika powiązanych z kontem (cele dzienne i limit nowych fiszek).
- **Zasób DB**: `user_settings` (RLS: dostęp tylko do własnego wiersza, trigger `set_updated_at`).
- **Stack**: Astro 5 (API Routes), TypeScript 5, Supabase (PostgREST przez `@supabase/supabase-js`), Zod do walidacji, middleware przekazujące `supabase` w `context.locals`.

### 2. Szczegóły żądania
- **Metody HTTP**:
  - GET `/api/user-settings` — zwraca bieżące ustawienia zalogowanego użytkownika.
  - PATCH `/api/user-settings` — aktualizuje ustawienia zalogowanego użytkownika.
- **URL**: `/api/user-settings`
- **Parametry**:
  - **Wymagane**: brak w ścieżce i query; wymagana autentykacja użytkownika.
  - **Opcjonalne** (tylko dla PATCH, w body): `daily_goal`, `new_limit`.
- **Request Body (PATCH)**:
```json
{"daily_goal": 30, "new_limit": 10}
```
- **Walidacja wejścia** (PATCH):
  - `daily_goal`: liczba całkowita w zakresie 1–200.
  - `new_limit`: liczba całkowita w zakresie 0–50.
  - Dozwolone przesłanie tylko podzbioru pól (min. jedno pole wymagane w body).

### 3. Wykorzystywane typy (DTO/Command)
- Istniejące w `src/types.ts`:
  - `UserSettingsDTO = Tables<"user_settings">`
  - `UserSettingsUpdateCommand = Partial<Pick<Tables<"user_settings">, "daily_goal" | "new_limit">>`
- Dodatkowe typy do użytku lokalnego (opcjonalnie w serwisie):
  - `AuthenticatedUser = { id: string }`

### 4. Szczegóły odpowiedzi
- **GET 200**:
```json
{"user_id":"uuid","daily_goal":20,"new_limit":10,"created_at":"...","updated_at":"..."}
```
- **PATCH 200**: identyczna struktura jak GET (zaktualizowane wartości).
- **Kody statusu**:
  - 200 — sukces (GET/PATCH)
  - 400 — nieprawidłowe dane wejściowe (np. błędy walidacji Zod lub brak pól w PATCH)
  - 401 — brak autentykacji / nieprawidłowy token
  - 404 — zasób nie znaleziony (nieoczekiwane; jeśli brak wiersza — patrz uwagi w przepływie)
  - 500 — błąd serwera (nieoczekiwany)

### 5. Przepływ danych
1. Klient wywołuje endpoint z nagłówkiem `Authorization: Bearer <access_token>` lub z odpowiednimi cookie Supabase (jeśli używane).
2. Middleware `src/middleware/index.ts` umieszcza `supabase` w `context.locals`.
3. Handler API (Astro):
   - Pozyskuje tożsamość użytkownika: `const { data: { user }, error } = supabase.auth.getUser(token)`.
   - Tworzy klienta request-scoped z nagłówkiem `Authorization: Bearer <token>` do zapytań PostgREST, aby działały polityki RLS. (Opcje poniżej.)
   - Dla GET: wykonuje `select` z `user_settings` filtrowany po `user_id = user.id` i zwraca rekord.
     - Jeśli brak wiersza: opcje
       - a) Jednorazowe `insert default values ... on conflict do nothing` + ponowny `select`, albo
       - b) Zwrócenie błędu 404 (mniej preferowane, jeśli system zakłada istnienie rekordu). Preferowane (a).
   - Dla PATCH: waliduje body Zod, wykonuje `update` na wierszu `user_id = user.id`, następnie `select` i zwraca wynik.
4. Supabase wymusza RLS (self-only). Trigger `set_updated_at` aktualizuje `updated_at` podczas `update`.

### 6. Względy bezpieczeństwa
- **Autentykacja**: Wymagana. Sprawdzamy access token; odrzucamy żądania bez ważnego tokena (401).
- **Autoryzacja (RLS)**: Polityki RLS muszą ograniczać `select`/`update` do wiersza z `user_id = auth.uid()`.
- **Walidacja**: Zod po stronie API; dodatkowo ograniczenia DB poprzez `CHECK` na kolumnach.
- **Brak nadpisania innego użytkownika**: Filtr `eq("user_id", user.id)` w każdym zapytaniu.
- **Rate limiting**: Opcjonalnie dodać prosty limiter (np. Cloudflare Pages Functions/Edge lub middleware) dla PATCH.
- **Powierzchnia ataku**: Brak wrażliwych danych w body/odpowiedzi poza `user_id`; nie logować tokenów ani pełnych payloadów w produkcji.

### 7. Obsługa błędów
- **401**: Brak tokena / token nieprawidłowy / `auth.getUser` zwróci błąd lub `user` puste.
- **400**: Body PATCH nie przechodzi walidacji Zod, brak żadnego z pól (`daily_goal`/`new_limit`).
- **404**: (Rzadkie) Brak rekordu w `user_settings` po próbie auto-utworzenia — zwrócić 404.
- **500**: Niespodziewane błędy (sieć, Supabase, serializacja). Logować i zwracać komunikat ogólny.
- **Logowanie błędów**: Jeśli istnieje tabela audytu/zdarzeń, można zapisać wpis o nieudanej operacji (bez wrażliwych danych). W przeciwnym razie log do `console.error` + integracja APM (np. Sentry) w przyszłości.

### 8. Rozważania dotyczące wydajności
- Zapytania proste po kluczu (`user_id`), indeksowane przez PK → O(1).
- Unikać podwójnych round-tripów w PATCH (użyć `select().single()` z `update()` poprzez `returning`); jeśli SDK/REST nie zwraca pełnego widoku, wykonać jedno `select` po udanym `update`.
- Mały payload — brak potrzeby stronicowania/cachowania. Dopuszczalne krótkie cache dla GET po stronie klienta.

### 9. Kroki implementacji
1. Dodaj serwis `src/lib/services/userSettings.service.ts` z funkcjami:
   - `getUserSettings(supabase: SupabaseClient<Database>, userId: string): Promise<UserSettingsDTO>`
   - `ensureUserSettingsExists(supabase: SupabaseClient<Database>, userId: string): Promise<UserSettingsDTO>` (insert default on conflict + select)
   - `updateUserSettings(supabase: SupabaseClient<Database>, userId: string, command: UserSettingsUpdateCommand): Promise<UserSettingsDTO>`
2. Utwórz endpoint `src/pages/api/user-settings.ts`:
   - `export const prerender = false`
   - `export async function GET(context) { ... }`
   - `export async function PATCH(context) { ... }`
   - Użyj `context.locals.supabase` (nie importować klienta bezpośrednio).
   - Ekstrakcja tokena: `Authorization` lub cookie Supabase; `supabase.auth.getUser(token)`.
   - Utwórz klienta request-scoped (autoryzowanego) na podstawie tokena:
     - **Opcja A (rekomendowana)**: Zmień middleware, aby budował request-scoped klienta z cookie/Authorization i umieszczał go w `context.locals.supabase` (z odpowiednimi nagłówkami). Wtedy endpoint nie musi nic klonować.
     - **Opcja B**: W endpointzie stwórz klienta z nagłówkiem `Authorization` na podstawie tokena i tylko tego klienta używaj do zapytań do tabel (patrz szkic niżej).
3. Dodaj walidację z Zod w endpointzie PATCH:
```ts
const PatchSchema = z.object({
  daily_goal: z.number().int().min(1).max(200).optional(),
  new_limit: z.number().int().min(0).max(50).optional(),
}).refine(v => v.daily_goal !== undefined || v.new_limit !== undefined, {
  message: "At least one of daily_goal or new_limit must be provided",
});
```
4. Zaimplementuj mapowanie błędów na kody statusu: 400 (walidacja), 401 (auth), 404 (brak rekordu), 500 (pozostałe). Zwracaj JSON z kluczem `error` i `message`.
5. Upewnij się, że w DB istnieją: tabela `user_settings`, RLS self-only oraz trigger `set_updated_at` (zgodnie z migracjami). Jeśli trzeba, dodaj odpowiednią migrację Supabase.
6. Testy manualne (cURL/HTTPie/Postman):
   - GET bez tokena → 401
   - GET z tokenem świeżego użytkownika → 200 (auto-utworzony rekord lub 404 zgodnie z decyzją w punkcie 5)
   - PATCH niepoprawny payload → 400
   - PATCH poprawny payload → 200 i odzwierciedlone zmiany
7. (Opcjonalnie) Dodać prosty rate limiting w middleware dla ścieżki `/api/user-settings`.

### 10. Szkice implementacyjne (referencyjne)
- Plik: `src/lib/services/userSettings.service.ts`
```ts
import type { Database } from "../../db/database.types";
import type { UserSettingsDTO, UserSettingsUpdateCommand } from "../../types";
import { supabaseClient } from "../../db/supabase.client";
type SupabaseClient = typeof supabaseClient;

export async function ensureUserSettingsExists(supabase: SupabaseClient, userId: string): Promise<UserSettingsDTO> {
  await supabase
    .from("user_settings")
    .insert({ user_id: userId } as any)
    .onConflict("user_id")
    .ignore();

  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw error ?? new Error("user_settings row not found");
  return data as UserSettingsDTO;
}

export async function getUserSettings(supabase: SupabaseClient, userId: string): Promise<UserSettingsDTO> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .single();
  if (error || !data) throw error ?? new Error("user_settings row not found");
  return data as UserSettingsDTO;
}

export async function updateUserSettings(
  supabase: SupabaseClient,
  userId: string,
  command: UserSettingsUpdateCommand,
): Promise<UserSettingsDTO> {
  const { error: updateError } = await supabase
    .from("user_settings")
    .update(command)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  return getUserSettings(supabase, userId);
}
```

- Plik: `src/pages/api/user-settings.ts`
```ts
import type { APIContext } from "astro";
import { z } from "zod";
import { ensureUserSettingsExists, getUserSettings, updateUserSettings } from "../../lib/services/userSettings.service";
import { createClient } from "@supabase/supabase-js";
import { supabaseClient } from "../../db/supabase.client";
type SupabaseClient = typeof supabaseClient;

export const prerender = false;

function getAccessToken(context: APIContext): string | null {
  const auth = context.request.headers.get("authorization") || context.request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  const cookie = context.request.headers.get("cookie") || "";
  const match = cookie.match(/sb-access-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function withAuth(token: string): SupabaseClient {
  // Tworzymy klienta per-request z nagłówkiem Authorization, bez utrwalania sesji
  const url = import.meta.env.SUPABASE_URL as string;
  const key = import.meta.env.SUPABASE_KEY as string;
  return createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } } }) as SupabaseClient;
}

const PatchSchema = z.object({
  daily_goal: z.number().int().min(1).max(200).optional(),
  new_limit: z.number().int().min(0).max(50).optional(),
}).refine(v => v.daily_goal !== undefined || v.new_limit !== undefined, {
  message: "At least one of daily_goal or new_limit must be provided",
});

export async function GET(context: APIContext) {
  const supabase = context.locals.supabase as SupabaseClient;
  const token = getAccessToken(context);
  if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  try {
    const db = withAuth(token);
    const settings = await ensureUserSettingsExists(db, user.id);
    return new Response(JSON.stringify(settings), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }
}

export async function PATCH(context: APIContext) {
  const supabase = context.locals.supabase as SupabaseClient;
  const token = getAccessToken(context);
  if (!token) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });

  let payload: unknown;
  try {
    payload = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ error: "bad_request", message: "Invalid JSON" }), { status: 400 });
  }
  const parsed = PatchSchema.safeParse(payload);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: "bad_request", message: parsed.error.flatten() }), { status: 400 });
  }

  try {
    const db = withAuth(token);
    const settings = await updateUserSettings(db, user.id, parsed.data);
    return new Response(JSON.stringify(settings), { status: 200, headers: { "content-type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: "server_error" }), { status: 500 });
  }
}
```


