-- Doke SEC-001 client profile authority validation.
-- Execute only in local/staging. Every mutation is transaction-scoped and rolled back.

begin;

select set_config('doke.test.client_id', (
  select id::text from public.users where role = 'client' and status = 'active' order by created_at limit 1
), true);
select set_config('doke.test.professional_id', (
  select id::text from public.users where role = 'professional' and status = 'active' order by created_at limit 1
), true);
select set_config('doke.test.admin_id', (
  select id::text from public.users where role = 'admin' and status = 'active' order by created_at limit 1
), true);

do $$
begin
  if nullif(current_setting('doke.test.client_id', true), '') is null
     or nullif(current_setting('doke.test.professional_id', true), '') is null
     or nullif(current_setting('doke.test.admin_id', true), '') is null then
    raise exception 'Canary prerequisite failure: existing active client, professional and admin accounts are required.';
  end if;
end
$$;

-- Anon cannot access private metrics or mutations, but can read the minimal public projection.
set local role anon;
do $$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.client_profiles limit 1;
  exception when insufficient_privilege then
    v_denied := true;
  end;
  if not v_denied then
    raise exception 'anon_private_read: anon read client_profiles.';
  end if;
  if has_table_privilege('anon', 'public.client_profiles', 'INSERT,UPDATE,DELETE') then
    raise exception 'anon_private_write: anon can mutate client_profiles.';
  end if;
  perform 1 from public.client_profile_public_summaries limit 1;
end
$$;
reset role;

-- Client owner sees exactly one private row. Forged JWT metadata does not expand access.
select set_config('request.jwt.claim.sub', current_setting('doke.test.client_id'), true);
select set_config('request.jwt.claims', jsonb_build_object(
  'sub', current_setting('doke.test.client_id'),
  'user_metadata', jsonb_build_object('role', 'admin'),
  'app_metadata', jsonb_build_object('role', 'admin')
)::text, true);
set local role authenticated;
do $$
declare
  v_visible integer;
  v_cross integer;
  v_write_denied boolean := false;
begin
  select count(*) into v_visible from public.client_profiles;
  select count(*) into v_cross
  from public.client_profiles
  where user_id = current_setting('doke.test.professional_id')::uuid;
  if v_visible <> 1 or v_cross <> 0 then
    raise exception 'owner_and_forged_metadata: visible %, cross %.', v_visible, v_cross;
  end if;

  begin
    update public.client_profiles
       set orders_count = orders_count + 1
     where user_id = current_setting('doke.test.client_id')::uuid;
  exception when insufficient_privilege then
    v_write_denied := true;
  end;
  if not v_write_denied then
    raise exception 'client_direct_update: authenticated owner changed server-owned metrics.';
  end if;
end
$$;
reset role;

-- Professional status grants no cross-account client access.
select set_config('request.jwt.claim.sub', current_setting('doke.test.professional_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('doke.test.professional_id'))::text, true);
set local role authenticated;
do $$
declare
  v_visible integer;
  v_cross integer;
begin
  select count(*) into v_visible from public.client_profiles;
  select count(*) into v_cross
  from public.client_profiles
  where user_id = current_setting('doke.test.client_id')::uuid;
  if v_visible <> 1 or v_cross <> 0 then
    raise exception 'professional_cross_account_read: visible %, cross %.', v_visible, v_cross;
  end if;
end
$$;
reset role;

-- Admin/support authority is not a generic table-wide browser grant.
select set_config('request.jwt.claim.sub', current_setting('doke.test.admin_id'), true);
select set_config('request.jwt.claims', jsonb_build_object('sub', current_setting('doke.test.admin_id'))::text, true);
set local role authenticated;
do $$
declare
  v_visible integer;
  v_cross integer;
begin
  select count(*) into v_visible from public.client_profiles;
  select count(*) into v_cross
  from public.client_profiles
  where user_id = current_setting('doke.test.client_id')::uuid;
  if v_visible <> 1 or v_cross <> 0 then
    raise exception 'operator_cross_account_read: visible %, cross %.', v_visible, v_cross;
  end if;
end
$$;
reset role;

-- Service role owns controlled materialization/reconciliation, not schema-destructive privileges.
do $$
begin
  if not has_table_privilege('service_role', 'public.client_profiles', 'SELECT')
     or not has_table_privilege('service_role', 'public.client_profiles', 'INSERT')
     or not has_table_privilege('service_role', 'public.client_profiles', 'UPDATE')
     or not has_table_privilege('service_role', 'public.client_profiles', 'DELETE') then
    raise exception 'service_role_crud: service_role lacks client metric authority.';
  end if;
  if has_table_privilege('service_role', 'public.client_profiles', 'TRUNCATE')
     or has_table_privilege('service_role', 'public.client_profiles', 'REFERENCES')
     or has_table_privilege('service_role', 'public.client_profiles', 'TRIGGER') then
    raise exception 'service_role_minimum_grants: service_role retains schema-destructive privileges.';
  end if;
  if has_function_privilege('anon', 'public.refresh_client_profile_metrics_internal(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.refresh_client_profile_metrics_internal(uuid)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.refresh_client_profile_metrics_internal(uuid)', 'EXECUTE') then
    raise exception 'service_role_rpc: reconciliation RPC permissions are invalid.';
  end if;
end
$$;

set local role service_role;
update public.client_profiles
   set orders_count = orders_count + 1,
       updated_at = now()
 where user_id = current_setting('doke.test.client_id')::uuid;
do $$
declare
  v_private integer;
  v_public integer;
begin
  select orders_count into v_private
  from public.client_profiles
  where user_id = current_setting('doke.test.client_id')::uuid;
  select completed_orders_count into v_public
  from public.client_profile_public_summaries
  where user_id = current_setting('doke.test.client_id')::uuid;
  if v_private is distinct from v_public then
    raise exception 'service_role_projection_sync: private %, public %.', v_private, v_public;
  end if;
end
$$;
reset role;

-- Projection schema is aggregate-only and contains no sensitive client fields.
do $$
declare
  v_unexpected integer;
begin
  select count(*) into v_unexpected
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'client_profile_public_summaries'
    and column_name not in ('user_id', 'completed_orders_count', 'average_rating', 'reviews_count', 'updated_at');
  if v_unexpected <> 0 then
    raise exception 'public_projection_columns: % unexpected columns.', v_unexpected;
  end if;
end
$$;

-- Suspension removes the public projection and reactivation restores it.
update public.users
   set status = 'suspended'
 where id = current_setting('doke.test.professional_id')::uuid;
do $$
begin
  if exists (
    select 1 from public.client_profile_public_summaries
    where user_id = current_setting('doke.test.professional_id')::uuid
  ) then
    raise exception 'suspension_removes_public_summary: suspended account remains public.';
  end if;
end
$$;
update public.users
   set status = 'active'
 where id = current_setting('doke.test.professional_id')::uuid;

-- Isolated private-row deletion cannot leave a stale public summary.
delete from public.client_profiles
where user_id = current_setting('doke.test.client_id')::uuid;
do $$
begin
  if exists (
    select 1 from public.client_profile_public_summaries
    where user_id = current_setting('doke.test.client_id')::uuid
  ) then
    raise exception 'delete_removes_public_summary: stale public summary remains.';
  end if;
end
$$;

-- Materialization remains private and still creates client_profiles for new Auth users.
do $$
declare
  v_definition text;
begin
  select pg_get_functiondef('private.materialize_auth_account(uuid)'::regprocedure)
    into v_definition;
  if v_definition not like '%insert into public.client_profiles%' then
    raise exception 'account_materialization: private.materialize_auth_account no longer creates client_profiles.';
  end if;
  if has_function_privilege('anon', 'private.materialize_auth_account(uuid)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.materialize_auth_account(uuid)', 'EXECUTE') then
    raise exception 'account_materialization: private materializer is browser-callable.';
  end if;
end
$$;

rollback;
