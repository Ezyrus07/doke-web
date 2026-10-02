-- ANA-A11: repository-only candidate for deterministic liquidity window planning.
--
-- This migration does not insert a publication policy, choose cadence/SLO/anchor,
-- activate pg_cron, write metric snapshots or change CAT facts. The planner is
-- policy-driven: every numeric boundary comes from an explicit versioned
-- publication-policy row.

create or replace function private.plan_analytics_cat_liquidity_windows_v1(
  p_policy_id text,
  p_at timestamptz
)
returns table (
  window_ordinal integer,
  window_start timestamptz,
  window_end timestamptz,
  required_series_count integer,
  materialized_series_count integer,
  missing_series_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_policy private.analytics_metric_publication_policies_v1%rowtype;
  v_coverage_complete_from timestamptz;
  v_watermark jsonb;
  v_source_watermark timestamptz;
  v_lower_bound timestamptz;
  v_upper_bound timestamptz;
  v_first_start timestamptz;
  v_last_start timestamptz;
  v_first_index bigint;
  v_last_end_index bigint;
  v_step_seconds integer;
begin
  if p_at is null
     or pg_catalog.btrim(coalesce(p_policy_id,'')) = '' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_REQUIRED';
  end if;

  select p.*
    into v_policy
  from private.analytics_metric_publication_policies_v1 p
  where p.policy_id = pg_catalog.btrim(p_policy_id)
    and p.metric_key = 'liquidity.active_service_seconds'
    and p.metric_version = 'v1';

  if not found then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_REQUIRED';
  end if;

  v_step_seconds := v_policy.window_step_seconds;

  select min(e.coverage_complete_from)
    into v_coverage_complete_from
  from private.cat_listing_supply_coverage_epochs_v1 e
  where e.contract_id = 'cat-a07-supply-coverage-baseline-v1'
    and e.certification_state = 'certified';

  if v_coverage_complete_from is null then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_LIQUIDITY_COVERAGE_EPOCH_REQUIRED';
  end if;

  v_watermark := private.cat_listing_visibility_watermark_v1();
  v_source_watermark := (v_watermark ->> 'dataThrough')::timestamptz;

  if v_source_watermark is null then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_LIQUIDITY_SOURCE_WATERMARK_REQUIRED';
  end if;

  v_lower_bound := greatest(
    v_policy.effective_from,
    v_coverage_complete_from
  );

  v_upper_bound := least(
    p_at,
    v_source_watermark,
    coalesce(v_policy.effective_until,p_at)
  );

  if v_upper_bound <= v_lower_bound then
    return;
  end if;

  v_first_index := pg_catalog.ceil(
    extract(epoch from (v_lower_bound - v_policy.window_anchor))
      / v_step_seconds
  )::bigint;

  v_last_end_index := pg_catalog.floor(
    extract(epoch from (v_upper_bound - v_policy.window_anchor))
      / v_step_seconds
  )::bigint;

  if v_last_end_index <= v_first_index then
    return;
  end if;

  v_first_start := v_policy.window_anchor
    + (v_first_index * v_step_seconds) * interval '1 second';

  v_last_start := v_policy.window_anchor
    + ((v_last_end_index - 1) * v_step_seconds) * interval '1 second';

  return query
  with candidate_windows as (
    select
      gs as candidate_window_start,
      gs + pg_catalog.make_interval(secs => v_step_seconds) as candidate_window_end
    from pg_catalog.generate_series(
      v_first_start,
      v_last_start,
      pg_catalog.make_interval(secs => v_step_seconds)
    ) gs
  ),
  expected_series as (
    select
      w.candidate_window_start,
      w.candidate_window_end,
      s.series_ordinal,
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'serviceCategory',s.service_category,
        'serviceState',s.service_state
      )) as expected_dimensions
    from candidate_windows w
    cross join lateral private.list_analytics_cat_liquidity_series_v1(
      w.candidate_window_start,
      w.candidate_window_end
    ) s
  ),
  series_state as (
    select
      e.candidate_window_start,
      e.candidate_window_end,
      e.series_ordinal,
      exists (
        select 1
        from private.analytics_metric_snapshots_v1 m
        where m.metric_key = 'liquidity.active_service_seconds'
          and m.metric_version = 'v1'
          and m.window_start = e.candidate_window_start
          and m.window_end = e.candidate_window_end
          and m.dimensions = e.expected_dimensions
      ) as materialized
    from expected_series e
  ),
  window_state as (
    select
      s.candidate_window_start,
      s.candidate_window_end,
      count(*)::integer as required_count,
      count(*) filter (where s.materialized)::integer as materialized_count,
      count(*) filter (where not s.materialized)::integer as missing_count
    from series_state s
    group by s.candidate_window_start,s.candidate_window_end
  ),
  missing_windows as (
    select
      w.candidate_window_start,
      w.candidate_window_end,
      w.required_count,
      w.materialized_count,
      w.missing_count
    from window_state w
    where w.missing_count > 0
    order by w.candidate_window_start,w.candidate_window_end
    limit v_policy.max_catch_up_windows_per_invocation
  )
  select
    pg_catalog.row_number() over (
      order by w.candidate_window_start,w.candidate_window_end
    )::integer,
    w.candidate_window_start,
    w.candidate_window_end,
    w.required_count,
    w.materialized_count,
    w.missing_count
  from missing_windows w
  order by w.candidate_window_start,w.candidate_window_end;
end;
$$;

revoke all privileges on function private.plan_analytics_cat_liquidity_windows_v1(text,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.plan_analytics_cat_liquidity_windows_v1(text,timestamptz) is
  'ANA-A11 owner-only planner for missing canonical liquidity windows. Uses only an explicit versioned publication policy, CAT certified coverage and CAT transaction-snapshot watermark. A window is complete only when every CAT-required series has a corresponding ANA snapshot. Returns oldest missing windows first, capped by the policy catch-up bound. Creates no snapshots and activates no scheduler.';
