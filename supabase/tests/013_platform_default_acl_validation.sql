-- Doke SEC-001 — read-only post-migration ACL and RLS validation.
-- This test intentionally does not attempt to alter platform-owned supabase_admin defaults.

do $$
declare
  violation_count integer;
begin
  select count(*) into violation_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not c.relrowsecurity;
  if violation_count > 0 then
    raise exception 'SEC_PLATFORM_ACL_PUBLIC_TABLE_WITHOUT_RLS:%', violation_count;
  end if;

  select count(*) into violation_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p')
    and not exists (
      select 1
      from pg_policy p
      where p.polrelid = c.oid
    );
  if violation_count > 0 then
    raise exception 'SEC_PLATFORM_ACL_PUBLIC_TABLE_WITHOUT_POLICY:%', violation_count;
  end if;

  select count(*) into violation_count
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'p', 'S')
    and pg_get_userbyid(c.relowner) = 'supabase_admin';
  if violation_count > 0 then
    raise exception 'SEC_PLATFORM_ACL_SUPABASE_ADMIN_OWNED_PUBLIC_OBJECT:%', violation_count;
  end if;

  select count(*) into violation_count
  from information_schema.role_usage_grants
  where object_schema = 'public'
    and object_type = 'SEQUENCE'
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  if violation_count > 0 then
    raise exception 'SEC_PLATFORM_ACL_BROWSER_SEQUENCE_GRANT:%', violation_count;
  end if;

  select count(*) into violation_count
  from pg_default_acl d
  join pg_roles owner_role on owner_role.oid = d.defaclrole
  left join pg_namespace n on n.oid = d.defaclnamespace
  cross join lateral aclexplode(d.defaclacl) acl
  left join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where owner_role.rolname = 'postgres'
    and n.nspname = 'public'
    and coalesce(grantee_role.rolname, 'PUBLIC') in ('PUBLIC', 'anon', 'authenticated');
  if violation_count > 0 then
    raise exception 'SEC_PLATFORM_ACL_POSTGRES_DEFAULT_NOT_FAIL_CLOSED:%', violation_count;
  end if;
end
$$;

select json_build_object(
  'public_tables', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  ),
  'tables_without_rls', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  ),
  'tables_without_policies', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
  ),
  'supabase_admin_owned_public_objects', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p', 'S')
      and pg_get_userbyid(c.relowner) = 'supabase_admin'
  ),
  'browser_sequence_grants', (
    select count(*)
    from information_schema.role_usage_grants
    where object_schema = 'public'
      and object_type = 'SEQUENCE'
      and grantee in ('PUBLIC', 'anon', 'authenticated')
  )
) as sec_platform_acl_validation;
