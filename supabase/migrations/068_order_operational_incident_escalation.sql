-- Doke: automatic incident escalation.
create or replace function private.escalate_order_operational_incidents(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_alert private.order_operational_alerts%rowtype;
  v_reason text;
  v_escalation_number integer;
  v_notifications integer := 0;
  v_escalated integer := 0;
  v_rows integer := 0;
begin
  for v_alert in
    select *
    from private.order_operational_alerts a
    where a.status = 'open'
      and a.next_escalation_at is not null
      and a.next_escalation_at <= p_observed_at
    order by case a.severity when 'critical' then 1 else 2 end, a.next_escalation_at
    for update skip locked
  loop
    v_reason := case
      when v_alert.acknowledged_at is null then 'unacknowledged'
      else 'response_overdue'
    end;
    v_escalation_number := v_alert.escalation_count + 1;

    update private.order_operational_alerts
       set workflow_status = 'escalated',
           escalation_count = v_escalation_number,
           escalated_at = coalesce(escalated_at, p_observed_at),
           last_escalated_at = p_observed_at,
           next_escalation_at = p_observed_at + make_interval(
             mins => case when severity = 'critical' then 30 else 60 end
           ),
           updated_at = p_observed_at
     where id = v_alert.id;

    insert into private.order_operational_incident_actions (
      alert_id, alert_key, cycle_count, actor_role, action, note,
      previous_owner_id, new_owner_id,
      previous_workflow_status, new_workflow_status, metadata, created_at
    ) values (
      v_alert.id, v_alert.alert_key, v_alert.cycle_count, 'system', 'escalate_auto',
      case when v_reason = 'unacknowledged'
        then 'Incidente não reconhecido dentro do SLA.'
        else 'Incidente reconhecido sem recuperação dentro do prazo operacional.'
      end,
      v_alert.owner_id, v_alert.owner_id,
      v_alert.workflow_status, 'escalated',
      jsonb_build_object(
        'reason', v_reason,
        'severity', v_alert.severity,
        'escalationNumber', v_escalation_number,
        'dueAt', v_alert.next_escalation_at
      ),
      p_observed_at
    );

    insert into public.notifications (
      external_id, user_id, actor_id, type, category, event_key,
      title, body, target_url, action_label, data, created_at, updated_at
    )
    select
      'notif_order_incident_escalation_' || md5(v_alert.id::text || ':' || v_alert.cycle_count || ':' || v_escalation_number || ':' || u.id::text),
      u.id,
      null,
      'order_ops_incident_escalation',
      'social',
      'order-ops-incident-escalation:' || v_alert.id::text || ':cycle:' || v_alert.cycle_count || ':level:' || v_escalation_number || ':recipient:' || u.id::text,
      case when v_alert.severity = 'critical' then 'Incidente crítico sem resposta' else 'Incidente operacional escalonado' end,
      case when v_reason = 'unacknowledged'
        then v_alert.title || ' ainda não foi assumido por um operador.'
        else v_alert.title || ' ultrapassou o prazo operacional sem recuperação.'
      end,
      'admin-pedidos-operacao.html?alert=' || v_alert.alert_type,
      'Gerenciar incidente',
      jsonb_build_object(
        'operationalIncident', true,
        'alertId', v_alert.id,
        'alertType', v_alert.alert_type,
        'severity', v_alert.severity,
        'cycle', v_alert.cycle_count,
        'escalationNumber', v_escalation_number,
        'reason', v_reason,
        'ownerId', v_alert.owner_id
      ),
      p_observed_at,
      p_observed_at
    from public.users u
    where lower(u.status) = 'active'
      and lower(u.role) = 'admin'
    on conflict (user_id, event_key) where event_key is not null and event_key <> '' do nothing;

    get diagnostics v_rows = row_count;
    v_notifications := v_notifications + v_rows;
    v_escalated := v_escalated + 1;
  end loop;

  return jsonb_build_object(
    'escalatedCount', v_escalated,
    'notifiedCount', v_notifications,
    'observedAt', p_observed_at
  );
end;
$$;

revoke all on function private.escalate_order_operational_incidents(timestamptz)
  from public, anon, authenticated;
grant execute on function private.escalate_order_operational_incidents(timestamptz)
  to service_role;
