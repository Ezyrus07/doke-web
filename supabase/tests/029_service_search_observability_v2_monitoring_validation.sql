-- SEARCH-001 / SEARCH-A09
-- Transactional monitoring and rollback-invariant validation.

begin;

create temporary table search_a09_monitor_baseline on commit drop as
select
  private.current_service_search_ranking_version() as active_version,
  (select pg_catalog.count(*) from private.service_search_ranking_state_events) as ranking_event_count,
  pg_catalog.pg_get_functiondef('public.search_public_services_v1(jsonb)'::pg_catalog.regprocedure) as rpc_v1_definition,
  pg_catalog.pg_get_functiondef('public.search_public_services_v2(jsonb)'::pg_catalog.regprocedure) as rpc_v2_definition,
  (select pg_catalog.count(*) from private.service_search_observations_v2) as observation_count,
  (select pg_catalog.count(*) from private.service_search_observability_snapshots_v2) as snapshot_count,
  pg_catalog.clock_timestamp() as started_at;

set local role service_role;

select public.record_service_search_observation_v2(
  pg_catalog.jsonb_build_object(
    'requestId', ('a0910000-0000-4000-8000-' || pg_catalog.lpad(sample::text, 12, '0'))::uuid,
    'source', 'staging_canary',
    'actorClass', case when sample % 2 = 0 then 'anon' else 'authenticated' end,
    'outcome', 'success',
    'latencyMs', 20 + sample,
    'rankingVersion', 'search-rank-v0',
    'rankingStrategy', 'legacy_updated_at',
    'cursorPresent', false,
    'firstPage', true,
    'pageSize', 12,
    'queryPresent', sample % 3 = 0,
    'categoryCount', sample % 2,
    'locationScope', case when sample % 2 = 0 then 'city' else 'none' end,
    'serviceMode', 'any',
    'itemCount', case when sample = 1 then 0 else 1 end,
    'zeroResult', sample = 1,
    'hasNext', false
  )
)
from pg_catalog.generate_series(1, 20) sample;

select public.record_service_search_observation_v2(pg_catalog.jsonb_build_object(
  'requestId', 'a0920000-0000-4000-8000-000000000001'::uuid,
  'source', 'staging_canary', 'actorClass', 'anon', 'outcome', 'error',
  'errorCode', 'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID', 'errorClass', 'cursor_invalid',
  'latencyMs', 5, 'rankingVersion', 'search-rank-v0', 'rankingStrategy', 'legacy_updated_at',
  'cursorPresent', true, 'firstPage', false, 'pageSize', 12, 'queryPresent', true,
  'categoryCount', 1, 'locationScope', 'city', 'serviceMode', 'any', 'zeroResult', false
));

select public.record_service_search_observation_v2(pg_catalog.jsonb_build_object(
  'requestId', 'a0920000-0000-4000-8000-000000000002'::uuid,
  'source', 'staging_canary', 'actorClass', 'anon', 'outcome', 'error',
  'errorCode', 'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT', 'errorClass', 'cursor_conflict',
  'latencyMs', 6, 'rankingVersion', 'search-rank-v0', 'rankingStrategy', 'legacy_updated_at',
  'cursorPresent', true, 'firstPage', false, 'pageSize', 12, 'queryPresent', true,
  'categoryCount', 1, 'locationScope', 'city', 'serviceMode', 'any', 'zeroResult', false
));

select public.record_service_search_observation_v2(pg_catalog.jsonb_build_object(
  'requestId', 'a0920000-0000-4000-8000-000000000003'::uuid,
  'source', 'staging_canary', 'actorClass', 'authenticated', 'outcome', 'error',
  'errorCode', 'DOKE_SEARCH_INTERNAL_ERROR', 'errorClass', 'server',
  'latencyMs', 7, 'rankingVersion', 'search-rank-v0', 'rankingStrategy', 'legacy_updated_at',
  'cursorPresent', false, 'firstPage', true, 'pageSize', 12, 'queryPresent', false,
  'categoryCount', 0, 'locationScope', 'none', 'serviceMode', 'any', 'zeroResult', false
));

reset role;

create temporary table search_a09_monitor_snapshot on commit drop as
select private.calculate_service_search_observability_v2(
  (select started_at from search_a09_monitor_baseline),
  pg_catalog.clock_timestamp() + interval '1 second'
) as payload;

create temporary table search_a09_persisted_snapshot on commit drop as
select public.refresh_service_search_observability_v2(60) as payload;

do $$
declare
  v_snapshot jsonb;
  v_persisted jsonb;
  v_observation_delta bigint;
  v_snapshot_delta bigint;
  v_baseline search_a09_monitor_baseline%rowtype;
begin
  select * into v_baseline from search_a09_monitor_baseline;
  select payload into v_snapshot from search_a09_monitor_snapshot;
  select payload into v_persisted from search_a09_persisted_snapshot;

  select pg_catalog.count(*) - v_baseline.observation_count
    into v_observation_delta
  from private.service_search_observations_v2;

  select pg_catalog.count(*) - v_baseline.snapshot_count
    into v_snapshot_delta
  from private.service_search_observability_snapshots_v2;

  if v_observation_delta <> 23
     or coalesce((v_snapshot ->> 'sampleCount')::bigint, -1) <> 23
     or coalesce((v_snapshot ->> 'successCount')::bigint, -1) <> 20
     or coalesce((v_snapshot -> 'errors' ->> 'cursorInvalid')::bigint, -1) <> 1
     or coalesce((v_snapshot -> 'errors' ->> 'cursorConflict')::bigint, -1) <> 1
     or coalesce((v_snapshot -> 'errors' ->> 'server')::bigint, -1) <> 1
     or coalesce((v_snapshot -> 'zeroResults' ->> 'count')::bigint, -1) <> 1
     or coalesce((v_snapshot -> 'rankingVersionDistribution' ->> 'search-rank-v0')::bigint, -1) <> 23 then
    raise exception 'SEARCH-A09 monitoring snapshot does not reflect authoritative observations: %', v_snapshot;
  end if;

  if v_snapshot ->> 'health' not in ('warning', 'critical')
     or nullif(v_snapshot -> 'latencyMs' ->> 'p95', '') is null
     or nullif(v_snapshot ->> 'cursorConflictPercent', '') is null then
    raise exception 'SEARCH-A09 monitoring health or latency fields are incomplete: %', v_snapshot;
  end if;

  if v_snapshot -> 'zeroResults' ->> 'enforcement' <> 'informational' then
    raise exception 'SEARCH-A09 zero-result rate must remain informational';
  end if;

  if v_snapshot_delta <> 1
     or nullif(v_persisted ->> 'snapshotId', '') is null
     or nullif(v_persisted ->> 'sourceHash', '') is null then
    raise exception 'SEARCH-A09 persisted monitoring snapshot is invalid: %', v_persisted;
  end if;

  if private.current_service_search_ranking_version() <> 'search-rank-v0'
     or private.current_service_search_ranking_version() <> v_baseline.active_version then
    raise exception 'SEARCH-A09 changed the active ranking version';
  end if;

  if (select pg_catalog.count(*) from private.service_search_ranking_state_events) <> v_baseline.ranking_event_count then
    raise exception 'SEARCH-A09 persisted a ranking activation event';
  end if;

  if pg_catalog.pg_get_functiondef('public.search_public_services_v1(jsonb)'::pg_catalog.regprocedure) <> v_baseline.rpc_v1_definition
     or pg_catalog.pg_get_functiondef('public.search_public_services_v2(jsonb)'::pg_catalog.regprocedure) <> v_baseline.rpc_v2_definition then
    raise exception 'SEARCH-A09 modified an existing public search RPC';
  end if;

  if pg_catalog.pg_get_functiondef('public.search_public_services_v2(jsonb)'::pg_catalog.regprocedure)
       like '%service_search_observations_v2%' then
    raise exception 'SEARCH-A09 incorrectly embedded telemetry writes inside the search RPC transaction';
  end if;
end;
$$;

rollback;
