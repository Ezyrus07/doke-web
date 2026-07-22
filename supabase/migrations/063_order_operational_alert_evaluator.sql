-- Doke: alert lifecycle evaluator and protected operations projection.

create or replace function private.evaluate_order_operational_alerts(
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_snapshot jsonb;
  v_candidates jsonb;
  v_candidate jsonb;
  v_active_keys text[] := array[]::text[];
  v_alert private.order_operational_alerts;
  v_existing private.order_operational_alerts;
  v_notification_number integer;
  v_recipient_count integer := 0;
  v_notified_count integer := 0;
  v_resolved_count integer := 0;
  v_detected_count integer := 0;
  v_event_key text;
  v_evaluation_id uuid;
begin
  v_snapshot := private.capture_order_operational_health_snapshot(p_observed_at);
  v_candidates := private.classify_order_operational_alerts(v_snapshot, p_observed_at);
  v_detected_count := jsonb_array_length(v_candidates);

  for v_candidate in select value from jsonb_array_elements(v_candidates)
  loop
    v_active_keys := array_append(v_active_keys, v_candidate ->> 'alertKey');

    select * into v_existing
      from private.order_operational_alerts a
     where a.alert_key = v_candidate ->> 'alertKey'
     for update;

    if not found then
      insert into private.order_operational_alerts (
        alert_key, alert_type, severity, status, title, body, details,
        silence_minutes, cycle_count, occurrence_count, notification_count,
        first_seen_at, opened_at, last_seen_at, next_notification_at, created_at, updated_at
      ) values (
        v_candidate ->> 'alertKey',
        v_candidate ->> 'alertType',
        v_candidate ->> 'severity',
        'open',
        v_candidate ->> 'title',
        v_candidate ->> 'body',
        coalesce(v_candidate -> 'details', '{}'::jsonb),
        coalesce((v_candidate ->> 'silenceMinutes')::integer, 60),
        1, 1, 0,
        p_observed_at, p_observed_at, p_observed_at, p_observed_at, p_observed_at, p_observed_at
      ) returning * into v_alert;
    else
      update private.order_operational_alerts
         set alert_type = v_candidate ->> 'alertType',
             severity = v_candidate ->> 'severity',
             status = 'open',
             title = v_candidate ->> 'title',
             body = v_candidate ->> 'body',
             details = coalesce(v_candidate -> 'details', '{}'::jsonb),
             silence_minutes = coalesce((v_candidate ->> 'silenceMinutes')::integer, silence_minutes),
             cycle_count = case when v_existing.status = 'resolved' then cycle_count + 1 else cycle_count end,
             occurrence_count = occurrence_count + 1,
             opened_at = case when v_existing.status = 'resolved' then p_observed_at else opened_at end,
             last_seen_at = p_observed_at,
             last_notified_at = case when v_existing.status = 'resolved' then null else last_notified_at end,
             next_notification_at = case
               when v_existing.status = 'resolved' then p_observed_at
               else coalesce(next_notification_at, p_observed_at)
             end,
             notification_count = case when v_existing.status = 'resolved' then 0 else notification_count end,
             resolved_at = null,
             updated_at = p_observed_at
       where id = v_existing.id
       returning * into v_alert;
    end if;

    if v_alert.next_notification_at <= p_observed_at then
      v_notification_number := v_alert.notification_count + 1;

      insert into public.notifications (
        external_id, user_id, actor_id, type, category, event_key,
        title, body, target_url, action_label, data, created_at, updated_at
      )
      select
        'notif_order_ops_' || md5(v_alert.id::text || ':' || v_alert.cycle_count || ':' || v_notification_number || ':' || u.id::text),
        u.id,
        null,
        'order_ops_alert',
        'social',
        'order-ops-alert:' || v_alert.alert_type || ':cycle:' || v_alert.cycle_count || ':notification:' || v_notification_number || ':recipient:' || u.id::text,
        v_alert.title,
        v_alert.body,
        'admin-pedidos-operacao.html?alert=' || v_alert.alert_type,
        'Abrir operação',
        jsonb_build_object(
          'operationalAlert', true,
          'alertId', v_alert.id,
          'alertKey', v_alert.alert_key,
          'alertType', v_alert.alert_type,
          'severity', v_alert.severity,
          'cycle', v_alert.cycle_count,
          'notificationNumber', v_notification_number,
          'details', v_alert.details
        ),
        p_observed_at,
        p_observed_at
      from public.users u
      where u.status = 'active'
        and u.role in ('support', 'admin')
      on conflict (user_id, event_key) where event_key is not null and event_key <> '' do nothing;

      get diagnostics v_recipient_count = row_count;
      v_notified_count := v_notified_count + v_recipient_count;

      if v_recipient_count > 0 then
        update private.order_operational_alerts
           set notification_count = v_notification_number,
               last_notified_at = p_observed_at,
               next_notification_at = p_observed_at + make_interval(mins => v_alert.silence_minutes),
               updated_at = p_observed_at
         where id = v_alert.id;
      end if;
    end if;
  end loop;

  update private.order_operational_alerts
     set status = 'resolved',
         resolved_at = p_observed_at,
         last_seen_at = p_observed_at,
         updated_at = p_observed_at
   where status = 'open'
     and not (alert_key = any(v_active_keys));
  get diagnostics v_resolved_count = row_count;

  insert into private.order_operational_alert_evaluations (
    status, detected_count, notified_count, resolved_count, snapshot, evaluated_at, completed_at
  ) values (
    'completed', v_detected_count, v_notified_count, v_resolved_count, v_snapshot, p_observed_at, now()
  ) returning id into v_evaluation_id;

  return jsonb_build_object(
    'evaluationId', v_evaluation_id,
    'detectedCount', v_detected_count,
    'notifiedCount', v_notified_count,
    'resolvedCount', v_resolved_count,
    'snapshot', v_snapshot,
    'alerts', v_candidates
  );
end;
$$;

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
  v_last_evaluation jsonb := '{}'::jsonb;
  v_active_count bigint := 0;
  v_critical_count bigint := 0;
  v_warning_count bigint := 0;
begin
  v_role := private.assert_order_event_operator(p_actor_id);

  select
    count(*) filter (where a.status = 'open'),
    count(*) filter (where a.status = 'open' and a.severity = 'critical'),
    count(*) filter (where a.status = 'open' and a.severity = 'warning')
  into v_active_count, v_critical_count, v_warning_count
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
        'title', a.title,
        'body', a.body,
        'details', a.details,
        'cycleCount', a.cycle_count,
        'occurrenceCount', a.occurrence_count,
        'notificationCount', a.notification_count,
        'openedAt', a.opened_at,
        'lastSeenAt', a.last_seen_at,
        'lastNotifiedAt', a.last_notified_at,
        'nextNotificationAt', a.next_notification_at,
        'silenceMinutes', a.silence_minutes
      ) as item
    from private.order_operational_alerts a
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
        'title', a.title,
        'body', a.body,
        'cycleCount', a.cycle_count,
        'openedAt', a.opened_at,
        'resolvedAt', a.resolved_at
      ) as item
    from private.order_operational_alerts a
    where a.status = 'resolved'
    order by a.resolved_at desc nulls last
    limit 10
  ) rows_recent;

  select jsonb_build_object(
    'id', e.id,
    'status', e.status,
    'detectedCount', e.detected_count,
    'notifiedCount', e.notified_count,
    'resolvedCount', e.resolved_count,
    'evaluatedAt', e.evaluated_at,
    'completedAt', e.completed_at
  )
  into v_last_evaluation
  from private.order_operational_alert_evaluations e
  order by e.evaluated_at desc
  limit 1;

  return jsonb_build_object(
    'actorRole', v_role,
    'summary', jsonb_build_object(
      'active', v_active_count,
      'critical', v_critical_count,
      'warning', v_warning_count
    ),
    'active', v_active,
    'recentResolved', v_recent,
    'lastEvaluation', coalesce(v_last_evaluation, '{}'::jsonb)
  );
end;
$$;
