-- SEARCH-001 / SEARCH-A09
-- Contract and privilege validation for server-authoritative search observability.

begin;

do $$
begin
  if to_regclass('private.service_search_observations_v2') is null
     or to_regclass('private.service_search_observability_policies_v2') is null
     or to_regclass('private.service_search_observability_snapshots_v2') is null then
    raise exception 'SEARCH-A09 observability tables are missing';
  end if;

  if to_regprocedure('public.record_service_search_observation_v2(jsonb)') is null
     or to_regprocedure('public.get_service_search_observability_v2(integer)') is null
     or to_regprocedure('public.refresh_service_search_observability_v2(integer)') is null
     or to_regprocedure('public.prune_service_search_observability_v2(timestamptz)') is null then
    raise exception 'SEARCH-A09 observability authority functions are missing';
  end if;

  if has_function_privilege('anon', 'public.record_service_search_observation_v2(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.record_service_search_observation_v2(jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.get_service_search_observability_v2(integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.get_service_search_observability_v2(integer)', 'EXECUTE') then
    raise exception 'SEARCH-A09 browser roles can write or read private observability';
  end if;

  if not has_function_privilege('service_role', 'public.record_service_search_observation_v2(jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.get_service_search_observability_v2(integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.refresh_service_search_observability_v2(integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.prune_service_search_observability_v2(timestamptz)', 'EXECUTE') then
    raise exception 'SEARCH-A09 service role observability authority is incomplete';
  end if;

  if has_table_privilege('anon', 'private.service_search_observations_v2', 'SELECT')
     or has_table_privilege('authenticated', 'private.service_search_observations_v2', 'SELECT')
     or has_table_privilege('service_role', 'private.service_search_observations_v2', 'INSERT') then
    raise exception 'SEARCH-A09 private observation table has direct API-role access';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'private'
      and table_name = 'service_search_observations_v2'
      and column_name in (
        'query', 'cursor', 'state', 'city', 'neighborhood', 'ip', 'ip_address',
        'user_id', 'actor_id', 'professional_id', 'rank_score', 'score'
      )
  ) then
    raise exception 'SEARCH-A09 stores raw search, identity, network or score data';
  end if;

  if pg_catalog.pg_get_functiondef('public.search_public_services_v2(jsonb)'::pg_catalog.regprocedure)
       like '%service_search_observations_v2%' then
    raise exception 'SEARCH-A09 incorrectly embedded telemetry writes inside the search RPC transaction';
  end if;
end;
$$;

rollback;
