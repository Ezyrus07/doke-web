-- ANA-A11 repository/staging structural validation for the liquidity series orchestrator.
-- Run only after the candidate migration has been explicitly authorized and applied.
begin;

do $$
declare
  v_series regprocedure;
  v_window_runner regprocedure;
  v_series_def text;
  v_runner_def text;
begin
  v_series := to_regprocedure(
    'private.list_analytics_cat_liquidity_series_v1(timestamp with time zone,timestamp with time zone)'
  );
  v_window_runner := to_regprocedure(
    'private.run_analytics_cat_liquidity_window_v1(timestamp with time zone,timestamp with time zone)'
  );

  if v_series is null or v_window_runner is null then
    raise exception 'ANA-A11 liquidity series orchestration functions missing';
  end if;

  select pg_get_functiondef(v_series::oid) into v_series_def;
  select pg_get_functiondef(v_window_runner::oid) into v_runner_def;

  if position('private.cat_listing_supply_coverage_epochs_v1' in v_series_def) = 0
     or position('certification_state = ''certified''' in v_series_def) = 0
     or position('private.cat_listing_visibility_watermark_v1()' in v_series_def) = 0
     or position('dimension_snapshot_after' in v_series_def) = 0
     or position('pg_catalog.lower' in v_series_def) = 0 then
    raise exception 'ANA-A11 series enumerator does not preserve CAT-A07/A06 authority';
  end if;

  if position('public.services' in v_series_def) > 0
     or position('public.service_versions' in v_series_def) > 0 then
    raise exception 'ANA-A11 series enumerator joined mutable catalog state';
  end if;

  if position('public.run_analytics_cat_liquidity_projection_v1' in v_runner_def) = 0
     or position('private.list_analytics_cat_liquidity_series_v1' in v_runner_def) = 0
     or position('DOKE_ANALYTICS_LIQUIDITY_SNAPSHOT_STATE_INVALID' in v_runner_def) = 0 then
    raise exception 'ANA-A11 window orchestrator does not delegate to canonical A10 authority';
  end if;

  if has_function_privilege('anon', v_series, 'EXECUTE')
     or has_function_privilege('authenticated', v_series, 'EXECUTE')
     or has_function_privilege('service_role', v_series, 'EXECUTE')
     or has_function_privilege('anon', v_window_runner, 'EXECUTE')
     or has_function_privilege('authenticated', v_window_runner, 'EXECUTE')
     or has_function_privilege('service_role', v_window_runner, 'EXECUTE') then
    raise exception 'ANA-A11 private scheduler helpers exposed outside postgres owner boundary';
  end if;
end;
$$;

rollback;
