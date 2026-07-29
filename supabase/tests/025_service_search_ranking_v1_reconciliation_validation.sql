-- SEARCH-001 / SEARCH-A07
-- Validates canonical v1 configuration after controlled staging reconciliation.

begin;

do $$
declare
  v_config jsonb;
  v_trigger_enabled "char";
  v_events bigint;
begin
  if private.current_service_search_ranking_version() <> 'search-rank-v0' then
    raise exception 'SEARCH-A07 reconciliation did not preserve ranking v0';
  end if;

  select config
    into v_config
  from private.service_search_ranking_versions
  where version = 'search-rank-v1';

  if v_config <> pg_catalog.jsonb_build_object(
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
    raise exception 'SEARCH-A07 canonical ranking v1 config is not installed';
  end if;

  select trigger_row.tgenabled
    into v_trigger_enabled
  from pg_catalog.pg_trigger trigger_row
  where trigger_row.tgrelid = 'private.service_search_ranking_versions'::regclass
    and trigger_row.tgname = 'trg_reject_service_search_ranking_version_mutation'
    and not trigger_row.tgisinternal;

  if v_trigger_enabled <> 'O' then
    raise exception 'SEARCH-A07 immutable ranking trigger was not restored';
  end if;

  select pg_catalog.count(*)
    into v_events
  from private.service_search_ranking_state_events
  where previous_version = 'search-rank-v1'
     or active_version = 'search-rank-v1';

  if v_events <> 0 then
    raise exception 'SEARCH-A07 reconciliation found a persisted v1 activation event';
  end if;

  begin
    update private.service_search_ranking_versions
    set config = config
    where version = 'search-rank-v1';
    raise exception 'SEARCH-A07 immutable boundary accepted an update after reconciliation';
  exception
    when sqlstate '55000' then null;
  end;
end;
$$;

rollback;
