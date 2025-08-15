## /api/me

- Methods: GET, PATCH
- Auth: Required (Supabase JWT via Authorization header or cookies)
- Cache: `Cache-Control: no-store`

### GET /api/me
Returns current user's profile.

Response 200 (application/json):
```
{ "user_id": "uuid", "is_admin": false, "created_at": "2025-08-13T10:00:00Z" }
```

Example:
```bash
curl -s -H "Authorization: Bearer $SUPABASE_JWT" https://your-host/api/me
```

Error codes:
- 401 `unauthorized`
- 404 `not_found`
- 500 (generic)

### PATCH /api/me
MVP: no editable fields; accepts `{}` only. Returns current profile.

Request (application/json):
```
{}
```

Example:
```bash
curl -s -X PATCH -H "Authorization: Bearer $SUPABASE_JWT" -H "Content-Type: application/json" \
  -d '{}' https://your-host/api/me
```

Responses:
- 200 with `ProfileDTO`
- 415 `unsupported_media_type` (when content-type is not JSON)
- 400 `invalid_json` (malformed body)
- 422 `validation_failed` (unknown fields due to strict schema)
- 401 `unauthorized`
- 404 `not_found`
- 500 (generic)


