-- Doke SEC-001 / identity batch 1.
-- Removes unnecessary RLS bypass from account-role helper functions.

create or replace function public.current_user_role()
returns text
language plpgsql
stable
security invoker
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    return 'guest';
  end if;

  select case when u.status = 'active' then u.role else 'guest' end
    into v_role
    from public.users u
   where u.id = v_uid;

  return coalesce(v_role, 'guest');
end;
$$;

create or replace function public.is_active_admin_or_moderator()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select public.current_user_role() in ('admin', 'moderator')
$$;

revoke all on function public.current_user_role() from public;
revoke all on function public.is_active_admin_or_moderator() from public;
grant execute on function public.current_user_role() to anon, authenticated, service_role;
grant execute on function public.is_active_admin_or_moderator() to anon, authenticated, service_role;
