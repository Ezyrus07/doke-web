-- ANA-A09 rollback-only validation for the scheduler activation function candidate.
-- Run only after a separate exact-head staging authorization applies the migration.
-- Every scheduler row created here is transactional and rolled back.

begin;

do $validation$
declare
  v_activation regprocedure;
  v_definition text;
  v_before_a09 integer;
  v_after_conflict_cleanup integer;
  v_first jsonb;
  v_replay jsonb;
  v_replay_after_conflict jsonb;
  v_job record;
  v_conflict_job_id bigint;
  v_a11_job_before jsonb;
  v_a11_job_after jsonb;
  v_a11_policy_before jsonb;
  v_a11_policy_after jsonb;
begin
  v_activation := pg_catalog.to_regprocedure(
    'private.activate_analytics_a09_funnel_scheduler_v1(text)'
  );

  if v_activation is null then
    raise exception 'ANA-A09 scheduler activation function missing';
  end if;

  select pg_catalog.pg_get_functiondef(v_activation::oid)
  into v_definition;

  if position('ana-a07-a09-funnel-v1-r1' in v_definition) = 0
     or position('doke-ana-funnel-v1-r1' in v_definition) = 0
     or position('* * * * *' in v_definition) = 0
     or position('private.run_analytics_a09_funnel_catch_up_v1' in v_definition) = 0
     or position('e28703cd192e618582438bb0e63267caac881eda' in v_definition) = 0
     or position('2db1282f585217ab76069ba564c94f9133d08b3fa4c7d2f87fea76049684c829' in v_definition) = 0
     or position('DOKE_ANALYTICS_A09_SCHEDULER_JOB_CONFLICT' in v_definition) = 0
     or position('DOKE_ANALYTICS_A09_SCHEDULER_CRON_HEADROOM_EXCEEDED' in v_definition) = 0
     or position('DOKE_ANALYTICS_A09_SCHEDULER_A11_PRESERVATION_REQUIRED' in v_definition) = 0
     or position('NO_CHANGE' in v_definition) = 0
     or position('APPENDED' in v_definition) = 0 then
    raise exception 'ANA-A09 scheduler activation definition is incomplete';
  end if;

  if position('run_analytics_a09_funnel_window_v1' in v_definition) > 0
     or position('compute_analytics_canonical_funnel_snapshot_payloads_v1' in v_definition) > 0 then
    raise exception 'ANA-A09 scheduler activation bypasses the bounded catch-up executor';
  end if;

  if pg_catalog.pg_get_userbyid(
       (select p.proowner from pg_catalog.pg_proc p where p.oid = v_activation::oid)
     ) <> 'postgres'
     or not (
       select p.prosecdef from pg_catalog.pg_proc p where p.oid = v_activation::oid
     )
     or pg_catalog.has_function_privilege('anon',v_activation,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_activation,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_activation,'EXECUTE') then
    raise exception 'ANA-A09 scheduler activation escaped postgres owner boundary';
  end if;

  select pg_catalog.to_jsonb(j)
  into v_a11_job_before
  from cron.job j
  where j.jobname = 'doke-ana-liquidity-v1-r1'
    and j.schedule = '* * * * *'
    and j.command =
      'select private.run_analytics_cat_liquidity_catch_up_v1(''ana-a11-liquidity-v1-r1'', clock_timestamp());'
    and j.database = pg_catalog.current_database()
    and j.username = 'postgres'
    and j.active = true;

  if v_a11_job_before is null then
    raise exception 'ANA-A09 scheduler validation requires canonical A11 scheduler';
  end if;

  select pg_catalog.to_jsonb(p)
  into v_a11_policy_before
  from private.analytics_metric_publication_policies_v1 p
  where p.policy_id = 'ana-a11-liquidity-v1-r1';

  if v_a11_policy_before is null then
    raise exception 'ANA-A09 scheduler validation requires canonical A11 publication policy';
  end if;

  select pg_catalog.count(*)::integer
  into v_before_a09
  from cron.job j
  where j.jobname like 'doke-ana-funnel%'
     or pg_catalog.lower(j.command) like '%run_analytics_a09_funnel_catch_up_v1%';

  if v_before_a09 <> 0 then
    raise exception 'ANA-A09 scheduler validation requires zero pre-existing funnel jobs';
  end if;

  v_first := private.activate_analytics_a09_funnel_scheduler_v1(
    'ana-a07-a09-funnel-v1-r1'
  );

  if (v_first ->> 'status') is distinct from 'APPENDED'
     or (v_first ->> 'jobName') is distinct from 'doke-ana-funnel-v1-r1'
     or (v_first ->> 'schedule') is distinct from '* * * * *'
     or (v_first ->> 'pollIntervalSeconds')::integer <> 60
     or (v_first ->> 'publicationWindowStepSeconds')::integer <> 300
     or (v_first ->> 'projectionDelaySloSeconds')::integer <> 60
     or (v_first ->> 'target') is distinct from 'private.run_analytics_a09_funnel_catch_up_v1'
     or (v_first ->> 'plannerBypassed')::boolean is not false
     or (v_first ->> 'canaryEvidenceBlobSha')
        is distinct from 'e28703cd192e618582438bb0e63267caac881eda'
     or (v_first ->> 'a11Preserved')::boolean is not true then
    raise exception 'ANA-A09 scheduler first activation result invalid';
  end if;

  select j.*
  into v_job
  from cron.job j
  where j.jobname = 'doke-ana-funnel-v1-r1';

  if not found
     or v_job.schedule is distinct from '* * * * *'
     or v_job.command is distinct from
       'select private.run_analytics_a09_funnel_catch_up_v1(''ana-a07-a09-funnel-v1-r1'', clock_timestamp());'
     or v_job.database is distinct from pg_catalog.current_database()
     or v_job.username is distinct from 'postgres'
     or v_job.active is not true then
    raise exception 'ANA-A09 scheduler cron row mismatch';
  end if;

  v_replay := private.activate_analytics_a09_funnel_scheduler_v1(
    'ana-a07-a09-funnel-v1-r1'
  );

  if (v_replay ->> 'status') is distinct from 'NO_CHANGE'
     or (v_replay ->> 'jobId')::bigint <> v_job.jobid then
    raise exception 'ANA-A09 scheduler activation replay is not idempotent';
  end if;

  v_conflict_job_id := cron.schedule(
    'doke-ana-funnel-validation-conflict',
    '* * * * *',
    'select private.run_analytics_a09_funnel_catch_up_v1(''ana-a07-a09-funnel-v1-r1'', clock_timestamp());'
  );

  begin
    perform private.activate_analytics_a09_funnel_scheduler_v1(
      'ana-a07-a09-funnel-v1-r1'
    );
    raise exception 'ANA-A09 scheduler conflict was not rejected';
  exception
    when others then
      if sqlerrm is distinct from 'DOKE_ANALYTICS_A09_SCHEDULER_JOB_CONFLICT' then
        raise;
      end if;
  end;

  perform cron.unschedule(v_conflict_job_id);

  select pg_catalog.count(*)::integer
  into v_after_conflict_cleanup
  from cron.job j
  where j.jobname like 'doke-ana-funnel%'
     or pg_catalog.lower(j.command) like '%run_analytics_a09_funnel_catch_up_v1%';

  if v_after_conflict_cleanup <> 1 then
    raise exception 'ANA-A09 scheduler conflict cleanup left unexpected funnel jobs';
  end if;

  v_replay_after_conflict := private.activate_analytics_a09_funnel_scheduler_v1(
    'ana-a07-a09-funnel-v1-r1'
  );

  if (v_replay_after_conflict ->> 'status') is distinct from 'NO_CHANGE'
     or (v_replay_after_conflict ->> 'jobId')::bigint <> v_job.jobid then
    raise exception 'ANA-A09 scheduler exact job changed after conflict rejection';
  end if;

  select pg_catalog.to_jsonb(j)
  into v_a11_job_after
  from cron.job j
  where j.jobname = 'doke-ana-liquidity-v1-r1'
    and j.schedule = '* * * * *'
    and j.command =
      'select private.run_analytics_cat_liquidity_catch_up_v1(''ana-a11-liquidity-v1-r1'', clock_timestamp());'
    and j.database = pg_catalog.current_database()
    and j.username = 'postgres'
    and j.active = true;

  select pg_catalog.to_jsonb(p)
  into v_a11_policy_after
  from private.analytics_metric_publication_policies_v1 p
  where p.policy_id = 'ana-a11-liquidity-v1-r1';

  if v_a11_job_after is distinct from v_a11_job_before
     or v_a11_policy_after is distinct from v_a11_policy_before then
    raise exception 'ANA-A09 scheduler validation mutated A11';
  end if;
end;
$validation$;

rollback;
