# API Endpoint Implementation Plan: Admin

## 1. Przegląd punktu końcowego

Odczyt logów audytu i agregatów KPI. Dostęp tylko dla adminów (`profiles.is_admin = true`) oraz (w produkcji) dodatkowy claim `role=admin` z bramki.

## 2. Szczegóły żądania

### 2.1 GET `/api/admin/audit-logs`

- Metoda: GET
- URL: `/api/admin/audit-logs?limit&offset&action&user_id&card_id`
- Parametry:
  - Wymagane: brak
  - Opcjonalne: `limit`, `offset`, `action`, `user_id`, `card_id`
- Body: brak

### 2.2 GET `/api/admin/kpi-totals`

- Metoda: GET
- URL: `/api/admin/kpi-totals`
- Parametry: brak
- Body: brak

## 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `AdminAuditLogDTO`
  - `AdminKpiTotalsDTO`

## 3. Szczegóły odpowiedzi

- Audit logs 200: `{ items: AdminAuditLogDTO[] }` (lub bezpośrednio listę)
- KPI totals 200: `AdminKpiTotalsDTO`
- 403: forbidden (nie-admin)
- 401: unauthorized

## 4. Przepływ danych

- Walidacja admina:
  - Sprawdzenie w `profiles` własnego rekordu: `select is_admin where user_id = auth.uid()`
  - Alternatywnie (z bramką) weryfikacja clama JWT `role=admin`.
- Audit logs: `supabase.from('audit_log').select(...)` z filtrami i stronicowaniem; RLS `SELECT` globalny dla admina.
- KPI totals: `supabase.from('kpi_totals').select().single()` (VIEW tylko-do-odczytu; RLS admin-only).

## 5. Względy bezpieczeństwa

- Twarda walidacja uprawnień (krótka-ścieżka 403) zanim wykonamy kosztowne zapytania.
- Ochrona przed rozlaniem danych: brak zwracania danych gdy nie-admin (nie `404`, ale `403`).

## 6. Obsługa błędów

- 401: nieautoryzowany
- 403: brak uprawnień admina
- 500: błędy zapytań/połączenia

## 7. Rozważania dotyczące wydajności

- Indeksy na `audit_log` (created_at DESC, acted_by, card_id) wspierają filtrowanie.
- Stronicowanie wyników (limit/offset) i minimalne kolumny.

## 8. Etapy wdrożenia

1. Pliki API:
   - `src/pages/api/admin/audit-logs.ts` (GET)
   - `src/pages/api/admin/kpi-totals.ts` (GET)
   - W każdym: `export const prerender = false;`
2. Walidacja Zod: `src/lib/validation/admin.ts` (schemat zapytań dla audit-logs).
3. Serwis: `src/lib/services/admin.service.ts`:
   - `assertIsAdmin(supabase)`
   - `listAuditLogs(supabase, filters)`
   - `getKpiTotals(supabase)`
4. Testy: użytkownik nie-admin (403), admin z filtrami i stronicowaniem.
