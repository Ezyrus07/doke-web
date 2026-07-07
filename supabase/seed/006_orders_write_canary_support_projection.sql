-- Minimal, idempotent public.users projection for the Orders Write support canary.
-- This fixture validates auth.users but never writes to it.
-- Transaction ownership belongs to scripts/execute-orders-write-canary-support-projection.js.

do $$
declare
  auth_support_email text;
  public_support_role text;
  conflicting_email_id uuid;
begin
  select lower(email)
    into auth_support_email
    from auth.users
   where id = 'fafbba6d-041c-4831-8c43-ad0af99107a8';

  if auth_support_email is distinct from 'suporte@doke.local' then
    raise exception 'Expected support canary does not exist in auth.users or has an unexpected email.';
  end if;

  select role
    into public_support_role
    from public.users
   where id = 'fafbba6d-041c-4831-8c43-ad0af99107a8';

  if public_support_role is not null and public_support_role <> 'support' then
    raise exception 'Existing public support canary has an unexpected role.';
  end if;

  select id
    into conflicting_email_id
    from public.users
   where lower(email) = 'suporte@doke.local'
     and id <> 'fafbba6d-041c-4831-8c43-ad0af99107a8'
   limit 1;

  if conflicting_email_id is not null then
    raise exception 'Support canary email belongs to another public.users record.';
  end if;
end
$$;

insert into public.users (id, email, role, status) values
  ('fafbba6d-041c-4831-8c43-ad0af99107a8', 'suporte@doke.local', 'support', 'active')
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
