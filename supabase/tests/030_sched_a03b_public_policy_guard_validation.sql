begin;

do $$
declare
  v_service_bypass boolean;
  v_violation_count integer;
begin
  select rolbypassrls
    into v_service_bypass
  from pg_roles
  where rolname = 'service_role';

  if v_service_bypass is distinct from true then
    raise exception 'sched_a03b_service_role_bypass_missing';
  end if;

  select count(*)
    into v_violation_count
  from (
    values
      ('schedule_availability_rules'::text, 'schedule_availability_rules_browser_deny_all'::text),
      ('schedule_reservations'::text, 'schedule_reservations_browser_deny_all'::text)
  ) expected(table_name, policy_name)
  where not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_policy p on p.polrelid = c.oid
    where n.nspname = 'public'
      and c.relname = expected.table_name
      and c.relrowsecurity
      and p.polname = expected.policy_name
      and p.polpermissive = false
      and p.polcmd = '*'
      and p.polroles @> array[
        (select oid from pg_roles where rolname = 'anon'),
        (select oid from pg_roles where rolname = 'authenticated')
      ]::oid[]
      and pg_get_expr(p.polqual, p.polrelid) = 'false'
      and pg_get_expr(p.polwithcheck, p.polrelid) = 'false'
  );

  if v_violation_count <> 0 then
    raise exception 'sched_a03b_deny_policy_contract_violation:%', v_violation_count;
  end if;

  select count(*)
    into v_violation_count
  from (
    values
      ('anon'::text, 'schedule_availability_rules'::text),
      ('anon'::text, 'schedule_reservations'::text),
      ('authenticated'::text, 'schedule_availability_rules'::text),
      ('authenticated'::text, 'schedule_reservations'::text)
  ) browser(role_name, table_name)
  where has_table_privilege(
    browser.role_name,
    format('public.%I', browser.table_name),
    'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'
  );

  if v_violation_count <> 0 then
    raise exception 'sched_a03b_browser_privilege_regression:%', v_violation_count;
  end if;

  select count(*)
    into v_violation_count
  from (
    values
      ('schedule_availability_rules'::text),
      ('schedule_reservations'::text)
  ) authority(table_name)
  where not has_table_privilege(
    'service_role',
    format('public.%I', authority.table_name),
    'SELECT,INSERT,UPDATE,DELETE'
  );

  if v_violation_count <> 0 then
    raise exception 'sched_a03b_service_role_crud_missing:%', v_violation_count;
  end if;
end
$$;

select json_build_object(
  'sched_a03b_policy_guard', true,
  'browser_access', 'denied',
  'service_role_bypass_rls', (
    select rolbypassrls from pg_roles where rolname = 'service_role'
  ),
  'platform_tables_without_policy', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (
        select 1 from pg_policy p where p.polrelid = c.oid
      )
  )
) as sched_a03b_validation;

rollback;
