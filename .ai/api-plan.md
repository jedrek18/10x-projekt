# REST API Plan

> This plan assumes a Supabase-backed REST layer (PostgREST + Edge Functions) fronted by Cloudflare Pages. Table CRUD uses PostgREST semantics; domain/business actions use Edge Functions (invoked as regular REST endpoints). Timestamps are UTC (`TIMESTAMPTZ`), dates are UTC calendar days.

---

## 1. Resources

| Resource                | DB Table / View              | Notes                                                                               |
| ----------------------- | ---------------------------- | ----------------------------------------------------------------------------------- |
| **Profile**             | `public.profiles`            | 1–1 with `auth.users`.                                                              |
| **Flashcard**           | `public.flashcards`          | Soft delete via `deleted_at`; content constraints; SRS fields managed via RPC only. |
| **User Settings**       | `public.user_settings`       | Daily goal & new-card limit.                                                        |
| **User Daily Progress** | `public.user_daily_progress` | Per user per UTC date; counts reviews/new introduced; optional goal override.       |
| **Event Log**           | `public.event_log`           | Telemetry (`generation`, `save`), includes `request_id`.                            |
| **Audit Log** (admin)   | `public.audit_log`           | All privileged/structural actions; admin-only read.                                 |
| **KPI Totals** (admin)  | `public.kpi_totals` (VIEW)   | Global aggregates of generation/saves.                                              |

---

## 2. Endpoints

> **Conventions**
>
> - Base URL examples use `/api`. PostgREST endpoints are under `/rest/v1/...`; custom business endpoints under `/fn/...` (Edge Functions). For readability below we show clean paths; map them in gateway routing (e.g., `/api/flashcards` → `/rest/v1/flashcards`).
> - Auth via `Authorization: Bearer <Supabase JWT>` unless noted otherwise.
> - Errors return JSON:
>
>   ```json
>   { "error": { "code": "validation_failed", "message": "Front exceeds 200 chars", "fields": { "front": "max 200" } } }
>   ```
>
> - **Pagination**: limit/offset with default `limit=25`; responses include `X-Total-Count` and `Link` headers. For PostgREST you may also rely on `Range`/`Content-Range`.

### 2.1 Profiles

#### GET `/api/me`

- **Desc:** Fetch current user profile (self).
- **Response 200**

  ```json
  { "user_id": "uuid", "is_admin": false, "created_at": "2025-08-13T10:00:00Z" }
  ```

- **Errors:** `401 unauthorized`

#### PATCH `/api/me`

- **Desc:** Update own profile (currently only future-safe fields; `is_admin` is **not** user-editable).
- **Request**

  ```json
  {}
  ```

  (MVP exposes no user-editable fields beyond server-managed.)

- **Response 200:** updated profile.
- **Errors:** `400 validation_failed`, `403 forbidden` if attempting to change `is_admin`.

> **Implementation:** PostgREST on `profiles` with RLS `USING (user_id = auth.uid())`.

---

### 2.2 User Settings

#### GET `/api/user-settings`

- **Desc:** Get current user settings.
- **Response 200**

  ```json
  { "user_id": "uuid", "daily_goal": 20, "new_limit": 10, "created_at": "...", "updated_at": "..." }
  ```

- **Errors:** `401`

#### PATCH `/api/user-settings`

- **Desc:** Update settings (limits validated server-side and DB CHECK).
- **Request**

  ```json
  { "daily_goal": 30, "new_limit": 10 }
  ```

- **Response 200:** updated settings.
- **Errors:** `422 validation_failed` (e.g., `daily_goal` not 1–200; `new_limit` not 0–50), `401`.

> **Implementation:** PostgREST table updates (RLS self-only). Trigger `set_updated_at`.

---

### 2.3 User Daily Progress

#### GET `/api/progress`

- **Desc:** Get progress for a UTC date or date range.
- **Query:** `date=YYYY-MM-DD` **or** `start=YYYY-MM-DD&end=YYYY-MM-DD`
- **Response 200**

  ```json
  {
    "items": [
      {
        "user_id": "uuid",
        "date_utc": "2025-08-13",
        "reviews_done": 12,
        "new_introduced": 5,
        "goal_override": null,
        "created_at": "...",
        "updated_at": "..."
      }
    ]
  }
  ```

- **Errors:** `400` (invalid dates), `401`.

#### PATCH `/api/progress/{date}`

- **Desc:** Update `goal_override` for a given UTC day.
- **Request**

  ```json
  { "goal_override": 30 }
  ```

- **Response 200:** upserted/updated row.
- **Errors:** `422 validation_failed`, `401`.

> **Implementation:** PostgREST upsert on `(user_id, date_utc)` with RLS self-only; trigger `set_updated_at`.

---

### 2.4 Flashcards (CRUD & batch save)

> **Data shape (responses)** — fields mirror DB columns; SRS fields are flat to simplify PostgREST usage.

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "front": "...",
  "back": "...",
  "source": "ai|ai_edited|manual",
  "state": "new|learning|review|relearning",
  "due_at": null,
  "interval_days": 0,
  "ease_factor": "2.50",
  "reps": 0,
  "lapses": 0,
  "last_reviewed_at": null,
  "last_rating": null,
  "introduced_on": null,
  "created_at": "...",
  "updated_at": "...",
  "deleted_at": null
}
```

#### GET `/api/flashcards`

- **Desc:** List “My flashcards” (non-deleted).
- **Query (optional):** `limit`, `offset`, `order=created_at.desc|asc` (default `.desc`).
- **Response 200:** array of flashcards; headers include totals.
- **Errors:** `401`.

> **Indexes used:** `(user_id, created_at DESC, id DESC)`, partial visibility via RLS `deleted_at IS NULL`.

#### POST `/api/flashcards`

- **Desc:** Create a single **manual** flashcard.
- **Request**

  ```json
  { "front": "...", "back": "..." }
  ```

- **Response 201:** created flashcard with `source="manual"`, SRS defaults.
- **Errors:** `422 validation_failed` (front/back length, front!=back after canonicalization), `409 conflict` (duplicate by `(user_id, content_hash)`), `401`.

#### GET `/api/flashcards/{id}`

- **Desc:** Get one flashcard (if owned, non-deleted).
- **Response 200:** flashcard.
- **Errors:** `404 not_found`, `401`.

#### PATCH `/api/flashcards/{id}`

- **Desc:** Update **content only** (`front`, `back`). SRS/state fields are immutable via this route.
- **Request**

  ```json
  { "front": "...", "back": "..." }
  ```

- **Response 200:** updated flashcard.
- **Errors:** `409 conflict_soft_deleted` (cannot edit soft-deleted), `422 validation_failed`, `404`, `401`.

#### DELETE `/api/flashcards/{id}`

- **Desc:** Soft delete a flashcard (hidden from lists and study).
- **Response 204**
- **Errors:** `404`, `401`.

> **Implementation:** PostgREST for GET/POST/PATCH; DELETE proxies an Edge Function `delete_flashcard` RPC that sets `deleted_at` and writes an `audit_log` record.

#### POST `/api/flashcards:batch-save`

- **Desc:** Persist accepted/edited AI proposals in one call (idempotent).
- **Headers:** `Idempotency-Key: <uuid>` (maps to `event_log.request_id`)
- **Request**

  ```json
  {
    "items": [
      { "front": "...", "back": "...", "source": "ai" },
      { "front": "...", "back": "...", "source": "ai_edited" }
    ]
  }
  ```

- **Response 201**

  ```json
  {
    "saved": [
      { "id": "uuid", "source": "ai" },
      { "id": "uuid", "source": "ai_edited" }
    ],
    "skipped": [{ "front": "...", "reason": "duplicate" }]
  }
  ```

- **Errors:** `422` (any invalid item), `409 conflict` (duplicate content returned in request; response lists in `skipped`), `401`.
- **Side-effects:** Writes `event_log` with `event_name='save'` and counts per source; `audit_log` entry `action='save_batch'`.

> **Indexes used:** `(user_id, content_hash)` unique partial (non-deleted) for dedupe.

---

### 2.5 Study / SRS

#### GET `/api/srs/queue`

- **Desc:** Build today’s study queue: all **due** cards first (states `learning`,`review`), then up to **N new** where `N = min(settings.new_limit, 10)` and respecting `user_daily_progress.new_introduced` (MVP: 10 new cap).
- **Query:** `goal_hint` (optional int; if provided and > due count, may include more “new” up to hint, capped by limits).
- **Response 200**

  ```json
  {
    "due": [{ "id": "uuid", "front": "...", "back": null, "state": "review", "due_at": "..." }],
    "new": [{ "id": "uuid", "front": "...", "back": null, "state": "new" }],
    "meta": { "due_count": 18, "new_selected": 7, "daily_goal": 20 }
  }
  ```

  _(Back content may be elided until reveal in client if desired; API can return full content.)_

- **Errors:** `401`.

> **Implementation:** Edge Function `build_queue` reading settings, progress, and indices:
>
> - Partial index `(user_id, due_at) WHERE state IN ('learning','review') AND deleted_at IS NULL`.
> - New selection FIFO by `(created_at ASC, id ASC)` and partial index `(user_id, introduced_on) WHERE deleted_at IS NULL`.

#### POST `/api/srs/promote-new`

- **Desc:** Promote next “new” cards for **today** (sets `introduced_on = current_date UTC`) up to remaining allowance.
- **Request (optional)**:

  ```json
  { "count": 10 }
  ```

- **Response 200**

  ```json
  { "promoted": ["uuid1", "uuid2"], "remaining_allowance": 3 }
  ```

- **Errors:** `401`.

> **Implementation:** Edge Function `promote_new_cards_for_today` (SECURITY DEFINER).

#### POST `/api/srs/review`

- **Desc:** Submit a rating for one card and get the next schedule.
- **Request**

  ```json
  { "card_id": "uuid", "rating": 0 }
  ```

  _(0=Again, 1=Hard, 2=Good, 3=Easy)_

- **Response 200**

  ```json
  {
    "card_id": "uuid",
    "state": "review",
    "due_at": "2025-08-20T09:00:00Z",
    "interval_days": 4,
    "ease_factor": "2.36",
    "reps": 12,
    "lapses": 1,
    "last_reviewed_at": "2025-08-13T09:10:00Z",
    "last_rating": 2
  }
  ```

- **Errors:** `422 validation_failed` (rating out of 0–3), `404` (card not found or soft-deleted), `401`.

> **Implementation:** Edge Function `review_flashcard` (SECURITY DEFINER) updates SRS using Open Spaced Repetition, increments `user_daily_progress.reviews_done`, and writes `audit_log` (`action='review'`).

---

### 2.6 AI Generation (no persistence of proposals)

#### POST `/api/ai/generate`

- **Desc:** Generate flashcard proposals from user text. **No DB writes**; proposals are client-held until saved.
- **Headers (optional):** `Accept: text/event-stream` for streaming.
- **Request**

  ```json
  { "source_text": "... (1000-10000 chars) ...", "max_proposals": 30 }
  ```

- **SSE Response 200 (stream)** — events:
  - `proposal`: `{"front":"...","back":"..."}` (emitted per item)
  - `progress`: `{"count": N}`
  - `done`: `{"returned_count": N, "request_id":"uuid"}`
  - `error`: `{"message":"..."}`

- **Non-SSE Response 200**

  ```json
  { "items": [{ "front": "...", "back": "..." }], "returned_count": 27, "request_id": "uuid" }
  ```

- **Errors:** `422` (text length <1000 or >10000; `max_proposals` not 10–50), `401`, `408` (generation timeout), `503` (upstream).
- **Side-effects:** Writes `event_log` (`event_name='generation'`, `properties={"returned_count":N}`, `request_id`) **after** completion (server-side).

> **Notes:** Language follows the source; no forced translation. The client will later call `batch-save`.

---

### 2.7 Events (optional explicit API; typically server-managed)

> Normally emitted server-side in `/ai/generate` and `/flashcards:batch-save`. Expose only if clients need to log manual actions.

#### POST `/api/events`

- **Request**

  ```json
  {
    "event_name": "generation|save",
    "request_id": "uuid",
    "properties": { "returned_count": 27 }
  }
  ```

- **Response 202:** accepted (fire-and-forget).
- **Errors:** `422`, `401`.

---

### 2.8 Admin

> Admin access requires `profiles.is_admin = true` (RLS check) **and** a JWT with an `role=admin` claim set by the gateway (defense in depth).

#### GET `/api/admin/audit-logs`

- **Query:** `limit`, `offset`, optional `action`, `user_id`, `card_id`.
- **Response 200**

  ```json
  {
    "items": [
      {
        "id": "uuid",
        "acted_by": "uuid",
        "action": "delete",
        "card_id": "uuid",
        "target_user_id": null,
        "details": {},
        "created_at": "..."
      }
    ]
  }
  ```

- **Errors:** `403 forbidden` (not admin), `401`.

#### GET `/api/admin/kpi-totals`

- **Desc:** Read-only view.
- **Response 200**

  ```json
  { "generated_total": 10234, "saved_manual_total": 1200, "saved_ai_total": 7200, "saved_ai_edited_total": 980 }
  ```

- **Errors:** `403`, `401`.

---

### 2.9 Account & Session (via Supabase Auth)

> Prefer using `@supabase/supabase-js` on the client. If you expose pass-throughs, forward to Supabase Auth.

- `POST /api/auth/signup` → Supabase `auth.signUp` (email+password).
- `POST /api/auth/signin` → `auth.signInWithPassword`.
- `POST /api/auth/signout` → `auth.signOut`.
- `POST /api/auth/change-password` → requires current password; after success, **invalidate all sessions**.
- `DELETE /api/auth/account` → delete user + cascade app data (Edge Function that deletes rows and calls Supabase Admin API).

---

### 2.10 Misc

#### GET `/api/health`

- **Desc:** Liveness/readiness, model/quota pings.
- **Response 200**

  ```json
  { "status": "ok", "time": "2025-08-13T09:00:00Z" }
  ```

---

## 3. Authentication and Authorization

- **Auth mechanism:** Supabase JWT (client obtains via Supabase Auth). All requests include `Authorization: Bearer <token>`.
- **RLS (Row Level Security):**
  - Every table has RLS enabled. Policies enforce **self-only access** for `profiles`, `user_settings`, `user_daily_progress`, `flashcards` (and hidden soft-deleted), `event_log` (self), while `audit_log` and `kpi_totals` are **admin-only**.

- **Edge Functions (business endpoints):** Run with `SECURITY DEFINER` PostgreSQL functions to modify SRS/`deleted_at` when required, bypassing RLS appropriately. **Before** executing, functions validate the caller’s identity (`auth.uid()`), check ownership/admin, and write `audit_log` rows.
- **Admin:** `profiles.is_admin=true` gates admin endpoints. Gateway also adds an `role=admin` JWT claim for extra protection.
- **Sessions:** 7-day expiration, multi-session allowed. Password change invalidates all sessions.
- **Rate Limiting & Abuse Controls:**
  - **Global:** 60 req/min/IP (Cloudflare), 10 concurrent SSE streams/user.
  - **AI generation:** 5 runs/min/user, burst 10; backoff on `429`.
  - **Idempotency:** For batch save, require `Idempotency-Key` (UUID). Server stores the result keyed by `(user_id, key)` for 24h; repeated requests return the original response.

- **CORS:** Allow frontend origins (Cloudflare Pages domain); block credentials to unknown origins.
- **Data exposure:** Never expose soft-deleted cards in normal queries; admin-only may query with `include_deleted=true`.
- **Auditing:** All RPC writes record an `audit_log` entry with `action`, `acted_by`, optional `card_id`, `target_user_id`, and structured `details`.

---

## 4. Validation and Business Logic

### 4.1 Validation Rules (enforced in API + DB)

- **Flashcard content:**
  - `front` required, `TEXT`, `length ≤ 200`.
  - `back` required, `TEXT`, `length ≤ 500`.
  - Canonicalized `front` **≠** canonicalized `back` (server replicates DB normalization: trim, whitespace compression, lowercase).
  - **Deduplication**: unique `(user_id, content_hash)` for non-deleted → return `409 conflict` with `reason="duplicate"`.

- **SRS fields (server-managed only):**
  - `state ∈ {'new','learning','review','relearning'}`.
  - `interval_days ≥ 0`, `ease_factor 1.30–3.00`, `reps ≥ 0`, `lapses ≥ 0`.
  - `last_rating ∈ {0,1,2,3}` or `null`.

- **User Settings:**
  - `daily_goal 1–200`.
  - `new_limit 0–50`.

- **Progress:**
  - `reviews_done ≥ 0`, `new_introduced ≥ 0`, `goal_override ≥ 0 | null`.

- **AI Generation:**
  - `source_text` length **1000–10000** chars; `max_proposals 10–50`.

### 4.2 Business Logic Mapping

- **AI proposals (no persistence):** `/api/ai/generate` streams/returns proposals; upon completion logs `event_log (generation)` with `returned_count` and optional `request_id`.
- **Accept/Edit/Save proposals:** Client calls `/api/flashcards:batch-save` with selected items; server:
  1. Validates each item (content rules).
  2. Inserts new rows with `source = 'ai' | 'ai_edited'`, SRS defaults (`state='new'`, `interval_days=0`, etc.).
  3. Skips duplicates (responds in `skipped`).
  4. Logs `event_log (save)` with counts split by `source`.
  5. Returns created IDs.

- **Manual add:** `/api/flashcards` (`source='manual'`).
- **Editing after save:** `/api/flashcards/{id}` allows only `front/back` (DB trigger blocks updates to soft-deleted; SRS unaffected directly; future scheduling uses updated text).
- **Soft delete:** `DELETE /api/flashcards/{id}` marks `deleted_at` via RPC; removes from study queue immediately.
- **Restore/Merge (when needed):** (non-MVP external route) internal RPC `restore_or_merge_flashcard` resets SRS to `'new'` and clears `introduced_on`; if later exposed, use `POST /api/flashcards/{id}/restore`.
- **Study flow:**
  - **Queue build:** `/api/srs/queue` selects all due, then promotes up to 10 new (bounded by `user_settings.new_limit` minus `user_daily_progress.new_introduced`); respects FIFO (`created_at ASC, id ASC`).
  - **Promote new explicitly:** `/api/srs/promote-new` sets `introduced_on = current_date UTC` for selected cards; increments `user_daily_progress.new_introduced`.
  - **Review grading:** `/api/srs/review` updates SRS via library rules; sets `due_at`, `interval_days`, `ease_factor`, increments `reps`/`lapses` appropriately; updates `last_reviewed_at`, `last_rating`; increments `user_daily_progress.reviews_done`.
  - **Daily goal handling:** Clients can compare `reviews_done` to `daily_goal` and optionally PATCH `goal_override` for the day.

- **Telemetry/KPI:** `kpi_totals` view is admin-only; `event_log` is RLS-filtered (self or admin-all). Admin dashboards can read `/api/admin/kpi-totals`.

### 4.3 Error Codes

| Code                       | When                                       |
| -------------------------- | ------------------------------------------ |
| `400 bad_request`          | malformed query/body, invalid date formats |
| `401 unauthorized`         | missing/invalid token                      |
| `403 forbidden`            | admin endpoint without admin               |
| `404 not_found`            | missing resource / not owned               |
| `409 conflict`             | dedupe clash; editing soft-deleted         |
| `422 validation_failed`    | length/enum/check constraints              |
| `429 too_many_requests`    | rate limit exceeded                        |
| `500 internal_error`       | unexpected                                 |
| `503 upstream_unavailable` | model provider unavailable                 |
| `408 request_timeout`      | AI generation timed out                    |

---

**Assumptions & Notes**

- Lists default to `limit=25` as per MVP pagination.
- Study queue returns full card content; clients may choose to hide `back` until reveal.
- Edge Functions validate ownership using `auth.uid()` even when running as `service_role`.
- All timestamps are returned in ISO-8601 with `Z`.
- Future features (search/filtering, restore/merge UI) can be added without breaking the current shapes.
