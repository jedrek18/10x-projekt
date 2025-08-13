# 1. Lista tabel (kolumny, typy danych, ograniczenia)

### `profiles`

* `user_id UUID PK` – FK → `auth.users.id`, `NOT NULL`
* `is_admin BOOLEAN` – `DEFAULT false`, `NOT NULL`
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`

---

### `flashcards`

* `id UUID PK` – `DEFAULT gen_random_uuid()`, `NOT NULL`
* `user_id UUID` – FK → `auth.users.id`, `NOT NULL`
* `front TEXT` – `NOT NULL`, `CHECK (char_length(front) <= 200)`
* `back TEXT` – `NOT NULL`, `CHECK (char_length(back) <= 500)`
* `source TEXT` – `NOT NULL`, `CHECK (source IN ('ai','ai_edited','manual'))`
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`
* `updated_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL` (aktualizowane triggerem)
* `deleted_at TIMESTAMPTZ` – `NULL` (soft delete)
* `content_hash BYTEA` – `GENERATED ALWAYS AS ( digest(canonicalize_text(front) || '|' || canonicalize_text(back), 'sha256') ) STORED`, `NOT NULL`
* **SRS:**

  * `state TEXT` – `NOT NULL`, `CHECK (state IN ('new','learning','review','relearning'))`
  * `due_at TIMESTAMPTZ` – `NULL`
  * `interval_days INT` – `DEFAULT 0`, `NOT NULL`, `CHECK (interval_days >= 0)`
  * `ease_factor NUMERIC(5,2)` – `DEFAULT 2.50`, `NOT NULL`, `CHECK (ease_factor >= 1.30 AND ease_factor <= 3.00)`
  * `reps INT` – `DEFAULT 0`, `NOT NULL`, `CHECK (reps >= 0)`
  * `lapses INT` – `DEFAULT 0`, `NOT NULL`, `CHECK (lapses >= 0)`
  * `last_reviewed_at TIMESTAMPTZ` – `NULL`
  * `last_rating SMALLINT` – `NULL`, `CHECK (last_rating BETWEEN 0 AND 3)`  *(0=Again, 1=Hard, 2=Good, 3=Easy)*
  * `introduced_on DATE` – `NULL`  *(dzień UTC promowania do puli „nowych”)*

**Dodatkowe CHECK jakości treści:**

* `CHECK (canonicalize_text(front) <> canonicalize_text(back))` *(blokada identycznego front/back po kanonikalizacji)*

---

### `user_settings`

* `user_id UUID PK` – FK → `auth.users.id`, `NOT NULL`
* `daily_goal INT` – `DEFAULT 20`, `NOT NULL`, `CHECK (daily_goal BETWEEN 1 AND 200)`
* `new_limit INT` – `DEFAULT 10`, `NOT NULL`, `CHECK (new_limit BETWEEN 0 AND 50)`
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`
* `updated_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL` (trigger)

---

### `user_daily_progress`

* `user_id UUID` – FK → `auth.users.id`, `NOT NULL`
* `date_utc DATE` – `NOT NULL` *(dzień wg UTC)*
* `reviews_done INT` – `DEFAULT 0`, `NOT NULL`, `CHECK (reviews_done >= 0)`
* `new_introduced INT` – `DEFAULT 0`, `NOT NULL`, `CHECK (new_introduced >= 0)`
* `goal_override INT` – `NULL`, `CHECK (goal_override >= 0)`
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`
* `updated_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL` (trigger)

**PK:** `(user_id, date_utc)`

---

### `audit_log`

* `id UUID PK` – `DEFAULT gen_random_uuid()`, `NOT NULL`
* `acted_by UUID` – FK → `auth.users.id`, `NOT NULL`
* `action TEXT` – `NOT NULL` *(np. 'admin\_update','admin\_delete','merge','restore','delete','review','promote','save\_batch')*
* `card_id UUID` – FK → `flashcards.id`, `NULL`
* `target_user_id UUID` – FK → `auth.users.id`, `NULL`
* `details JSONB` – `DEFAULT '{}'::jsonb`, `NOT NULL`
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`

---

### `event_log`  *(telemetria/KPI)*

* `id BIGSERIAL PK`
* `user_id UUID` – FK → `auth.users.id`, `NOT NULL`
* `event_name TEXT` – `NOT NULL`, `CHECK (event_name IN ('generation','save'))`
* `request_id UUID` – `NULL` *(identyfikator żądania generacji dla idempotencji/logów)*
* `properties JSONB` – `DEFAULT '{}'::jsonb`, `NOT NULL`
  *(np. dla `generation`: `{"returned_count": N}`; dla `save`: `{"manual": x, "ai": y, "ai_edited": z}`)*
* `created_at TIMESTAMPTZ` – `DEFAULT now()`, `NOT NULL`

---

### Widok (agregat KPI – globalny, bez okna czasowego)

#### `kpi_totals` (VIEW)

* `generated_total BIGINT` – `SUM( (properties->>'returned_count')::BIGINT )` dla `event_name='generation'`
* `saved_manual_total BIGINT` – suma z `event_name='save'` z `properties->>'manual'`
* `saved_ai_total BIGINT` – suma z `event_name='save'` z `properties->>'ai'`
* `saved_ai_edited_total BIGINT` – suma z `event_name='save'` z `properties->>'ai_edited'`

> *(Widok tylko-do-odczytu; dostępny dla admina.)*

---

### Funkcje pomocnicze / triggery (schemat)

* **Extensiony:** `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
* **`canonicalize_text(t TEXT) RETURNS TEXT IMMUTABLE`** – `lower(regexp_replace(btrim(t), '\s+', ' ', 'g'))`
* **Trigger `set_updated_at`** – przed `UPDATE` na: `flashcards`, `user_settings`, `user_daily_progress` → ustawia `NEW.updated_at = now()`
* **Trigger `prevent_update_soft_deleted`** – przed `UPDATE` na `flashcards` → `RAISE EXCEPTION` gdy `OLD.deleted_at IS NOT NULL` *(uniemożliwia modyfikacje soft-deleted bez RPC restore/merge)*

---

# 2. Relacje między tabelami

* `profiles.user_id` 1–1 `auth.users.id`
* `flashcards.user_id` 1–N `auth.users.id`
* `user_settings.user_id` 1–1 `auth.users.id`
* `user_daily_progress.user_id` 1–N `auth.users.id` (po 1 rekordzie dziennie)
* `audit_log.acted_by` N–1 `auth.users.id`
* `audit_log.target_user_id` N–1 `auth.users.id` (opcjonalnie)
* `audit_log.card_id` N–1 `flashcards.id` (opcjonalnie)
* `event_log.user_id` N–1 `auth.users.id`

Kardynalności:

* Użytkownik **ma wiele** `flashcards`
* Użytkownik **ma jeden** `user_settings`
* Użytkownik **ma wiele** wpisów `user_daily_progress` (po dacie)
* `audit_log` i `event_log` **opisują zdarzenia** powiązane z użytkownikiem i opcjonalnie konkretną kartą.

---

# 3. Indeksy

**`flashcards`**

* **Unikalność deduplikacji:**
  `UNIQUE (user_id, content_hash) WHERE deleted_at IS NULL`
* **Lookup deduplikacyjny (wspomagający):**
  `INDEX (user_id, content_hash)`
* **Lista „Moje fiszki” (sortowanie domyślne):**
  `INDEX (user_id, created_at DESC, id DESC)`
* **Kolejka SRS (due):**
  `INDEX (user_id, due_at) WHERE state IN ('learning','review') AND deleted_at IS NULL`
* **Nowe karty (promocja FIFO / dzienne limity):**
  `INDEX (user_id, introduced_on) WHERE deleted_at IS NULL`

**`user_daily_progress`**

* **PK:** `(user_id, date_utc)` \*(wystarcza dla zapytań dziennych)\`

**`event_log`**

* `INDEX (event_name, created_at DESC)`
* `INDEX (user_id, created_at DESC)`
* `INDEX (request_id)` *(idempotencja/diagnoza)*

**`audit_log`**

* `INDEX (created_at DESC)`
* `INDEX (acted_by, created_at DESC)`
* `INDEX (card_id)`

**`profiles` / `user_settings`**

* PK/UK na `user_id` (wbudowane)

---

# 4. Zasady PostgreSQL (RLS, GRANT/REVOKE)

> Poniższe polityki zakładają środowisko Supabase (role `authenticated`, `anon`, `service_role`) i wykorzystanie `auth.uid()`.

### Uogólnione:

* `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
* `REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;`

---

### `profiles`

* **RLS:**

  * `SELECT` tylko własny rekord: `USING (user_id = auth.uid())`
  * `INSERT`/`UPDATE`: tylko dla `user_id = auth.uid()` (np. ustawienie `is_admin` kontrolowane poza RLS)
* **GRANTS:**

  * `GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;`

---

### `flashcards`

* **RLS:**

  * `SELECT`: `USING (user_id = auth.uid() AND deleted_at IS NULL)` *(użytkownik nie widzi soft-deleted)*
  * `INSERT`: `WITH CHECK (user_id = auth.uid())`
  * `UPDATE` (edycja treści): `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL)`

    * Dostępną edycję kolumn ograniczają uprawnienia (patrz GRANTS).
  * `DELETE`: brak (soft delete wyłącznie przez RPC)
* **GRANTS:**

  * `GRANT SELECT, INSERT ON flashcards TO authenticated;`
  * `GRANT UPDATE (front, back) ON flashcards TO authenticated;`
  * `REVOKE UPDATE (state, due_at, interval_days, ease_factor, reps, lapses, last_reviewed_at, last_rating, introduced_on, deleted_at, source, content_hash, created_at, updated_at, user_id) FROM authenticated;`
* **Uwagi:**

  * Funkcje RPC `review_flashcard`, `save_flashcards`, `promote_new_cards_for_today`, `delete_flashcard`, `restore_or_merge_flashcard` działają jako `SECURITY DEFINER` (właściciel tabel), więc mogą modyfikować kolumny SRS/`deleted_at` i obsłużyć MERGE/RESTORE, a także logować do `audit_log`.
  * `ALTER TABLE flashcards FOR ROW LEVEL SECURITY` *(domyślnie owner omija RLS; brak `FORCE` by RPC właściciela mogły ominąć RLS)*.

---

### `user_settings`

* **RLS:**

  * `SELECT/INSERT/UPDATE`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
* **GRANTS:**

  * `GRANT SELECT, INSERT, UPDATE ON user_settings TO authenticated;`

---

### `user_daily_progress`

* **RLS:**

  * `SELECT/INSERT/UPDATE`: `USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())`
* **GRANTS:**

  * `GRANT SELECT, INSERT, UPDATE ON user_daily_progress TO authenticated;`

---

### `event_log`

* **RLS:**

  * `INSERT`: `WITH CHECK (user_id = auth.uid())`
  * `SELECT`: własne zdarzenia: `USING (user_id = auth.uid())`
  * Dodatkowa polityka admina (SELECT wszystkie): `USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin))`
* **GRANTS:**

  * `GRANT SELECT, INSERT ON event_log TO authenticated;`

---

### `audit_log`

* **RLS:**

  * `SELECT`: tylko admin: `USING (EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.is_admin))`
  * `INSERT`: brak dla `authenticated` – wyłącznie przez funkcje `SECURITY DEFINER`
* **GRANTS:**

  * `GRANT SELECT ON audit_log TO authenticated;` *(efektywnie ograniczone RLS do adminów)*

---

### Funkcje/triggery

* `GRANT EXECUTE ON FUNCTION canonicalize_text(TEXT) TO PUBLIC;`
* Triggery `set_updated_at`, `prevent_update_soft_deleted` – instalowane na odpowiednich tabelach.
  *(Brak dodatkowych GRANTS – działają w kontekście tabel.)*

---

# 5. Dodatkowe uwagi / wyjaśnienia

* **Kanoniczna treść i deduplikacja:**
  `canonicalize_text` implementuje `btrim` + kompresję białych znaków + `lower()`. NFC wykonywane jest po stronie backendu; DB zapewnia spójność przez `content_hash` i `CHECK (canonicalize_text(front) <> canonicalize_text(back))`.
  Unikalność `UNIQUE (user_id, content_hash) WHERE deleted_at IS NULL` realizuje deduplikację w całej bibliotece użytkownika, ignorując pozycje soft-deleted (umożliwia `restore`/`merge`).

* **SRS – modyfikacje wyłącznie przez RPC:**
  Użytkownik może edytować tylko `front/back`. Kolumny SRS, `deleted_at`, `introduced_on` i `source` są modyfikowane wyłącznie przez RPC (`SECURITY DEFINER`) z audytem.
  Domyślne wartości SRS przy wstawieniu nowej karty: `state='new'`, `interval_days=0`, `ease_factor=2.50`, `reps=0`, `lapses=0`, `due_at=NULL`, `introduced_on=NULL`.

* **Promocja „nowych” kart:**
  RPC `promote_new_cards_for_today` ustawia `introduced_on = current_date AT TIME ZONE 'UTC'` (typ `DATE`), wybierając FIFO po `(created_at ASC, id ASC)` i respektując `user_settings.new_limit` oraz `user_daily_progress.new_introduced`.

* **Kolejka nauki:**
  Zapytania o **due** korzystają z indeksu częściowego `(user_id, due_at)` dla `state IN ('learning','review')` i `deleted_at IS NULL`. Nowe karty kontrolowane przez `introduced_on` oraz dzienne limity.

* **Telemetria/KPI:**
  `event_log` rejestruje:

  * `generation`: `properties.returned_count` (rozmiar batcha) + opcjonalnie `request_id`
  * `save`: sumy per źródło `manual/ai/ai_edited` dla batcha
    Widok `kpi_totals` dostarcza globalne agregaty (dla admina).

* **Soft delete i przywracanie:**
  Usuwanie kart wykonuje RPC (ustawia `deleted_at`). `prevent_update_soft_deleted` blokuje zwykłe `UPDATE` na rekordach usuniętych. `restore/merge` resetuje SRS do `'new'` i czyści `introduced_on` zgodnie z ustaleniami.

* **Normalizacja i walidacje:**
  Walidacje limitów znaków i `front <> back` znajdują się w DB (CHECK) i są duplikowane na FE/BE. Wszystkie znaczniki czasu jako `TIMESTAMPTZ` (UTC), dzień raportowy w `user_daily_progress` i `introduced_on` jako `DATE` w UTC.

* **Lista „Moje fiszki”:**
  Domyślne sortowanie po `created_at DESC, id DESC`; `created_at` jest stabilne (edycja nie zmienia kolejności).

* **Bezpieczeństwo admina:**
  Operacje na cudzych rekordach wyłącznie poprzez RPC z `SECURITY DEFINER` i `audit_log`. `SELECT` globalny do metryk poprzez RLS (rola admina z `profiles.is_admin = true`).

# 6. Tabele referencyjne (auth) – Supabase (read-only)

> Schemat `auth` jest zarządzany przez Supabase i **nie podlega naszym migracjom**. Poniżej minimalny opis na potrzeby odniesień (FK) i RLS.

### 6.1. Tabele i kolumny wykorzystywane

#### `auth.users`

* `id UUID PK` – **jedyny** klucz, do którego odwołują się nasze FK.
* *(Pozostałe kolumny – email, metadane itp. – są zarządzane przez Supabase i nie są częścią naszego schematu aplikacyjnego.)*

#### *(opcjonalnie informacyjnie)* `auth.identities`

* Relacja: wiele → jeden do `auth.users.id`.
* Brak bezpośrednich FK z naszego schematu (tylko świadomość istnienia przy integracjach SSO).

### 6.2. Relacje z naszym schematem

* `auth.users.id` **1 → 1** `public.profiles.user_id`
* `auth.users.id` **1 → 1** `public.user_settings.user_id`
* `auth.users.id` **1 → N** `public.flashcards.user_id`
* `auth.users.id` **1 → N** `public.user_daily_progress.user_id`
* `auth.users.id` **1 → N** `public.event_log.user_id`
* `auth.users.id` **1 → N** `public.audit_log.acted_by` / `public.audit_log.target_user_id`

### 6.3. Uprawnienia i RLS

* RLS/GRANTS na `auth.*` są zarządzane przez Supabase – **nie zmieniamy ich**.
* W politykach RLS naszych tabel używamy `auth.uid()` do powiązania wierszy z `auth.users.id`.

### 6.4. Wskazówki migracyjne / dev

* **Nie** tworzymy ani nie modyfikujemy tabel w `auth`.
* Na lokalne testy bez Supabase można zastosować **tymczasowy stub**: `auth.users(id UUID PRIMARY KEY)` wyłącznie w środowisku dev (nigdy w prod), aby zaspokoić zależności FK.
