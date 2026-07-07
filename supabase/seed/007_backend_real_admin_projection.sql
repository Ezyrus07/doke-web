-- Minimal, idempotent public.users projection for the Backend Real admin canary.
-- This fixture validates auth.users but never writes to it.
-- Transaction ownership belongs to scripts/execute-backend-real-admin-projection.js.

do $$
declare
  auth_admin_id uuid;
  auth_admin_count integer;
  public_admin_role text;
  conflicting_email_id uuid;
begin
  select count(*)
    into auth_admin_count
    from auth.users
   where lower(email) = 'admin@doke.local';

  if auth_admin_count <> 1 then
    raise exception 'Expected exactly one admin canary in auth.users.';
  end if;

  select id
    into auth_admin_id
    from auth.users
   where lower(email) = 'admin@doke.local'
   limit 1;

  select role
    into public_admin_role
    from public.users
   where id = auth_admin_id;

  if public_admin_role is not null and public_admin_role <> 'admin' then
    raise exception 'Existing public admin canary has an unexpected role.';
  end if;

  select id
    into conflicting_email_id
    from public.users
   where lower(email) = 'admin@doke.local'
     and id <> auth_admin_id
   limit 1;

  if conflicting_email_id is not null then
    raise exception 'Admin canary email belongs to another public.users record.';
  end if;
end
$$;

insert into public.users (id, email, role, status)
select id, 'admin@doke.local', 'admin', 'active'
  from auth.users
 where lower(email) = 'admin@doke.local'
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
