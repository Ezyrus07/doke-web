-- Doke: least-privilege grants, ownership documentation and five-minute evaluator schedule.

revoke all on function private.capture_order_operational_health_snapshot(timestamptz) from public, anon, authenticated;
revoke all on function private.classify_order_operational_alerts(jsonb, timestamptz) from public, anon, authenticated;
revoke all on function private.evaluate_order_operational_alerts(timestamptz) from public, anon, authenticated;
revoke all on function public.get_order_operational_alerts_internal(uuid, integer) from public, anon, authenticated;
grant execute on function public.get_order_operational_alerts_internal(uuid, integer) to service_role;

comment on table private.order_operational_alerts is
  'Deduplicated lifecycle state for automatic order-worker operational incidents.';
comment on function private.evaluate_order_operational_alerts(timestamptz) is
  'Evaluates worker health, resolves recovered incidents and notifies active support/admin users with silence windows.';
comment on function public.get_order_operational_alerts_internal(uuid, integer) is
  'Service-role-only alert projection for an independently authenticated support/admin actor.';

do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select j.jobid from cron.job j where j.jobname = 'doke-order-operational-alerts'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'doke-order-operational-alerts',
    '*/5 * * * *',
    $job$select private.evaluate_order_operational_alerts(now());$job$
  );
exception when undefined_table or invalid_schema_name or insufficient_privilege then
  null;
end;
$$;
