create or replace function private.calculate_service_search_observability_v2(
  p_from timestamptz,
  p_to timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_from timestamptz := coalesce(p_from, pg_catalog.clock_timestamp() - interval '1 hour');
  v_to timestamptz := coalesce(p_to, pg_catalog.clock_timestamp());
  v_policy private.service_search_observability_policies_v2%rowtype;
  v_total bigint := 0;
  v_success bigint := 0;
  v_client_errors bigint := 0;
  v_cursor_invalid bigint := 0;
  v_cursor_conflicts bigint := 0;
  v_rate_limited bigint := 0;
  v_server_errors bigint := 0;
  v_first_page_success bigint := 0;
  v_zero_results bigint := 0;
  v_p50 numeric;
  v_p95 numeric;
  v_p99 numeric;
  v_success_percent numeric;
  v_total_error_percent numeric;
  v_cursor_conflict_percent numeric;
  v_zero_result_percent numeric;
  v_health text := 'no_data';
  v_versions jsonb := '{}'::jsonb;
  v_errors jsonb := '{}'::jsonb;
  v_actors jsonb := '{}'::jsonb;
  v_result jsonb;
begin
  if v_from >= v_to then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVABILITY_WINDOW_INVALID';
  end if;

  select * into v_policy
  from private.service_search_observability_policies_v2
  where singleton = true;

  if v_policy.singleton is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_OBSERVABILITY_POLICY_MISSING';
  end if;

  select
    pg_catalog.count(*),
    pg_catalog.count(*) filter (where outcome = 'success'),
    pg_catalog.count(*) filter (where error_class = 'client'),
    pg_catalog.count(*) filter (where error_class = 'cursor_invalid'),
    pg_catalog.count(*) filter (where error_class = 'cursor_conflict'),
    pg_catalog.count(*) filter (where error_class = 'rate_limit'),
    pg_catalog.count(*) filter (where error_class = 'server'),
    pg_catalog.count(*) filter (where outcome = 'success' and first_page),
    pg_catalog.count(*) filter (where zero_result),
    pg_catalog.percentile_cont(0.50) within group (order by latency_ms) filter (where outcome = 'success'),
    pg_catalog.percentile_cont(0.95) within group (order by latency_ms) filter (where outcome = 'success'),
    pg_catalog.percentile_cont(0.99) within group (order by latency_ms) filter (where outcome = 'success')
  into
    v_total,
    v_success,
    v_client_errors,
    v_cursor_invalid,
    v_cursor_conflicts,
    v_rate_limited,
    v_server_errors,
    v_first_page_success,
    v_zero_results,
    v_p50,
    v_p95,
    v_p99
  from private.service_search_observations_v2 observation
  where observation.observed_at >= v_from
    and observation.observed_at <= v_to;

  v_success_percent := case
    when v_success + v_server_errors = 0 then null
    else pg_catalog.round((v_success::numeric / (v_success + v_server_errors)::numeric) * 100, 4)
  end;
  v_total_error_percent := case
    when v_total = 0 then null
    else pg_catalog.round(((v_total - v_success)::numeric / v_total::numeric) * 100, 4)
  end;
  v_cursor_conflict_percent := case
    when v_total = 0 then null
    else pg_catalog.round((v_cursor_conflicts::numeric / v_total::numeric) * 100, 4)
  end;
  v_zero_result_percent := case
    when v_first_page_success = 0 then null
    else pg_catalog.round((v_zero_results::numeric / v_first_page_success::numeric) * 100, 4)
  end;

  select coalesce(pg_catalog.jsonb_object_agg(distribution.key, distribution.count order by distribution.key), '{}'::jsonb)
    into v_versions
  from (
    select coalesce(observation.ranking_version, 'unknown') as key, pg_catalog.count(*) as count
    from private.service_search_observations_v2 observation
    where observation.observed_at >= v_from
      and observation.observed_at <= v_to
    group by coalesce(observation.ranking_version, 'unknown')
  ) distribution;

  select coalesce(pg_catalog.jsonb_object_agg(distribution.key, distribution.count order by distribution.key), '{}'::jsonb)
    into v_errors
  from (
    select coalesce(observation.error_code, 'none') as key, pg_catalog.count(*) as count
    from private.service_search_observations_v2 observation
    where observation.observed_at >= v_from
      and observation.observed_at <= v_to
      and observation.outcome = 'error'
    group by coalesce(observation.error_code, 'none')
  ) distribution;

  select coalesce(pg_catalog.jsonb_object_agg(distribution.key, distribution.count order by distribution.key), '{}'::jsonb)
    into v_actors
  from (
    select observation.actor_class as key, pg_catalog.count(*) as count
    from private.service_search_observations_v2 observation
    where observation.observed_at >= v_from
      and observation.observed_at <= v_to
    group by observation.actor_class
  ) distribution;

  if v_total < v_policy.minimum_samples then
    v_health := 'no_data';
  elsif coalesce(v_success_percent, 100) < greatest(0, 100 - ((100 - v_policy.target_success_percent) * 2))
     or coalesce(v_p95, 0) > v_policy.max_p95_latency_ms * 2
     or coalesce(v_cursor_conflict_percent, 0) > v_policy.max_cursor_conflict_percent * 2 then
    v_health := 'critical';
  elsif coalesce(v_success_percent, 100) < v_policy.target_success_percent
     or coalesce(v_p95, 0) > v_policy.max_p95_latency_ms
     or coalesce(v_cursor_conflict_percent, 0) > v_policy.max_cursor_conflict_percent then
    v_health := 'warning';
  else
    v_health := 'healthy';
  end if;

  v_result := pg_catalog.jsonb_build_object(
    'authority', 'private.calculate_service_search_observability_v2',
    'contractVersion', '1.0.0',
    'window', pg_catalog.jsonb_build_object('from', v_from, 'to', v_to),
    'health', v_health,
    'sampleCount', v_total,
    'successCount', v_success,
    'errors', pg_catalog.jsonb_build_object(
      'client', v_client_errors,
      'cursorInvalid', v_cursor_invalid,
      'cursorConflict', v_cursor_conflicts,
      'rateLimited', v_rate_limited,
      'server', v_server_errors,
      'totalErrorPercent', v_total_error_percent,
      'serviceSuccessPercent', v_success_percent
    ),
    'latencyMs', pg_catalog.jsonb_build_object(
      'p50', case when v_p50 is null then null else pg_catalog.round(v_p50, 3) end,
      'p95', case when v_p95 is null then null else pg_catalog.round(v_p95, 3) end,
      'p99', case when v_p99 is null then null else pg_catalog.round(v_p99, 3) end
    ),
    'zeroResults', pg_catalog.jsonb_build_object(
      'firstPageSuccessSamples', v_first_page_success,
      'count', v_zero_results,
      'percent', v_zero_result_percent,
      'enforcement', 'informational'
    ),
    'cursorConflictPercent', v_cursor_conflict_percent,
    'rankingVersionDistribution', v_versions,
    'errorCodeDistribution', v_errors,
    'actorClassDistribution', v_actors,
    'thresholds', pg_catalog.jsonb_build_object(
      'minimumSamples', v_policy.minimum_samples,
      'targetSuccessPercent', v_policy.target_success_percent,
      'maxP95LatencyMs', v_policy.max_p95_latency_ms,
      'maxCursorConflictPercent', v_policy.max_cursor_conflict_percent
    )
  );

  return v_result;
end;
$$;

revoke all on function private.calculate_service_search_observability_v2(timestamptz, timestamptz) from public, anon, authenticated;

