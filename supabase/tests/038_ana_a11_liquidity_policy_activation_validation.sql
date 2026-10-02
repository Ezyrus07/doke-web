-- ANA-A11 structural validation for atomic liquidity policy activation.
-- Run only after explicit staging migration authorization.
begin;

do $$
declare
  v_activation regprocedure;
  v_def text;
begin
  v_activation := to_regprocedure(
    'private.activate_analytics_cat_liquidity_policy_v1(text,integer,integer,timestamp with time zone,integer,jsonb,timestamp with time zone,timestamp with time zone)'
  );

  if v_activation is null then
    raise exception 'ANA-A11 liquidity policy activation function missing';
  end if;

  select pg_get_functiondef(v_activation::oid) into v_def;

  if position('analytics_metric_publication_policies_v1' in v_def) = 0
     or position('analytics_metric_freshness_policies_v1' in v_def) = 0
     or position('p_window_step_seconds::bigint + p_projection_delay_slo_seconds::bigint' in v_def) = 0
     or position('DOKE_ANALYTICS_PUBLICATION_POLICY_OVERLAP' in v_def) = 0
     or position('DOKE_ANALYTICS_FRESHNESS_POLICY_OVERLAP' in v_def) = 0 then
    raise exception 'ANA-A11 policy activation does not preserve atomic derivation/overlap rules';
  end if;

  if position('cron.schedule' in lower(v_def)) > 0
     or position('run_analytics_cat_liquidity_catch_up_v1' in v_def) > 0 then
    raise exception 'ANA-A11 policy activation introduced scheduler authority';
  end if;

  if has_function_privilege('anon',v_activation,'EXECUTE')
     or has_function_privilege('authenticated',v_activation,'EXECUTE')
     or has_function_privilege('service_role',v_activation,'EXECUTE') then
    raise exception 'ANA-A11 policy activation exposed outside postgres owner boundary';
  end if;
end;
$$;

rollback;
