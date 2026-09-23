-- ANA-A11: repository-only candidate for atomic liquidity policy activation.
--
-- This migration defines an owner-only activation boundary but activates nothing.
-- No policy row, freshness row or cron job is created by the migration itself.
-- Every numeric value must be supplied explicitly by a separately authorized caller.

create or replace function private.activate_analytics_cat_liquidity_policy_v1(
  p_policy_id text,
  p_window_step_seconds integer,
  p_projection_delay_slo_seconds integer,
  p_window_anchor timestamptz,
  p_max_catch_up_windows_per_invocation integer,
  p_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_policy_id text := pg_catalog.btrim(coalesce(p_policy_id,''));
  v_max_lag_seconds bigint;
begin
  if pg_catalog.char_length(v_policy_id) not between 3 and 120
     or p_window_step_seconds is null
     or p_window_step_seconds <= 0
     or p_projection_delay_slo_seconds is null
     or p_projection_delay_slo_seconds < 0
     or p_window_anchor is null
     or p_max_catch_up_windows_per_invocation is null
     or p_max_catch_up_windows_per_invocation <= 0
     or p_approval_evidence is null
     or pg_catalog.jsonb_typeof(p_approval_evidence) <> 'object'
     or p_effective_from is null
     or (p_effective_until is not null and p_effective_until <= p_effective_from) then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_INVALID';
  end if;

  v_max_lag_seconds :=
    p_window_step_seconds::bigint + p_projection_delay_slo_seconds::bigint;

  if v_max_lag_seconds not between 1 and 2147483647 then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_INVALID';
  end if;

  if exists (
    select 1
    from private.analytics_metric_publication_policies_v1 p
    where p.policy_id = v_policy_id
       or (
         p.metric_key = 'liquidity.active_service_seconds'
         and p.metric_version = 'v1'
         and p.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
         and p_effective_until is distinct from p_effective_from
         and p_effective_from < coalesce(p.effective_until,'infinity'::timestamptz)
       )
  ) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_OVERLAP';
  end if;

  if exists (
    select 1
    from private.analytics_metric_freshness_policies_v1 f
    where f.policy_id = v_policy_id
       or (
         f.metric_key = 'liquidity.active_service_seconds'
         and f.metric_version = 'v1'
         and f.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
         and p_effective_from < coalesce(f.effective_until,'infinity'::timestamptz)
       )
  ) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_FRESHNESS_POLICY_OVERLAP';
  end if;

  insert into private.analytics_metric_publication_policies_v1 (
    policy_id,
    metric_key,
    metric_version,
    window_step_seconds,
    projection_delay_slo_seconds,
    window_anchor,
    max_catch_up_windows_per_invocation,
    missed_window_order,
    scheduler_mechanism,
    derivation_contract_id,
    series_contract_id,
    approval_evidence,
    effective_from,
    effective_until
  ) values (
    v_policy_id,
    'liquidity.active_service_seconds',
    'v1',
    p_window_step_seconds,
    p_projection_delay_slo_seconds,
    p_window_anchor,
    p_max_catch_up_windows_per_invocation,
    'oldest_first',
    'supabase_pg_cron_database_local',
    'ana-a11-liquidity-freshness-policy-derivation-v1',
    'ana-a11-liquidity-series-orchestration-v1',
    p_approval_evidence,
    p_effective_from,
    p_effective_until
  );

  insert into private.analytics_metric_freshness_policies_v1 (
    policy_id,
    metric_key,
    metric_version,
    max_lag_seconds,
    effective_from,
    effective_until
  ) values (
    v_policy_id,
    'liquidity.active_service_seconds',
    'v1',
    v_max_lag_seconds::integer,
    p_effective_from,
    p_effective_until
  );

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a11-liquidity-policy-activation-v1',
    'policyId',v_policy_id,
    'metricKey','liquidity.active_service_seconds',
    'metricVersion','v1',
    'windowStepSeconds',p_window_step_seconds,
    'projectionDelaySloSeconds',p_projection_delay_slo_seconds,
    'derivedMaxLagSeconds',v_max_lag_seconds,
    'windowAnchor',p_window_anchor,
    'maxCatchUpWindowsPerInvocation',p_max_catch_up_windows_per_invocation,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'publicationPolicyInserted',true,
    'freshnessPolicyInserted',true
  );
end;
$$;

revoke all privileges on function private.activate_analytics_cat_liquidity_policy_v1(
  text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) from public, anon, authenticated, service_role;

comment on function private.activate_analytics_cat_liquidity_policy_v1(
  text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) is
  'ANA-A11 owner-only atomic activation boundary. Inserts one explicit liquidity publication policy and its mechanically derived freshness policy in the same transaction, rejects overlapping effective windows, creates no cron and has no numeric defaults.';
