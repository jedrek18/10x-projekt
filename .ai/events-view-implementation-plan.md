# API Endpoint Implementation Plan: Events (Telemetry)

## 1. Przegląd punktu końcowego
Dobrowolne, jawne logowanie zdarzeń przez klienta. Zwykle zdarzenia są emitowane po stronie serwera w `/ai/generate` i `/flashcards:batch-save`.

## 2. Szczegóły żądania
- Metoda: POST
- URL: `/api/events`
- Parametry: brak
- Body: `{ event_name: 'generation'|'save', request_id: UUID, properties?: Json }`

## 3. Wykorzystywane typy
- Z `src/types.ts`: `EventCreateCommand`, `UUID`

## 3. Szczegóły odpowiedzi
- 202: `accepted` (bez zawartości lub `{ status: 'accepted' }`)
- 401: unauthorized
- 422: `validation_failed`

## 4. Przepływ danych
- `context.locals.supabase` → `supabase.from('event_log').insert(...)` (RLS `WITH CHECK (user_id = auth.uid())`).
- Pola: `{ user_id: auth.uid(), event_name, request_id, properties }`.

## 5. Względy bezpieczeństwa
- Walidacja nazw zdarzeń do dozwolonych wartości z DB (`generation|save`).
- Rozmiar `properties` kontrolowany (np. limit 8–16KB).
- RLS ogranicza wpisy do użytkownika.

## 6. Obsługa błędów
- 401: brak auth
- 422: niepoprawne pole `event_name` lub `request_id`
- 500: niespodziewane błędy insertu

## 7. Rozważania dotyczące wydajności
- Wstawienia asynchroniczne (fire-and-forget) – zwrot 202 po przyjęciu żądania; ewentualnie kolejkowanie.
- Indeksy na `event_log` (wg planu DB) wspierają późniejsze odczyty admina.

## 8. Etapy wdrożenia
1. Plik API: `src/pages/api/events.ts` (POST), `export const prerender = false;`
2. Walidacja Zod: `src/lib/validation/events.ts` (`eventCreateSchema`).
3. Serwis: `src/lib/services/events.service.ts` → `createEvent(supabase, cmd)`.
4. Testy: walidacja pól i przyjęcie 202.


