-- ORD-A03 compatibility reconciliation: keep the current notification schema
-- while allowing the command boundary to pass relationship-derived capability.
create or replace function private.project_order_domain_event()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := nullif(trim(current_setting('doke.order_actor_role', true)), '');
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_action text := nullif(trim(current_setting('doke.order_transition_action', true)), '');
  v_note text := nullif(trim(current_setting('doke.order_transition_note', true)), '');
  v_previous_status text;
  v_sequence bigint;
  v_event_id uuid;
  v_event_key text;
  v_event_type text;
  v_conversation_id uuid;
  v_recipient_id uuid;
  v_notification_key text;
  v_title text;
  v_body text;
  v_cache_tags text[];
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if v_actor_role is null then
    if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
      v_actor_role := 'service_role';
      if v_jwt_role <> 'service_role' then
        v_actor_id := null;
      end if;
    elsif v_actor_id is not null then
      select lower(u.role) into v_actor_role
      from public.users u
      where u.id = v_actor_id;
    end if;
  end if;

  if v_actor_role is null then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_EVENT_ACTOR_UNRESOLVED';
  end if;

  v_previous_status := case when tg_op = 'INSERT' then null else old.status end;
  v_action := coalesce(v_action, case when tg_op = 'INSERT' then 'create' else 'updateStatus' end);
  v_note := coalesce(v_note, case new.status
    when 'requested' then 'Pedido criado ou solicitado pelo cliente.'
    when 'accepted' then 'Pedido aceito pelo profissional.'
    when 'quoted' then 'Orçamento enviado ou atualizado pelo profissional.'
    when 'scheduled' then 'Atendimento agendado.'
    when 'in_progress' then 'Atendimento iniciado.'
    when 'completed' then 'Atendimento concluído.'
    when 'cancelled' then 'Pedido cancelado.'
    when 'disputed' then 'Disputa aberta para o pedido.'
    else 'Status do pedido atualizado.'
  end);

  v_event_type := case new.status
    when 'requested' then 'order.requested'
    when 'accepted' then 'order.accepted'
    when 'quoted' then 'order.quoted'
    when 'scheduled' then 'order.scheduled'
    when 'in_progress' then 'order.started'
    when 'completed' then 'order.completed'
    when 'cancelled' then 'order.cancelled'
    when 'disputed' then 'order.disputed'
    else null
  end;
  if v_event_type is null then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_EVENT_TYPE_INVALID';
  end if;

  select coalesce(max(e.sequence_no), 0) + 1
  into v_sequence
  from private.order_domain_events e
  where e.order_id = new.id;

  v_event_key := 'order:' || new.id::text || ':v' || v_sequence::text;
  v_cache_tags := array_remove(array[
    'order:' || new.id::text,
    'orders:client:' || new.client_id::text,
    case when new.professional_id is not null then 'orders:professional:' || new.professional_id::text end,
    case when new.professional_id is not null then 'conversation:order:' || new.id::text end
  ], null);

  insert into private.order_domain_events (
    event_key,
    order_id,
    sequence_no,
    event_type,
    previous_status,
    next_status,
    actor_id,
    actor_role,
    action,
    note,
    payload,
    cache_tags,
    created_at
  ) values (
    v_event_key,
    new.id,
    v_sequence,
    v_event_type,
    v_previous_status,
    new.status,
    v_actor_id,
    v_actor_role,
    v_action,
    v_note,
    jsonb_build_object(
      'orderId', new.id,
      'serviceId', new.service_id,
      'clientId', new.client_id,
      'professionalId', new.professional_id,
      'previousStatus', v_previous_status,
      'nextStatus', new.status,
      'actorId', v_actor_id,
      'actorRole', v_actor_role,
      'action', v_action,
      'occurredAt', coalesce(new.updated_at, now())
    ),
    v_cache_tags,
    coalesce(new.updated_at, now())
  ) returning id into v_event_id;

  insert into public.order_status_history (
    order_id,
    old_status,
    new_status,
    actor_id,
    note,
    event_id,
    event_key,
    sequence_no,
    action,
    created_at
  ) values (
    new.id,
    v_previous_status,
    new.status,
    v_actor_id,
    v_note,
    v_event_id,
    v_event_key,
    v_sequence,
    v_action,
    coalesce(new.updated_at, now())
  ) on conflict (event_key) where event_key is not null and event_key <> '' do nothing;

  update public.conversations
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'orderStatus', new.status,
        'orderEventKey', v_event_key,
        'orderEventSequence', v_sequence,
        'cacheVersion', v_sequence
      ),
      updated_at = coalesce(new.updated_at, now())
  where order_id = new.id
  returning id into v_conversation_id;

  insert into private.order_metric_events (
    order_event_id,
    event_key,
    order_id,
    service_id,
    client_id,
    professional_id,
    event_type,
    occurred_at,
    dimensions
  ) values (
    v_event_id,
    v_event_key,
    new.id,
    new.service_id,
    new.client_id,
    new.professional_id,
    v_event_type,
    coalesce(new.updated_at, now()),
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', new.status,
      'actorRole', v_actor_role,
      'action', v_action,
      'sequence', v_sequence
    )
  ) on conflict (order_event_id) do nothing;

  v_title := case new.status
    when 'requested' then 'Novo pedido recebido'
    when 'accepted' then 'Pedido aceito'
    when 'quoted' then 'Novo orçamento recebido'
    when 'scheduled' then 'Serviço agendado'
    when 'in_progress' then 'Serviço iniciado'
    when 'completed' then 'Serviço concluído'
    when 'cancelled' then 'Pedido cancelado'
    when 'disputed' then 'Disputa aberta'
    else 'Pedido atualizado'
  end;
  v_body := case new.status
    when 'requested' then 'Um cliente enviou uma nova solicitação de serviço.'
    when 'accepted' then 'O profissional aceitou a solicitação de serviço.'
    when 'quoted' then 'O profissional enviou ou atualizou o orçamento do pedido.'
    when 'scheduled' then 'O pedido recebeu uma data de atendimento.'
    when 'in_progress' then 'O atendimento deste pedido foi iniciado.'
    when 'completed' then 'O atendimento deste pedido foi marcado como concluído.'
    when 'cancelled' then 'Este pedido foi cancelado.'
    when 'disputed' then 'Uma disputa foi aberta para este pedido.'
    else 'O status deste pedido foi atualizado.'
  end;

  for v_recipient_id in
    select participant_id
    from unnest(array[new.client_id, new.professional_id]) as participants(participant_id)
    where participant_id is not null
      and (v_actor_id is null or participant_id <> v_actor_id)
  loop
    v_notification_key := v_event_key || ':recipient:' || v_recipient_id::text;

    insert into public.notifications (
      external_id,
      user_id,
      actor_id,
      type,
      category,
      event_key,
      title,
      body,
      target_url,
      action_label,
      order_id,
      conversation_id,
      service_id,
      data,
      created_at,
      updated_at
    ) values (
      'notif_' || replace(v_notification_key, ':', '_'),
      v_recipient_id,
      v_actor_id,
      replace(v_event_type, '.', '_'),
      'orders',
      v_notification_key,
      v_title,
      v_body,
      'pedidos.html?order=' || new.id::text,
      'Ver pedido',
      new.id,
      v_conversation_id,
      new.service_id,
      jsonb_build_object(
        'eventKey', v_event_key,
        'eventType', v_event_type,
        'orderId', new.id,
        'conversationId', v_conversation_id,
        'previousStatus', v_previous_status,
        'nextStatus', new.status,
        'sequence', v_sequence
      ),
      coalesce(new.updated_at, now()),
      coalesce(new.updated_at, now())
    ) on conflict (user_id, event_key) where event_key is not null and event_key <> '' do update
      set actor_id = excluded.actor_id,
          type = excluded.type,
          category = excluded.category,
          title = excluded.title,
          body = excluded.body,
          target_url = excluded.target_url,
          action_label = excluded.action_label,
          order_id = excluded.order_id,
          conversation_id = excluded.conversation_id,
          service_id = excluded.service_id,
          data = excluded.data,
          updated_at = excluded.updated_at;
  end loop;

  return new;
end;
$$;

revoke all on function private.project_order_domain_event() from public, anon, authenticated;

comment on function private.project_order_domain_event() is
  'Projects canonical order events with ORD-A03 relationship-derived actor capability and the current notification schema.';
