-- Minimal, idempotent staging fixture for the Orders Read-only canary.
-- Transaction ownership belongs to scripts/execute-orders-readonly-canary-fixture.js.

do $$
declare
  actual_client_role text;
  actual_professional_role text;
begin
  select role
    into actual_client_role
    from public.users
   where id = '826dde36-c959-4ab6-a26f-586bf82cdb7a';

  if actual_client_role is distinct from 'client' then
    raise exception 'Orders Read-only client canary is missing or has an unexpected role.';
  end if;

  select role
    into actual_professional_role
    from public.users
   where id = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4';

  if actual_professional_role is distinct from 'professional' then
    raise exception 'Orders Read-only professional canary is missing or has an unexpected role.';
  end if;
end
$$;

insert into public.orders (
  id,
  client_id,
  professional_id,
  service_id,
  title,
  description,
  status,
  city,
  state
) values (
  '6f1de55f-6c67-4f5d-9c4f-26416b4e1301',
  '826dde36-c959-4ab6-a26f-586bf82cdb7a',
  '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4',
  null,
  'Orders Read-only canary fixture',
  'Minimal staging fixture used only to validate list and detail reads.',
  'requested',
  null,
  null
)
on conflict (id) do update set
  client_id = excluded.client_id,
  professional_id = excluded.professional_id,
  service_id = excluded.service_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  city = excluded.city,
  state = excluded.state,
  updated_at = now();
