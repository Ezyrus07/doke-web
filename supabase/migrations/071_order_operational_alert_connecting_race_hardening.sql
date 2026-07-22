-- Doke: harden cron health detection for the transient `connecting` state.
-- pg_cron may expose a newest row with no start_time while establishing the connection.

create or replace function private.capture_order_operational_health_snapshot(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_dead_letter bigint := 0;
  v_stale_processing bigint := 0;
  v_retry_count bigint := 0;
  v_deliverable bigint := 0;
  v_oldest_retry_at timestamptz;
  v_claimed_24h bigint := 0;
  v_completed_24h bigint := 0;
  v_cron_active boolean := false;
  v_cron_last_status text;
  v_cron_last_run_at timestamptz;
begin
  select
    count(*) filter (where e.delivery_status = 'dead_letter'),
    count(*) filter (
      where e.delivery_status = 'processing'
        and e.claimed_at < p_observed_at - interval '5 minutes'
    ),
    count(*) filter (where e.delivery_status = 'failed'),
    count(*) filter (
      where e.delivery_status in ('ready', 'failed')
        and e.available_at <= p_observed_at
        and e.delivery_attempts < e.max_delivery_attempts
    ),
    min(e.created_at) filter (where e.delivery_status = 'failed')
  into
    v_dead_letter,
    v_stale_processing,
    v_retry_count,
    v_deliverable,
    v_oldest_retry_at
  from private.order_domain_events e;

  select
    coalesce(sum(r.claimed_count), 0),
    coalesce(sum(r.completed_count), 0)
  into v_claimed_24h, v_completed_24h
  from private.order_event_worker_runs r
  where r.started_at >= p_observed_at - interval '24 hours';

  begin
    select exists (
      select 1
      from cron.job j
      where j.jobname = 'doke-order-event-worker'
        and j.active
    ) into v_cron_active;

    select d.status,
           case
             when lower(coalesce(d.status, '')) in ('connecting', 'running') then coalesce(d.start_time, p_observed_at)
             else d.start_time
           end
      into v_cron_last_status, v_cron_last_run_at
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
     where j.jobname = 'doke-order-event-worker'
     order by d.runid desc
     limit 1;
  exception when undefined_table or invalid_schema_name or insufficient_privilege then
    v_cron_active := false;
    v_cron_last_status := null;
    v_cron_last_run_at := null;
  end;

  return jsonb_build_object(
    'observedAt', p_observed_at,
    'deadLetter', v_dead_letter,
    'staleProcessing', v_stale_processing,
    'retryCount', v_retry_count,
    'deliverable', v_deliverable,
    'oldestRetryAt', v_oldest_retry_at,
    'claimed24h', v_claimed_24h,
    'completed24h', v_completed_24h,
    'cronActive', v_cron_active,
    'cronLastStatus', v_cron_last_status,
    'cronLastRunAt', v_cron_last_run_at
  );
end;
$$;


create or replace function private.classify_order_operational_alerts(
  p_snapshot jsonb,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_alerts jsonb := '[]'::jsonb;
  v_dead_letter integer := coalesce((p_snapshot ->> 'deadLetter')::integer, 0);
  v_stale_processing integer := coalesce((p_snapshot ->> 'staleProcessing')::integer, 0);
  v_retry_count integer := coalesce((p_snapshot ->> 'retryCount')::integer, 0);
  v_deliverable integer := coalesce((p_snapshot ->> 'deliverable')::integer, 0);
  v_claimed_24h integer := coalesce((p_snapshot ->> 'claimed24h')::integer, 0);
  v_completed_24h integer := coalesce((p_snapshot ->> 'completed24h')::integer, 0);
  v_cron_active boolean := coalesce((p_snapshot ->> 'cronActive')::boolean, false);
  v_cron_last_status text := lower(coalesce(p_snapshot ->> 'cronLastStatus', ''));
  v_cron_last_run_at timestamptz := nullif(p_snapshot ->> 'cronLastRunAt', '')::timestamptz;
  v_oldest_retry_at timestamptz := nullif(p_snapshot ->> 'oldestRetryAt', '')::timestamptz;
  v_success_rate numeric;
begin
  if v_dead_letter > 0 then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
      'alertKey', 'orders.worker.dead_letter',
      'alertType', 'dead_letter',
      'severity', 'critical',
      'title', 'Eventos em dead-letter',
      'body', format('%s evento(s) esgotaram as tentativas e exigem análise manual.', v_dead_letter),
      'silenceMinutes', 30,
      'details', jsonb_build_object('count', v_dead_letter)
    ));
  end if;

  if v_stale_processing > 0 then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
      'alertKey', 'orders.worker.stale_claim',
      'alertType', 'stale_claim',
      'severity', 'critical',
      'title', 'Claims de processamento travados',
      'body', format('%s evento(s) permanecem em processamento há mais de cinco minutos.', v_stale_processing),
      'silenceMinutes', 15,
      'details', jsonb_build_object('count', v_stale_processing, 'thresholdMinutes', 5)
    ));
  end if;

  if not v_cron_active
     or v_cron_last_run_at is null
     or v_cron_last_run_at < p_observed_at - interval '3 minutes'
     or v_cron_last_status not in ('succeeded', 'success', 'running', 'connecting') then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
      'alertKey', 'orders.worker.cron_inactive',
      'alertType', 'cron_inactive',
      'severity', 'critical',
      'title', 'Agendamento automático degradado',
      'body', 'O cron do worker está inativo, atrasado ou sua execução mais recente não foi concluída com sucesso.',
      'silenceMinutes', 30,
      'details', jsonb_build_object(
        'cronActive', v_cron_active,
        'lastStatus', nullif(v_cron_last_status, ''),
        'lastRunAt', v_cron_last_run_at,
        'staleAfterMinutes', 3
      )
    ));
  end if;

  if v_claimed_24h >= 10 then
    v_success_rate := round((v_completed_24h::numeric / greatest(v_claimed_24h, 1)::numeric) * 100, 1);
    if v_success_rate < 90 then
      v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
        'alertKey', 'orders.worker.success_rate_degraded',
        'alertType', 'success_rate_degraded',
        'severity', 'warning',
        'title', 'Taxa de sucesso degradada',
        'body', format('A taxa de conclusão do worker nas últimas 24 horas caiu para %s%%.', v_success_rate),
        'silenceMinutes', 60,
        'details', jsonb_build_object(
          'claimed24h', v_claimed_24h,
          'completed24h', v_completed_24h,
          'successRate24h', v_success_rate,
          'thresholdPercent', 90
        )
      ));
    end if;
  end if;

  if v_retry_count >= 5
     or (v_retry_count >= 2 and v_oldest_retry_at is not null and v_oldest_retry_at < p_observed_at - interval '15 minutes') then
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object(
      'alertKey', 'orders.worker.retry_backlog',
      'alertType', 'retry_backlog',
      'severity', 'warning',
      'title', 'Acúmulo anormal de retries',
      'body', format('%s evento(s) estão em retry; %s já estão entregáveis.', v_retry_count, v_deliverable),
      'silenceMinutes', 45,
      'details', jsonb_build_object(
        'retryCount', v_retry_count,
        'deliverable', v_deliverable,
        'oldestRetryAt', v_oldest_retry_at,
        'countThreshold', 5,
        'ageThresholdMinutes', 15
      )
    ));
  end if;

  return v_alerts;
end;
$$;

comment on function private.classify_order_operational_alerts(jsonb, timestamptz) is
  'Classifies five order-worker health signals; fresh connecting/running cron invocations are healthy until the stale threshold expires.';

revoke all on function private.classify_order_operational_alerts(jsonb, timestamptz) from public, anon, authenticated;
