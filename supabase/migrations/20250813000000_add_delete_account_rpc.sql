--
-- migration: add delete account RPC function
-- purpose: enable account deletion functionality via RPC
-- affected objects:
--   - function: delete_user_account_rpc
--   - grants: execute permission for authenticated users

begin;

-- function: delete user account and all associated data via RPC
create or replace function public.delete_user_account_rpc(account_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  -- verify the user is deleting their own account
  if auth.uid() != account_user_id then
    raise exception 'can only delete own account';
  end if;
  
  -- verify user exists
  if not exists (
    select 1 from auth.users where id = account_user_id
  ) then
    raise exception 'user not found';
  end if;
  
  -- delete all user data in the correct order (respecting foreign key constraints)
  
  -- 1. Delete audit log entries (acted_by references)
  delete from public.audit_log where acted_by = account_user_id;
  
  -- 2. Delete event log entries
  delete from public.event_log where user_id = account_user_id;
  
  -- 3. Delete user daily progress
  delete from public.user_daily_progress where user_id = account_user_id;
  
  -- 4. Delete user settings
  delete from public.user_settings where user_id = account_user_id;
  
  -- 5. Delete all flashcards (including soft-deleted)
  delete from public.flashcards where user_id = account_user_id;
  
  -- 6. Delete profile
  delete from public.profiles where user_id = account_user_id;
  
  -- Note: The auth.users record will be deleted by Supabase Admin API
  -- This function only handles the application data
end;
$$;

-- grant execute permission on the RPC function
grant execute on function public.delete_user_account_rpc(uuid) to authenticated;

commit;
