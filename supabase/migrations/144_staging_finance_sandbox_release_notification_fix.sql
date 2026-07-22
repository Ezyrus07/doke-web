-- Patch: capture composite notification rows as JSON instead of assigning them to a row variable.
-- Staging-only completion confirmation and escrow release authority.

create or replace function private.finance_sandbox_release_payment(
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
  v_transaction public.transactions%rowtype;
  v_receivable public.wallet_receivables%rowtype;
  v_wallet public.wallets%rowtype;
  v_notification jsonb := '{}'::jsonb;
  v_finance_result jsonb;
  v_now timestamptz;
  v_order_metadata jsonb;
  v_message_metadata jsonb;
  v_conversation_metadata jsonb;
begin
  v_actor_role := private.finance_sandbox_set_actor(p_actor_id);
  if v_actor_role <> 'client' then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED';
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

  if p_actor_id <> v_order.client_id then
    raise exception using errcode = '42501', message = 'DOKE_FINANCE_SANDBOX_CLIENT_REQUIRED';
  end if;

  select row_value.* into v_payment
  from public.payments row_value
  where row_value.order_id = v_order.id
    and row_value.status in ('held', 'processing', 'released')
  order by row_value.created_at desc
  limit 1
  for update;

  select row_value.* into v_transaction
  from public.transactions row_value
  where row_value.order_id = v_order.id
    and row_value.payment_id = v_payment.id
  order by row_value.created_at desc
  limit 1
  for update;

  if v_order.status = 'completed'
     and coalesce(v_order.metadata ->> 'paymentStatus', '') = 'released'
     and v_payment.status = 'released'
     and v_transaction.status = 'available' then
    select row_value.* into v_receivable
    from public.wallet_receivables row_value
    where row_value.transaction_id = v_transaction.id
    limit 1;

    select row_value.* into v_wallet
    from public.wallets row_value
    where row_value.user_id = v_order.professional_id;

    return jsonb_build_object(
      'updated', false,
      'action', 'release_payment',
      'order', to_jsonb(v_order),
      'conversation', to_jsonb(v_conversation),
      'message', to_jsonb(v_message),
      'payment', to_jsonb(v_payment),
      'transaction', to_jsonb(v_transaction),
      'receivable', to_jsonb(v_receivable),
      'wallet', to_jsonb(v_wallet),
      'sandbox', true,
      'authority', 'staging_sandbox'
    );
  end if;

  if v_order.status <> 'in_progress'
     or coalesce(v_order.metadata ->> 'completionStatus', '') <> 'requested' then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_COMPLETION_NOT_REQUESTED';
  end if;
  if v_payment.id is null or v_transaction.id is null then
    raise exception using errcode = '23503', message = 'DOKE_FINANCE_SANDBOX_ESCROW_NOT_FOUND';
  end if;

  v_finance_result := public.release_order_receivable(
    p_transaction_external_id := coalesce(v_transaction.external_id, v_transaction.id::text),
    p_payment_external_id := coalesce(v_payment.external_id, v_payment.id::text),
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_released_at := now()
  );

  select row_value.* into v_payment
  from public.payments row_value
  where row_value.id = v_payment.id;

  select row_value.* into v_transaction
  from public.transactions row_value
  where row_value.id = v_transaction.id;

  select row_value.* into v_receivable
  from public.wallet_receivables row_value
  where row_value.transaction_id = v_transaction.id
  limit 1;

  select row_value.* into v_wallet
  from public.wallets row_value
  where row_value.user_id = v_order.professional_id;

  v_now := coalesce(v_payment.released_at, now());
  perform set_config('doke.order_transition_action', 'complete', true);
  perform set_config('doke.order_transition_note', 'Staging sandbox payment released.', true);

  v_order_metadata := coalesce(v_order.metadata, '{}'::jsonb) || jsonb_build_object(
    'paymentStatus', 'released',
    'escrowStatus', 'released',
    'completionStatus', 'confirmed',
    'completionConfirmedAt', v_now,
    'completionConfirmedBy', p_actor_id,
    'paymentReleasedAt', v_now,
    'paymentReleasedBy', p_actor_id,
    'walletTransactionId', coalesce(v_transaction.external_id, v_transaction.id::text),
    'detailFlow', 'Pedido concluído no staging. O pagamento sandbox foi liberado ao profissional.',
    'nextAction', 'Avaliar atendimento',
    'financialAuthority', 'staging_sandbox',
    'updatedAt', v_now
  );
  update public.orders
  set status = 'completed', metadata = v_order_metadata, updated_at = v_now
  where id = v_order.id
  returning * into v_order;

  update public.payments
  set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'completionStatus', 'confirmed',
        'completionConfirmedAt', v_now,
        'completionConfirmedBy', p_actor_id,
        'sandbox', true
      ),
      updated_at = v_now
  where id = v_payment.id
  returning * into v_payment;

  v_message_metadata := coalesce(v_message.metadata, '{}'::jsonb) || jsonb_build_object(
    'paid', true,
    'completed', true,
    'paymentStatus', 'released',
    'escrowStatus', 'released',
    'chargeStatus', 'completed',
    'completionStatus', 'confirmed',
    'completionConfirmedAt', v_now,
    'completionConfirmedBy', p_actor_id,
    'releasedAt', v_now,
    'walletTransactionId', coalesce(v_transaction.external_id, v_transaction.id::text),
    'updatedAt', v_now
  );
  update public.messages
  set metadata = v_message_metadata
  where id = v_message.id
  returning * into v_message;

  v_conversation_metadata := coalesce(v_conversation.metadata, '{}'::jsonb) || jsonb_build_object(
    'status', 'completed',
    'statusLabel', 'Concluído',
    'paymentStatus', 'released',
    'escrowStatus', 'released',
    'completionStatus', 'confirmed',
    'completionConfirmedAt', v_now,
    'lastSeen', 'Pedido concluído',
    'lastMessage', 'Conclusão confirmada e pagamento sandbox liberado.',
    'updatedAt', v_now
  );
  v_conversation_metadata := jsonb_set(
    v_conversation_metadata,
    '{order}',
    coalesce(v_conversation_metadata -> 'order', '{}'::jsonb)
      || v_order_metadata
      || jsonb_build_object('status', 'completed', 'statusLabel', 'Concluído'),
    true
  );
  update public.conversations
  set metadata = v_conversation_metadata, last_message_at = v_now, updated_at = v_now
  where id = v_conversation.id
  returning * into v_conversation;

  select to_jsonb(public.create_transaction_notification(
    p_external_id := 'notif_' || replace(gen_random_uuid()::text, '-', ''),
    p_recipient_id := v_order.professional_id,
    p_type := 'payment_released',
    p_category := 'payments',
    p_title := 'Pagamento liberado',
    p_body := 'O cliente confirmou a conclusão e o pagamento sandbox foi liberado.',
    p_event_key := 'sandbox_payment_released:' || v_payment.id::text,
    p_target_url := 'carteira.html',
    p_action_label := 'Ver carteira',
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_conversation_external_id := coalesce(v_conversation.external_id, v_conversation.id::text),
    p_service_external_id := null,
    p_data := jsonb_build_object('paymentId', coalesce(v_payment.external_id, v_payment.id::text), 'sandbox', true)
  )) into v_notification;

  return jsonb_build_object(
    'updated', true,
    'action', 'release_payment',
    'order', to_jsonb(v_order),
    'conversation', to_jsonb(v_conversation),
    'message', to_jsonb(v_message),
    'payment', to_jsonb(v_payment),
    'transaction', to_jsonb(v_transaction),
    'receivable', to_jsonb(v_receivable),
    'wallet', to_jsonb(v_wallet),
    'notification', v_notification,
    'sandbox', true,
    'authority', 'staging_sandbox'
  );
end;
$function$;

revoke all on function private.finance_sandbox_release_payment(uuid, jsonb)
  from public, anon, authenticated, service_role;
