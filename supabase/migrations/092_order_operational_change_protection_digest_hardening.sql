-- Doke: qualify pgcrypto digest calls in the extensions schema.
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
