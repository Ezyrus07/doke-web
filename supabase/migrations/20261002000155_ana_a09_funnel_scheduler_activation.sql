-- ANA-A09 funnel scheduler activation function candidate.
-- REPOSITORY-ONLY CANDIDATE.
--
-- Applying this migration only defines the owner-only activation boundary.
-- It does NOT create a cron job, publish snapshots, mutate publication policies,
-- or grant scheduler authority. Actual scheduler creation requires a separate
-- exact-head staging authorization and explicit function invocation.

create or replace function private.activate_analytics_a09_funnel_scheduler_v1(
  p_policy_set_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_policy jsonb;
  v_job_name constant text := 'doke-ana-funnel-v1-r1';
  v_schedule constant text := '* * * * *';
  v_command constant text :=
    'select private.run_analytics_a09_funnel_catch_up_v1(''ana-a07-a09-funnel-v1-r1'', clock_timestamp());';
  v_canary_evidence_blob_sha constant text :=
    'e28703cd192e618582438bb0e63267caac881eda';
  v_policy_approval_evidence_digest constant text :=
    '2db1282f585217ab76069ba564c94f9133d08b3fa4c7d2f87fea76049684c829';
  v_policy_count integer;
  v_policy_digest_count integer;
  v_policy_digest text;
  v_relevant_count integer;
  v_exact_count integer;
  v_existing_job_id bigint;
  v_active_cron_count integer;
  v_a11_relevant_count integer;
  v_a11_exact_count integer;
  v_a11_publication_policy_count integer;
  v_job_id bigint;
begin
  if p_policy_set_id is null
     or pg_catalog.btrim(p_policy_set_id) is distinct from 'ana-a07-a09-funnel-v1-r1' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_POLICY_SET_UNSUPPORTED';
  end if;

  v_policy := private.current_analytics_a09_funnel_publication_policy_set_v1(
    p_policy_set_id,
    v_now
  );

  if (v_policy ->> 'contractId') is distinct from 'ana-a09-funnel-publication-policy-set-runtime-v1'
     or (v_policy ->> 'policySetId') is distinct from p_policy_set_id
     or (v_policy ->> 'metricVersion') is distinct from 'v1'
     or (v_policy ->> 'metricCount')::integer <> 8
     or (v_policy ->> 'windowStepSeconds')::integer <> 300
     or (v_policy ->> 'projectionDelaySloSeconds')::integer <> 60
     or (v_policy ->> 'derivedMaxLagSeconds')::bigint <> 360
     or (v_policy ->> 'windowAnchor')::timestamptz
        is distinct from '1970-01-01T00:00:00Z'::timestamptz
     or (v_policy ->> 'maxCatchUpWindowsPerInvocation')::integer <> 3
     or (v_policy ->> 'missedWindowOrder') is distinct from 'oldest_first'
     or (v_policy ->> 'schedulerMechanism') is distinct from 'supabase_pg_cron_database_local'
     or (v_policy ->> 'effectiveFrom')::timestamptz
        is distinct from '2026-10-01T00:00:00Z'::timestamptz
     or (v_policy ->> 'effectiveUntil') is not null then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_POLICY_BINDING_MISMATCH';
  end if;

  select
    pg_catalog.count(*)::integer,
    pg_catalog.count(distinct p.approval_evidence ->> 'evidenceDigestSha256')::integer,
    pg_catalog.min(p.approval_evidence ->> 'evidenceDigestSha256')
  into
    v_policy_count,
    v_policy_digest_count,
    v_policy_digest
  from private.analytics_metric_publication_policies_v1 p
  where p.approval_evidence ->> 'policySetId' = p_policy_set_id
    and p.metric_version = 'v1'
    and p.derivation_contract_id = 'ana-a07-a09-funnel-freshness-policy-candidate-v1'
    and p.series_contract_id = 'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'
    and p.effective_from <= v_now
    and (p.effective_until is null or v_now < p.effective_until);

  if v_policy_count <> 8
     or v_policy_digest_count <> 1
     or v_policy_digest is distinct from v_policy_approval_evidence_digest then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_POLICY_APPROVAL_MISMATCH';
  end if;

  select
    pg_catalog.count(*)::integer,
    (pg_catalog.count(*) filter (
      where j.jobname = 'doke-ana-liquidity-v1-r1'
        and j.schedule = '* * * * *'
        and j.command =
          'select private.run_analytics_cat_liquidity_catch_up_v1(''ana-a11-liquidity-v1-r1'', clock_timestamp());'
        and j.database = pg_catalog.current_database()
        and j.username = 'postgres'
        and j.active = true
    ))::integer
  into
    v_a11_relevant_count,
    v_a11_exact_count
  from cron.job j
  where j.jobname like 'doke-ana-liquidity%'
     or pg_catalog.lower(j.command) like '%run_analytics_cat_liquidity_catch_up_v1%';

  if v_a11_relevant_count <> 1 or v_a11_exact_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_A11_PRESERVATION_REQUIRED';
  end if;

  select pg_catalog.count(*)::integer
  into v_a11_publication_policy_count
  from private.analytics_metric_publication_policies_v1 p
  where p.policy_id = 'ana-a11-liquidity-v1-r1';

  if v_a11_publication_policy_count <> 1 then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_A11_PRESERVATION_REQUIRED';
  end if;

  select
    pg_catalog.count(*)::integer,
    (pg_catalog.count(*) filter (
      where j.jobname = v_job_name
        and j.schedule = v_schedule
        and j.command = v_command
        and j.database = pg_catalog.current_database()
        and j.username = 'postgres'
        and j.active = true
    ))::integer,
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
  where j.jobname like 'doke-ana-funnel%'
     or pg_catalog.lower(j.command) like '%run_analytics_a09_funnel_catch_up_v1%';

  if v_relevant_count > 0 then
    if v_relevant_count = 1 and v_exact_count = 1 then
      return pg_catalog.jsonb_build_object(
        'contractId','ana-a09-funnel-scheduler-activation-v1',
        'status','NO_CHANGE',
        'policySetId',p_policy_set_id,
        'jobId',v_existing_job_id,
        'jobName',v_job_name,
        'schedule',v_schedule,
        'pollIntervalSeconds',60,
        'publicationWindowStepSeconds',300,
        'projectionDelaySloSeconds',60,
        'target','private.run_analytics_a09_funnel_catch_up_v1',
        'plannerBypassed',false,
        'canaryEvidenceBlobSha',v_canary_evidence_blob_sha,
        'a11Preserved',true
      );
    end if;

    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_JOB_CONFLICT';
  end if;

  select pg_catalog.count(*)::integer
  into v_active_cron_count
  from cron.job j
  where j.active = true;

  if v_active_cron_count >= 8 then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_CRON_HEADROOM_EXCEEDED';
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
      message = 'DOKE_ANALYTICS_A09_SCHEDULER_JOB_VERIFICATION_FAILED';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-scheduler-activation-v1',
    'status','APPENDED',
    'policySetId',p_policy_set_id,
    'jobId',v_job_id,
    'jobName',v_job_name,
    'schedule',v_schedule,
    'pollIntervalSeconds',60,
    'publicationWindowStepSeconds',300,
    'projectionDelaySloSeconds',60,
    'target','private.run_analytics_a09_funnel_catch_up_v1',
    'plannerBypassed',false,
    'canaryEvidenceBlobSha',v_canary_evidence_blob_sha,
    'a11Preserved',true
  );
end;
$function$;

alter function private.activate_analytics_a09_funnel_scheduler_v1(text)
  owner to postgres;

revoke all privileges on function private.activate_analytics_a09_funnel_scheduler_v1(text)
  from public, anon, authenticated, service_role;

comment on function private.activate_analytics_a09_funnel_scheduler_v1(text) is
  'ANA-A09 owner-only scheduler activation boundary for policy set ana-a07-a09-funnel-v1-r1. Applying this migration creates no cron job. A separately authorized invocation may create exactly one database-local pg_cron job targeting only the bounded A09 catch-up executor; exact replay is NO_CHANGE, conflicts fail closed, global cron headroom is enforced, and A11 must remain intact.';
