-- Doke: protected incident operations projection.
create or replace function public.get_order_operational_alerts_internal(
  p_actor_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_limit integer := greatest(5, least(coalesce(p_limit, 20), 50));
  v_role text;
  v_active jsonb := '[]'::jsonb;
  v_recent jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_operators jsonb := '[]'::jsonb;
  v_last_evaluation jsonb := '{}'::jsonb;
  v_active_count bigint := 0;
  v_critical_count bigint := 0;
  v_warning_count bigint := 0;
  v_unassigned_count bigint := 0;
  v_escalated_count bigint := 0;
begin
  v_role := private.assert_order_event_operator(p_actor_id);

  select
    count(*) filter (where a.status = 'open'),
    count(*) filter (where a.status = 'open' and a.severity = 'critical'),
    count(*) filter (where a.status = 'open' and a.severity = 'warning'),
    count(*) filter (where a.status = 'open' and a.owner_id is null),
    count(*) filter (where a.status = 'open' and a.workflow_status = 'escalated')
  into v_active_count, v_critical_count, v_warning_count, v_unassigned_count, v_escalated_count
  from private.order_operational_alerts a;

  select coalesce(jsonb_agg(item order by sort_order, opened_at), '[]'::jsonb)
  into v_active
  from (
    select
      case a.severity when 'critical' then 1 else 2 end as sort_order,
      a.opened_at,
      jsonb_build_object(
        'id', a.id,
        'alertKey', a.alert_key,
        'alertType', a.alert_type,
        'severity', a.severity,
        'status', a.status,
        'workflowStatus', a.workflow_status,
        'title', a.title,
        'body', a.body,
        'details', a.details,
        'cycleCount', a.cycle_count,
        'occurrenceCount', a.occurrence_count,
        'notificationCount', a.notification_count,
        'ownerId', a.owner_id,
        'ownerRole', a.owner_role,
        'ownerName', coalesce(nullif(trim(owner_profile.display_name), ''), case when a.owner_id is null then null else 'Operador Doke' end),
        'acknowledgedAt', a.acknowledged_at,
        'acknowledgedBy', a.acknowledged_by,
        'acknowledgementDueAt', a.acknowledgement_due_at,
        'responseDueAt', a.response_due_at,
        'escalationCount', a.escalation_count,
        'escalatedAt', a.escalated_at,
        'lastEscalatedAt', a.last_escalated_at,
        'nextEscalationAt', a.next_escalation_at,
        'openedAt', a.opened_at,
        'lastSeenAt', a.last_seen_at,
        'lastNotifiedAt', a.last_notified_at,
        'nextNotificationAt', a.next_notification_at,
        'silenceMinutes', a.silence_minutes
      ) as item
    from private.order_operational_alerts a
    left join public.user_profiles owner_profile on owner_profile.user_id = a.owner_id
    where a.status = 'open'
    order by sort_order, a.opened_at
    limit v_limit
  ) rows_active;

  select coalesce(jsonb_agg(item order by resolved_at desc), '[]'::jsonb)
  into v_recent
  from (
    select
      a.resolved_at,
      jsonb_build_object(
        'id', a.id,
        'alertKey', a.alert_key,
        'alertType', a.alert_type,
        'severity', a.severity,
        'status', a.status,
        'workflowStatus', a.workflow_status,
        'title', a.title,
        'body', a.body,
        'cycleCount', a.cycle_count,
        'ownerId', a.owner_id,
        'ownerName', coalesce(nullif(trim(owner_profile.display_name), ''), case when a.owner_id is null then null else 'Operador Doke' end),
        'escalationCount', a.escalation_count,
        'openedAt', a.opened_at,
        'resolvedAt', a.resolved_at
      ) as item
    from private.order_operational_alerts a
    left join public.user_profiles owner_profile on owner_profile.user_id = a.owner_id
    where a.status = 'resolved'
    order by a.resolved_at desc nulls last
    limit 10
  ) rows_recent;

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb)
  into v_history
  from (
    select
      h.created_at,
      jsonb_build_object(
        'id', h.id,
        'alertId', h.alert_id,
        'alertKey', h.alert_key,
        'cycleCount', h.cycle_count,
        'actorId', h.actor_id,
        'actorRole', h.actor_role,
        'actorName', coalesce(nullif(trim(actor_profile.display_name), ''), case when h.actor_role = 'system' then 'Automação Doke' else 'Operador Doke' end),
        'action', h.action,
        'note', h.note,
        'previousOwnerId', h.previous_owner_id,
        'newOwnerId', h.new_owner_id,
        'previousWorkflowStatus', h.previous_workflow_status,
        'newWorkflowStatus', h.new_workflow_status,
        'metadata', h.metadata,
        'createdAt', h.created_at
      ) as item
    from private.order_operational_incident_actions h
    left join public.user_profiles actor_profile on actor_profile.user_id = h.actor_id
    order by h.created_at desc
    limit 30
  ) history_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', u.id,
    'role', lower(u.role),
    'name', coalesce(nullif(trim(up.display_name), ''), 'Operador Doke')
  ) order by case lower(u.role) when 'admin' then 1 else 2 end, coalesce(up.display_name, '')), '[]'::jsonb)
  into v_operators
  from public.users u
  left join public.user_profiles up on up.user_id = u.id
  where lower(u.status) = 'active'
    and lower(u.role) in ('support', 'admin');

  select jsonb_build_object(
    'id', e.id,
    'status', e.status,
    'detectedCount', e.detected_count,
    'notifiedCount', e.notified_count,
    'resolvedCount', e.resolved_count,
    'evaluatedAt', e.evaluated_at,
    'completedAt', e.completed_at
  ) into v_last_evaluation
  from private.order_operational_alert_evaluations e
  order by e.evaluated_at desc
  limit 1;

  return jsonb_build_object(
    'actorId', p_actor_id,
    'actorRole', v_role,
    'summary', jsonb_build_object(
      'active', v_active_count,
      'critical', v_critical_count,
      'warning', v_warning_count,
      'unassigned', v_unassigned_count,
      'escalated', v_escalated_count
    ),
    'active', v_active,
    'recentResolved', v_recent,
    'history', v_history,
    'operators', v_operators,
    'lastEvaluation', coalesce(v_last_evaluation, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.get_order_operational_alerts_internal(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.get_order_operational_alerts_internal(uuid, integer)
  to service_role;

