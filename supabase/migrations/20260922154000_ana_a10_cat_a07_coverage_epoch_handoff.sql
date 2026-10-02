-- ANA-001 / ANA-A10 handoff to CAT-A07 certified coverage epochs.
-- Repository candidate only until the CAT-A07 baseline is separately authorized and certified.
-- This migration never changes CAT source facts or the CAT-A06 activation record.

begin;

create or replace function public.compute_analytics_cat_liquidity_v1(
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_service_category text default null,
  p_service_state text default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_activation_at timestamptz;
  v_coverage_before text;
  v_baseline_policy text;
  v_coverage_complete_from timestamptz;
  v_watermark jsonb;
  v_source_watermark timestamptz;
  v_data_through timestamptz;
  v_policy_id text;
  v_max_lag_seconds integer;
  v_freshness_lag_seconds bigint;
  v_source_count bigint := 0;
  v_service_count bigint := 0;
  v_interval_count bigint := 0;
  v_observed_seconds bigint := 0;
  v_sequence_gap_count bigint := 0;
  v_state_mismatch_count bigint := 0;
  v_time_regression_count bigint := 0;
  v_missing_dimension_count bigint := 0;
  v_left_truncated_count bigint := 0;
  v_source_payload jsonb := '[]'::jsonb;
  v_projection_payload jsonb := '[]'::jsonb;
  v_segments jsonb := '[]'::jsonb;
  v_source_hash text;
  v_projection_hash text;
  v_coverage_state text;
  v_projection_state text;
  v_reason_code text;
  v_value_seconds bigint;
begin
  if p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception using errcode='22023', message='DOKE_ANALYTICS_LIQUIDITY_WINDOW_INVALID';
  end if;

  select s.activated_at,s.coverage_before_activation,s.existing_listing_baseline_policy
    into v_activation_at,v_coverage_before,v_baseline_policy
  from private.cat_listing_visibility_ledger_state_v1 s
  where s.contract_id='cat-a06-listing-visibility-timeline-v1';

  if not found then
    raise exception using errcode='55000', message='DOKE_ANALYTICS_LIQUIDITY_CAT_ACTIVATION_MISSING';
  end if;

  select max(e.coverage_complete_from)
    into v_coverage_complete_from
  from private.cat_listing_supply_coverage_epochs_v1 e
  where e.contract_id='cat-a07-supply-coverage-baseline-v1'
    and e.certification_state='certified'
    and e.coverage_complete_from <= p_window_start;

  v_watermark := private.cat_listing_visibility_watermark_v1();
  v_source_watermark := (v_watermark ->> 'dataThrough')::timestamptz;

  if p_window_end > v_source_watermark then
    raise exception using errcode='22023', message='DOKE_ANALYTICS_LIQUIDITY_WINDOW_NOT_CLOSED';
  end if;

  v_data_through := least(p_window_end,v_source_watermark);
  v_freshness_lag_seconds := greatest(
    0,
    pg_catalog.floor(extract(epoch from (v_source_watermark-v_data_through)))::bigint
  );

  select p.policy_id,p.max_lag_seconds
    into v_policy_id,v_max_lag_seconds
  from private.analytics_metric_freshness_policies_v1 p
  where p.metric_key='liquidity.active_service_seconds'
    and p.metric_version='v1'
    and p.effective_from <= v_source_watermark
    and (p.effective_until is null or p.effective_until > v_source_watermark)
  order by p.effective_from desc,p.policy_id desc
  limit 1;

  with ordered as (
    select
      e.*,
      pg_catalog.row_number() over(partition by e.service_id order by e.sequence_no) as expected_sequence,
      pg_catalog.lag(e.eligible_after) over(partition by e.service_id order by e.sequence_no) as previous_eligible_after,
      pg_catalog.lag(e.occurred_at) over(partition by e.service_id order by e.sequence_no) as previous_occurred_at,
      pg_catalog.lead(e.occurred_at) over(partition by e.service_id order by e.sequence_no) as next_occurred_at
    from private.cat_listing_visibility_events_v1 e
    where e.occurred_at <= v_data_through
  ),
  intervals as (
    select
      o.service_id,o.sequence_no,o.occurred_at as active_from,
      least(coalesce(o.next_occurred_at,v_data_through),v_data_through) as active_until,
      o.visible_version_id_after,o.dimension_snapshot_after,
      coalesce(nullif(o.dimension_snapshot_after ->> 'categoryId',''),
               nullif(o.dimension_snapshot_after ->> 'categorySlug',''),
               nullif(o.dimension_snapshot_after ->> 'category','')) as category_identity,
      nullif(pg_catalog.upper(o.dimension_snapshot_after ->> 'state'),'') as service_state
    from ordered o
    where o.eligible_after and o.occurred_at < v_data_through
  ),
  selected_intervals as (
    select i.*
    from intervals i
    where i.active_until > p_window_start
      and i.active_from < p_window_end
      and (p_service_category is null or pg_catalog.lower(coalesce(i.category_identity,''))=pg_catalog.lower(p_service_category))
      and (p_service_state is null or coalesce(i.service_state,'')=pg_catalog.upper(p_service_state))
  ),
  source_summary as (
    select
      count(*)::bigint as source_count,
      count(distinct o.service_id)::bigint as service_count,
      count(*) filter (where o.sequence_no <> o.expected_sequence)::bigint as sequence_gap_count,
      count(*) filter (where o.expected_sequence > 1 and o.eligible_before is distinct from o.previous_eligible_after)::bigint as state_mismatch_count,
      count(*) filter (where o.expected_sequence > 1 and o.occurred_at < o.previous_occurred_at)::bigint as time_regression_count,
      count(*) filter (
        where o.eligible_after and (
          coalesce(nullif(o.dimension_snapshot_after ->> 'categoryId',''),
                   nullif(o.dimension_snapshot_after ->> 'categorySlug',''),
                   nullif(o.dimension_snapshot_after ->> 'category','')) is null
          or nullif(pg_catalog.upper(o.dimension_snapshot_after ->> 'state'),'') is null
        )
      )::bigint as missing_dimension_count,
      count(distinct o.service_id) filter (where o.expected_sequence=1 and o.eligible_before)::bigint as left_truncated_count,
      coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(
          o.service_id,o.sequence_no,o.occurred_at,o.source_transition_key,
          o.eligible_before,o.eligible_after,o.visible_version_id_before,o.visible_version_id_after,
          o.dimension_snapshot_before,o.dimension_snapshot_after,o.coverage_kind
        ) order by o.service_id,o.sequence_no
      ),'[]'::jsonb) as source_payload
    from ordered o
  ),
  projection_summary as (
    select
      count(*)::bigint as interval_count,
      coalesce(pg_catalog.floor(pg_catalog.sum(
        extract(epoch from (least(i.active_until,p_window_end)-greatest(i.active_from,p_window_start)))
      )),0)::bigint as observed_seconds,
      coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_array(
          i.service_id,i.sequence_no,i.active_from,i.active_until,
          i.visible_version_id_after,i.category_identity,i.service_state
        ) order by i.service_id,i.sequence_no
      ),'[]'::jsonb) as projection_payload
    from selected_intervals i
  ),
  segment_summary as (
    select coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'categoryIdentity',x.category_identity,'state',x.service_state,
        'observedLowerBoundSeconds',x.observed_seconds,'intervalCount',x.interval_count
      ) order by x.category_identity,x.service_state
    ),'[]'::jsonb) as segments
    from (
      select
        i.category_identity,i.service_state,count(*)::bigint interval_count,
        coalesce(pg_catalog.floor(pg_catalog.sum(
          extract(epoch from (least(i.active_until,p_window_end)-greatest(i.active_from,p_window_start)))
        )),0)::bigint observed_seconds
      from selected_intervals i
      group by i.category_identity,i.service_state
    ) x
  )
  select
    s.source_count,s.service_count,s.sequence_gap_count,s.state_mismatch_count,
    s.time_regression_count,s.missing_dimension_count,s.left_truncated_count,s.source_payload,
    p.interval_count,p.observed_seconds,p.projection_payload,g.segments
  into
    v_source_count,v_service_count,v_sequence_gap_count,v_state_mismatch_count,
    v_time_regression_count,v_missing_dimension_count,v_left_truncated_count,v_source_payload,
    v_interval_count,v_observed_seconds,v_projection_payload,v_segments
  from source_summary s
  cross join projection_summary p
  cross join segment_summary g;

  v_coverage_state := case
    when v_coverage_complete_from is not null then 'complete'
    else 'partial'
  end;

  if v_sequence_gap_count + v_state_mismatch_count + v_time_regression_count + v_missing_dimension_count > 0 then
    v_projection_state := 'unavailable';
    v_reason_code := 'CAT_LEDGER_STRUCTURAL_DEFECT';
  elsif v_policy_id is null then
    v_projection_state := 'unavailable';
    v_reason_code := 'POLICY_THRESHOLD_MISSING';
  elsif v_freshness_lag_seconds > v_max_lag_seconds then
    v_projection_state := 'stale';
    v_reason_code := 'MAX_LAG_EXCEEDED';
  elsif v_coverage_state='partial' then
    v_projection_state := 'stale';
    v_reason_code := 'SUPPLY_COVERAGE_PARTIAL';
  else
    v_projection_state := 'authoritative';
    v_reason_code := 'WITHIN_POLICY';
  end if;

  v_value_seconds := case
    when v_coverage_state='complete'
      and v_sequence_gap_count + v_state_mismatch_count + v_time_regression_count + v_missing_dimension_count = 0
    then v_observed_seconds
    else null
  end;

  v_source_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'activationAt',v_activation_at,
          'coverageBeforeActivation',v_coverage_before,
          'baselinePolicy',v_baseline_policy,
          'coverageCompleteFrom',v_coverage_complete_from,
          'filter',pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
            'serviceCategory',p_service_category,'serviceState',p_service_state
          )),
          'events',v_source_payload
        )::text,'UTF8'
      ),'sha256'
    ),'hex'
  );

  v_projection_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        pg_catalog.jsonb_build_object(
          'windowStart',p_window_start,'windowEnd',p_window_end,'dataThrough',v_data_through,
          'coverageCompleteFrom',v_coverage_complete_from,
          'coverageState',v_coverage_state,'projectionState',v_projection_state,
          'observedLowerBoundSeconds',v_observed_seconds,'valueSeconds',v_value_seconds,
          'intervals',v_projection_payload
        )::text,'UTF8'
      ),'sha256'
    ),'hex'
  );

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a10-cat-liquidity-projection-v1',
    'metricKey','liquidity.active_service_seconds','metricVersion','v1',
    'windowStart',p_window_start,'windowEnd',p_window_end,'dataThrough',v_data_through,
    'sourceWatermark',v_watermark,'activationAt',v_activation_at,
    'activationBaselinePolicy',v_baseline_policy,'coverageCompleteFrom',v_coverage_complete_from,
    'dimensions',pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'serviceCategory',p_service_category,
      'serviceState',case when p_service_state is null then null else pg_catalog.upper(p_service_state) end
    )),
    'sourceEventCount',v_source_count,'serviceCount',v_service_count,'intervalCount',v_interval_count,
    'observedLowerBoundSeconds',v_observed_seconds,'valueSeconds',v_value_seconds,'segments',v_segments,
    'coverageState',v_coverage_state,'projectionState',v_projection_state,'reasonCode',v_reason_code,
    'freshnessPolicy',case when v_policy_id is null then null else pg_catalog.jsonb_build_object(
      'policyId',v_policy_id,'maxLagSeconds',v_max_lag_seconds
    ) end,
    'freshnessLagSeconds',v_freshness_lag_seconds,
    'structuralDefects',pg_catalog.jsonb_build_object(
      'sequenceGap',v_sequence_gap_count,'stateMismatch',v_state_mismatch_count,
      'timeRegression',v_time_regression_count,'missingDimensions',v_missing_dimension_count
    ),
    'leftTruncatedServiceCount',v_left_truncated_count,
    'sourceFingerprint',v_source_hash,'projectionFingerprint',v_projection_hash
  );
end;
$function$;

revoke all on function public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)
  to service_role;

comment on function public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text) is
  'ANA-A10 consumes CAT-A07 certified coverage epochs. Only windows beginning at/after a certified coverage_complete_from may become complete; older history remains partial.';

commit;
