-- Staging-only completion request authority.

create or replace function private.finance_sandbox_request_completion(
  p_actor_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_context jsonb;
  v_actor_role text;
  v_order public.orders%rowtype;
  v_conversation public.conversations%rowtype;
  v_message public.messages%rowtype;
  v_payment public.payments%rowtype;
  v_notification public.notifications%rowtype;
  v_now timestamptz := now();
  v_order_metadata jsonb;
  v_message_metadata jsonb;
  v_conversation_metadata jsonb;
begin
  v_actor_role := private.finance_sandbox_set_actor(p_actor_id);
  if v_actor_role <> 'professional' then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_PROFESSIONAL_REQUIRED';
  end if;

  v_context := private.finance_sandbox_context(v_payload);

  select row_value.* into v_order
  from public.orders row_value
  where row_value.id = (v_context ->> 'orderId')::uuid
  for update;

  select row_value.* into v_conversation
  from public.conversations row_value
  where row_value.id = (v_context ->> 'conversationId')::uuid
  for update;

  select row_value.* into v_message
  from public.messages row_value
  where row_value.id = (v_context ->> 'messageId')::uuid
  for update;

  if p_actor_id <> v_order.professional_id then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_PROFESSIONAL_REQUIRED';
  end if;
  if v_order.status <> 'in_progress' then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_ORDER_NOT_IN_PROGRESS';
  end if;

  select row_value.* into v_payment
  from public.payments row_value
  where row_value.order_id = v_order.id
    and row_value.status in ('held', 'released')
  order by row_value.created_at desc
  limit 1
  for update;

  if v_payment.id is null or v_payment.status <> 'held' then
    raise exception using errcode = '23503', message = 'DOKE_FINANCE_SANDBOX_HELD_PAYMENT_REQUIRED';
  end if;
  if coalesce(v_order.metadata ->> 'completionStatus', '') = 'confirmed' then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_ALREADY_COMPLETED';
  end if;

  v_order_metadata := coalesce(v_order.metadata, '{}'::jsonb) || jsonb_build_object(
    'completionStatus', 'requested',
    'completionRequestedAt', coalesce(nullif(v_payload ->> 'requestedAt', '')::timestamptz, v_now),
    'completionRequestedBy', p_actor_id,
    'completionNote', left(btrim(coalesce(v_payload ->> 'note', '')), 800),
    'detailFlow', 'O profissional informou que o serviço foi concluído. O cliente deve confirmar ou relatar um problema.',
    'nextAction', 'Confirmar conclusão',
    'financialAuthority', 'staging_sandbox',
    'updatedAt', v_now
  );
  update public.orders
  set metadata = v_order_metadata, updated_at = v_now
  where id = v_order.id
  returning * into v_order;

  update public.payments
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'completionStatus', 'requested',
        'completionRequestedAt', v_order_metadata ->> 'completionRequestedAt',
        'completionRequestedBy', p_actor_id,
        'completionNote', v_order_metadata ->> 'completionNote',
        'sandbox', true
      ),
      updated_at = v_now
  where id = v_payment.id
  returning * into v_payment;

  v_message_metadata := coalesce(v_message.metadata, '{}'::jsonb) || jsonb_build_object(
    'completionStatus', 'requested',
    'completionRequestedAt', v_order_metadata ->> 'completionRequestedAt',
    'completionRequestedBy', p_actor_id,
    'completionNote', v_order_metadata ->> 'completionNote',
    'updatedAt', v_now
  );
  update public.messages
  set metadata = v_message_metadata
  where id = v_message.id
  returning * into v_message;

  v_conversation_metadata := coalesce(v_conversation.metadata, '{}'::jsonb) || jsonb_build_object(
    'completionStatus', 'requested',
    'completionRequestedAt', v_order_metadata ->> 'completionRequestedAt',
    'completionRequestedBy', p_actor_id,
    'completionNote', v_order_metadata ->> 'completionNote',
    'updatedAt', v_now
  );
  v_conversation_metadata := jsonb_set(
    v_conversation_metadata,
    '{order}',
    coalesce(v_conversation_metadata -> 'order', '{}'::jsonb) || v_order_metadata,
    true
  );
  update public.conversations
  set metadata = v_conversation_metadata, last_message_at = v_now, updated_at = v_now
  where id = v_conversation.id
  returning * into v_conversation;

  select public.create_transaction_notification(
    p_external_id := 'notif_' || replace(gen_random_uuid()::text, '-', ''),
    p_recipient_id := v_order.client_id,
    p_type := 'completion_requested',
    p_category := 'orders',
    p_title := 'Confirme a conclusão do serviço',
    p_body := 'O profissional informou que o serviço foi concluído.',
    p_event_key := 'sandbox_completion_requested:' || v_order.id::text,
    p_target_url := 'pedidos.html?orderId=' || coalesce(v_order.external_id, v_order.id::text),
    p_action_label := 'Confirmar conclusão',
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_conversation_external_id := coalesce(v_conversation.external_id, v_conversation.id::text),
    p_service_external_id := null,
    p_data := jsonb_build_object('paymentId', coalesce(v_payment.external_id, v_payment.id::text), 'sandbox', true)
  ) into v_notification;

  return jsonb_build_object(
    'updated', true,
    'action', 'request_completion',
    'order', to_jsonb(v_order),
    'conversation', to_jsonb(v_conversation),
    'message', to_jsonb(v_message),
    'payment', to_jsonb(v_payment),
    'notification', to_jsonb(v_notification),
    'sandbox', true,
    'authority', 'staging_sandbox'
  );
end;
$function$;

revoke all on function private.finance_sandbox_request_completion(uuid, jsonb)
  from public, anon, authenticated, service_role;
