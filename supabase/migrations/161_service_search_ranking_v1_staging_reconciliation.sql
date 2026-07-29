-- SEARCH-001 / SEARCH-A07
-- Controlled reconciliation for a never-activated intermediate staging config.
-- Fresh environments already holding the canonical search-rank-v1 config remain unchanged.

do $$
declare
  v_active text;
  v_v1_events bigint;
begin
  select active_version
    into v_active
  from private.service_search_ranking_state
  where singleton = true;

  if v_active <> 'search-rank-v0' then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_RECONCILIATION_REQUIRES_V0';
  end if;

  if not exists (
    select 1
    from private.service_search_ranking_versions
    where version = 'search-rank-v1'
  ) then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_V1_MISSING';
  end if;

  select pg_catalog.count(*)
    into v_v1_events
  from private.service_search_ranking_state_events
  where previous_version = 'search-rank-v1'
     or active_version = 'search-rank-v1';

  if v_v1_events <> 0 then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_V1_ALREADY_ACTIVATED';
  end if;
end;
$$;

alter table private.service_search_ranking_versions
  disable trigger trg_reject_service_search_ranking_version_mutation;

update private.service_search_ranking_versions
set strategy = 'bounded_quality_v1',
    config = pg_catalog.jsonb_build_object(
      'weights', pg_catalog.jsonb_build_object(
        'text', 0.68,
        'reviews', 0.20,
        'availability', 0.07,
        'recency', 0.05
      ),
      'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5),
      'availabilityWindowDays', 14,
      'recencyFullDays', 14,
      'recencyZeroDays', 120,
      'behavioralSignalsEnabled', false,
      'scorePrecision', 8
    )
where version = 'search-rank-v1'
  and (
    strategy,
    config
  ) is distinct from (
    'bounded_quality_v1'::text,
    pg_catalog.jsonb_build_object(
      'weights', pg_catalog.jsonb_build_object(
        'text', 0.68,
        'reviews', 0.20,
        'availability', 0.07,
        'recency', 0.05
      ),
      'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5),
      'availabilityWindowDays', 14,
      'recencyFullDays', 14,
      'recencyZeroDays', 120,
      'behavioralSignalsEnabled', false,
      'scorePrecision', 8
    )
  );

alter table private.service_search_ranking_versions
  enable trigger trg_reject_service_search_ranking_version_mutation;

do $$
declare
  v_config jsonb;
  v_strategy text;
begin
  select strategy, config
    into v_strategy, v_config
  from private.service_search_ranking_versions
  where version = 'search-rank-v1';

  if v_strategy <> 'bounded_quality_v1'
     or v_config <> pg_catalog.jsonb_build_object(
       'weights', pg_catalog.jsonb_build_object(
         'text', 0.68,
         'reviews', 0.20,
         'availability', 0.07,
         'recency', 0.05
       ),
       'reviewPrior', pg_catalog.jsonb_build_object('mean', 4.2, 'weight', 5),
       'availabilityWindowDays', 14,
       'recencyFullDays', 14,
       'recencyZeroDays', 120,
       'behavioralSignalsEnabled', false,
       'scorePrecision', 8
     ) then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_V1_RECONCILIATION_FAILED';
  end if;

  if private.current_service_search_ranking_version() <> 'search-rank-v0' then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_RECONCILIATION_CHANGED_ACTIVE_VERSION';
  end if;
end;
$$;

comment on table private.service_search_ranking_versions is
  'SEARCH-A07 immutable ranking configurations. Migration 161 reconciles only a never-activated intermediate staging v1 config before restoring the immutable boundary.';
