-- ANA-A11 structural validation for the policy-driven liquidity window planner.
-- Run only after explicit staging migration authorization.
begin;

do $$
declare
  v_planner regprocedure;
  v_def text;
begin
  v_planner := to_regprocedure(
    'private.plan_analytics_cat_liquidity_windows_v1(text,timestamp with time zone)'
  );

  if v_planner is null then
    raise exception 'ANA-A11 liquidity window planner missing';
  end if;

  select pg_get_functiondef(v_planner::oid) into v_def;

  if position('private.analytics_metric_publication_policies_v1' in v_def) = 0
     or position('private.cat_listing_supply_coverage_epochs_v1' in v_def) = 0
     or position('private.cat_listing_visibility_watermark_v1()' in v_def) = 0
     or position('private.list_analytics_cat_liquidity_series_v1' in v_def) = 0
     or position('private.analytics_metric_snapshots_v1' in v_def) = 0
     or position('max_catch_up_windows_per_invocation' in v_def) = 0 then
    raise exception 'ANA-A11 planner does not preserve policy/CAT/ANA authorities';
  end if;

  if position('DOKE_ANALYTICS_PUBLICATION_POLICY_REQUIRED' in v_def) = 0
     or position('where w.missing_count > 0' in v_def) = 0
     or position('order by w.candidate_window_start' in v_def) = 0 then
    raise exception 'ANA-A11 planner is not fail-closed oldest-first';
  end if;

  if position('insert into' in lower(v_def)) > 0
     or position('update ' in lower(v_def)) > 0
     or position('delete from' in lower(v_def)) > 0
     or position('cron.schedule' in lower(v_def)) > 0 then
    raise exception 'ANA-A11 planner unexpectedly mutates runtime state';
  end if;

  if has_function_privilege('anon',v_planner,'EXECUTE')
     or has_function_privilege('authenticated',v_planner,'EXECUTE')
     or has_function_privilege('service_role',v_planner,'EXECUTE') then
    raise exception 'ANA-A11 planner exposed outside postgres owner boundary';
  end if;
end;
$$;

rollback;
