-- Doke SEC-001 public data authority validation.
-- Execute in staging. This file is read-only except where a caller wraps its own
-- fixtures in a transaction and rolls them back.

-- Every public table must have RLS enabled.
select c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by c.relname;

-- Browser roles must not retain structural privileges on the hardened surfaces.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  and table_name in (
    'notifications','audit_logs','service_categories','favorites','availability_slots',
    'reviews','message_attachments','reports','budgets','communities',
    'community_members','community_posts'
  )
order by grantee, table_name, privilege_type;

-- Notification RPCs are authenticated-only and use a safe lookup path.
select p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
       p.prosecdef as security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_transaction_notification', 'update_own_notification_state')
order by p.proname;

-- The public client summary remains callable without a privileged definer context.
select p.proname,
       p.prosecdef as security_definer,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute
from pg_proc p
where p.oid = 'public.get_public_client_profile_summary(uuid)'::regprocedure;

-- The service-media bucket must have no broad public listing policy.
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname like 'service_media_bucket_%'
order by policyname;


-- No browser or service runtime role retains structural table privileges.
select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated', 'service_role')
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
order by grantee, table_name, privilege_type;

-- Every browser DML grant must have a matching RLS policy for that role or PUBLIC.
with grants as (
  select grantee, table_name, privilege_type
  from information_schema.role_table_grants
  where table_schema = 'public'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('SELECT', 'INSERT', 'UPDATE', 'DELETE')
), policy_support as (
  select tablename, role_name, cmd
  from pg_policies policy
  cross join lateral unnest(policy.roles) as role_name
  where policy.schemaname = 'public'
)
select grant_row.grantee, grant_row.table_name, grant_row.privilege_type
from grants grant_row
where not exists (
  select 1
  from policy_support policy
  where policy.tablename = grant_row.table_name
    and (policy.role_name = grant_row.grantee or policy.role_name = 'public')
    and (policy.cmd = 'ALL' or policy.cmd = grant_row.privilege_type)
)
order by grant_row.grantee, grant_row.table_name, grant_row.privilege_type;

-- Every authenticated SECURITY DEFINER function must pin an immutable lookup path.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and has_function_privilege('authenticated', p.oid, 'EXECUTE')
  and p.proconfig is distinct from array['search_path=pg_catalog']
order by p.proname;
