-- Doke: risk-aware change gate, temporary admin overrides, CI consumption and incident correlation.

create or replace function private.order_operational_protection_state_rank(p_state text)
returns integer
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(coalesce(p_state, 'frozen'))
    when 'healthy' then 0
    when 'warning' then 1
    when 'restricted' then 2
    else 3
  end;
$$;

create or replace function private.classify_order_operational_change_decision(
  p_risk_level text,
  p_protection_state text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(coalesce(p_protection_state, 'frozen'))
    when 'healthy' then case lower(coalesce(p_risk_level, 'critical'))
      when 'low' then 'allow'
      when 'medium' then 'allow'
      when 'high' then 'allow'
      else 'approval_required'
    end
    when 'warning' then case lower(coalesce(p_risk_level, 'critical'))
      when 'low' then 'allow'
      when 'medium' then 'allow'
      else 'approval_required'
    end
    when 'restricted' then case lower(coalesce(p_risk_level, 'critical'))
      when 'low' then 'allow'
      when 'medium' then 'approval_required'
      when 'high' then 'approval_required'
      else 'hard_block'
    end
    else case lower(coalesce(p_risk_level, 'critical'))
      when 'low' then 'approval_required'
      else 'hard_block'
    end
  end;
$$;

create or replace function private.expire_order_operational_change_overrides(
  p_observed_at timestamptz default now(),
  p_change_id uuid default null
)
returns integer
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_override record;
  v_expired integer := 0;
begin
  for v_override in
    update private.order_operational_change_overrides o
       set status = 'expired'
     where o.status = 'active'
       and o.expires_at <= p_observed_at
       and (p_change_id is null or o.change_id = p_change_id)
     returning o.*
  loop
    insert into private.order_operational_change_decisions (
      change_id, actor_id, actor_role, action, previous_status, new_status,
      gate_decision, protection_state, reason, metadata, created_at
    )
    select
      c.id, null, 'system', 'override_expired', c.status, c.status,
      c.gate_decision, c.protection_state,
      'A aprovação temporária expirou antes da execução da mudança.',
      jsonb_build_object(
        'overrideId', v_override.id,
        'grantedAt', v_override.granted_at,
        'expiresAt', v_override.expires_at,
        'grantedProtectionState', v_override.granted_protection_state
      ),
      p_observed_at
    from private.order_operational_changes c
    where c.id = v_override.change_id;

    v_expired := v_expired + 1;
  end loop;

  return v_expired;
end;
$$;

create or replace function private.evaluate_order_operational_change(
  p_change_id uuid,
  p_actor_id uuid default null,
  p_actor_role text default 'system',
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_change private.order_operational_changes%rowtype;
  v_budget jsonb;
  v_state text;
  v_base_decision text;
  v_effective_decision text;
  v_new_status text;
  v_previous_status text;
  v_previous_decision text;
  v_previous_state text;
  v_hash text;
  v_override private.order_operational_change_overrides%rowtype;
  v_override_valid boolean := false;
  v_action text := 'evaluated';
begin
  select * into v_change
  from private.order_operational_changes
  where id = p_change_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_CHANGE_NOT_FOUND';
  end if;

  if v_change.status in ('started', 'completed', 'failed', 'cancelled') then
    return jsonb_build_object(
      'changeId', v_change.id,
      'status', v_change.status,
      'gateDecision', v_change.gate_decision,
      'protectionState', v_change.protection_state,
      'evaluation', v_change.evaluation_snapshot
    );
  end if;

  perform private.expire_order_operational_change_overrides(p_observed_at, v_change.id);

  v_budget := private.calculate_order_operational_error_budget(p_observed_at);
  v_state := v_budget ->> 'protectionState';
  v_base_decision := private.classify_order_operational_change_decision(v_change.risk_level, v_state);
  v_effective_decision := v_base_decision;
  v_hash := encode(extensions.digest((v_budget - 'observedAt')::text, 'sha256'), 'hex');

  select * into v_override
  from private.order_operational_change_overrides
  where change_id = v_change.id
    and status = 'active'
    and expires_at > p_observed_at
  order by granted_at desc
  limit 1;

  if found
     and v_base_decision = 'approval_required'
     and private.order_operational_protection_state_rank(v_state)
         <= private.order_operational_protection_state_rank(v_override.granted_protection_state) then
    v_override_valid := true;
    v_effective_decision := 'allow';
  end if;

  v_new_status := case
    when v_effective_decision = 'allow' and v_override_valid then 'approved'
    when v_effective_decision = 'allow' then 'evaluated'
    when v_effective_decision = 'approval_required' then 'approval_required'
    else 'blocked'
  end;

  v_previous_status := v_change.status;
  v_previous_decision := v_change.gate_decision;
  v_previous_state := v_change.protection_state;

  if v_previous_decision <> 'allow' and v_effective_decision = 'allow' and not v_override_valid then
    v_action := 'released_auto';
  elsif v_effective_decision = 'allow' then
    v_action := 'allowed';
  elsif v_effective_decision = 'approval_required' then
    v_action := 'approval_required';
  else
    v_action := 'blocked';
  end if;

  update private.order_operational_changes
     set status = v_new_status,
         gate_decision = v_effective_decision,
         protection_state = v_state,
         evaluation_snapshot = v_budget,
         evaluation_hash = v_hash,
         evaluated_at = p_observed_at,
         approved_by = case when v_override_valid then v_override.actor_id else null end,
         approved_at = case when v_override_valid then v_override.granted_at else null end,
         override_expires_at = case when v_override_valid then v_override.expires_at else null end,
         updated_at = p_observed_at
   where id = v_change.id
   returning * into v_change;

  if v_previous_status is distinct from v_new_status
     or v_previous_decision is distinct from v_effective_decision
     or v_previous_state is distinct from v_state then
    insert into private.order_operational_change_decisions (
      change_id, actor_id, actor_role, action,
      previous_status, new_status, gate_decision, protection_state,
      snapshot, metadata, created_at
    ) values (
      v_change.id,
      p_actor_id,
      case when p_actor_role in ('support', 'admin', 'system') then p_actor_role else 'system' end,
      v_action,
      v_previous_status,
      v_new_status,
      v_effective_decision,
      v_state,
      v_budget,
      jsonb_build_object(
        'baseDecision', v_base_decision,
        'overrideApplied', v_override_valid,
        'overrideId', case when v_override_valid then v_override.id else null end
      ),
      p_observed_at
    );
  end if;

  return jsonb_build_object(
    'changeId', v_change.id,
    'externalKey', v_change.external_key,
    'status', v_change.status,
    'gateDecision', v_change.gate_decision,
    'baseDecision', v_base_decision,
    'protectionState', v_change.protection_state,
    'overrideApplied', v_override_valid,
    'overrideExpiresAt', v_change.override_expires_at,
    'evaluation', v_change.evaluation_snapshot
  );
end;
$$;

create or replace function public.register_order_operational_change_internal(
  p_actor_id uuid,
  p_external_key text,
  p_change_type text,
  p_risk_level text,
  p_title text,
  p_description text default null,
  p_change_reference text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_external_key text := trim(coalesce(p_external_key, ''));
  v_type text := lower(trim(coalesce(p_change_type, '')));
  v_risk text := lower(trim(coalesce(p_risk_level, '')));
  v_title text := regexp_replace(trim(coalesce(p_title, '')), '\s+', ' ', 'g');
  v_description text := nullif(regexp_replace(trim(coalesce(p_description, '')), '\s+', ' ', 'g'), '');
  v_reference text := nullif(regexp_replace(trim(coalesce(p_change_reference, '')), '\s+', ' ', 'g'), '');
  v_change private.order_operational_changes%rowtype;
  v_result jsonb;
begin
  v_role := private.assert_order_event_operator(p_actor_id);

  if char_length(v_external_key) < 6 or char_length(v_external_key) > 180
     or v_external_key !~ '^[A-Za-z0-9._:/-]+$' then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_KEY_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(v_external_key, 0));
  if v_type not in ('deploy', 'migration', 'edge_function', 'configuration', 'feature_flag', 'manual') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_TYPE_INVALID';
  end if;
  if v_risk not in ('low', 'medium', 'high', 'critical') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_RISK_INVALID';
  end if;
  if char_length(v_title) < 5 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_TITLE_REQUIRED';
  end if;

  select * into v_change
  from private.order_operational_changes
  where external_key = v_external_key
  for update;

  if found and v_change.status in ('started', 'completed', 'failed', 'cancelled') then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_KEY_FINALIZED';
  end if;

  if found then
    update private.order_operational_changes
       set change_type = v_type,
           risk_level = v_risk,
           title = left(v_title, 300),
           description = left(v_description, 2000),
           change_reference = left(v_reference, 500),
           requested_by = p_actor_id,
           requested_role = v_role,
           requested_at = now(),
           metadata = coalesce(p_metadata, '{}'::jsonb),
           updated_at = now()
     where id = v_change.id
     returning * into v_change;
  else
    insert into private.order_operational_changes (
      external_key, change_type, risk_level, title, description, change_reference,
      requested_by, requested_role, metadata
    ) values (
      v_external_key, v_type, v_risk, left(v_title, 300), left(v_description, 2000),
      left(v_reference, 500), p_actor_id, v_role, coalesce(p_metadata, '{}'::jsonb)
    ) returning * into v_change;

    insert into private.order_operational_change_decisions (
      change_id, actor_id, actor_role, action,
      previous_status, new_status, gate_decision, protection_state,
      reason, metadata
    ) values (
      v_change.id, p_actor_id, v_role, 'registered',
      null, 'registered', null, null,
      'Mudança registrada para avaliação de confiabilidade.',
      jsonb_build_object('externalKey', v_external_key, 'riskLevel', v_risk, 'changeType', v_type)
    );
  end if;

  v_result := private.evaluate_order_operational_change(v_change.id, p_actor_id, v_role, now());
  return v_result;
end;
$$;

create or replace function public.approve_order_operational_change_override_internal(
  p_actor_id uuid,
  p_change_id uuid,
  p_reason text,
  p_valid_minutes integer default 60
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_reason text := regexp_replace(trim(coalesce(p_reason, '')), '\s+', ' ', 'g');
  v_minutes integer := greatest(15, least(coalesce(p_valid_minutes, 60), 120));
  v_evaluation jsonb;
  v_change private.order_operational_changes%rowtype;
  v_override private.order_operational_change_overrides%rowtype;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED';
  end if;
  if p_change_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_ID_REQUIRED';
  end if;
  if char_length(v_reason) < 20 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_OVERRIDE_REASON_REQUIRED';
  end if;

  v_evaluation := private.evaluate_order_operational_change(p_change_id, p_actor_id, v_role, now());
  if v_evaluation ->> 'baseDecision' <> 'approval_required' then
    if v_evaluation ->> 'baseDecision' = 'hard_block' then
      raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_HARD_BLOCKED';
    end if;
    raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_OVERRIDE_NOT_REQUIRED';
  end if;

  select * into v_change
  from private.order_operational_changes
  where id = p_change_id
  for update;

  update private.order_operational_change_overrides
     set status = 'revoked', revoked_at = now()
   where change_id = p_change_id
     and status = 'active';

  insert into private.order_operational_change_overrides (
    change_id, actor_id, actor_role, reason, granted_protection_state,
    evaluation_hash, expires_at
  ) values (
    p_change_id, p_actor_id, 'admin', left(v_reason, 1000), v_change.protection_state,
    v_change.evaluation_hash, now() + make_interval(mins => v_minutes)
  ) returning * into v_override;

  update private.order_operational_changes
     set status = 'approved',
         gate_decision = 'allow',
         approved_by = p_actor_id,
         approved_at = now(),
         override_expires_at = v_override.expires_at,
         updated_at = now()
   where id = p_change_id
   returning * into v_change;

  insert into private.order_operational_change_decisions (
    change_id, actor_id, actor_role, action,
    previous_status, new_status, gate_decision, protection_state,
    reason, snapshot, metadata
  ) values (
    p_change_id, p_actor_id, 'admin', 'override_granted',
    v_evaluation ->> 'status', 'approved', 'allow', v_change.protection_state,
    left(v_reason, 1000), v_change.evaluation_snapshot,
    jsonb_build_object('overrideId', v_override.id, 'expiresAt', v_override.expires_at, 'validMinutes', v_minutes)
  );

  return jsonb_build_object(
    'changeId', p_change_id,
    'status', v_change.status,
    'gateDecision', v_change.gate_decision,
    'protectionState', v_change.protection_state,
    'overrideId', v_override.id,
    'overrideExpiresAt', v_override.expires_at
  );
end;
$$;

create or replace function private.start_order_operational_change(
  p_change_id uuid,
  p_actor_id uuid,
  p_actor_role text,
  p_execution_reference text default null,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_evaluation jsonb;
  v_change private.order_operational_changes%rowtype;
  v_override_id uuid;
begin
  v_evaluation := private.evaluate_order_operational_change(
    p_change_id, p_actor_id, p_actor_role, p_observed_at
  );

  if v_evaluation ->> 'gateDecision' <> 'allow' then
    if v_evaluation ->> 'gateDecision' = 'approval_required' then
      raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_APPROVAL_REQUIRED';
    end if;
    raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_BLOCKED';
  end if;

  select * into v_change
  from private.order_operational_changes
  where id = p_change_id
  for update;

  if v_change.status = 'started' then
    return jsonb_build_object(
      'changeId', v_change.id,
      'externalKey', v_change.external_key,
      'status', v_change.status,
      'startedAt', v_change.started_at,
      'protectionState', v_change.protection_state,
      'alreadyStarted', true
    );
  end if;
  if v_change.status in ('completed', 'failed', 'cancelled') then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_FINALIZED';
  end if;

  select id into v_override_id
  from private.order_operational_change_overrides
  where change_id = p_change_id
    and status = 'active'
    and expires_at > p_observed_at
  order by granted_at desc
  limit 1;

  update private.order_operational_changes
     set status = 'started',
         started_at = p_observed_at,
         change_reference = coalesce(nullif(trim(p_execution_reference), ''), change_reference),
         updated_at = p_observed_at
   where id = p_change_id
   returning * into v_change;

  if v_override_id is not null then
    update private.order_operational_change_overrides
       set status = 'used', used_at = p_observed_at
     where id = v_override_id;

    insert into private.order_operational_change_decisions (
      change_id, actor_id, actor_role, action,
      previous_status, new_status, gate_decision, protection_state,
      reason, snapshot, metadata, created_at
    ) values (
      p_change_id, p_actor_id,
      case when p_actor_role in ('support', 'admin', 'system') then p_actor_role else 'system' end,
      'override_used', v_evaluation ->> 'status', v_evaluation ->> 'status', 'allow', v_change.protection_state,
      'A aprovação temporária foi consumida para iniciar a mudança.',
      v_change.evaluation_snapshot,
      jsonb_build_object('overrideId', v_override_id),
      p_observed_at
    );
  end if;

  insert into private.order_operational_change_decisions (
    change_id, actor_id, actor_role, action,
    previous_status, new_status, gate_decision, protection_state,
    snapshot, metadata, created_at
  ) values (
    p_change_id, p_actor_id,
    case when p_actor_role in ('support', 'admin', 'system') then p_actor_role else 'system' end,
    'started', v_evaluation ->> 'status', 'started', 'allow', v_change.protection_state,
    v_change.evaluation_snapshot,
    jsonb_build_object('overrideId', v_override_id, 'executionReference', p_execution_reference),
    p_observed_at
  );

  return jsonb_build_object(
    'changeId', v_change.id,
    'externalKey', v_change.external_key,
    'status', v_change.status,
    'startedAt', v_change.started_at,
    'protectionState', v_change.protection_state
  );
end;
$$;

create or replace function public.start_order_operational_change_internal(
  p_actor_id uuid,
  p_change_id uuid,
  p_confirmation_text text,
  p_execution_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_change private.order_operational_changes%rowtype;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if p_change_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_ID_REQUIRED';
  end if;

  select * into v_change
  from private.order_operational_changes
  where id = p_change_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_CHANGE_NOT_FOUND';
  end if;

  if trim(coalesce(p_confirmation_text, '')) <> ('LIBERAR ' || v_change.external_key) then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_CONFIRMATION_INVALID';
  end if;

  return private.start_order_operational_change(
    p_change_id, p_actor_id, v_role, p_execution_reference, now()
  );
end;
$$;

create or replace function public.consume_order_operational_change_gate_internal(
  p_external_key text,
  p_execution_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_change_id uuid;
begin
  select id into v_change_id
  from private.order_operational_changes
  where external_key = trim(coalesce(p_external_key, ''));
  if v_change_id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_CHANGE_NOT_FOUND';
  end if;

  return private.start_order_operational_change(
    v_change_id, null, 'system', p_execution_reference, now()
  );
end;
$$;

create or replace function public.complete_order_operational_change_internal(
  p_actor_id uuid,
  p_change_id uuid,
  p_outcome text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_outcome text := lower(trim(coalesce(p_outcome, '')));
  v_note text := regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g');
  v_change private.order_operational_changes%rowtype;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if v_outcome not in ('completed', 'failed', 'cancelled') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_OUTCOME_INVALID';
  end if;
  if char_length(v_note) < 10 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CHANGE_COMPLETION_NOTE_REQUIRED';
  end if;

  select * into v_change
  from private.order_operational_changes
  where id = p_change_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_CHANGE_NOT_FOUND';
  end if;
  if v_change.status <> 'started' then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_NOT_STARTED';
  end if;

  update private.order_operational_changes
     set status = v_outcome,
         completed_at = now(),
         completion_note = left(v_note, 2000),
         updated_at = now()
   where id = p_change_id
   returning * into v_change;

  insert into private.order_operational_change_decisions (
    change_id, actor_id, actor_role, action,
    previous_status, new_status, gate_decision, protection_state,
    reason, snapshot
  ) values (
    p_change_id, p_actor_id, v_role, v_outcome,
    'started', v_outcome, v_change.gate_decision, v_change.protection_state,
    left(v_note, 2000), v_change.evaluation_snapshot
  );

  return jsonb_build_object(
    'changeId', v_change.id,
    'status', v_change.status,
    'completedAt', v_change.completed_at
  );
end;
$$;

create or replace function private.correlate_order_operational_incident_with_change()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_change private.order_operational_changes%rowtype;
  v_anchor timestamptz;
  v_minutes numeric;
  v_score integer;
  v_reason text;
  v_correlation_id uuid;
begin
  if new.action not in ('opened_auto', 'reopened_auto') then
    return new;
  end if;

  select * into v_change
  from private.order_operational_changes c
  where c.status in ('started', 'completed', 'failed')
    and coalesce(c.started_at, c.completed_at, c.requested_at) <= new.created_at
    and coalesce(c.started_at, c.completed_at, c.requested_at) >= new.created_at - interval '2 hours'
  order by coalesce(c.started_at, c.completed_at, c.requested_at) desc
  limit 1;

  if not found then
    return new;
  end if;

  v_anchor := coalesce(v_change.started_at, v_change.completed_at, v_change.requested_at);
  v_minutes := extract(epoch from (new.created_at - v_anchor)) / 60.0;
  v_score := case
    when v_minutes <= 15 then 100
    when v_minutes <= 30 then 80
    when v_minutes <= 60 then 60
    else 40
  end;
  v_reason := format('Incidente aberto %s minuto(s) após a mudança %s.', round(v_minutes, 1), v_change.external_key);

  insert into private.order_operational_change_incidents (
    change_id, alert_id, cycle_count, correlation_score, correlation_reason, correlated_at
  ) values (
    v_change.id, new.alert_id, new.cycle_count, v_score, v_reason, new.created_at
  ) on conflict (change_id, alert_id, cycle_count) do nothing
  returning id into v_correlation_id;

  if v_correlation_id is null then
    return new;
  end if;

  insert into private.order_operational_change_decisions (
    change_id, actor_role, action, previous_status, new_status,
    gate_decision, protection_state, reason, metadata, created_at
  ) values (
    v_change.id, 'system', 'incident_correlated', v_change.status, v_change.status,
    v_change.gate_decision, v_change.protection_state, v_reason,
    jsonb_build_object(
      'alertId', new.alert_id,
      'alertKey', new.alert_key,
      'cycleCount', new.cycle_count,
      'correlationScore', v_score
    ),
    new.created_at
  );

  return new;
end;
$$;

drop trigger if exists trg_correlate_order_incident_change on private.order_operational_incident_actions;
create trigger trg_correlate_order_incident_change
after insert on private.order_operational_incident_actions
for each row execute function private.correlate_order_operational_incident_with_change();

create or replace function private.refresh_order_operational_change_protection(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_budget jsonb;
  v_change record;
  v_revaluated integer := 0;
  v_expired integer := 0;
begin
  v_budget := private.refresh_order_operational_error_budget(p_observed_at);

  v_expired := private.expire_order_operational_change_overrides(p_observed_at, null);

  for v_change in
    select id
    from private.order_operational_changes
    where status in ('registered', 'evaluated', 'approval_required', 'blocked', 'approved')
    order by requested_at
    for update skip locked
  loop
    perform private.evaluate_order_operational_change(v_change.id, null, 'system', p_observed_at);
    v_revaluated := v_revaluated + 1;
  end loop;

  return jsonb_build_object(
    'budget', v_budget,
    'revaluatedChanges', v_revaluated,
    'expiredOverrides', v_expired,
    'observedAt', p_observed_at
  );
end;
$$;

revoke all on function private.order_operational_protection_state_rank(text) from public, anon, authenticated;
revoke all on function private.classify_order_operational_change_decision(text, text) from public, anon, authenticated;
revoke all on function private.expire_order_operational_change_overrides(timestamptz, uuid) from public, anon, authenticated;
revoke all on function private.evaluate_order_operational_change(uuid, uuid, text, timestamptz) from public, anon, authenticated;
revoke all on function private.start_order_operational_change(uuid, uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function private.correlate_order_operational_incident_with_change() from public, anon, authenticated;
revoke all on function private.refresh_order_operational_change_protection(timestamptz) from public, anon, authenticated;
revoke all on function public.register_order_operational_change_internal(uuid, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.approve_order_operational_change_override_internal(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.start_order_operational_change_internal(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.consume_order_operational_change_gate_internal(text, text) from public, anon, authenticated;
revoke all on function public.complete_order_operational_change_internal(uuid, uuid, text, text) from public, anon, authenticated;

grant execute on function private.refresh_order_operational_change_protection(timestamptz) to service_role;
grant execute on function public.register_order_operational_change_internal(uuid, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.approve_order_operational_change_override_internal(uuid, uuid, text, integer) to service_role;
grant execute on function public.start_order_operational_change_internal(uuid, uuid, text, text) to service_role;
grant execute on function public.consume_order_operational_change_gate_internal(text, text) to service_role;
grant execute on function public.complete_order_operational_change_internal(uuid, uuid, text, text) to service_role;
