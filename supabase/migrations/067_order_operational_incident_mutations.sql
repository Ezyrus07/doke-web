-- Doke: controlled human incident actions.
create or replace function public.mutate_order_operational_incident_internal(
  p_actor_id uuid,
  p_alert_id uuid,
  p_action text,
  p_note text default null,
  p_assignee_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor_role text;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_note text := regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g');
  v_alert private.order_operational_alerts%rowtype;
  v_assignee_role text;
  v_assignee_name text;
  v_previous_owner uuid;
  v_previous_workflow text;
  v_response_minutes integer;
begin
  v_actor_role := private.assert_order_event_operator(p_actor_id);

  if p_alert_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_INCIDENT_ID_REQUIRED';
  end if;

  if v_action not in ('acknowledge', 'assign', 'note') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_INCIDENT_ACTION_INVALID';
  end if;

  if char_length(v_note) < 5 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_INCIDENT_NOTE_REQUIRED';
  end if;

  select * into v_alert
  from private.order_operational_alerts
  where id = p_alert_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_INCIDENT_NOT_FOUND';
  end if;

  if v_alert.status <> 'open' then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_INCIDENT_CLOSED';
  end if;

  v_previous_owner := v_alert.owner_id;
  v_previous_workflow := v_alert.workflow_status;
  v_response_minutes := case when v_alert.severity = 'critical' then 30 else 120 end;

  if v_action = 'acknowledge' then
    if v_alert.owner_id is not null and v_alert.owner_id <> p_actor_id then
      raise exception using errcode = '55000', message = 'DOKE_ORDER_INCIDENT_ALREADY_OWNED';
    end if;

    update private.order_operational_alerts
       set owner_id = p_actor_id,
           owner_role = v_actor_role,
           acknowledged_at = coalesce(acknowledged_at, now()),
           acknowledged_by = coalesce(acknowledged_by, p_actor_id),
           workflow_status = 'acknowledged',
           response_due_at = now() + make_interval(mins => v_response_minutes),
           next_escalation_at = now() + make_interval(mins => v_response_minutes),
           updated_at = now()
     where id = v_alert.id
     returning * into v_alert;

  elsif v_action = 'assign' then
    if v_actor_role <> 'admin' then
      raise exception using errcode = '42501', message = 'DOKE_ORDER_INCIDENT_ASSIGN_ADMIN_REQUIRED';
    end if;
    if p_assignee_id is null then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_INCIDENT_ASSIGNEE_REQUIRED';
    end if;

    select lower(u.role), coalesce(nullif(trim(up.display_name), ''), 'Operador Doke')
      into v_assignee_role, v_assignee_name
      from public.users u
      left join public.user_profiles up on up.user_id = u.id
     where u.id = p_assignee_id
       and lower(u.status) = 'active'
       and lower(u.role) in ('support', 'admin');

    if v_assignee_role is null then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_INCIDENT_ASSIGNEE_INVALID';
    end if;

    update private.order_operational_alerts
       set owner_id = p_assignee_id,
           owner_role = v_assignee_role,
           acknowledged_at = coalesce(acknowledged_at, now()),
           acknowledged_by = coalesce(acknowledged_by, p_actor_id),
           workflow_status = 'acknowledged',
           response_due_at = now() + make_interval(mins => v_response_minutes),
           next_escalation_at = now() + make_interval(mins => v_response_minutes),
           updated_at = now()
     where id = v_alert.id
     returning * into v_alert;
  end if;

  insert into private.order_operational_incident_actions (
    alert_id, alert_key, cycle_count, actor_id, actor_role, action, note,
    previous_owner_id, new_owner_id,
    previous_workflow_status, new_workflow_status, metadata
  ) values (
    v_alert.id, v_alert.alert_key, v_alert.cycle_count, p_actor_id, v_actor_role, v_action, v_note,
    v_previous_owner, v_alert.owner_id,
    v_previous_workflow, v_alert.workflow_status,
    jsonb_build_object(
      'severity', v_alert.severity,
      'assigneeRole', v_alert.owner_role,
      'assigneeName', v_assignee_name,
      'responseDueAt', v_alert.response_due_at
    )
  );

  return jsonb_build_object(
    'alertId', v_alert.id,
    'action', v_action,
    'workflowStatus', v_alert.workflow_status,
    'ownerId', v_alert.owner_id,
    'ownerRole', v_alert.owner_role,
    'acknowledgedAt', v_alert.acknowledged_at,
    'responseDueAt', v_alert.response_due_at
  );
end;
$$;

revoke all on function public.mutate_order_operational_incident_internal(uuid, uuid, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.mutate_order_operational_incident_internal(uuid, uuid, text, text, uuid)
  to service_role;

