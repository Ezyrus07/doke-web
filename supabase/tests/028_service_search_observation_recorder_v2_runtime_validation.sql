-- SEARCH-001 / SEARCH-A09
-- Transactional recorder validation: shape, idempotency and private storage.

begin;

create temporary table search_a09_recorder_baseline on commit drop as
select pg_catalog.count(*) as observation_count
from private.service_search_observations_v2;

set local role service_role;

select public.record_service_search_observation_v2(
  pg_catalog.jsonb_build_object(
    'requestId', 'a0900000-0000-4000-8000-000000000028'::uuid,
    'source', 'staging_canary', 'actorClass', 'anon', 'outcome', 'success',
    'latencyMs', 50, 'rankingVersion', 'search-rank-v0', 'rankingStrategy', 'legacy_updated_at',
    'cursorPresent', false, 'firstPage', true, 'pageSize', 12, 'queryPresent', false,
    'categoryCount', 0, 'locationScope', 'none', 'serviceMode', 'any',
    'itemCount', 1, 'zeroResult', false, 'hasNext', false
  )
);

select public.record_service_search_observation_v2(
  pg_catalog.jsonb_build_object(
    'requestId', 'a0900000-0000-4000-8000-000000000028'::uuid,
    'source', 'staging_canary', 'actorClass', 'anon', 'outcome', 'success',
    'latencyMs', 999, 'rankingVersion', 'search-rank-v0', 'rankingStrategy', 'legacy_updated_at',
    'cursorPresent', false, 'firstPage', true, 'pageSize', 12, 'queryPresent', false,
    'categoryCount', 0, 'locationScope', 'none', 'serviceMode', 'any',
    'itemCount', 1, 'zeroResult', false, 'hasNext', false
  )
);

reset role;

do $$
declare
  v_delta bigint;
  v_row private.service_search_observations_v2%rowtype;
begin
  select pg_catalog.count(*) - (select observation_count from search_a09_recorder_baseline)
    into v_delta
  from private.service_search_observations_v2;

  select * into v_row
  from private.service_search_observations_v2
  where request_id = 'a0900000-0000-4000-8000-000000000028'::uuid;

  if v_delta <> 1 then
    raise exception 'SEARCH-A09 request-id idempotency failed';
  end if;
  if v_row.outcome <> 'success' or v_row.error_class <> 'none' or v_row.error_code is not null
     or v_row.latency_ms <> 50 or v_row.ranking_version <> 'search-rank-v0'
     or v_row.first_page <> true or v_row.zero_result <> false then
    raise exception 'SEARCH-A09 recorder normalized an invalid observation: %', row_to_json(v_row);
  end if;
end;
$$;

rollback;
