# Plan implementacji widoku Admin

## 1. Przegląd
Widok Admin służy do wglądu w metryki KPI oraz logi audytowe systemu. Dostępny wyłącznie dla administratorów (`profiles.is_admin = true`). Ma umożliwić:
- szybkie przejrzenie łącznych metryk: generated_total, saved_manual_total, saved_ai_total, saved_ai_edited_total oraz pochodną „Akceptowalność AI”;
- przegląd logów audytowych z filtrami (action, user_id, card_id) i paginacją 25/stronę;
- czytelną obsługę błędów (401/403) i stanów ładowania;
- dostępność z klawiaturą i responsywny układ.

## 2. Routing widoku
- Ścieżka główna: `/admin`
- Opcjonalne sub-ścieżki (na przyszłość): `/admin/kpi`, `/admin/audit-logs` (w MVP pojedynczy widok z dwiema sekcjami)
- Implementacja w Astro: plik strony `src/pages/admin/index.astro` montujący komponent React `AdminPage`.

## 3. Struktura komponentów
```
AdminPage (layout sekcji + guard)
└─ AdminGuard (kontrola dostępu; 401/403)
   └─ AdminContent
      ├─ KpiTotalsCards
      ├─ Divider
      └─ AuditLogSection
         ├─ AuditLogFilters
         ├─ AuditLogTable
         └─ Pagination
```

## 4. Szczegóły komponentów
### AdminPage
- **Opis**: Kontener widoku. Odpowiada za układ, nagłówek, osadzenie `AdminGuard` i sekcji KPI/Logów.
- **Główne elementy**: nagłówek „Admin”, dwie karty sekcji (KPI i Audit Logs), wrapper siatki.
- **Interakcje**: brak bezpośrednich (delegowane do dzieci).
- **Walidacja**: n/d.
- **Typy**: używa `AdminKpiTotalsDTO`, `AdminAuditLogDTO` pośrednio przez dzieci.
- **Propsy**: brak (dane ładowane przez dzieci/hooki w ramach sekcji).

### AdminGuard
- **Opis**: Sprawdza czy użytkownik ma uprawnienia admina. W przypadku braku uprawnień pokazuje komunikat i ewentualny link powrotu.
- **Główne elementy**: kontener stanu (loading, error 401/403), slot na dzieci po pozytywnym sprawdzeniu.
- **Interakcje**: n/d.
- **Walidacja**: dostępu — jeśli `is_admin !== true` → pokaż 403.
- **Typy**: korzysta z `ProfileDTO` (z `/api/me`).
- **Propsy**: `{ children: ReactNode }`.

### KpiTotalsCards
- **Opis**: Zestaw 4 kafelków z wartościami KPI i opcjonalny wskaźnik „Akceptowalność AI”.
- **Główne elementy**: `Card` (shadcn/ui) x4 z nagłówkiem i wartością; badge/wskaźnik pochodny.
- **Interakcje**: odśwież przycisk (opcjonalnie) lub automatyczne odpytywanie on-mount.
- **Walidacja**: brak walidacji wejścia; ukrycie wskaźnika akceptowalności, gdy `generated_total === 0`.
- **Typy**: `AdminKpiTotalsDTO`, `KpiTotalsViewModel` (opis w sekcji Typy).
- **Propsy**: `{ data: KpiTotalsViewModel | null, loading: boolean, error?: UIError }` lub wariant z wewnętrznym fetchowaniem przez hook.

### AuditLogSection
- **Opis**: Sekcja łącząca filtry, tabelę i paginację.
- **Główne elementy**: wrapper, nagłówek, `AuditLogFilters`, `AuditLogTable`, `Pagination`.
- **Interakcje**: reaguje na zmianę filtrów i stronicowania; trzyma spójny stan zapytań i fetchuje dane.
- **Walidacja**: walidacja filtrów (UUID/enum action) po stronie UI (soft) i defensywnie przy budowaniu zapytania.
- **Typy**: `AuditLogFiltersVM`, `AuditLogRowVM`, `PaginationState`.
- **Propsy**: wariant sterowany (przekazywanie hooków) lub samodzielny (zalecany samodzielny, z wewnętrznymi hookami).

### AuditLogFilters
- **Opis**: Formularz filtrów: `action` (select), `user_id` (input), `card_id` (input). Zmiany debounced.
- **Główne elementy**: `Select`, `Input`, `Button` „Wyczyść”, ikonka reset.
- **Interakcje**: onChange (debounced 300–500 ms), onReset.
- **Walidacja**: 
  - `action` ∈ dozwolone akcje (lista znana w UI, np. delete, save_batch, review, itp. — można pobrać z logów lub utrzymać stałą listę);
  - `user_id`, `card_id` muszą być `UUID` (regex), inaczej disable apply lub pokaż komunikat i nie wysyłaj zapytania.
- **Typy**: `AuditLogFiltersVM`.
- **Propsy**: `{ value: AuditLogFiltersVM, onChange: (next: AuditLogFiltersVM) => void, loading: boolean }`.

### AuditLogTable
- **Opis**: Tabela wyników; kolumny: `created_at`, `action`, `acted_by`, `card_id`, `target_user_id`, `details` (skrót JSON).
- **Główne elementy**: `Table` (shadcn/ui) + `Code`/`Badge` dla ID i skrótu JSON; copy-to-clipboard na ID.
- **Interakcje**: klik w ID → kopiuje do schowka; sortowanie (opcjonalnie w MVP brak — sort serwerowy domyślnie `created_at DESC`).
- **Walidacja**: brak — wyświetlanie danych już zwróconych.
- **Typy**: `AdminAuditLogDTO`, `AuditLogRowVM`.
- **Propsy**: `{ rows: AuditLogRowVM[], loading: boolean, error?: UIError }`.

### Pagination
- **Opis**: Paginacja 25/stronę, przyciski „Poprzednia/Następna”, wskaźnik zakresu, opcjonalnie numery stron ≤7.
- **Główne elementy**: `Button`/`IconButton`, label z „X–Y z Z”.
- **Interakcje**: `onPrev`, `onNext`, `onPage(n)`.
- **Walidacja**: brak.
- **Typy**: `PaginationState`.
- **Propsy**: `{ state: PaginationState, onChange: (next: PaginationState) => void }`.

## 5. Typy
- **DTO z backendu** (z `src/types.ts`):
  - `AdminKpiTotalsDTO` — pola: `generated_total: number`, `saved_manual_total: number`, `saved_ai_total: number`, `saved_ai_edited_total: number`.
  - `AdminAuditLogDTO` — rekord logu audytu (pełny kształt wg DB; m.in. `id`, `acted_by`, `action`, `card_id`, `target_user_id`, `details`, `created_at`).

- **Nowe typy ViewModel (FE):**
  - `type UIError = { code: string; message: string }`
  - `interface KpiTotalsViewModel { generated_total: number; saved_manual_total: number; saved_ai_total: number; saved_ai_edited_total: number; acceptance_ratio?: number | null }`
    - `acceptance_ratio = (saved_ai_total + saved_ai_edited_total) / generated_total` gdy `generated_total > 0`, inaczej `null`.
  - `type AuditAction = string` (lub zawężona unia, jeśli lista znana: `'save_batch' | 'delete' | 'review' | ...'`).
  - `interface AuditLogFiltersVM { action?: AuditAction; user_id?: string; card_id?: string }`
  - `interface AuditLogRowVM { id: string; createdAtLabel: string; action: string; actedBy: string; cardId?: string | null; targetUserId?: string | null; detailsPreview: string }`
  - `interface PaginationState { limit: number; offset: number; total: number }
`

## 6. Zarządzanie stanem
- **Lokalny stan w `AdminContent`/`AuditLogSection`:**
  - `filters: AuditLogFiltersVM` (kontrolowane przez `AuditLogFilters` z debounce 300–500 ms)
  - `pagination: PaginationState` (limit=25 stałe; offset 0; total z nagłówka `X-Total-Count` lub fallback `items.length`)
  - `kpi: { data: KpiTotalsViewModel | null; loading: boolean; error?: UIError }`
  - `auditLogs: { rows: AuditLogRowVM[]; loading: boolean; error?: UIError }`
  - `isAdmin: boolean | null` (z `AdminGuard`)

- **Custom hooki:**
  - `useAdminGuard()` → pobiera `/api/me`, zwraca `{ isAdmin, loading, error }`; na `!isAdmin` → stan 403.
  - `useKpiTotals()` → GET `/api/admin/kpi-totals`, mapuje do `KpiTotalsViewModel`.
  - `useAuditLogs(filters, pagination)` → GET `/api/admin/audit-logs?limit&offset&action&user_id&card_id` z `AbortController`; ustawia `rows` i `total` z nagłówka.
  - `useDebouncedValue<T>(value, delay)` do sterowania filtrami.

## 7. Integracja API
- **KPI:** `GET /api/admin/kpi-totals`
  - Response 200: `AdminKpiTotalsDTO` → mapowanie do `KpiTotalsViewModel` + wyliczenie `acceptance_ratio`.
  - Errors: `401`, `403`, `500` → odpowiednie bannery/alerty.

- **Audit Logs:** `GET /api/admin/audit-logs?limit&offset&action&user_id&card_id`
  - Response 200: `{ items: AdminAuditLogDTO[] }`
  - Headers: `X-Total-Count` (jeśli dostępne) do ustawienia `pagination.total`.
  - Errors: `401`, `403`, `422` (złe parametry), `500`.

- **Guard:** `GET /api/me` dla `ProfileDTO` (sprawdzenie `is_admin`).

## 8. Interakcje użytkownika
- **Wejście na `/admin`** → `AdminGuard` sprawdza uprawnienia:
  - Gdy `loading` → skeleton/loader;
  - Gdy `403/401` → komunikat „Brak uprawnień”/„Zaloguj się”.
- **Przegląd KPI**: po załadowaniu wyświetla 4 metryki i (jeśli możliwe) „Akceptowalność AI”. Opcjonalny przycisk „Odśwież”.
- **Filtry Audit Logs**:
  - Zmiana `action`/`user_id`/`card_id` (debounced) → reset `offset` do 0 i refetch.
  - „Wyczyść” → czyści filtry, refetch.
- **Tabela**:
  - Klik na ID (copy) → toast „Skopiowano”.
  - Brak wyników → pusty stan z sugestią zmiany filtrów.
- **Paginacja**: przyciski poprzednia/następna zmieniają `offset` o `limit`; disabled na brzegach; zakres „X–Y z Z”.

## 9. Warunki i walidacja
- **Dostęp Admin**: `is_admin === true` wymagane — weryfikacja przed pobraniami.
- **Filtry**:
  - `action`: dozwolona wartość z listy; domyślnie brak (nie filtruj).
  - `user_id`, `card_id`: akceptuj tylko `UUID` (regex). Przy niepoprawnym formacie: pokaż błąd pod polem i nie wysyłaj parametru.
- **KPI**: nie pokazuj `acceptance_ratio` gdy `generated_total === 0`.
- **Paginacja**: `limit=25` stałe; `offset ≥ 0` i `offset < total`.

## 10. Obsługa błędów
- **401 unauthorized**: banner z CTA „Zaloguj”; nie renderuj treści admina.
- **403 forbidden**: komunikat „Brak uprawnień admina” + link powrotny.
- **422 validation_failed** (filtry): pokaż inline pod polem, nie wysyłaj błędnych parametrów.
- **429 too_many_requests**: toast „Zbyt wiele żądań, spróbuj ponownie później”.
- **500 internal_error / sieć**: karta z komunikatem i przyciskiem „Spróbuj ponownie”.
- **Brak danych**: pusty stan z podpowiedzią (zmień filtry/zakres).

## 11. Kroki implementacji
1. Routing i szablon strony:
   - Utwórz `src/pages/admin/index.astro` z montażem `AdminPage` (React) i `export const prerender = false;`.
2. Guard dostępu:
   - Zaimplementuj `AdminGuard` i hook `useAdminGuard()` pobierający `/api/me` i sprawdzający `is_admin`.
3. Sekcja KPI:
   - Hook `useKpiTotals()` → GET `/api/admin/kpi-totals` → mapuj do `KpiTotalsViewModel` (wylicz `acceptance_ratio`).
   - Komponent `KpiTotalsCards` z 4 kartami + wskaźnik akceptowalności (gdy `generated_total > 0`).
4. Sekcja Audit Logs:
   - Zaimplementuj `AuditLogFilters` z walidacją UUID i debounce.
   - Hook `useAuditLogs(filters, pagination)` z `AbortController`, pobierający `/api/admin/audit-logs` i ustawiający `pagination.total` z `X-Total-Count`.
   - Komponent `AuditLogTable` renderujący kolumny, skrót JSON w `details` (np. `JSON.stringify(details).slice(0, 120) + '…'`).
   - `Pagination` z przyciskami i etykietą zakresu.
5. A11y i UX:
   - Zapewnij focus management, role ARIA dla tabeli i komunikatów, klawiszologię TAB/Shift+TAB.
   - Dla kopiowania ID użyj `navigator.clipboard.writeText` + toast.
6. Obsługa błędów i stany ładowania:
   - Dodaj skeletony/karty „Ładowanie…”, bannery błędów i retry.
7. Stylowanie:
   - Użyj Tailwind 4 i komponentów shadcn/ui (`Card`, `Table`, `Select`, `Input`, `Button`, `Badge`, `Alert`).
8. Integracja z istniejącą warstwą HTTP:
   - Wykorzystaj `src/lib/http.ts` (jeżeli istnieje) do wołań API z obsługą nagłówków i błędów; dodaj parsowanie `X-Total-Count`.
9. Testy e2e/integracyjne (opcjonalnie w tym repo):
   - Scenariusze: 403 dla nie-admina; poprawne renderowanie KPI; filtry i paginacja działają; brak ratio przy `generated_total=0`.
10. Refaktory/wykończenie:
   - Eksport komponentów w `src/components/admin/` (utwórz katalog); upewnij się, że `prettier/eslint` przechodzą; dodać krótką dokumentację README w katalogu.


