# Telemetria: Events API

## Przegląd

Dobrowolne zapisywanie zdarzeń użytkownika do tabeli `event_log` z RLS. Obecnie obsługiwane zdarzenia:

- `generation` — zakończenie generowania propozycji kart (AI)
- `save` — zapis propozycji kart

## Endpoint

- POST `/api/events`
- Body:

```
{
  "event_name": "generation" | "save",
  "request_id": "<uuid>",
  "properties": { "...": "optional JSON, do 8KB" }
}
```

- Odpowiedzi:
  - 202 Accepted: `{ "status": "accepted" }`
  - 401 Unauthorized: `{ "error": "Unauthorized", "code": "unauthorized" }`
  - 415 Unsupported Media Type: `{ "error": "Unsupported Media Type", "code": "unsupported_media_type" }`
  - 400 Invalid JSON: `{ "error": "Invalid JSON body", "code": "invalid_json" }`
  - 422 Validation failed: `{ "error": "Validation failed", "code": "validation_failed", "details": { ... } }`
  - 408 Timeout: `{ "error": "Request timeout", "code": "timeout" }`
  - 500 Internal Server Error

## Bezpieczeństwo

- Uwierzytelnienie: wymagane; `user_id` pochodzi z `auth.uid()` via `assertAuthenticated`.
- RLS: `WITH CHECK (user_id = auth.uid())` dla `event_log`.
- Walidacja: Zod wymusza dozwolone `event_name`, `UUID` i limit rozmiaru `properties`.

## Konfiguracja

- Limit rozmiaru `properties`: `EVENT_PROPERTIES_MAX_BYTES` w `src/lib/config.ts` (domyślnie 8KB).

## Klient

- Helper: `logClientEvent(event)` w `src/lib/services/client-events.ts` (best-effort, ignoruje błędy).
