-- ANA-A11: repository-only candidate for deterministic liquidity series enumeration
-- and atomic per-window projection orchestration.
--
-- This file does not choose a publication cadence, boundary anchor, projection-delay
-- SLO, catch-up batch size or freshness threshold. It is not a cron activation.
-- CAT remains the owner of listing visibility and frozen dimensions.

create or replace function private.list_analytics_cat_liquidity_series_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns table (
  series_ordinal integer,
  service_category text,
  service_state text
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_coverage_complete_from timestamptz;
  v_watermark jsonb;
  v_source_watermark timestamptz;
begin
  if p_window_start is null
     or p_window_end is null
     or p_window_end <= p_window_start then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_LIQUIDITY_WINDOW_INVALID';
  end if;

  select max(e.coverage_complete_from)
    into v_coverage_complete_from
  from private.cat_listing_supply_coverage_epochs_v1 e
  where e.contract_id = 'cat-a07-supply-coverage-baseline-v1'
    and e.certification_state = 'certified'
    and e.coverage_complete_from <= p_window_start;

  if v_coverage_complete_from is null then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_LIQUIDITY_COVERAGE_EPOCH_REQUIRED';
  end if;

  v_watermark := private.cat_listing_visibility_watermark_v1();
  v_source_watermark := (v_watermark ->> 'dataThrough')::timestamptz;

  if v_source_watermark is null
     or p_window_end > v_source_watermark then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_LIQUIDITY_WINDOW_NOT_CLOSED';
  end if;

  return query
  with raw_pairs as (
    select
      pg_catalog.lower(coalesce(
        nullif(e.dimension_snapshot_after ->> 'categoryId', ''),
        nullif(e.dimension_snapshot_after ->> 'categorySlug', ''),
        nullif(e.dimension_snapshot_after ->> 'category', '')
      )) as category_identity,
      nullif(pg_catalog.upper(e.dimension_snapshot_after ->> 'state'), '') as state_identity
    from private.cat_listing_visibility_events_v1 e
    where e.occurred_at >= v_coverage_complete_from
      and e.occurred_at <= p_window_end
  ),
  canonical_pairs as (
    select distinct
      r.category_identity,
      r.state_identity
    from raw_pairs r
    where r.category_identity is not null
      and r.state_identity is not null
  ),
  ordered_pairs as (
    select
      pg_catalog.row_number() over (
        order by pg_catalog.lower(p.category_identity), p.category_identity, p.state_identity
      )::integer as ordinal,
      p.category_identity,
      p.state_identity
    from canonical_pairs p
  )
  select
    0::integer,
    null::text,
    null::text
  union all
  select
    p.ordinal,
    p.category_identity,
    p.state_identity
  from ordered_pairs p
  order by 1, 2 nulls first, 3 nulls first;
end;
$$;

revoke all privileges on function private.list_analytics_cat_liquidity_series_v1(timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.list_analytics_cat_liquidity_series_v1(timestamptz,timestamptz) is
  'ANA-A11 server-only series universe for liquidity.active_service_seconds. Emits the global series plus every valid CAT-frozen category/state pair observed from the certified CAT-A07 coverage epoch through the requested closed window. The ANA series key lowercases only the frozen fallback token because A10 category filtering is case-insensitive; it never equates a freeform name/slug with a category UUID and never joins mutable current catalog state.';

create or replace function private.run_analytics_cat_liquidity_window_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_series record;
  v_result jsonb;
  v_snapshot_state text;
  v_results jsonb := '[]'::jsonb;
  v_series_count integer := 0;
  v_appended_count integer := 0;
  v_no_change_count integer := 0;
begin
  for v_series in
    select s.series_ordinal, s.service_category, s.service_state
    from private.list_analytics_cat_liquidity_series_v1(p_window_start, p_window_end) s
    order by s.series_ordinal
  loop
    v_result := public.run_analytics_cat_liquidity_projection_v1(
      p_window_start,
      p_window_end,
      v_series.service_category,
      v_series.service_state
    );

    v_snapshot_state := coalesce(v_result #>> '{snapshot,state}', '');

    if v_snapshot_state not in ('APPENDED', 'NO_CHANGE') then
      raise exception using
        errcode = '55000',
        message = 'DOKE_ANALYTICS_LIQUIDITY_SNAPSHOT_STATE_INVALID';
    end if;

    v_series_count := v_series_count + 1;
    v_appended_count := v_appended_count
      + case when v_snapshot_state = 'APPENDED' then 1 else 0 end;
    v_no_change_count := v_no_change_count
      + case when v_snapshot_state = 'NO_CHANGE' then 1 else 0 end;

    v_results := v_results || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'seriesOrdinal', v_series.series_ordinal,
        'serviceCategory', v_series.service_category,
        'serviceState', v_series.service_state,
        'snapshotState', v_snapshot_state
      )
    );
  end loop;

  return pg_catalog.jsonb_build_object(
    'contractId', 'ana-a11-liquidity-series-orchestration-v1',
    'metricKey', 'liquidity.active_service_seconds',
    'metricVersion', 'v1',
    'windowStart', p_window_start,
    'windowEnd', p_window_end,
    'seriesCount', v_series_count,
    'appendedCount', v_appended_count,
    'noChangeCount', v_no_change_count,
    'series', v_results
  );
end;
$$;

revoke all privileges on function private.run_analytics_cat_liquidity_window_v1(timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.run_analytics_cat_liquidity_window_v1(timestamptz,timestamptz) is
  'ANA-A11 server-only atomic per-window orchestrator. Runs the existing A10 projection runner for the global series and the CAT-frozen category/state universe. Any uncaught series failure aborts the SQL statement/transaction; exact replay remains NO_CHANGE through the A04 append authority.';
