-- ANA-A11 structural validation for the scheduler activation candidate.
-- Run only after separate explicit staging authorization applies the candidate migration.
-- The cron created by this validation is rollback-only.
begin;

do $$
declare
  v_activation regprocedure;
  v_definition text;
  v_before bigint;
  v_after bigint;
  v_first jsonb;
  v_replay jsonb;
  v_job record;
begin
  v_activation := to_regprocedure(
    'private.activate_analytics_cat_liquidity_scheduler_v1(text)'
  );

  if v_activation is null then
    raise exception 'ANA-A11 scheduler activation function missing';
  end if;

  select pg_get_functiondef(v_activation::oid)
  into v_definition;

  if position('ana-a11-liquidity-v1-r1' in v_definition) = 0
     or position('f87d6f3286bd1b790deef55e32deae10290fc18e51a9d1d7d416ac428d78c14d' in v_definition) = 0
     or position('window_step_seconds <> 300' in v_definition) = 0
     or position('projection_delay_slo_seconds <> 60' in v_definition) = 0
     or position('max_catch_up_windows_per_invocation <> 3' in v_definition) = 0
     or position('private.run_analytics_cat_liquidity_catch_up_v1' in v_definition) = 0
     or position('cron.schedule' in v_definition) = 0
     or position('DOKE_ANALYTICS_SCHEDULER_JOB_CONFLICT' in v_definition) = 0
     or position('NO_CHANGE' in v_definition) = 0 then
    raise exception 'ANA-A11 scheduler activation definition is incomplete';
  end if;

  if position('run_analytics_cat_liquidity_projection_v1' in v_definition) > 0
     or position('run_analytics_cat_liquidity_window_v1' in v_definition) > 0 then
    raise exception 'ANA-A11 scheduler candidate bypasses bounded planner/executor topology';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_activation::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_activation::oid)
     or has_function_privilege('anon',v_activation,'EXECUTE')
     or has_function_privilege('authenticated',v_activation,'EXECUTE')
     or has_function_privilege('service_role',v_activation,'EXECUTE') then
    raise exception 'ANA-A11 scheduler activation escaped postgres owner boundary';
  end if;

  select count(*)
  into v_before
  from cron.job j
  where j.jobname like 'doke-ana-liquidity%'
     or lower(j.command) like '%run_analytics_cat_liquidity_catch_up_v1%';

  if v_before <> 0 then
    raise exception 'ANA-A11 scheduler validation requires zero pre-existing liquidity jobs';
  end if;

  v_first :=
    private.activate_analytics_cat_liquidity_scheduler_v1(
      'ana-a11-liquidity-v1-r1'
    );

  if (v_first ->> 'status') is distinct from 'APPENDED'
     or (v_first ->> 'schedule') is distinct from '* * * * *'
     or (v_first ->> 'pollIntervalSeconds')::integer <> 60
     or (v_first ->> 'publicationWindowStepSeconds')::integer <> 300
     or (v_first ->> 'target') is distinct from 'private.run_analytics_cat_liquidity_catch_up_v1'
     or (v_first ->> 'plannerBypassed')::boolean is not false then
    raise exception 'ANA-A11 scheduler first activation result invalid';
  end if;

  select j.*
  into v_job
  from cron.job j
  where j.jobname = 'doke-ana-liquidity-v1-r1';

  if not found
     or v_job.schedule is distinct from '* * * * *'
     or v_job.command is distinct from
       'select private.run_analytics_cat_liquidity_catch_up_v1(''ana-a11-liquidity-v1-r1'', clock_timestamp());'
     or v_job.database is distinct from current_database()
     or v_job.username is distinct from 'postgres'
     or v_job.active is not true then
    raise exception 'ANA-A11 scheduler cron row mismatch';
  end if;

  v_replay :=
    private.activate_analytics_cat_liquidity_scheduler_v1(
      'ana-a11-liquidity-v1-r1'
    );

  if (v_replay ->> 'status') is distinct from 'NO_CHANGE'
     or (v_replay ->> 'jobId')::bigint <> v_job.jobid then
    raise exception 'ANA-A11 scheduler activation replay is not idempotent';
  end if;

  select count(*)
  into v_after
  from cron.job j
  where j.jobname like 'doke-ana-liquidity%'
     or lower(j.command) like '%run_analytics_cat_liquidity_catch_up_v1%';

  if v_after <> 1 then
    raise exception 'ANA-A11 scheduler validation created duplicate jobs';
  end if;
end;
$$;

rollback;
