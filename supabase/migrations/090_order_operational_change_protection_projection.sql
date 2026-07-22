-- Doke: protected projection of error budgets, change gates, overrides and incident correlations.

create or replace function public.get_order_operational_change_protection_internal(
  p_actor_id uuid,
  p_limit integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_limit integer := greatest(10, least(coalesce(p_limit, 30), 80));
  v_current jsonb;
  v_policies jsonb := '[]'::jsonb;
  v_snapshots jsonb := '[]'::jsonb;
  v_changes jsonb := '[]'::jsonb;
  v_decisions jsonb := '[]'::jsonb;
  v_summary jsonb;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  v_current := private.calculate_order_operational_error_budget(now());

  select coalesce(jsonb_agg(jsonb_build_object(
    'metricKey', p.metric_key,
    'title', p.title,
    'targetPercent', p.target_percent,
    'enforcementEnabled', p.enforcement_enabled,
    'minimumSamples', jsonb_build_object(
      '1h', p.minimum_samples_1h,
      '6h', p.minimum_samples_6h,
      '24h', p.minimum_samples_24h,
      '30d', p.minimum_samples_30d
    ),
    'metadata', p.metadata
  ) order by p.metric_key), '[]'::jsonb)
  into v_policies
  from private.order_operational_error_budget_policies p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'protectionState', s.protection_state,
    'reasons', s.reasons,
    'worstShortBurnRate', s.worst_short_burn_rate,
    'maximum30dConsumedPercent', s.maximum_30d_consumed_percent,
    'openCriticalIncidents', s.open_critical_incidents,
    'observedAt', s.observed_at
  ) order by s.observed_at desc), '[]'::jsonb)
  into v_snapshots
  from (
    select *
    from private.order_operational_error_budget_snapshots
    order by observed_at desc
    limit 24
  ) s;

  select coalesce(jsonb_agg(item order by requested_at desc), '[]'::jsonb)
  into v_changes
  from (
    select
      c.requested_at,
      jsonb_build_object(
        'id', c.id,
        'externalKey', c.external_key,
        'changeType', c.change_type,
        'riskLevel', c.risk_level,
        'title', c.title,
        'description', c.description,
        'changeReference', c.change_reference,
        'status', c.status,
        'gateDecision', c.gate_decision,
        'protectionState', c.protection_state,
        'evaluation', c.evaluation_snapshot,
        'requestedBy', c.requested_by,
        'requestedByName', coalesce(nullif(trim(requester.display_name), ''), case when c.requested_by is null then 'Automação Doke' else 'Operador Doke' end),
        'requestedRole', c.requested_role,
        'requestedAt', c.requested_at,
        'evaluatedAt', c.evaluated_at,
        'approvedBy', c.approved_by,
        'approvedByName', coalesce(nullif(trim(approver.display_name), ''), case when c.approved_by is null then null else 'Administrador Doke' end),
        'approvedAt', c.approved_at,
        'overrideExpiresAt', c.override_expires_at,
        'startedAt', c.started_at,
        'completedAt', c.completed_at,
        'completionNote', c.completion_note,
        'confirmationPhrase', 'LIBERAR ' || c.external_key,
        'activeOverride', override_row.item,
        'correlations', coalesce(correlation_rows.items, '[]'::jsonb),
        'metadata', c.metadata
      ) item
    from private.order_operational_changes c
    left join public.user_profiles requester on requester.user_id = c.requested_by
    left join public.user_profiles approver on approver.user_id = c.approved_by
    left join lateral (
      select jsonb_build_object(
        'id', o.id,
        'reason', o.reason,
        'grantedProtectionState', o.granted_protection_state,
        'status', o.status,
        'grantedAt', o.granted_at,
        'expiresAt', o.expires_at,
        'usedAt', o.used_at
      ) item
      from private.order_operational_change_overrides o
      where o.change_id = c.id
      order by o.granted_at desc
      limit 1
    ) override_row on true
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', ci.id,
        'alertId', ci.alert_id,
        'alertKey', a.alert_key,
        'alertType', a.alert_type,
        'severity', a.severity,
        'cycleCount', ci.cycle_count,
        'correlationScore', ci.correlation_score,
        'correlationReason', ci.correlation_reason,
        'correlatedAt', ci.correlated_at
      ) order by ci.correlated_at desc) items
      from private.order_operational_change_incidents ci
      join private.order_operational_alerts a on a.id = ci.alert_id
      where ci.change_id = c.id
    ) correlation_rows on true
    order by c.requested_at desc
    limit v_limit
  ) change_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'changeId', d.change_id,
    'externalKey', c.external_key,
    'actorId', d.actor_id,
    'actorRole', d.actor_role,
    'actorName', coalesce(nullif(trim(actor.display_name), ''), case when d.actor_role = 'system' then 'Automação Doke' else 'Operador Doke' end),
    'action', d.action,
    'previousStatus', d.previous_status,
    'newStatus', d.new_status,
    'gateDecision', d.gate_decision,
    'protectionState', d.protection_state,
    'reason', d.reason,
    'metadata', d.metadata,
    'createdAt', d.created_at
  ) order by d.created_at desc), '[]'::jsonb)
  into v_decisions
  from (
    select *
    from private.order_operational_change_decisions
    order by created_at desc
    limit 40
  ) d
  join private.order_operational_changes c on c.id = d.change_id
  left join public.user_profiles actor on actor.user_id = d.actor_id;

  select jsonb_build_object(
    'pending', count(*) filter (where status in ('registered', 'evaluated', 'approval_required', 'blocked', 'approved')),
    'approvalRequired', count(*) filter (where status = 'approval_required'),
    'blocked', count(*) filter (where status = 'blocked'),
    'approved', count(*) filter (where status = 'approved'),
    'started', count(*) filter (where status = 'started'),
    'correlatedIncidents', (select count(*) from private.order_operational_change_incidents)
  ) into v_summary
  from private.order_operational_changes;

  return jsonb_build_object(
    'actorId', p_actor_id,
    'actorRole', v_role,
    'current', v_current,
    'policies', v_policies,
    'snapshots', v_snapshots,
    'summary', v_summary,
    'changes', v_changes,
    'decisions', v_decisions
  );
end;
$$;

revoke all on function public.get_order_operational_change_protection_internal(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_order_operational_change_protection_internal(uuid, integer)
  to service_role;

comment on table private.order_operational_error_budget_snapshots is
  'Multi-window error-budget snapshots used to protect order-operation changes.';
comment on table private.order_operational_changes is
  'Risk-classified deploy, migration and configuration changes governed by order-operation reliability.';
comment on table private.order_operational_change_decisions is
  'Immutable decision ledger for operational change gates and incident correlations.';
comment on function public.get_order_operational_change_protection_internal(uuid, integer) is
  'Service-role-only projection of error budgets, change gates, overrides and correlations after independent operator authentication.';
