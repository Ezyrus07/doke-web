-- Doke: automatic escalation evaluation every five minutes.
do $$
declare
  v_job_id bigint;
begin
  select j.jobid into v_job_id
  from cron.job j
  where j.jobname = 'doke-order-incident-escalation'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'doke-order-incident-escalation',
    '*/5 * * * *',
    $cron$select private.escalate_order_operational_incidents(now());$cron$
  );
end;
$$;
