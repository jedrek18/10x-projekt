# API Endpoint Implementation Plan: AI Generation

## 1. Przegląd punktu końcowego

Generowanie propozycji fiszek z dostarczonego tekstu. Brak zapisu do DB; klient zapisuje wybrane pozycje przez batch-save. Obsługa trybu SSE (`text/event-stream`) i trybu non-SSE.

## 2. Szczegóły żądania

- Metoda: POST
- URL: `/api/ai/generate`
- Nagłówki (opcjonalne): `Accept: text/event-stream` (aktywuje streaming)
- Parametry: brak
- Body: `{ source_text: string(1000–10000), max_proposals: number(10–50) }`

## 3. Wykorzystywane typy

- Z `src/types.ts`:
  - `AiGenerateCommand`
  - `AiGenerationProposalDTO`
  - `AiGenerateResponse`
  - `AiGenerateSseEvent*`
  - `UUID`

## 3. Szczegóły odpowiedzi

- Non-SSE 200: `AiGenerateResponse` `{ items, returned_count, request_id }`
- SSE 200: strumień zdarzeń:
  - `proposal`: `{ front, back }`
  - `progress`: `{ count }`
  - `done`: `{ returned_count, request_id }`
  - `error`: `{ message }`
- Kody błędów: 422 (walidacja), 401 (auth), 408 (timeout), 503 (upstream), 500 (inne)

## 4. Przepływ danych

- Uwierzytelnienie przez Supabase JWT (wymagane).
- Generowanie przez OpenRouter lub innego dostawcę LLM; brak zapisu do DB.
- Po zakończeniu (niezależnie od trybu) zapis do `event_log` z `event_name='generation'`, `properties={ returned_count }`, `request_id`.
- Strumień SSE: kontrola żywotności i zamykanie na `abort` (sygnał `AbortController`).

## 5. Względy bezpieczeństwa

- Limit wejścia: 1000–10000 znaków; `max_proposals` 10–50 (Zod + weryfikacja runtime).
- Rate limiting na bramce (Cloudflare). W aplikacji możliwość prostego ogranicznika per użytkownik na czas dev.
- Sanitizacja treści wyjściowych (trim, kompresja białych znaków) przed wysłaniem do klienta.

## 6. Obsługa błędów

- 401: brak tokena
- 422: długość tekstu / zakres `max_proposals`
- 408: przekroczenie limitu czasu generacji
- 503: niedostępność dostawcy modelu
- 500: inne błędy
- Brak tabeli błędów; log do serwera oraz wpis do `event_log` tylko po sukcesie (nie przy błędzie).

## 7. Rozważania dotyczące wydajności

- Streaming SSE dla szybkiego feedbacku; batchowane wysyłanie `proposal`.
- Ograniczanie liczby propozycji i czasu generacji; backoff przy 429 z upstream.
- Reużycie połączeń HTTP do dostawcy modelu.

## 8. Etapy wdrożenia

1. Plik API: `src/pages/api/ai/generate.ts` (POST), `export const prerender = false;`
2. Walidacja w `src/lib/validation/ai.ts`: `generateSchema` { source_text, max_proposals }.
3. Serwis `src/lib/services/ai.service.ts`:
   - `generateProposals(command, { streaming, signal })` → zwraca iterator/strumień lub pełen wynik.
   - Normalizacja i filtracja propozycji (puste/duplikaty w obrębie batcha).
4. Integracja SSE: obsługa nagłówków, `flush`, `keep-alive`, propagacja `AbortSignal`.
5. Po zakończeniu zapisz `event_log` (`generation`), z `request_id` (UUID v4) i `returned_count`.
6. Testy: tryb non-SSE i SSE; skrajne limity; anulowanie żądania.
