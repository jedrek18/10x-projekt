# Testowanie Admin API (manual)

## Wymagania wstępne

- Użytkownik zalogowany z `profiles.is_admin = true` (sesja przeglądarkowa lub cookie w cURL).
- Uruchomiona aplikacja: `http://localhost:4321`.

## Endpoints

- GET `/api/admin/audit-logs`
- GET `/api/admin/kpi-totals`
- POST `/api/events` (telemetria)

### Podgląd AI Generate

- POST `/api/ai/generate` (non‑SSE i SSE)
- Przykłady: `.http/ai-generate.http`

### Flashcards (użytkownik)

- GET `/api/flashcards?limit&offset&order`
- POST `/api/flashcards`
- GET `/api/flashcards/{id}`
- PATCH `/api/flashcards/{id}`
- DELETE `/api/flashcards/{id}`
- POST `/api/flashcards/batch-save` (zalecany nagłówek `Idempotency-Key`)

Walidacja:

- `front`, `back`: niepuste, przycięte, ≤ 1000 znaków; muszą się różnić po kanonikalizacji serwerowej
- `limit` 1..100, `offset` ≥ 0, `order` ∈ `created_at.desc|created_at.asc`
- Batch `items`: 1..100, `source` ∈ `ai|ai_edited`

Kody błędów (wybór): 401 `unauthorized`, 415 `unsupported_media_type`, 400 `invalid_json`, 422 `validation_failed`, 409 `conflict`/`conflict_soft_deleted`, 404 `not_found`.

## Scenariusze (statusy i edge case'y)

### 1) Autoryzacja

- 401 Unauthorized: wyślij żądanie bez cookie sesji.
- 403 Forbidden: wyślij żądanie z sesją użytkownika nie-admina.
- 200 OK: wyślij żądanie z sesją admina.

### 2) `/api/admin/audit-logs`

- Domyślne parametry: brak; oczekuj `limit=50`, `offset=0`, sort `created_at DESC`.
- Paginacja: `limit=1`, `offset=0`; następnie `offset=1`; sprawdź różne strony.
- Filtrowanie:
  - `action=<string>` (np. `save`)
  - `user_id=<uuid>` (filtruje po `acted_by`)
  - `card_id=<uuid>`
- Walidacja błędów (400 Bad Request):
  - `user_id` lub `card_id` nie-UUID
  - `limit` > 100 lub `limit` < 1
  - `offset` < 0

Oczekiwany kształt odpowiedzi: `{ items: AdminAuditLogDTO[] }`.

### 3) `/api/admin/kpi-totals`

- 200 OK: zwraca obiekt typu `AdminKpiTotalsDTO` (pola agregatów KPI).

## Przykłady (cURL)

Zastąp `<cookie>` wartością cookie sesji (np. skopiuj z DevTools → Application → Cookies):

```bash
# Audit logs (domyślnie)
curl -i \
  -H "Cookie: sb:token=<cookie>" \
  "http://localhost:4321/api/admin/audit-logs"

# Audit logs (paginacja + filtr action)
curl -i \
  -H "Cookie: sb:token=<cookie>" \
  "http://localhost:4321/api/admin/audit-logs?limit=25&offset=0&action=save"

# KPI totals
curl -i \
  -H "Cookie: sb:token=<cookie>" \
  "http://localhost:4321/api/admin/kpi-totals"

# Events (telemetria)
curl -i \
  -H "Cookie: sb:token=<cookie>" \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "generation",
    "request_id": "00000000-0000-4000-8000-000000000001",
    "properties": { "returned_count": 12 }
  }' \
  "http://localhost:4321/api/events"
```

## VS Code REST Client

Możesz użyć gotowych requestów: `.http/admin-api.http`.
Dodaliśmy też przykłady dla zdarzeń: `.http/events.http`.
