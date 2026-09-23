-- ANA-A11: repository-only candidate for bounded liquidity catch-up execution.
--
-- This migration defines no policy values and creates no cron. The executor can
-- only act on windows returned by the policy-driven ANA-A11 planner and delegates
-- each window to the existing atomic series orchestrator.

create or replace function private.run_analytics_cat_liquidity_catch_up_v1(
  p_policy_id text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_window record;
  v_window_result jsonb;
  v_results jsonb := '[]'::jsonb;
  v_planned_count integer := 0;
  v_appended_count integer := 0;
  v_no_change_count integer := 0;
begin
  for v_window in
    select
      p.window_ordinal,
      p.window_start,
      p.window_end,
      p.required_series_count,
      p.materialized_series_count,
      p.missing_series_count
    from private.plan_analytics_cat_liquidity_windows_v1(
      p_policy_id,
      p_at
    ) p
    order by p.window_ordinal
  loop
    v_window_result := private.run_analytics_cat_liquidity_window_v1(
      v_window.window_start,
      v_window.window_end
    );

    v_planned_count := v_planned_count + 1;
    v_appended_count := v_appended_count
      + coalesce((v_window_result ->> 'appendedCount')::integer,0);
    v_no_change_count := v_no_change_count
      + coalesce((v_window_result ->> 'noChangeCount')::integer,0);

    v_results := v_results || jsonb_build_array(
      jsonb_build_object(
        'windowOrdinal',v_window.window_ordinal,
        'windowStart',v_window.window_start,
        'windowEnd',v_window.window_end,
        'requiredSeriesBefore',v_window.required_series_count,
        'materializedSeriesBefore',v_window.materialized_series_count,
        'missingSeriesBefore',v_window.missing_series_count,
        'result',v_window_result
      )
    );
  end loop;

  return jsonb_build_object(
    'contractId','ana-a11-liquidity-catch-up-executor-v1',
    'metricKey','liquidity.active_service_seconds',
    'metricVersion','v1',
    'policyId',pg_catalog.btrim(coalesce(p_policy_id,'')),
    'evaluatedAt',p_at,
    'plannedWindowCount',v_planned_count,
    'appendedSeriesCount',v_appended_count,
    'noChangeSeriesCount',v_no_change_count,
    'windows',v_results
  );
end;
$$;

revoke all privileges on function private.run_analytics_cat_liquidity_catch_up_v1(text,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.run_analytics_cat_liquidity_catch_up_v1(text,timestamptz) is
  'ANA-A11 owner-only bounded catch-up executor. Consumes only windows emitted by the explicit-policy planner and delegates each to the atomic A11 window orchestrator. No cron or policy default is created. An uncaught window failure aborts the caller transaction, preventing a partially committed catch-up invocation.';
