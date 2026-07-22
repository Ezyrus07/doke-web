-- Doke: avoid a cron race false positive while the worker invocation for the current minute is still running.

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
     or v_cron_last_status not in ('succeeded', 'success', 'running') then
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
  'Classifies five order-worker health signals; a fresh running cron invocation is healthy until the stale threshold expires.';

revoke all on function private.classify_order_operational_alerts(jsonb, timestamptz) from public, anon, authenticated;
