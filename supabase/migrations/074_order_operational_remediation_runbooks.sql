-- Doke: safe, closed-catalog remediation runbooks for order operations.
-- Every executable action requires a server-side preview, expiring token,
-- confirmation phrase, operator note and post-action verification.

create table if not exists private.order_operational_runbook_executions (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references private.order_operational_alerts(id) on delete set null,
  alert_key text not null,
  cycle_count integer not null check (cycle_count >= 1),
  runbook_id text not null check (runbook_id in (
    'dead_letter_recovery',
    'stale_claim_recovery',
    'cron_health_recovery',
    'retry_backlog_recovery',
    'success_rate_diagnostic'
  )),
  actor_id uuid not null references public.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('support', 'admin')),
  risk_level text not null check (risk_level in ('read_only', 'low', 'elevated')),
  requires_admin_approval boolean not null default false,
  status text not null default 'previewed' check (status in (
    'previewed', 'executing', 'succeeded', 'verification_failed', 'failed', 'expired'
  )),
  preview jsonb not null default '{}'::jsonb,
  impact_hash text not null,
  approval_token_hash text not null,
  confirmation_code text not null,
  selected_event_key text,
  note text,
  result jsonb not null default '{}'::jsonb,
  verification jsonb not null default '{}'::jsonb,
  error_code text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  executed_at timestamptz,
  completed_at timestamptz
);

create index if not exists idx_order_operational_runbook_executions_alert
  on private.order_operational_runbook_executions(alert_id, created_at desc)
  where alert_id is not null;
create index if not exists idx_order_operational_runbook_executions_actor
  on private.order_operational_runbook_executions(actor_id, created_at desc);
create index if not exists idx_order_operational_runbook_executions_status_expiry
  on private.order_operational_runbook_executions(status, expires_at)
  where status = 'previewed';

revoke all on private.order_operational_runbook_executions from public, anon, authenticated;
grant select on private.order_operational_runbook_executions to service_role;

create or replace function private.order_operational_runbook_descriptor(
  p_alert_type text,
  p_severity text default 'warning'
)
returns jsonb
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_type text := lower(trim(coalesce(p_alert_type, '')));
  v_severity text := lower(trim(coalesce(p_severity, 'warning')));
begin
  case v_type
    when 'dead_letter' then
      return jsonb_build_object(
        'id', 'dead_letter_recovery',
        'title', 'Recuperar um evento em dead-letter',
        'summary', 'Seleciona um evento, valida o estado atual e o recoloca na fila com auditoria e nova tentativa controlada.',
        'riskLevel', 'elevated',
        'requiresAdminApproval', true,
        'executable', true,
        'actionLabel', 'Preparar reprocessamento',
        'steps', jsonb_build_array(
          'Confirmar o código de erro e a quantidade de tentativas.',
          'Selecionar somente um evento elegível.',
          'Revalidar o estado imediatamente antes da execução.',
          'Recolocar o evento na fila e acionar o worker.',
          'Verificar se o evento saiu de dead-letter.'
        )
      );
    when 'stale_claim' then
      return jsonb_build_object(
        'id', 'stale_claim_recovery',
        'title', 'Recuperar claims de processamento travados',
        'summary', 'Libera somente claims com mais de cinco minutos e preserva a tentativa como falha ou dead-letter conforme o limite.',
        'riskLevel', 'elevated',
        'requiresAdminApproval', true,
        'executable', true,
        'actionLabel', 'Preparar recuperação',
        'steps', jsonb_build_array(
          'Contar claims que ultrapassaram cinco minutos.',
          'Revalidar o lote antes de alterar qualquer evento.',
          'Executar a rotina canônica de recuperação de claims.',
          'Confirmar a redução do número de claims travados.',
          'Acionar o worker apenas quando houver eventos entregáveis.'
        )
      );
    when 'cron_inactive' then
      return jsonb_build_object(
        'id', 'cron_health_recovery',
        'title', 'Validar e reativar o processamento',
        'summary', 'Confere os três agendamentos, solicita uma execução segura do worker e reavalia a saúde operacional.',
        'riskLevel', 'low',
        'requiresAdminApproval', false,
        'executable', true,
        'actionLabel', 'Preparar validação',
        'steps', jsonb_build_array(
          'Validar se worker, detector e escalonador estão ativos.',
          'Inspecionar o último estado registrado por cada cron.',
          'Solicitar uma execução somente se houver trabalho entregável.',
          'Executar nova avaliação de saúde.',
          'Confirmar se o incidente foi resolvido automaticamente.'
        )
      );
    when 'retry_backlog' then
      return jsonb_build_object(
        'id', 'retry_backlog_recovery',
        'title', 'Drenar backlog de retries',
        'summary', 'Mede o backlog entregável, aciona o worker e verifica se a fila começou a reduzir sem alterar limites de tentativa.',
        'riskLevel', 'low',
        'requiresAdminApproval', false,
        'executable', true,
        'actionLabel', 'Preparar drenagem',
        'steps', jsonb_build_array(
          'Contar retries e identificar o evento mais antigo.',
          'Separar eventos entregáveis de retries ainda em espera.',
          'Acionar o worker sem alterar tentativas ou payloads.',
          'Reavaliar a fila após a solicitação.',
          'Manter o incidente aberto até a recuperação real.'
        )
      );
    when 'success_rate_degraded' then
      return jsonb_build_object(
        'id', 'success_rate_diagnostic',
        'title', 'Diagnosticar taxa de sucesso degradada',
        'summary', 'Registra uma execução diagnóstica, aciona o worker quando necessário e mantém a recuperação sob observação automática.',
        'riskLevel', 'low',
        'requiresAdminApproval', false,
        'executable', true,
        'actionLabel', 'Preparar diagnóstico',
        'steps', jsonb_build_array(
          'Comparar eventos reivindicados e concluídos nas últimas 24 horas.',
          'Inspecionar os códigos de erro ativos.',
          'Acionar o worker apenas se houver eventos entregáveis.',
          'Executar nova avaliação de saúde.',
          'Aguardar volume suficiente antes de considerar a taxa recuperada.'
        )
      );
    else
      return '{}'::jsonb;
  end case;
end;
$$;

create or replace function private.build_order_operational_runbook_preview(
  p_alert private.order_operational_alerts,
  p_descriptor jsonb,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_runbook_id text := p_descriptor ->> 'id';
  v_preview jsonb := '{}'::jsonb;
  v_count integer := 0;
  v_deliverable integer := 0;
  v_oldest timestamptz;
  v_events jsonb := '[]'::jsonb;
  v_snapshot jsonb := '{}'::jsonb;
  v_evaluations jsonb := '[]'::jsonb;
begin
  if v_runbook_id = 'dead_letter_recovery' then
    select count(*) into v_count
    from private.order_domain_events e
    where e.delivery_status = 'dead_letter';

    select coalesce(jsonb_agg(item order by item ->> 'createdAt'), '[]'::jsonb)
      into v_events
    from (
      select jsonb_build_object(
        'eventKey', e.event_key,
        'eventType', e.event_type,
        'attempts', e.delivery_attempts,
        'maxAttempts', e.max_delivery_attempts,
        'errorCode', e.last_error_code,
        'createdAt', e.created_at
      ) as item
      from private.order_domain_events e
      where e.delivery_status = 'dead_letter'
      order by e.created_at
      limit 20
    ) rows_dead_letter;

    v_preview := jsonb_build_object(
      'impactCount', v_count,
      'eligibleEvents', v_events,
      'requiresEventSelection', true,
      'before', jsonb_build_object('deadLetter', v_count),
      'verificationTarget', 'selected_event_not_dead_letter'
    );
  elsif v_runbook_id = 'stale_claim_recovery' then
    select count(*), min(e.claimed_at)
      into v_count, v_oldest
      from private.order_domain_events e
     where e.delivery_status = 'processing'
       and e.claimed_at < p_observed_at - interval '5 minutes';

    v_preview := jsonb_build_object(
      'impactCount', v_count,
      'requiresEventSelection', false,
      'before', jsonb_build_object('staleProcessing', v_count, 'oldestClaimedAt', v_oldest),
      'verificationTarget', 'stale_processing_reduced'
    );
  elsif v_runbook_id in ('cron_health_recovery', 'retry_backlog_recovery', 'success_rate_diagnostic') then
    v_snapshot := private.capture_order_operational_health_snapshot(p_observed_at);
    select coalesce(jsonb_agg(jsonb_build_object(
      'jobName', j.jobname,
      'active', j.active,
      'schedule', j.schedule,
      'lastStatus', latest.status,
      'lastRunAt', latest.start_time
    ) order by j.jobname), '[]'::jsonb)
      into v_evaluations
      from cron.job j
      left join lateral (
        select d.status, d.start_time
        from cron.job_run_details d
        where d.jobid = j.jobid
        order by d.runid desc
        limit 1
      ) latest on true
     where j.jobname in (
       'doke-order-event-worker',
       'doke-order-operational-alerts',
       'doke-order-incident-escalation'
     );

    v_count := coalesce((v_snapshot ->> 'retryCount')::integer, 0);
    v_deliverable := coalesce((v_snapshot ->> 'deliverable')::integer, 0);
    v_oldest := nullif(v_snapshot ->> 'oldestRetryAt', '')::timestamptz;

    v_preview := jsonb_build_object(
      'impactCount', case
        when v_runbook_id = 'retry_backlog_recovery' then v_deliverable
        when v_runbook_id = 'success_rate_diagnostic' then coalesce((v_snapshot ->> 'claimed24h')::integer, 0)
        else 3
      end,
      'requiresEventSelection', false,
      'before', v_snapshot || jsonb_build_object('cronJobs', v_evaluations, 'oldestRetryAt', v_oldest),
      'verificationTarget', case v_runbook_id
        when 'cron_health_recovery' then 'cron_healthy_after_recheck'
        when 'retry_backlog_recovery' then 'worker_requested_or_no_deliverable_events'
        else 'diagnostic_recorded_and_health_rechecked'
      end
    );
  end if;

  return v_preview || jsonb_build_object(
    'alertId', p_alert.id,
    'alertKey', p_alert.alert_key,
    'alertType', p_alert.alert_type,
    'cycleCount', p_alert.cycle_count,
    'runbookId', v_runbook_id,
    'observedAt', p_observed_at
  );
end;
$$;

create or replace function private.expire_order_operational_runbook_previews(
  p_observed_at timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_rows integer := 0;
begin
  update private.order_operational_runbook_executions
     set status = 'expired', completed_at = p_observed_at
   where status = 'previewed'
     and expires_at <= p_observed_at;
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$;

create or replace function public.get_order_operational_runbooks_internal(
  p_actor_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_limit integer := greatest(5, least(coalesce(p_limit, 20), 50));
  v_active jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  perform private.expire_order_operational_runbook_previews(now());

  select coalesce(jsonb_agg(jsonb_build_object(
    'alertId', a.id,
    'alertKey', a.alert_key,
    'cycleCount', a.cycle_count,
    'descriptor', private.order_operational_runbook_descriptor(a.alert_type, a.severity)
  ) order by case a.severity when 'critical' then 1 else 2 end, a.opened_at), '[]'::jsonb)
  into v_active
  from private.order_operational_alerts a
  where a.status = 'open'
    and private.order_operational_runbook_descriptor(a.alert_type, a.severity) <> '{}'::jsonb;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'alertId', r.alert_id,
    'alertKey', r.alert_key,
    'cycleCount', r.cycle_count,
    'runbookId', r.runbook_id,
    'actorId', r.actor_id,
    'actorName', coalesce(nullif(trim(up.display_name), ''), 'Operador Doke'),
    'actorRole', r.actor_role,
    'riskLevel', r.risk_level,
    'status', r.status,
    'selectedEventKey', r.selected_event_key,
    'note', r.note,
    'result', r.result,
    'verification', r.verification,
    'errorCode', r.error_code,
    'createdAt', r.created_at,
    'executedAt', r.executed_at,
    'completedAt', r.completed_at
  ) order by r.created_at desc), '[]'::jsonb)
  into v_recent
  from (
    select *
    from private.order_operational_runbook_executions
    where status <> 'previewed'
    order by created_at desc
    limit v_limit
  ) r
  left join public.user_profiles up on up.user_id = r.actor_id;

  return jsonb_build_object(
    'actorId', p_actor_id,
    'actorRole', v_role,
    'active', v_active,
    'recentExecutions', v_recent
  );
end;
$$;

create or replace function public.preview_order_operational_runbook_internal(
  p_actor_id uuid,
  p_alert_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_alert private.order_operational_alerts%rowtype;
  v_descriptor jsonb;
  v_preview jsonb;
  v_preview_id uuid := gen_random_uuid();
  v_token text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_confirmation_code text := upper(substr(replace(v_preview_id::text, '-', ''), 1, 8));
  v_impact_hash text;
  v_expires_at timestamptz := now() + interval '10 minutes';
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  perform private.expire_order_operational_runbook_previews(now());

  if p_alert_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_ALERT_REQUIRED';
  end if;

  select * into v_alert
  from private.order_operational_alerts
  where id = p_alert_id;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_RUNBOOK_ALERT_NOT_FOUND';
  end if;
  if v_alert.status <> 'open' then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_ALERT_CLOSED';
  end if;

  v_descriptor := private.order_operational_runbook_descriptor(v_alert.alert_type, v_alert.severity);
  if v_descriptor = '{}'::jsonb then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_NOT_AVAILABLE';
  end if;

  v_preview := private.build_order_operational_runbook_preview(v_alert, v_descriptor, now());
  v_impact_hash := encode(extensions.digest((v_preview - 'observedAt')::text, 'sha256'), 'hex');

  insert into private.order_operational_runbook_executions (
    id, alert_id, alert_key, cycle_count, runbook_id,
    actor_id, actor_role, risk_level, requires_admin_approval,
    status, preview, impact_hash, approval_token_hash,
    confirmation_code, created_at, expires_at
  ) values (
    v_preview_id, v_alert.id, v_alert.alert_key, v_alert.cycle_count, v_descriptor ->> 'id',
    p_actor_id, v_role, v_descriptor ->> 'riskLevel',
    coalesce((v_descriptor ->> 'requiresAdminApproval')::boolean, false),
    'previewed', v_preview, v_impact_hash, encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_confirmation_code, now(), v_expires_at
  );

  return jsonb_build_object(
    'previewId', v_preview_id,
    'approvalToken', v_token,
    'confirmationPhrase', 'EXECUTAR ' || v_confirmation_code,
    'expiresAt', v_expires_at,
    'canExecute', not coalesce((v_descriptor ->> 'requiresAdminApproval')::boolean, false) or v_role = 'admin',
    'actorRole', v_role,
    'descriptor', v_descriptor,
    'preview', v_preview
  );
end;
$$;

create or replace function public.execute_order_operational_runbook_internal(
  p_actor_id uuid,
  p_preview_id uuid,
  p_approval_token text,
  p_confirmation_text text,
  p_note text,
  p_selected_event_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_execution private.order_operational_runbook_executions%rowtype;
  v_alert private.order_operational_alerts%rowtype;
  v_descriptor jsonb;
  v_current_preview jsonb;
  v_note text := regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g');
  v_selected_event_key text := nullif(trim(coalesce(p_selected_event_key, '')), '');
  v_result jsonb := '{}'::jsonb;
  v_verification jsonb := '{}'::jsonb;
  v_request_id bigint;
  v_recovered integer := 0;
  v_after_count integer := 0;
  v_event_status text;
  v_snapshot jsonb := '{}'::jsonb;
  v_evaluation jsonb := '{}'::jsonb;
  v_ok boolean := false;
  v_error_code text;
begin
  v_role := private.assert_order_event_operator(p_actor_id);

  if p_preview_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_PREVIEW_NOT_FOUND';
  end if;
  if char_length(v_note) < 10 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_NOTE_REQUIRED';
  end if;

  select * into v_execution
  from private.order_operational_runbook_executions
  where id = p_preview_id
  for update;

  if not found or v_execution.actor_id <> p_actor_id then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_RUNBOOK_PREVIEW_NOT_FOUND';
  end if;
  if v_execution.status <> 'previewed' then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_PREVIEW_USED';
  end if;
  if v_execution.expires_at <= now() then
    update private.order_operational_runbook_executions
       set status = 'expired', completed_at = now()
     where id = v_execution.id;
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_PREVIEW_EXPIRED';
  end if;
  if encode(extensions.digest(coalesce(p_approval_token, ''), 'sha256'), 'hex') <> v_execution.approval_token_hash then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_RUNBOOK_TOKEN_INVALID';
  end if;
  if v_execution.requires_admin_approval and v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_RUNBOOK_ADMIN_REQUIRED';
  end if;
  if upper(trim(coalesce(p_confirmation_text, ''))) <> 'EXECUTAR ' || v_execution.confirmation_code then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_CONFIRMATION_INVALID';
  end if;

  select * into v_alert
  from private.order_operational_alerts
  where id = v_execution.alert_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_RUNBOOK_ALERT_NOT_FOUND';
  end if;
  if v_alert.status <> 'open' or v_alert.cycle_count <> v_execution.cycle_count then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_ALERT_CLOSED';
  end if;

  v_descriptor := private.order_operational_runbook_descriptor(v_alert.alert_type, v_alert.severity);
  if v_descriptor ->> 'id' <> v_execution.runbook_id then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_RUNBOOK_NOT_AVAILABLE';
  end if;

  v_current_preview := private.build_order_operational_runbook_preview(v_alert, v_descriptor, now());
  if v_execution.risk_level = 'elevated' and encode(extensions.digest((v_current_preview - 'observedAt')::text, 'sha256'), 'hex') <> v_execution.impact_hash then
    raise exception using errcode = '40001', message = 'DOKE_ORDER_RUNBOOK_PREVIEW_STALE';
  end if;

  update private.order_operational_runbook_executions
     set status = 'executing', note = left(v_note, 500),
         selected_event_key = v_selected_event_key, executed_at = now()
   where id = v_execution.id;

  begin
    if v_execution.runbook_id = 'dead_letter_recovery' then
      if v_selected_event_key is null then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_EVENT_REQUIRED';
      end if;
      if not exists (
        select 1
        from jsonb_array_elements(coalesce(v_current_preview -> 'eligibleEvents', '[]'::jsonb)) item
        where item ->> 'eventKey' = v_selected_event_key
      ) then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_RUNBOOK_EVENT_INVALID';
      end if;

      v_result := public.requeue_order_domain_event_internal(
        p_actor_id, v_selected_event_key, left(v_note, 500)
      );
      select e.delivery_status into v_event_status
      from private.order_domain_events e
      where e.event_key = v_selected_event_key;
      v_ok := coalesce(v_event_status, '') <> 'dead_letter';
      v_verification := jsonb_build_object(
        'target', 'selected_event_not_dead_letter',
        'eventKey', v_selected_event_key,
        'deliveryStatus', v_event_status,
        'passed', v_ok
      );

    elsif v_execution.runbook_id = 'stale_claim_recovery' then
      v_recovered := private.recover_stale_order_event_claims(300);
      select count(*) into v_after_count
      from private.order_domain_events e
      where e.delivery_status = 'processing'
        and e.claimed_at < now() - interval '5 minutes';
      begin
        v_request_id := private.invoke_order_event_worker_if_needed();
      exception when others then
        v_request_id := null;
      end;
      v_result := jsonb_build_object('recoveredCount', v_recovered, 'requestId', v_request_id);
      v_ok := v_after_count = 0 or v_after_count < coalesce((v_execution.preview #>> '{before,staleProcessing}')::integer, 0);
      v_verification := jsonb_build_object(
        'target', 'stale_processing_reduced',
        'remainingStaleProcessing', v_after_count,
        'passed', v_ok
      );

    else
      begin
        v_request_id := private.invoke_order_event_worker_if_needed();
      exception when others then
        v_request_id := null;
      end;
      v_snapshot := private.capture_order_operational_health_snapshot(now());
      v_evaluation := private.evaluate_order_operational_alerts(now());
      v_result := jsonb_build_object('requestId', v_request_id, 'healthEvaluation', v_evaluation);

      if v_execution.runbook_id = 'cron_health_recovery' then
        v_ok := coalesce((v_snapshot ->> 'cronActive')::boolean, false)
          and lower(coalesce(v_snapshot ->> 'cronLastStatus', '')) in ('succeeded', 'success', 'running', 'sending', 'connecting');
        v_verification := jsonb_build_object(
          'target', 'cron_healthy_after_recheck',
          'snapshot', v_snapshot,
          'passed', v_ok
        );
      elsif v_execution.runbook_id = 'retry_backlog_recovery' then
        v_ok := v_request_id is not null or coalesce((v_snapshot ->> 'deliverable')::integer, 0) = 0;
        v_verification := jsonb_build_object(
          'target', 'worker_requested_or_no_deliverable_events',
          'snapshot', v_snapshot,
          'passed', v_ok
        );
      else
        v_ok := true;
        v_verification := jsonb_build_object(
          'target', 'diagnostic_recorded_and_health_rechecked',
          'snapshot', v_snapshot,
          'monitoringRequired', true,
          'passed', true
        );
      end if;
    end if;

    update private.order_operational_runbook_executions
       set status = case when v_ok then 'succeeded' else 'verification_failed' end,
           result = coalesce(v_result, '{}'::jsonb),
           verification = coalesce(v_verification, '{}'::jsonb),
           completed_at = now()
     where id = v_execution.id;
  exception when others then
    v_error_code := case
      when sqlerrm like 'DOKE_%' then sqlerrm
      else 'DOKE_ORDER_RUNBOOK_EXECUTION_FAILED'
    end;
    update private.order_operational_runbook_executions
       set status = 'failed', error_code = v_error_code,
           result = jsonb_build_object('databaseCode', sqlstate),
           completed_at = now()
     where id = v_execution.id;
    return jsonb_build_object(
      'ok', false,
      'previewId', v_execution.id,
      'runbookId', v_execution.runbook_id,
      'status', 'failed',
      'errorCode', v_error_code
    );
  end;

  return jsonb_build_object(
    'ok', true,
    'verificationPassed', v_ok,
    'previewId', v_execution.id,
    'runbookId', v_execution.runbook_id,
    'status', case when v_ok then 'succeeded' else 'verification_failed' end,
    'result', v_result,
    'verification', v_verification
  );
end;
$$;

revoke all on function private.order_operational_runbook_descriptor(text, text) from public, anon, authenticated;
revoke all on function private.build_order_operational_runbook_preview(private.order_operational_alerts, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function private.expire_order_operational_runbook_previews(timestamptz) from public, anon, authenticated;
revoke all on function public.get_order_operational_runbooks_internal(uuid, integer) from public, anon, authenticated;
revoke all on function public.preview_order_operational_runbook_internal(uuid, uuid) from public, anon, authenticated;
revoke all on function public.execute_order_operational_runbook_internal(uuid, uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_order_operational_runbooks_internal(uuid, integer) to service_role;
grant execute on function public.preview_order_operational_runbook_internal(uuid, uuid) to service_role;
grant execute on function public.execute_order_operational_runbook_internal(uuid, uuid, text, text, text, text) to service_role;

comment on table private.order_operational_runbook_executions is
  'Immutable operational record of runbook previews and executions, including impact, approval and verification.';
comment on function public.preview_order_operational_runbook_internal(uuid, uuid) is
  'Service-role-only preview for a closed-catalog remediation action after independent operator authentication.';
comment on function public.execute_order_operational_runbook_internal(uuid, uuid, text, text, text, text) is
  'Service-role-only execution of a previously previewed remediation with expiring token, confirmation and post-action verification.';
