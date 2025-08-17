## SRS API

### GET `/api/srs/queue`

- Query: `goal_hint?: number`
- 200: `{ due: SrsQueueCardDTO[]; new: SrsQueueCardDTO[]; meta: { due_count: number; new_selected: number; daily_goal: number } }`
- 401: `{ error, code: "unauthorized" }`

### POST `/api/srs/promote-new`

- Body: `{ count?: number }`
- 200: `{ promoted: { id: string; source: "ai"|"ai_edited" }[]; remaining_allowance: number }`
- 401: `{ error, code: "unauthorized" }`

### POST `/api/srs/review`

- Body: `{ card_id: string(uuid); rating: 0|1|2|3 }`
- 200: `SrsReviewResultDTO`
- 401: `{ error, code: "unauthorized" }`
- 404: `{ error, code: "not_found" }`
- 422: `{ error, code: "validation_failed" }`

Notes:

- Wykorzystywany jest `locals.supabase` oraz RLS.
- Algorytm SRS jest uproszczony (SM-2-lite) i może zostać przeniesiony do RPC dla atomowości.
