-- ANA-A09 validation 054: publication orchestration candidate structural/runtime-boundary validation.
-- Rollback-only. This validation must not call the mutation-capable A09 window or catch-up functions.
-- It preserves the already-active A11 liquidity publication policy and proves no A09 publication row/cron exists.

begin;

do $validation$
declare
  v_scope_constraint text;
  v_a11_policy jsonb;
  v_selector regprocedure;
  v_planner regprocedure;
  v_window_runner regprocedure;
  v_catch_up regprocedure;
  v_def text;
  v_funnel_policy_rows integer;
  v_funnel_cron_rows integer;
  v_expected_error boolean:=false;
begin
  select pg_catalog.pg_get_constraintdef(c.oid)
  into v_scope_constraint
  from pg_catalog.pg_constraint c
  where c.conrelid='private.analytics_metric_publication_policies_v1'::regclass
    and c.conname='analytics_metric_publication_contract_scope_check';

  if v_scope_constraint is null
     or position('ana-a11-liquidity-freshness-policy-derivation-v1' in v_scope_constraint)=0
     or position('ana-a11-liquidity-series-orchestration-v1' in v_scope_constraint)=0
     or position('ana-a07-a09-funnel-freshness-policy-candidate-v1' in v_scope_constraint)=0
     or position('ana-a09-funnel-snapshot-publication-orchestration-candidate-v1' in v_scope_constraint)=0
     or position('funnel.quote_submitted_to_order_requested' in v_scope_constraint)=0 then
    raise exception 'VALIDATION_054_PUBLICATION_SCOPE_CONSTRAINT_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid='private.analytics_metric_publication_policies_v1'::regclass
      and c.conname in (
        'analytics_metric_publication_derivation_contract_check',
        'analytics_metric_publication_series_contract_check'
      )
  ) then
    raise exception 'VALIDATION_054_LEGACY_A11_ONLY_CONSTRAINTS_REMAIN';
  end if;

  v_a11_policy:=private.current_analytics_metric_publication_policy_v1(
    'liquidity.active_service_seconds','v1','2026-09-29T00:00:00Z'::timestamptz
  );
  if v_a11_policy is null
     or v_a11_policy->>'policyId'<>'ana-a11-liquidity-v1-r1'
     or (v_a11_policy->>'windowStepSeconds')::integer<>300
     or (v_a11_policy->>'projectionDelaySloSeconds')::integer<>60
     or (v_a11_policy->>'derivedMaxLagSeconds')::integer<>360
     or (v_a11_policy->>'maxCatchUpWindowsPerInvocation')::integer<>3 then
    raise exception 'VALIDATION_054_A11_PRESERVATION_FAILED policy=%',v_a11_policy;
  end if;

  select count(*)::integer into v_funnel_policy_rows
  from private.analytics_metric_publication_policies_v1
  where metric_key like 'funnel.%';
  if v_funnel_policy_rows<>0 then
    raise exception 'VALIDATION_054_FUNNEL_PUBLICATION_POLICY_UNEXPECTED count=%',v_funnel_policy_rows;
  end if;

  select count(*)::integer into v_funnel_cron_rows
  from cron.job
  where lower(coalesce(jobname,'')) like '%funnel%'
     or lower(coalesce(command,'')) like '%run_analytics_a09_funnel_catch_up_v1%';
  if v_funnel_cron_rows<>0 then
    raise exception 'VALIDATION_054_FUNNEL_CRON_UNEXPECTED count=%',v_funnel_cron_rows;
  end if;

  v_selector:=pg_catalog.to_regprocedure(
    'private.current_analytics_a09_funnel_publication_policy_set_v1(text,timestamp with time zone)'
  );
  v_planner:=pg_catalog.to_regprocedure(
    'private.plan_analytics_a09_funnel_windows_v1(text,timestamp with time zone)'
  );
  v_window_runner:=pg_catalog.to_regprocedure(
    'private.run_analytics_a09_funnel_window_v1(text,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  );
  v_catch_up:=pg_catalog.to_regprocedure(
    'private.run_analytics_a09_funnel_catch_up_v1(text,timestamp with time zone)'
  );

  if v_selector is null or v_planner is null or v_window_runner is null or v_catch_up is null then
    raise exception 'VALIDATION_054_FUNCTION_MISSING';
  end if;

  if pg_catalog.has_function_privilege('anon',v_selector,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_selector,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_selector,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_planner,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_planner,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_planner,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_window_runner,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_window_runner,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_window_runner,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_catch_up,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_catch_up,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_catch_up,'EXECUTE') then
    raise exception 'VALIDATION_054_PRIVATE_EXECUTE_BOUNDARY_INVALID';
  end if;

  select pg_catalog.pg_get_functiondef(v_catch_up::oid) into v_def;
  if position('plan_analytics_a09_funnel_windows_v1' in v_def)=0
     or position('run_analytics_a09_funnel_window_v1' in v_def)=0
     or position('maxSnapshotAppendAttempts' in v_def)=0
     or position('cron.schedule' in v_def)>0 then
    raise exception 'VALIDATION_054_CATCH_UP_DEFINITION_INVALID';
  end if;

  begin
    perform private.current_analytics_a09_funnel_publication_policy_set_v1(
      'ana-a07-a09-funnel-v1-r1',
      '2026-09-29T00:00:00Z'::timestamptz
    );
  exception when sqlstate '55000' then
    if sqlerrm='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_SET_REQUIRED' then
      v_expected_error:=true;
    else
      raise;
    end if;
  end;
  if not v_expected_error then
    raise exception 'VALIDATION_054_MISSING_POLICY_SET_DID_NOT_FAIL_CLOSED';
  end if;
end;
$validation$;

rollback;
