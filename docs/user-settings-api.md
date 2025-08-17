## User Settings API

### GET /api/user-settings

- **Auth**: required (Supabase)
- **Response 200**

```json
{
  "user_id": "uuid",
  "daily_goal": 20,
  "new_limit": 10,
  "created_at": "2025-08-13T09:00:00Z",
  "updated_at": "2025-08-13T09:00:00Z"
}
```

- **Errors**: 401 unauthorized, 500 server_error

### PATCH /api/user-settings

- **Auth**: required (Supabase)
- **Body**

```json
{ "daily_goal": 30, "new_limit": 5 }
```

- `daily_goal` int [1..200], `new_limit` int [0..50], at least one field is required
- **Response 200**: same as GET
- **Errors**: 400 invalid_json, 415 unsupported_media_type, 422 validation_failed, 401 unauthorized, 500 server_error

#### cURL examples

```bash
# GET
curl -X GET "http://localhost:4321/api/user-settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN"

# PATCH (set daily_goal)
curl -X PATCH "http://localhost:4321/api/user-settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daily_goal": 30}'

# PATCH (set both fields)
curl -X PATCH "http://localhost:4321/api/user-settings" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"daily_goal": 25, "new_limit": 10}'
```
