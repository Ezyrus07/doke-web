-- Doke: exclude historical false cron degradation caused only by transient startup snapshots without start_time.
create or replace function private.calculate_order_operational_slo_metrics(
  p_window_days integer default 30,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_days integer := greatest(1, least(coalesce(p_window_days, 30), 365));
  v_from timestamptz := p_observed_at - make_interval(days => greatest(1, least(coalesce(p_window_days, 30), 365)));
  v_evaluations integer := 0;
  v_healthy_evaluations integer := 0;
  v_availability numeric;
  v_cycles integer := 0;
  v_resolved integer := 0;
  v_critical integer := 0;
  v_warning integer := 0;
  v_mtta_avg numeric;
  v_mtta_p95 numeric;
  v_mttr_avg numeric;
  v_mttr_p95 numeric;
  v_critical_mtta numeric;
  v_warning_mtta numeric;
  v_critical_mttr numeric;
  v_warning_mttr numeric;
  v_completed_reviews integer := 0;
  v_completion_rate numeric;
  v_open_actions integer := 0;
  v_overdue_actions integer := 0;
begin
  select count(*),
         count(*) filter (where not exists (
           select 1
           from jsonb_array_elements(private.classify_order_operational_alerts(e.snapshot, e.evaluated_at)) item
           where item ->> 'severity' = 'critical'
             and not (
               item ->> 'alertType' = 'cron_inactive'
               and lower(coalesce(e.snapshot ->> 'cronLastStatus', '')) in ('connecting', 'sending', 'running')
               and nullif(e.snapshot ->> 'cronLastRunAt', '') is null
               and coalesce((e.snapshot ->> 'cronActive')::boolean, false)
             )
         ))
    into v_evaluations, v_healthy_evaluations
  from private.order_operational_alert_evaluations e
  where e.status = 'completed'
    and e.evaluated_at >= v_from
    and e.evaluated_at <= p_observed_at;

  v_availability := case when v_evaluations = 0 then null
    else round((v_healthy_evaluations::numeric / v_evaluations::numeric) * 100, 3) end;

  select
    count(*),
    count(*) filter (where c.status = 'resolved'),
    count(*) filter (where c.severity = 'critical'),
    count(*) filter (where c.severity = 'warning'),
    round(avg(c.mtta_seconds)::numeric, 1),
    round((percentile_cont(0.95) within group (order by c.mtta_seconds))::numeric, 1),
    round(avg(c.mttr_seconds)::numeric, 1),
    round((percentile_cont(0.95) within group (order by c.mttr_seconds))::numeric, 1),
    round((avg(c.mtta_seconds) filter (where c.severity = 'critical'))::numeric, 1),
    round((avg(c.mtta_seconds) filter (where c.severity = 'warning'))::numeric, 1),
    round((avg(c.mttr_seconds) filter (where c.severity = 'critical'))::numeric, 1),
    round((avg(c.mttr_seconds) filter (where c.severity = 'warning'))::numeric, 1)
  into
    v_cycles, v_resolved, v_critical, v_warning,
    v_mtta_avg, v_mtta_p95, v_mttr_avg, v_mttr_p95,
    v_critical_mtta, v_warning_mtta, v_critical_mttr, v_warning_mttr
  from private.order_operational_incident_cycles c
  where c.opened_at >= v_from
    and c.opened_at <= p_observed_at;

  select count(*) into v_completed_reviews
  from private.order_operational_post_incident_reviews r
  join private.order_operational_incident_cycles c on c.id = r.cycle_id
  where c.status = 'resolved'
    and c.opened_at >= v_from
    and c.opened_at <= p_observed_at
    and r.status = 'completed';

  v_completion_rate := case when v_resolved = 0 then null
    else round((v_completed_reviews::numeric / v_resolved::numeric) * 100, 1) end;

  select
    count(*) filter (where p.status in ('todo', 'in_progress')),
    count(*) filter (where p.status in ('todo', 'in_progress') and p.due_at < p_observed_at::date)
  into v_open_actions, v_overdue_actions
  from private.order_operational_prevention_actions p;

  return jsonb_build_object(
    'windowDays', v_days,
    'from', v_from,
    'to', p_observed_at,
    'availabilityPct', v_availability,
    'evaluations', v_evaluations,
    'healthyEvaluations', v_healthy_evaluations,
    'incidentCycles', v_cycles,
    'resolvedCycles', v_resolved,
    'criticalCycles', v_critical,
    'warningCycles', v_warning,
    'mttaAvgSeconds', v_mtta_avg,
    'mttaP95Seconds', v_mtta_p95,
    'mttrAvgSeconds', v_mttr_avg,
    'mttrP95Seconds', v_mttr_p95,
    'criticalMttaSeconds', v_critical_mtta,
    'warningMttaSeconds', v_warning_mtta,
    'criticalMttrSeconds', v_critical_mttr,
    'warningMttrSeconds', v_warning_mttr,
    'completedPostIncidentReviews', v_completed_reviews,
    'postIncidentCompletionPct', v_completion_rate,
    'openPreventionActions', v_open_actions,
    'overduePreventionActions', v_overdue_actions
  );
end;
$$;

select private.generate_order_operational_slo_report(current_date, 7);
select private.generate_order_operational_slo_report(current_date, 30);
