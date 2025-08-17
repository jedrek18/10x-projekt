# Flashcards API

Endpoints for managing user flashcards. All endpoints require a valid Supabase session; RLS enforces per-user access.

## Endpoints

- GET `/api/flashcards?limit&offset&order`
- POST `/api/flashcards`
- GET `/api/flashcards/{id}`
- PATCH `/api/flashcards/{id}`
- DELETE `/api/flashcards/{id}`
- POST `/api/flashcards:batch-save` (idempotency via `Idempotency-Key`)

## Parameters and Validation

- `front`, `back`: non-empty, trimmed, ≤ 1000 chars; must differ after server canonicalization
- `limit` 1..100, `offset` ≥ 0, `order` ∈ `created_at.desc|created_at.asc`
- Batch `items`: 1..100, each `{ front, back, source: 'ai' | 'ai_edited' }`

## Responses

- List: 200 with JSON array of flashcards and header `X-Total-Count`
- Create: 201 with created flashcard
- Read: 200 with flashcard
- Update: 200 with updated flashcard
- Delete: 204 no content
- Batch save: 201 with `{ saved: [{ id, source }], skipped: [{ front, reason }] }`

## Error Codes

- 401 `unauthorized` – missing/invalid session
- 415 `unsupported_media_type` – missing `Content-Type: application/json`
- 400 `invalid_json` – invalid JSON body
- 422 `validation_failed` – input validation failed
- 409 `conflict` – duplicate content (unique constraint)
- 409 `conflict_soft_deleted` – attempting to edit a soft-deleted card
- 404 `not_found` – resource not found or not accessible
- 408 `timeout` – server-side timeout guard triggered

## REST Client Examples

Use `.http/flashcards.http` for ready-to-run examples.
