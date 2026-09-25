-- ANA-A11 structural validation for bounded liquidity catch-up execution.
-- Run only after explicit staging migration authorization.
begin;

do $$
declare
  v_executor regprocedure;
  v_def text;
begin
  v_executor := to_regprocedure(
    'private.run_analytics_cat_liquidity_catch_up_v1(text,timestamp with time zone)'
  );

  if v_executor is null then
    raise exception 'ANA-A11 liquidity catch-up executor missing';
  end if;

  select pg_get_functiondef(v_executor::oid) into v_def;

  if position('private.plan_analytics_cat_liquidity_windows_v1' in v_def) = 0
     or position('private.run_analytics_cat_liquidity_window_v1' in v_def) = 0
     or position('order by p.window_ordinal' in v_def) = 0
     or position('DOKE_ANALYTICS_LIQUIDITY_PLANNER_ORDER_INVALID' in v_def) = 0
     or position('v_window.window_ordinal <> v_planned_count + 1' in v_def) = 0 then
    raise exception 'ANA-A11 catch-up executor bypasses canonical planner/orchestrator';
  end if;

  if position('analytics_metric_publication_policies_v1' in v_def) > 0
     or position('analytics_metric_freshness_policies_v1' in v_def) > 0
     or position('cron.schedule' in lower(v_def)) > 0 then
    raise exception 'ANA-A11 catch-up executor introduced policy/scheduler authority';
  end if;

  if has_function_privilege('anon',v_executor,'EXECUTE')
     or has_function_privilege('authenticated',v_executor,'EXECUTE')
     or has_function_privilege('service_role',v_executor,'EXECUTE') then
    raise exception 'ANA-A11 catch-up executor exposed outside postgres owner boundary';
  end if;
end;
$$;

rollback;
