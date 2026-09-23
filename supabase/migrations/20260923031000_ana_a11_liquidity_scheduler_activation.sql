-- ANA-A11: repository-only scheduler activation candidate for liquidity revision 1.
--
-- Applying this migration only defines an owner-only activation function.
-- It does NOT create a cron job. Scheduler activation requires a separate,
-- explicit staging invocation after this candidate is applied and validated.
--
-- Publication cadence remains the approved 300-second canonical window grid.
-- The scheduler polls every minute because projectionDelaySloSeconds=60. The
-- planner remains the sole authority that decides whether a 5-minute window is
-- closed/missing; polling more frequently never creates sub-window snapshots.

create or replace function private.activate_analytics_cat_liquidity_scheduler_v1(
  p_policy_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_policy private.analytics_metric_publication_policies_v1%rowtype;
  v_active_at_effective jsonb;
  v_job_name constant text := 'doke-ana-liquidity-v1-r1';
  v_schedule constant text := '* * * * *';
  v_command constant text :=
    'select private.run_analytics_cat_liquidity_catch_up_v1(''ana-a11-liquidity-v1-r1'', clock_timestamp());';
  v_relevant_count integer;
  v_exact_count integer;
  v_existing_job_id bigint;
  v_job_id bigint;
begin
  if p_policy_id is null
     or pg_catalog.btrim(p_policy_id) is distinct from 'ana-a11-liquidity-v1-r1' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_SCHEDULER_POLICY_UNSUPPORTED';
  end if;

  select p.*
  into v_policy
  from private.analytics_metric_publication_policies_v1 p
  where p.policy_id = p_policy_id;

  if not found then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_POLICY_REQUIRED';
  end if;

  if v_policy.metric_key is distinct from 'liquidity.active_service_seconds'
     or v_policy.metric_version is distinct from 'v1'
     or v_policy.scheduler_mechanism is distinct from 'supabase_pg_cron_database_local'
     or v_policy.window_step_seconds <> 300
     or v_policy.projection_delay_slo_seconds <> 60
     or v_policy.window_anchor is distinct from '1970-01-01T00:00:00Z'::timestamptz
     or v_policy.max_catch_up_windows_per_invocation <> 3
     or v_policy.missed_window_order is distinct from 'oldest_first'
     or v_policy.effective_from is distinct from '2026-09-23T16:00:00Z'::timestamptz
     or v_policy.effective_until is not null
     or v_policy.approval_evidence ->> 'evidenceDigestSha256'
        is distinct from 'f87d6f3286bd1b790deef55e32deae10290fc18e51a9d1d7d416ac428d78c14d' then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_POLICY_BINDING_MISMATCH';
  end if;

  if (v_policy.approval_evidence #>> '{approvedParameters,windowStepSeconds}') is distinct from '300'
     or (v_policy.approval_evidence #>> '{approvedParameters,projectionDelaySloSeconds}') is distinct from '60'
     or (v_policy.approval_evidence #>> '{approvedParameters,windowAnchor}') is distinct from '1970-01-01T00:00:00Z'
     or (v_policy.approval_evidence #>> '{approvedParameters,maxCatchUpWindowsPerInvocation}') is distinct from '3'
     or (v_policy.approval_evidence #>> '{approvedParameters,effectiveFrom}') is distinct from '2026-09-23T16:00:00Z'
     or pg_catalog.jsonb_typeof(v_policy.approval_evidence #> '{approvedParameters,effectiveUntil}')
        is distinct from 'null' then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_POLICY_BINDING_MISMATCH';
  end if;

  v_active_at_effective :=
    private.current_analytics_metric_publication_policy_v1(
      'liquidity.active_service_seconds',
      'v1',
      v_policy.effective_from
    );

  if v_active_at_effective is null
     or (v_active_at_effective ->> 'policyId') is distinct from p_policy_id then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_EFFECTIVE_POLICY_MISMATCH';
  end if;

  -- pg_cron minute granularity is intentionally coupled to the approved
  -- 60-second projection-delay SLO. The 300-second publication cadence remains
  -- enforced exclusively by the policy-driven window planner.
  if v_policy.projection_delay_slo_seconds <> 60
     or v_policy.window_step_seconds % 60 <> 0 then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_POLLING_DERIVATION_UNSUPPORTED';
  end if;

  select
    pg_catalog.count(*),
    pg_catalog.count(*) filter (
      where j.jobname = v_job_name
        and j.schedule = v_schedule
        and j.command = v_command
        and j.database = pg_catalog.current_database()
        and j.username = 'postgres'
        and j.active = true
    ),
    pg_catalog.min(j.jobid) filter (
      where j.jobname = v_job_name
        and j.schedule = v_schedule
        and j.command = v_command
        and j.database = pg_catalog.current_database()
        and j.username = 'postgres'
        and j.active = true
    )
  into
    v_relevant_count,
    v_exact_count,
    v_existing_job_id
  from cron.job j
  where j.jobname like 'doke-ana-liquidity%'
     or pg_catalog.lower(j.command) like '%run_analytics_cat_liquidity_catch_up_v1%';

  if v_relevant_count > 0 then
    if v_relevant_count = 1 and v_exact_count = 1 then
      return pg_catalog.jsonb_build_object(
        'contractId','ana-a11-liquidity-scheduler-activation-v1',
        'status','NO_CHANGE',
        'policyId',p_policy_id,
        'jobId',v_existing_job_id,
        'jobName',v_job_name,
        'schedule',v_schedule,
        'pollIntervalSeconds',60,
        'publicationWindowStepSeconds',v_policy.window_step_seconds,
        'projectionDelaySloSeconds',v_policy.projection_delay_slo_seconds,
        'target','private.run_analytics_cat_liquidity_catch_up_v1',
        'plannerBypassed',false
      );
    end if;

    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_JOB_CONFLICT';
  end if;

  v_job_id := cron.schedule(
    v_job_name,
    v_schedule,
    v_command
  );

  if not exists (
    select 1
    from cron.job j
    where j.jobid = v_job_id
      and j.jobname = v_job_name
      and j.schedule = v_schedule
      and j.command = v_command
      and j.database = pg_catalog.current_database()
      and j.username = 'postgres'
      and j.active = true
  ) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_SCHEDULER_JOB_VERIFICATION_FAILED';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a11-liquidity-scheduler-activation-v1',
    'status','APPENDED',
    'policyId',p_policy_id,
    'jobId',v_job_id,
    'jobName',v_job_name,
    'schedule',v_schedule,
    'pollIntervalSeconds',60,
    'publicationWindowStepSeconds',v_policy.window_step_seconds,
    'projectionDelaySloSeconds',v_policy.projection_delay_slo_seconds,
    'target','private.run_analytics_cat_liquidity_catch_up_v1',
    'plannerBypassed',false
  );
end;
$$;

revoke all privileges on function private.activate_analytics_cat_liquidity_scheduler_v1(text)
from public, anon, authenticated, service_role;

comment on function private.activate_analytics_cat_liquidity_scheduler_v1(text) is
  'ANA-A11 owner-only scheduler activation boundary for persisted liquidity policy revision 1. Creates exactly one postgres-local pg_cron job polling each minute (derived from projectionDelaySloSeconds=60) and targets only the bounded catch-up executor. The planner remains the authority for the 300-second publication grid. Applying the migration itself creates no cron job.';
