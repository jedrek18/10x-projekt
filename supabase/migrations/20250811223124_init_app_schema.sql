--
-- migration: initialize application database schema (profiles, flashcards, settings, progress, logs)
-- purpose:
--   - create core tables with constraints and indexes
--   - install helper extensions/functions and triggers
--   - enable row level security (rls) and define granular policies per role/action
--   - set explicit grants aligned with supabase roles
-- affected objects:
--   - tables: profiles, flashcards, user_settings, user_daily_progress, audit_log, event_log
--   - view: kpi_totals
--   - functions: canonicalize_text, set_updated_at(), prevent_update_soft_deleted()
--   - triggers: set_updated_at on selected tables; prevent_update_soft_deleted on flashcards
-- special considerations:
--   - all sql is intentionally lowercase
--   - destructive permissions revocation is commented and re-granted narrowly
--   - rls is enabled on all tables; policies are defined per action and per role (anon/authenticated)
--   - flashcards soft delete is enforced via rpc; direct updates on soft-deleted rows are blocked

begin;

-- extensions
-- pgcrypto provides gen_random_uuid() and digest() used for uuids and content hashing
create extension if not exists pgcrypto;

-- helper function: canonicalize_text
-- normalizes text for hashing and comparison: trim, collapse whitespace, lowercase
create or replace function public.canonicalize_text(t text)
returns text
language sql
immutable
returns null on null input
as $$
  select lower(regexp_replace(btrim(t), '\\s+', ' ', 'g'));
$$;

-- trigger function: generic updated_at maintainer
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- trigger function: prevent updates to soft-deleted flashcards
create or replace function public.prevent_update_soft_deleted()
returns trigger
language plpgsql
as $$
begin
  if old.deleted_at is not null then
    raise exception 'cannot update a soft-deleted flashcard (id=%)', old.id;
  end if;
  return new;
end;
$$;

-- tables

-- profiles: one-to-one with auth.users; stores role information
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- flashcards: user-owned study cards with srs fields and soft-delete support
create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid() not null,
  user_id uuid not null references auth.users(id),
  front text not null,
  back text not null,
  source text not null check (source in ('ai','ai_edited','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz null,
  -- srs fields
  state text not null default 'new' check (state in ('new','learning','review','relearning')),
  due_at timestamptz null,
  interval_days int not null default 0 check (interval_days >= 0),
  ease_factor numeric(5,2) not null default 2.50 check (ease_factor >= 1.30 and ease_factor <= 3.00),
  reps int not null default 0 check (reps >= 0),
  lapses int not null default 0 check (lapses >= 0),
  last_reviewed_at timestamptz null,
  last_rating smallint null check (last_rating between 0 and 3),
  introduced_on date null,
  -- generated hash for deduplication based on canonicalized content
  content_hash bytea generated always as (
    digest(
      public.canonicalize_text(front) || '|' || public.canonicalize_text(back),
      'sha256'
    )
  ) stored not null,
  -- prevent identical front/back after canonicalization
  constraint flashcards_front_back_distinct check (
    public.canonicalize_text(front) <> public.canonicalize_text(back)
  )
);

-- user_settings: per-user configurable settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) not null,
  daily_goal int not null default 20 check (daily_goal between 1 and 200),
  new_limit int not null default 10 check (new_limit between 0 and 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- user_daily_progress: daily counters per user and date (utc)
create table if not exists public.user_daily_progress (
  user_id uuid not null references auth.users(id),
  date_utc date not null,
  reviews_done int not null default 0 check (reviews_done >= 0),
  new_introduced int not null default 0 check (new_introduced >= 0),
  goal_override int null check (goal_override >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_daily_progress_pkey primary key (user_id, date_utc)
);

-- audit_log: security/audit trail for admin or privileged operations
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid() not null,
  acted_by uuid not null references auth.users(id),
  action text not null,
  card_id uuid null references public.flashcards(id),
  target_user_id uuid null references auth.users(id),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- event_log: telemetry/kpi events
create table if not exists public.event_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id),
  event_name text not null check (event_name in ('generation','save')),
  request_id uuid null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- view: kpi_totals (aggregates). note: visibility is governed by rls on event_log.
create or replace view public.kpi_totals as
  select
    coalesce(sum(case when event_name = 'generation' then (properties->>'returned_count')::bigint else 0 end), 0) as generated_total,
    coalesce(sum(case when event_name = 'save' then (properties->>'manual')::bigint else 0 end), 0) as saved_manual_total,
    coalesce(sum(case when event_name = 'save' then (properties->>'ai')::bigint else 0 end), 0) as saved_ai_total,
    coalesce(sum(case when event_name = 'save' then (properties->>'ai_edited')::bigint else 0 end), 0) as saved_ai_edited_total
  from public.event_log;

-- triggers
create trigger flashcards_set_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

create trigger user_settings_set_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

create trigger udp_set_updated_at
before update on public.user_daily_progress
for each row execute function public.set_updated_at();

create trigger flashcards_prevent_update_soft_deleted
before update on public.flashcards
for each row execute function public.prevent_update_soft_deleted();

-- indexes

-- flashcards: deduplication uniqueness on active rows (ignores soft-deleted)
create unique index if not exists flashcards_user_content_hash_active_uk
  on public.flashcards(user_id, content_hash)
  where deleted_at is null;

-- flashcards: supporting lookup by user/content_hash
create index if not exists flashcards_user_content_hash_idx
  on public.flashcards(user_id, content_hash);

-- flashcards: default listing order (stable)
create index if not exists flashcards_user_created_id_desc_idx
  on public.flashcards(user_id, created_at desc, id desc);

-- flashcards: srs due queue (only active learning/review)
create index if not exists flashcards_due_queue_idx
  on public.flashcards(user_id, due_at)
  where state in ('learning','review') and deleted_at is null;

-- flashcards: new cards promotion fifo / daily limits
create index if not exists flashcards_new_promotion_idx
  on public.flashcards(user_id, introduced_on)
  where deleted_at is null;

-- event_log: common access patterns
create index if not exists event_log_event_created_idx
  on public.event_log(event_name, created_at desc);

create index if not exists event_log_user_created_idx
  on public.event_log(user_id, created_at desc);

create index if not exists event_log_request_id_idx
  on public.event_log(request_id);

-- audit_log: admin queries
create index if not exists audit_log_created_desc_idx
  on public.audit_log(created_at desc);

create index if not exists audit_log_acted_by_created_desc_idx
  on public.audit_log(acted_by, created_at desc);

create index if not exists audit_log_card_id_idx
  on public.audit_log(card_id);

-- permissions hardening: start from least privilege and add grants selectively
-- caution: the following revocation removes default public privileges; ensure specific grants follow
revoke all on all tables in schema public from public;

-- rls: enable on all tables (no force; owner/rpc can bypass as needed)
alter table public.profiles enable row level security;
alter table public.flashcards enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_daily_progress enable row level security;
alter table public.event_log enable row level security;
alter table public.audit_log enable row level security;

-- rls policies (granular: per action, per role)

-- profiles policies
create policy profiles_select_authenticated
  on public.profiles for select
  to authenticated
  using (user_id = auth.uid());

create policy profiles_select_anon_deny
  on public.profiles for select
  to anon
  using (false);

create policy profiles_insert_authenticated
  on public.profiles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy profiles_insert_anon_deny
  on public.profiles for insert
  to anon
  with check (false);

create policy profiles_update_authenticated
  on public.profiles for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy profiles_update_anon_deny
  on public.profiles for update
  to anon
  using (false)
  with check (false);

-- flashcards policies
create policy flashcards_select_authenticated
  on public.flashcards for select
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy flashcards_select_anon_deny
  on public.flashcards for select
  to anon
  using (false);

create policy flashcards_insert_authenticated
  on public.flashcards for insert
  to authenticated
  with check (user_id = auth.uid());

create policy flashcards_insert_anon_deny
  on public.flashcards for insert
  to anon
  with check (false);

create policy flashcards_update_authenticated
  on public.flashcards for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and deleted_at is null);

create policy flashcards_update_anon_deny
  on public.flashcards for update
  to anon
  using (false)
  with check (false);

-- user_settings policies
create policy user_settings_select_authenticated
  on public.user_settings for select
  to authenticated
  using (user_id = auth.uid());

create policy user_settings_select_anon_deny
  on public.user_settings for select
  to anon
  using (false);

create policy user_settings_insert_authenticated
  on public.user_settings for insert
  to authenticated
  with check (user_id = auth.uid());

create policy user_settings_insert_anon_deny
  on public.user_settings for insert
  to anon
  with check (false);

create policy user_settings_update_authenticated
  on public.user_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_settings_update_anon_deny
  on public.user_settings for update
  to anon
  using (false)
  with check (false);

-- user_daily_progress policies
create policy udp_select_authenticated
  on public.user_daily_progress for select
  to authenticated
  using (user_id = auth.uid());

create policy udp_select_anon_deny
  on public.user_daily_progress for select
  to anon
  using (false);

create policy udp_insert_authenticated
  on public.user_daily_progress for insert
  to authenticated
  with check (user_id = auth.uid());

create policy udp_insert_anon_deny
  on public.user_daily_progress for insert
  to anon
  with check (false);

create policy udp_update_authenticated
  on public.user_daily_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy udp_update_anon_deny
  on public.user_daily_progress for update
  to anon
  using (false)
  with check (false);

-- event_log policies
create policy event_log_insert_authenticated
  on public.event_log for insert
  to authenticated
  with check (user_id = auth.uid());

create policy event_log_insert_anon_deny
  on public.event_log for insert
  to anon
  with check (false);

create policy event_log_select_own_authenticated
  on public.event_log for select
  to authenticated
  using (user_id = auth.uid());

-- admin can select all events
create policy event_log_select_admin_authenticated
  on public.event_log for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin
  ));

create policy event_log_select_anon_deny
  on public.event_log for select
  to anon
  using (false);

-- audit_log policies
create policy audit_log_select_admin_only
  on public.audit_log for select
  to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin
  ));

create policy audit_log_select_anon_deny
  on public.audit_log for select
  to anon
  using (false);

-- explicit denies for insert/update by app roles (only rpc/service_role should write)
create policy audit_log_insert_authenticated_deny
  on public.audit_log for insert
  to authenticated
  with check (false);

create policy audit_log_insert_anon_deny
  on public.audit_log for insert
  to anon
  with check (false);

-- grants

-- function visibility
grant execute on function public.canonicalize_text(text) to public;

-- profiles
grant select, insert, update on public.profiles to authenticated;

-- flashcards: restrict to content edits only
revoke update on public.flashcards from authenticated;
grant select, insert on public.flashcards to authenticated;
grant update (front, back) on public.flashcards to authenticated;

-- user_settings
grant select, insert, update on public.user_settings to authenticated;

-- user_daily_progress
grant select, insert, update on public.user_daily_progress to authenticated;

-- event_log
grant select, insert on public.event_log to authenticated;

-- audit_log: select allowed but limited by rls to admins
grant select on public.audit_log to authenticated;

-- kpi_totals view: no broad grant; admin/service can read via elevated role
-- (selection through the view still respects rls of event_log)

commit;


