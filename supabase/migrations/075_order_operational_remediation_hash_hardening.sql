-- Doke: cryptographic hardening for operational runbook approval and impact hashes.
-- Replaces MD5 with SHA-256 for both the expiring approval token and impact snapshot.

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

