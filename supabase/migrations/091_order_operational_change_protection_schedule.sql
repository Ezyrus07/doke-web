-- Doke: refresh error budgets and pending change gates every five minutes.
do $$
declare
  v_job_id bigint;
begin
  select j.jobid into v_job_id
  from cron.job j
  where j.jobname = 'doke-order-change-protection'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'doke-order-change-protection',
    '*/5 * * * *',
    $cron$select private.refresh_order_operational_change_protection(now());$cron$
  );
end;
$$;

select private.refresh_order_operational_change_protection(now());
