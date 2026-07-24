-- Validation for migration 145_edge_function_abuse_guard.sql.
-- Safe to run after the migration; behavioral writes are rolled back.

begin;

do $validation$
declare
  v_table_oid oid := to_regclass('private.edge_function_rate_limit_buckets');
  v_function_oid oid := to_regprocedure(
    'public.consume_edge_function_rate_limit_internal(text,uuid,text,integer,integer)'
  );
  v_actor uuid := '00000000-0000-0000-0000-000000000145'::uuid;
  v_first jsonb;
  v_second jsonb;
  v_third jsonb;
begin
  if v_table_oid is null then
    raise exception 'Missing private.edge_function_rate_limit_buckets';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = v_table_oid
      and relrowsecurity
  ) then
    raise exception 'Rate-limit bucket table must have RLS enabled';
  end if;

  if has_table_privilege('anon', v_table_oid, 'select')
     or has_table_privilege('authenticated', v_table_oid, 'select')
     or has_table_privilege('service_role', v_table_oid, 'select') then
    raise exception 'Rate-limit bucket table must not be directly readable by API roles';
  end if;

  if v_function_oid is null then
    raise exception 'Missing consume_edge_function_rate_limit_internal';
  end if;

  if has_function_privilege('anon', v_function_oid, 'execute')
     or has_function_privilege('authenticated', v_function_oid, 'execute') then
    raise exception 'Browser roles must not execute the rate-limit authority';
  end if;

  if not has_function_privilege('service_role', v_function_oid, 'execute') then
    raise exception 'service_role must execute the rate-limit authority';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = v_function_oid
      and prosecdef
      and coalesce(array_to_string(proconfig, ','), '') like '%search_path=pg_catalog%'
  ) then
    raise exception 'Rate-limit authority must be SECURITY DEFINER with pg_catalog search_path';
  end if;

  v_first := public.consume_edge_function_rate_limit_internal(
    'validation-function',
    v_actor,
    'validation-action',
    2,
    60
  );
  v_second := public.consume_edge_function_rate_limit_internal(
    'validation-function',
    v_actor,
    'validation-action',
    2,
    60
  );
  v_third := public.consume_edge_function_rate_limit_internal(
    'validation-function',
    v_actor,
    'validation-action',
    2,
    60
  );

  if coalesce((v_first ->> 'allowed')::boolean, false) is not true
     or coalesce((v_second ->> 'allowed')::boolean, false) is not true
     or coalesce((v_third ->> 'allowed')::boolean, true) is not false then
    raise exception 'Rate-limit behavioral threshold failed: %, %, %', v_first, v_second, v_third;
  end if;

  if (v_third ->> 'remaining')::integer <> 0
     or (v_third ->> 'retryAfterSeconds')::integer < 1 then
    raise exception 'Rate-limit response metadata is invalid: %', v_third;
  end if;
end;
$validation$;

rollback;
