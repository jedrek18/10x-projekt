--
-- migration: add SRS update RPC function
-- purpose: enable SRS field updates for flashcards via RPC
-- affected objects:
--   - function: update_flashcard_srs_rpc
--   - grants: execute permission for authenticated users

begin;

-- function: update SRS fields for flashcard via RPC
create or replace function public.update_flashcard_srs_rpc(
  card_id uuid,
  new_state text,
  new_due_at timestamptz,
  new_interval_days int,
  new_ease_factor numeric,
  new_reps int,
  new_lapses int,
  new_last_reviewed_at timestamptz,
  new_last_rating smallint,
  new_introduced_on date default null
)
returns void
language plpgsql
security definer
as $$
begin
  -- check if user owns the card and it's not deleted
  if not exists (
    select 1 from public.flashcards 
    where id = card_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'flashcard not found or access denied';
  end if;
  
  -- validate state
  if new_state not in ('new', 'learning', 'review', 'relearning') then
    raise exception 'invalid state: %', new_state;
  end if;
  
  -- validate rating
  if new_last_rating is not null and (new_last_rating < 0 or new_last_rating > 3) then
    raise exception 'invalid rating: %', new_last_rating;
  end if;
  
  -- validate ease factor
  if new_ease_factor < 1.30 or new_ease_factor > 3.00 then
    raise exception 'invalid ease factor: %', new_ease_factor;
  end if;
  
  -- validate non-negative values
  if new_interval_days < 0 or new_reps < 0 or new_lapses < 0 then
    raise exception 'interval_days, reps, and lapses must be non-negative';
  end if;
  
  -- perform SRS update
  update public.flashcards 
  set 
    state = new_state,
    due_at = new_due_at,
    interval_days = new_interval_days,
    ease_factor = new_ease_factor,
    reps = new_reps,
    lapses = new_lapses,
    last_reviewed_at = new_last_reviewed_at,
    last_rating = new_last_rating,
    introduced_on = coalesce(new_introduced_on, introduced_on)
  where id = card_id and user_id = auth.uid() and deleted_at is null;
  
  if not found then
    raise exception 'flashcard not found or already deleted';
  end if;
end;
$$;

-- grant execute permission on the RPC function
grant execute on function public.update_flashcard_srs_rpc(uuid, text, timestamptz, int, numeric, int, int, timestamptz, smallint, date) to authenticated;

commit;
