-- SEARCH-001 / SEARCH-A07
-- Transactional validation for immutable ranking versions and deterministic rollback.

begin;

do $$
declare
  v_initial_version text;
  v_single_five_star numeric;
  v_many_strong_reviews numeric;
  v_without_availability numeric;
  v_with_availability numeric;
  v_recent_day_one numeric;
  v_recent_day_ten numeric;
  v_old_service numeric;
  v_huge_text_score numeric;
  v_events_before bigint;
  v_events_after bigint;
begin
  if pg_catalog.to_regclass('private.service_search_ranking_versions') is null
     or pg_catalog.to_regclass('private.service_search_ranking_state') is null
     or pg_catalog.to_regclass('private.service_search_ranking_state_events') is null then
    raise exception 'SEARCH-A07 ranking authority tables are missing';
  end if;

  if pg_catalog.to_regprocedure('private.current_service_search_ranking_version()') is null
     or pg_catalog.to_regprocedure('private.activate_service_search_ranking_version(text,text,text)') is null
     or pg_catalog.to_regprocedure('private.compute_service_search_ranking_score(text,numeric,numeric,integer,boolean,timestamp with time zone,timestamp with time zone)') is null then
    raise exception 'SEARCH-A07 ranking authority functions are missing';
  end if;

  if pg_catalog.has_function_privilege(
       'anon',
       'private.activate_service_search_ranking_version(text,text,text)',
       'EXECUTE'
     )
     or pg_catalog.has_function_privilege(
       'authenticated',
       'private.activate_service_search_ranking_version(text,text,text)',
       'EXECUTE'
     ) then
    raise exception 'SEARCH-A07 browser role can activate or roll back ranking versions';
  end if;

  if not pg_catalog.has_function_privilege(
       'service_role',
       'private.activate_service_search_ranking_version(text,text,text)',
       'EXECUTE'
     ) then
    raise exception 'SEARCH-A07 service_role cannot activate ranking versions';
  end if;

  if pg_catalog.has_table_privilege('anon', 'private.service_search_ranking_versions', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'private.service_search_ranking_versions', 'SELECT')
     or pg_catalog.has_table_privilege('authenticated', 'private.service_search_ranking_state', 'UPDATE') then
    raise exception 'SEARCH-A07 private ranking state is browser-readable or browser-writable';
  end if;

  select private.current_service_search_ranking_version()
    into v_initial_version;

  if v_initial_version <> 'search-rank-v0' then
    raise exception 'SEARCH-A07 migration changed active ranking behavior';
  end if;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 5, 1, false,
    '2026-07-20T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_single_five_star;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 96, 20, false,
    '2026-07-20T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_many_strong_reviews;

  if v_many_strong_reviews <= v_single_five_star then
    raise exception 'SEARCH-A07 Bayesian smoothing lets one perfect review dominate sustained quality';
  end if;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 0, 0, false,
    '2026-07-20T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_without_availability;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 0, 0, true,
    '2026-07-20T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_with_availability;

  if pg_catalog.abs((v_with_availability - v_without_availability) - 0.07) > 0.0000001 then
    raise exception 'SEARCH-A07 availability signal is not binary and capped at seven percent';
  end if;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 0, 0, false,
    '2026-07-27T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_recent_day_one;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 0, 0, false,
    '2026-07-18T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_recent_day_ten;

  if v_recent_day_one <> v_recent_day_ten then
    raise exception 'SEARCH-A07 recency is not capped during the fourteen-day full-credit window';
  end if;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 0.5, 0, 0, false,
    '2025-12-01T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_old_service;

  if v_recent_day_one - v_old_service > 0.0500001 then
    raise exception 'SEARCH-A07 recency contribution exceeds its five-percent cap';
  end if;

  select private.compute_service_search_ranking_score(
    'search-rank-v1', 1000000, 5000, 1000, true,
    '2026-07-28T12:00:00Z'::timestamptz,
    '2026-07-28T12:00:00Z'::timestamptz
  ) into v_huge_text_score;

  if v_huge_text_score < 0 or v_huge_text_score > 1 then
    raise exception 'SEARCH-A07 score escaped the closed zero-to-one interval';
  end if;

  begin
    update private.service_search_ranking_versions
    set config = config
    where version = 'search-rank-v1';
    raise exception 'SEARCH-A07 immutable ranking version accepted an update';
  exception
    when sqlstate '55000' then null;
  end;

  begin
    insert into private.service_search_ranking_versions (version, strategy, config)
    values (
      'search-rank-invalid-test',
      'bounded_quality_v1',
      pg_catalog.jsonb_build_object(
        'weights', pg_catalog.jsonb_build_object('text', 2, 'reviews', 0, 'availability', 0, 'recency', 0),
        'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5),
        'availabilityWindowDays', 14,
        'recencyFullDays', 14,
        'recencyZeroDays', 120,
        'behavioralSignalsEnabled', false,
        'scorePrecision', 8
      )
    );
    raise exception 'SEARCH-A07 accepted an invalid unbounded configuration';
  exception
    when sqlstate '22023' then null;
  end;

  select pg_catalog.count(*)
    into v_events_before
  from private.service_search_ranking_state_events;

  if private.activate_service_search_ranking_version(
       'search-rank-v1',
       'search-rank-v0',
       'SEARCH-A07 transactional canary'
     ) <> 'search-rank-v1' then
    raise exception 'SEARCH-A07 failed to activate ranking v1';
  end if;

  begin
    perform private.activate_service_search_ranking_version(
      'search-rank-v0',
      'search-rank-v0',
      'stale compare-and-swap test'
    );
    raise exception 'SEARCH-A07 accepted a stale expected ranking version';
  exception
    when sqlstate '40001' then null;
  end;

  if private.activate_service_search_ranking_version(
       'search-rank-v0',
       'search-rank-v1',
       'SEARCH-A07 transactional rollback'
     ) <> 'search-rank-v0' then
    raise exception 'SEARCH-A07 failed to roll back ranking v1';
  end if;

  if private.current_service_search_ranking_version() <> 'search-rank-v0' then
    raise exception 'SEARCH-A07 rollback did not restore ranking v0';
  end if;

  select pg_catalog.count(*)
    into v_events_after
  from private.service_search_ranking_state_events;

  if v_events_after - v_events_before <> 2 then
    raise exception 'SEARCH-A07 activation and rollback events were not both recorded';
  end if;
end;
$$;

rollback;
