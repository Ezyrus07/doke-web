-- Doke: multi-window error budget calculation and protection-state snapshots.

create or replace function private.order_operational_budget_metric_result(
  p_samples bigint,
  p_good bigint,
  p_target_percent numeric,
  p_minimum_samples integer
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_samples bigint := greatest(coalesce(p_samples, 0), 0);
  v_good bigint := greatest(least(coalesce(p_good, 0), greatest(coalesce(p_samples, 0), 0)), 0);
  v_compliance numeric;
  v_observed_error numeric;
  v_allowed_error numeric := greatest(100 - p_target_percent, 0.0001);
  v_burn numeric;
  v_consumed numeric;
begin
  if v_samples = 0 or v_samples < greatest(coalesce(p_minimum_samples, 0), 0) then
    return jsonb_build_object(
      'status', 'no_data',
      'samples', v_samples,
      'good', v_good,
      'bad', greatest(v_samples - v_good, 0),
      'targetPercent', p_target_percent,
      'minimumSamples', greatest(coalesce(p_minimum_samples, 0), 0),
      'compliancePercent', null,
      'errorBudgetPercent', round(v_allowed_error, 4),
      'consumedPercent', null,
      'burnRate', null
    );
  end if;

  v_compliance := round((v_good::numeric / v_samples::numeric) * 100, 4);
  v_observed_error := greatest(100 - v_compliance, 0);
  v_burn := round(v_observed_error / v_allowed_error, 4);
  v_consumed := round(v_burn * 100, 4);

  return jsonb_build_object(
    'status', case when v_compliance >= p_target_percent then 'met' else 'breached' end,
    'samples', v_samples,
    'good', v_good,
    'bad', greatest(v_samples - v_good, 0),
    'targetPercent', p_target_percent,
    'minimumSamples', greatest(coalesce(p_minimum_samples, 0), 0),
    'compliancePercent', v_compliance,
    'errorBudgetPercent', round(v_allowed_error, 4),
    'consumedPercent', v_consumed,
    'burnRate', v_burn
  );
end;
$$;

create or replace function private.calculate_order_operational_error_budget(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_window text;
  v_from timestamptz;
  v_windows jsonb := '{}'::jsonb;
  v_metrics jsonb;
  v_policy private.order_operational_error_budget_policies%rowtype;
  v_samples bigint;
  v_good bigint;
  v_minimum integer;
  v_window_burn numeric;
  v_window_consumed numeric;
  v_burn_1h numeric;
  v_burn_6h numeric;
  v_burn_24h numeric;
  v_burn_30d numeric;
  v_max_30d numeric;
  v_worst_short numeric;
  v_open_critical integer := 0;
  v_escalated_critical integer := 0;
  v_state text := 'healthy';
  v_reasons jsonb := '[]'::jsonb;
  v_result jsonb;
begin
  foreach v_window in array array['1h', '6h', '24h', '30d']
  loop
    v_from := case v_window
      when '1h' then p_observed_at - interval '1 hour'
      when '6h' then p_observed_at - interval '6 hours'
      when '24h' then p_observed_at - interval '24 hours'
      else p_observed_at - interval '30 days'
    end;
    v_metrics := '{}'::jsonb;

    select * into v_policy
    from private.order_operational_error_budget_policies
    where metric_key = 'worker_availability';

    v_minimum := case v_window
      when '1h' then v_policy.minimum_samples_1h
      when '6h' then v_policy.minimum_samples_6h
      when '24h' then v_policy.minimum_samples_24h
      else v_policy.minimum_samples_30d
    end;

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
      into v_samples, v_good
    from private.order_operational_alert_evaluations e
    where e.status = 'completed'
      and e.evaluated_at >= v_from
      and e.evaluated_at <= p_observed_at;

    v_metrics := v_metrics || jsonb_build_object(
      v_policy.metric_key,
      private.order_operational_budget_metric_result(v_samples, v_good, v_policy.target_percent, v_minimum)
        || jsonb_build_object('title', v_policy.title, 'enforced', v_policy.enforcement_enabled)
    );

    select * into v_policy
    from private.order_operational_error_budget_policies
    where metric_key = 'worker_delivery_success';
    v_minimum := case v_window
      when '1h' then v_policy.minimum_samples_1h
      when '6h' then v_policy.minimum_samples_6h
      when '24h' then v_policy.minimum_samples_24h
      else v_policy.minimum_samples_30d
    end;

    select coalesce(sum(r.claimed_count), 0),
           coalesce(sum(least(r.completed_count, r.claimed_count)), 0)
      into v_samples, v_good
    from private.order_event_worker_runs r
    where r.started_at >= v_from
      and r.started_at <= p_observed_at;

    v_metrics := v_metrics || jsonb_build_object(
      v_policy.metric_key,
      private.order_operational_budget_metric_result(v_samples, v_good, v_policy.target_percent, v_minimum)
        || jsonb_build_object('title', v_policy.title, 'enforced', v_policy.enforcement_enabled)
    );

    select * into v_policy
    from private.order_operational_error_budget_policies
    where metric_key = 'incident_mtta_compliance';
    v_minimum := case v_window
      when '1h' then v_policy.minimum_samples_1h
      when '6h' then v_policy.minimum_samples_6h
      when '24h' then v_policy.minimum_samples_24h
      else v_policy.minimum_samples_30d
    end;

    select count(*),
           count(*) filter (where c.mtta_seconds <= case when c.severity = 'critical' then 600 else 1800 end)
      into v_samples, v_good
    from private.order_operational_incident_cycles c
    where c.opened_at >= v_from
      and c.opened_at <= p_observed_at
      and c.mtta_seconds is not null;

    v_metrics := v_metrics || jsonb_build_object(
      v_policy.metric_key,
      private.order_operational_budget_metric_result(v_samples, v_good, v_policy.target_percent, v_minimum)
        || jsonb_build_object('title', v_policy.title, 'enforced', v_policy.enforcement_enabled)
    );

    select * into v_policy
    from private.order_operational_error_budget_policies
    where metric_key = 'incident_mttr_compliance';
    v_minimum := case v_window
      when '1h' then v_policy.minimum_samples_1h
      when '6h' then v_policy.minimum_samples_6h
      when '24h' then v_policy.minimum_samples_24h
      else v_policy.minimum_samples_30d
    end;

    select count(*),
           count(*) filter (where c.mttr_seconds <= case when c.severity = 'critical' then 2400 else 9000 end)
      into v_samples, v_good
    from private.order_operational_incident_cycles c
    where c.status = 'resolved'
      and c.resolved_at >= v_from
      and c.resolved_at <= p_observed_at
      and c.mttr_seconds is not null;

    v_metrics := v_metrics || jsonb_build_object(
      v_policy.metric_key,
      private.order_operational_budget_metric_result(v_samples, v_good, v_policy.target_percent, v_minimum)
        || jsonb_build_object('title', v_policy.title, 'enforced', v_policy.enforcement_enabled)
    );

    select max(nullif(value ->> 'burnRate', '')::numeric),
           max(nullif(value ->> 'consumedPercent', '')::numeric)
      into v_window_burn, v_window_consumed
    from jsonb_each(v_metrics)
    where coalesce((value ->> 'enforced')::boolean, false)
      and value ->> 'status' <> 'no_data';

    v_windows := v_windows || jsonb_build_object(
      v_window,
      jsonb_build_object(
        'from', v_from,
        'to', p_observed_at,
        'worstBurnRate', v_window_burn,
        'maximumConsumedPercent', v_window_consumed,
        'metrics', v_metrics
      )
    );

    if v_window = '1h' then v_burn_1h := v_window_burn; end if;
    if v_window = '6h' then v_burn_6h := v_window_burn; end if;
    if v_window = '24h' then v_burn_24h := v_window_burn; end if;
    if v_window = '30d' then
      v_burn_30d := v_window_burn;
      v_max_30d := v_window_consumed;
    end if;
  end loop;

  select count(*) filter (where severity = 'critical'),
         count(*) filter (where severity = 'critical' and workflow_status = 'escalated')
    into v_open_critical, v_escalated_critical
  from private.order_operational_alerts
  where status = 'open';

  v_worst_short := greatest(coalesce(v_burn_1h, 0), coalesce(v_burn_6h, 0), coalesce(v_burn_24h, 0));

  if v_escalated_critical > 0 then
    v_state := 'frozen';
    v_reasons := v_reasons || jsonb_build_array('critical_incident_escalated');
  end if;
  if coalesce(v_burn_1h, 0) >= 14.4 and coalesce(v_burn_6h, 0) >= 6 then
    v_state := 'frozen';
    v_reasons := v_reasons || jsonb_build_array('fast_burn_multi_window');
  end if;
  if coalesce(v_max_30d, 0) >= 100 then
    v_state := 'frozen';
    v_reasons := v_reasons || jsonb_build_array('monthly_budget_exhausted');
  end if;

  if v_state <> 'frozen' then
    if v_open_critical > 0 then
      v_state := 'restricted';
      v_reasons := v_reasons || jsonb_build_array('critical_incident_open');
    end if;
    if coalesce(v_burn_6h, 0) >= 6 or coalesce(v_burn_24h, 0) >= 3 then
      v_state := 'restricted';
      v_reasons := v_reasons || jsonb_build_array('sustained_error_budget_burn');
    end if;
    if coalesce(v_max_30d, 0) >= 80 then
      v_state := 'restricted';
      v_reasons := v_reasons || jsonb_build_array('monthly_budget_near_exhaustion');
    end if;
  end if;

  if v_state = 'healthy' then
    if coalesce(v_burn_24h, 0) >= 1 or coalesce(v_burn_1h, 0) >= 2 then
      v_state := 'warning';
      v_reasons := v_reasons || jsonb_build_array('budget_burn_above_sustainable_rate');
    end if;
    if coalesce(v_max_30d, 0) >= 50 then
      v_state := 'warning';
      v_reasons := v_reasons || jsonb_build_array('monthly_budget_half_consumed');
    end if;
  end if;

  if jsonb_array_length(v_reasons) = 0 then
    v_reasons := jsonb_build_array('within_budget');
  end if;

  v_result := jsonb_build_object(
    'protectionState', v_state,
    'reasons', v_reasons,
    'windows', v_windows,
    'worstShortBurnRate', nullif(v_worst_short, 0),
    'maximum30dConsumedPercent', v_max_30d,
    'openCriticalIncidents', v_open_critical,
    'escalatedCriticalIncidents', v_escalated_critical,
    'observedAt', p_observed_at
  );

  return v_result;
end;
$$;

create or replace function private.refresh_order_operational_error_budget(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_result jsonb;
  v_hash text;
  v_snapshot_id uuid;
begin
  v_result := private.calculate_order_operational_error_budget(p_observed_at);
  v_hash := encode(extensions.digest((v_result - 'observedAt')::text, 'sha256'), 'hex');

  insert into private.order_operational_error_budget_snapshots (
    protection_state, reasons, windows, worst_short_burn_rate,
    maximum_30d_consumed_percent, open_critical_incidents,
    escalated_critical_incidents, source_hash, observed_at
  ) values (
    v_result ->> 'protectionState',
    v_result -> 'reasons',
    v_result -> 'windows',
    nullif(v_result ->> 'worstShortBurnRate', '')::numeric,
    nullif(v_result ->> 'maximum30dConsumedPercent', '')::numeric,
    coalesce((v_result ->> 'openCriticalIncidents')::integer, 0),
    coalesce((v_result ->> 'escalatedCriticalIncidents')::integer, 0),
    v_hash,
    p_observed_at
  ) returning id into v_snapshot_id;

  delete from private.order_operational_error_budget_snapshots
  where observed_at < p_observed_at - interval '90 days';

  return v_result || jsonb_build_object('snapshotId', v_snapshot_id, 'sourceHash', v_hash);
end;
$$;

revoke all on function private.order_operational_budget_metric_result(bigint, bigint, numeric, integer) from public, anon, authenticated;
revoke all on function private.calculate_order_operational_error_budget(timestamptz) from public, anon, authenticated;
revoke all on function private.refresh_order_operational_error_budget(timestamptz) from public, anon, authenticated;
grant execute on function private.refresh_order_operational_error_budget(timestamptz) to service_role;

comment on function private.calculate_order_operational_error_budget(timestamptz) is
  'Calculates 1h, 6h, 24h and 30d error budgets for worker availability, delivery success, MTTA and MTTR compliance.';
