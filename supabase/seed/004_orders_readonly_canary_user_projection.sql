-- Minimal, idempotent public.users projection for the Orders Read-only canaries.
-- This fixture validates auth.users but never writes to it.
-- Transaction ownership belongs to scripts/execute-orders-readonly-canary-user-projection.js.

do $$
declare
  auth_client_email text;
  auth_professional_email text;
  public_client_role text;
  public_professional_role text;
  conflicting_email_id uuid;
begin
  select lower(email)
    into auth_client_email
    from auth.users
   where id = '826dde36-c959-4ab6-a26f-586bf82cdb7a';

  if auth_client_email is distinct from 'cliente@doke.local' then
    raise exception 'Expected client canary does not exist in auth.users or has an unexpected email.';
  end if;

  select lower(email)
    into auth_professional_email
    from auth.users
   where id = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';

  if auth_professional_email is distinct from 'profissional@doke.local' then
    raise exception 'Expected professional canary does not exist in auth.users or has an unexpected email.';
  end if;

  select role
    into public_client_role
    from public.users
   where id = '826dde36-c959-4ab6-a26f-586bf82cdb7a';

  if public_client_role is not null and public_client_role <> 'client' then
    raise exception 'Existing public client canary has an unexpected role.';
  end if;

  select role
    into public_professional_role
    from public.users
   where id = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';

  if public_professional_role is not null and public_professional_role <> 'professional' then
    raise exception 'Existing public professional canary has an unexpected role.';
  end if;

  select id
    into conflicting_email_id
    from public.users
   where lower(email) = 'cliente@doke.local'
     and id <> '826dde36-c959-4ab6-a26f-586bf82cdb7a'
   limit 1;

  if conflicting_email_id is not null then
    raise exception 'Client canary email belongs to another public.users record.';
  end if;

  select id
    into conflicting_email_id
    from public.users
   where lower(email) = 'profissional@doke.local'
     and id <> '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4'
   limit 1;

  if conflicting_email_id is not null then
    raise exception 'Professional canary email belongs to another public.users record.';
  end if;
end
$$;

insert into public.users (id, email, role, status) values
  ('826dde36-c959-4ab6-a26f-586bf82cdb7a', 'cliente@doke.local', 'client', 'active'),
  ('3fd0113d-dc9b-4cc3-b67e-e7f611f352c4', 'profissional@doke.local', 'professional', 'active')
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();
