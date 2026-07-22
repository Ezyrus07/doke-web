-- Doke: generate 7-day and 30-day operational SLO reports daily at 00:15 America/Bahia (03:15 UTC).
do $$
declare
  v_job_id bigint;
begin
  select j.jobid into v_job_id
  from cron.job j
  where j.jobname = 'doke-order-slo-daily-report'
  limit 1;

  if v_job_id is not null then
    perform cron.unschedule(v_job_id);
  end if;

  perform cron.schedule(
    'doke-order-slo-daily-report',
    '15 3 * * *',
    $cron$select private.generate_order_operational_slo_reports_daily();$cron$
  );
end;
$$;
