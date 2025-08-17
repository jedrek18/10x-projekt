--
-- migration: fix restore trigger to allow restoring soft-deleted flashcards
-- purpose: modify prevent_update_soft_deleted trigger to allow setting deleted_at = null
-- affected objects:
--   - function: prevent_update_soft_deleted

begin;

-- modify trigger function to allow restoring (setting deleted_at = null)
create or replace function public.prevent_update_soft_deleted()
returns trigger
language plpgsql
as $$
begin
  -- allow restore operation (setting deleted_at = null)
  if old.deleted_at is not null and new.deleted_at is null then
    return new;
  end if;
  
  -- prevent other updates to soft-deleted flashcards
  if old.deleted_at is not null then
    raise exception 'cannot update a soft-deleted flashcard (id=%)', old.id;
  end if;
  
  return new;
end;
$$;

commit;
