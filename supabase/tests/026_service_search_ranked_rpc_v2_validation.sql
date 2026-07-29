-- SEARCH-001 / SEARCH-A08
-- Transactional validation for the parallel version-bound ranked search RPC.

begin;

do $$
declare
  v_response jsonb;
  v_request jsonb;
  v_request_hash text;
  v_payload jsonb;
  v_cursor text;
  v_decoded jsonb;
  v_tampered text;
  v_events_before bigint;
  v_events_after bigint;
begin
  if pg_catalog.to_regprocedure('public.search_public_services_v2(jsonb)') is null then
    raise exception 'SEARCH-A08 ranked RPC v2 is missing';
  end if;

  if pg_catalog.to_regprocedure('private.service_search_request_hash_v2(jsonb)') is null
     or pg_catalog.to_regprocedure('private.encode_service_search_cursor_v2(jsonb)') is null
     or pg_catalog.to_regprocedure('private.decode_service_search_cursor_v2(text)') is null then
    raise exception 'SEARCH-A08 private cursor authority is missing';
  end if;

  if not pg_catalog.has_function_privilege('anon', 'public.search_public_services_v2(jsonb)', 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', 'public.search_public_services_v2(jsonb)', 'EXECUTE') then
    raise exception 'SEARCH-A08 browser roles cannot execute the bounded public RPC';
  end if;

  if pg_catalog.has_function_privilege('anon', 'private.encode_service_search_cursor_v2(jsonb)', 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', 'private.encode_service_search_cursor_v2(jsonb)', 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', 'private.decode_service_search_cursor_v2(text)', 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', 'private.decode_service_search_cursor_v2(text)', 'EXECUTE')
     or pg_catalog.has_table_privilege('anon', 'private.service_search_cursor_keys', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'private.service_search_cursor_keys', 'SELECT') then
    raise exception 'SEARCH-A08 private cursor signing authority is exposed to browser roles';
  end if;

  select public.search_public_services_v2('{}'::jsonb)
    into v_response;

  if v_response ->> 'authority' <> 'public.search_public_services_v2'
     or v_response ->> 'contractVersion' <> '2.0.0' then
    raise exception 'SEARCH-A08 public response contract is invalid';
  end if;

  if v_response #>> '{ranking,version}' <> 'search-rank-v0'
     or v_response #>> '{ranking,strategy}' <> 'legacy_updated_at'
     or v_response #>> '{page,rankingVersion}' <> 'search-rank-v0'
     or v_response #>> '{page,asOf}' is null then
    raise exception 'SEARCH-A08 did not preserve the active legacy ranking contract';
  end if;

  if v_response::text like '%rankScore%'
     or v_response::text like '%reviewSignal%'
     or v_response::text like '%availabilitySignal%'
     or v_response::text like '%recencySignal%' then
    raise exception 'SEARCH-A08 exposed a ranking score breakdown publicly';
  end if;

  v_request := v_response -> 'request';
  v_request_hash := private.service_search_request_hash_v2(v_request);
  v_payload := pg_catalog.jsonb_build_object(
    'cursorVersion', 2,
    'rankingVersion', 'search-rank-v0',
    'asOf', v_response #>> '{page,asOf}',
    'requestHash', v_request_hash,
    'score', 0,
    'tiebreakAt', pg_catalog.statement_timestamp(),
    'id', extensions.gen_random_uuid()
  );
  v_cursor := private.encode_service_search_cursor_v2(v_payload);
  v_decoded := private.decode_service_search_cursor_v2(v_cursor);

  if v_decoded <> v_payload then
    raise exception 'SEARCH-A08 signed cursor did not round-trip exactly';
  end if;

  v_tampered := pg_catalog.overlay(v_cursor placing case when pg_catalog.substr(v_cursor, 1, 1) = 'A' then 'B' else 'A' end from 1 for 1);
  begin
    perform private.decode_service_search_cursor_v2(v_tampered);
    raise exception 'SEARCH-A08 accepted a tampered cursor';
  exception
    when sqlstate '22023' then null;
  end;

  begin
    perform public.search_public_services_v2(
      pg_catalog.jsonb_build_object('query', 'different request', 'cursor', v_cursor)
    );
    raise exception 'SEARCH-A08 accepted a cursor from a different normalized request';
  exception
    when sqlstate '22023' then null;
  end;

  select pg_catalog.count(*)
    into v_events_before
  from private.service_search_ranking_state_events;

  if private.activate_service_search_ranking_version(
       'search-rank-v1',
       'search-rank-v0',
       'SEARCH-A08 transactional cursor-version conflict canary'
     ) <> 'search-rank-v1' then
    raise exception 'SEARCH-A08 failed to activate ranking v1 transactionally';
  end if;

  begin
    perform public.search_public_services_v2(
      pg_catalog.jsonb_build_object('cursor', v_cursor)
    );
    raise exception 'SEARCH-A08 accepted a cursor created under another ranking version';
  exception
    when sqlstate '40001' then null;
  end;

  if private.activate_service_search_ranking_version(
       'search-rank-v0',
       'search-rank-v1',
       'SEARCH-A08 transactional rollback to legacy ranking'
     ) <> 'search-rank-v0' then
    raise exception 'SEARCH-A08 failed to roll back to ranking v0 transactionally';
  end if;

  select pg_catalog.count(*)
    into v_events_after
  from private.service_search_ranking_state_events;

  if v_events_after - v_events_before <> 2 then
    raise exception 'SEARCH-A08 activation and rollback evidence is incomplete';
  end if;

  if private.current_service_search_ranking_version() <> 'search-rank-v0' then
    raise exception 'SEARCH-A08 transactional rollback did not restore ranking v0';
  end if;

  if not exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'private' and indexname = 'idx_service_search_ranking_state_active_version'
  ) or not exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'private' and indexname = 'idx_service_search_ranking_events_previous_version'
  ) or not exists (
    select 1 from pg_catalog.pg_indexes
    where schemaname = 'private' and indexname = 'idx_service_search_ranking_events_active_version'
  ) then
    raise exception 'SEARCH-A08 ranking-state foreign-key coverage indexes are missing';
  end if;

  if pg_catalog.pg_get_functiondef('public.search_public_services_v1(jsonb)'::regprocedure) like '%service_search_ranking%'
     or pg_catalog.pg_get_functiondef('public.search_public_services_v1(jsonb)'::regprocedure) like '%search-rank-v1%' then
    raise exception 'SEARCH-A08 modified the already-proven public search RPC v1';
  end if;
end;
$$;

rollback;
