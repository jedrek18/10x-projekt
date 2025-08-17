--
-- migration: add soft delete RPC function and permissions
-- purpose: enable soft delete functionality for flashcards via RPC
-- affected objects:
--   - function: soft_delete_flashcard_rpc
--   - function: restore_flashcard_rpc
--   - grants: DELETE permission for authenticated users
--   - policies: DELETE policy for flashcards

begin;

-- function: soft delete flashcard via RPC
create or replace function public.soft_delete_flashcard_rpc(card_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- check if user owns the card
  if not exists (
    select 1 from public.flashcards 
    where id = card_id and user_id = auth.uid() and deleted_at is null
  ) then
    raise exception 'flashcard not found or access denied';
  end if;
  
  -- perform soft delete
  update public.flashcards 
  set deleted_at = now()
  where id = card_id and user_id = auth.uid() and deleted_at is null;
  
  if not found then
    raise exception 'flashcard not found or already deleted';
  end if;
end;
$$;

-- function: restore soft-deleted flashcard via RPC
create or replace function public.restore_flashcard_rpc(card_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- check if user owns the card
  if not exists (
    select 1 from public.flashcards 
    where id = card_id and user_id = auth.uid() and deleted_at is not null
  ) then
    raise exception 'flashcard not found or access denied';
  end if;
  
  -- perform restore
  update public.flashcards 
  set deleted_at = null
  where id = card_id and user_id = auth.uid() and deleted_at is not null;
  
  if not found then
    raise exception 'flashcard not found or not deleted';
  end if;
end;
$$;

-- grant execute permission on the RPC functions
grant execute on function public.soft_delete_flashcard_rpc(uuid) to authenticated;
grant execute on function public.restore_flashcard_rpc(uuid) to authenticated;

-- add DELETE policy for flashcards
create policy flashcards_delete_authenticated
  on public.flashcards for delete
  to authenticated
  using (user_id = auth.uid() and deleted_at is null);

create policy flashcards_delete_anon_deny
  on public.flashcards for delete
  to anon
  using (false);

-- grant DELETE permission on flashcards table
grant delete on public.flashcards to authenticated;

commit;
