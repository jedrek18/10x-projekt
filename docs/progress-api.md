# Progress API

Endpoints for user daily progress. All endpoints require a valid Supabase session; RLS enforces per-user access.

## Endpoints

- GET `/api/progress?date=YYYY-MM-DD` or `/api/progress?start=YYYY-MM-DD&end=YYYY-MM-DD`
- PATCH `/api/progress/{date}`

## Parameters and Validation

- Date format: `YYYY-MM-DD`, calendar-accurate (UTC)
- GET query: either `date` or both `start` and `end` with `start <= end`; range limited to 366 days
- PATCH body: `{ goal_override: int >= 0 | null }` with `Content-Type: application/json`

## Responses

- GET: 200 with `{ items: UserDailyProgressDTO[] }` ordered by `date_utc`
- PATCH: 200 with updated/upserted `UserDailyProgressDTO`

## Error Codes

- 401 `unauthorized` – missing/invalid session
- 415 `unsupported_media_type` – missing `Content-Type: application/json`
- 400 `bad_request` – invalid query params or date path param
- 400 `invalid_json` – invalid JSON body
- 422 `validation_failed` – body validation failed (e.g., negative goal)
- 408 `timeout` – server-side timeout guard triggered
- 500 `server_error` – unexpected server error

## Examples

```bash
# GET single date
curl -H "Authorization: Bearer <token>" \
  "/api/progress?date=2025-08-13"

# GET range
curl -H "Authorization: Bearer <token>" \
  "/api/progress?start=2025-08-01&end=2025-08-13"

# PATCH goal_override
curl -X PATCH -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"goal_override": 30}' \
  "/api/progress/2025-08-13"
```


