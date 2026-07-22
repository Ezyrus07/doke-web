-- Patch: capture composite notification rows as JSON instead of assigning them to a row variable.
-- Staging-only payment hold and escrow materialization.

create or replace function private.finance_sandbox_hold_payment(
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
  v_gross_cents integer := coalesce(nullif(v_payload ->> 'grossAmountCents', '')::integer, 0);
  v_charged_cents integer := coalesce(nullif(v_payload ->> 'chargedAmountCents', '')::integer, 0);
  v_discount_cents integer := coalesce(nullif(v_payload ->> 'discountAmountCents', '')::integer, 0);
  v_expected_cents integer;
  v_payment_external_id text;
  v_payment_event_key text;
  v_transaction_external_id text;
  v_receivable_event_key text;
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
  if v_order.status <> 'in_progress' then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_ORDER_NOT_IN_PROGRESS';
  end if;
  if nullif(v_order.metadata ->> 'proposalApprovedAt', '') is null then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_PROPOSAL_REQUIRED';
  end if;
  if nullif(v_order.metadata ->> 'chargeMessageId', '') is not null
     and v_order.metadata ->> 'chargeMessageId' not in (v_message.external_id, v_message.id::text) then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_CHARGE_MISMATCH';
  end if;

  if v_gross_cents <= 0 or v_charged_cents <= 0 or v_discount_cents < 0
     or v_charged_cents + v_discount_cents <> v_gross_cents then
    raise exception using errcode = '22023', message = 'DOKE_FINANCE_SANDBOX_AMOUNT_INVALID';
  end if;

  v_expected_cents := private.finance_sandbox_amount_cents(
    coalesce(
      v_message.metadata ->> 'amount',
      v_order.metadata ->> 'chargeAmount',
      v_order.metadata ->> 'proposalAmount',
      v_order.metadata ->> 'budget'
    )
  );
  if v_expected_cents > 0 and v_expected_cents <> v_gross_cents then
    raise exception using errcode = '23514', message = 'DOKE_FINANCE_SANDBOX_AMOUNT_MISMATCH';
  end if;

  v_payment_external_id := coalesce(
    nullif(left(btrim(coalesce(v_payload ->> 'paymentId', '')), 180), ''),
    'sandbox_payment_' || replace(gen_random_uuid()::text, '-', '')
  );
  v_payment_event_key := coalesce(
    nullif(left(btrim(coalesce(v_payload ->> 'eventKey', '')), 240), ''),
    'sandbox_payment:' || v_order.id::text || ':' || v_message.id::text
  );
  v_transaction_external_id := coalesce(
    nullif(left(btrim(coalesce(v_payload ->> 'transactionId', '')), 180), ''),
    'sandbox_wallet_tx_' || replace(gen_random_uuid()::text, '-', '')
  );
  v_receivable_event_key := 'sandbox_receivable:' || v_payment_event_key;

  v_payment := public.record_order_payment(
    p_external_id := v_payment_external_id,
    p_event_key := v_payment_event_key,
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_conversation_external_id := coalesce(v_conversation.external_id, v_conversation.id::text),
    p_message_external_id := coalesce(v_message.external_id, v_message.id::text),
    p_gross_amount_cents := v_gross_cents,
    p_charged_amount_cents := v_charged_cents,
    p_discount_amount_cents := v_discount_cents,
    p_method := coalesce(nullif(left(btrim(coalesce(v_payload ->> 'method', '')), 40), ''), 'sandbox_pix'),
    p_status := 'held',
    p_metadata := jsonb_build_object(
      'authority', 'staging_sandbox',
      'sandbox', true,
      'actorId', p_actor_id,
      'chargeMessageId', coalesce(v_message.external_id, v_message.id::text)
    )
  );

  v_finance_result := public.register_order_receivable(
    p_external_id := v_transaction_external_id,
    p_event_key := v_receivable_event_key,
    p_payment_external_id := coalesce(v_payment.external_id, v_payment.id::text),
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_conversation_external_id := coalesce(v_conversation.external_id, v_conversation.id::text),
    p_message_external_id := coalesce(v_message.external_id, v_message.id::text),
    p_metadata := jsonb_build_object('authority', 'staging_sandbox', 'sandbox', true)
  );

  select row_value.* into v_transaction
  from public.transactions row_value
  where row_value.id = nullif(v_finance_result #>> '{transaction,id}', '')::uuid;

  select row_value.* into v_receivable
  from public.wallet_receivables row_value
  where row_value.id = nullif(v_finance_result #>> '{receivable,id}', '')::uuid;

  select row_value.* into v_wallet
  from public.wallets row_value
  where row_value.user_id = v_order.professional_id;

  v_now := coalesce(v_payment.held_at, now());
  v_order_metadata := coalesce(v_order.metadata, '{}'::jsonb) || jsonb_build_object(
    'paymentStatus', 'held',
    'escrowStatus', 'held',
    'paymentId', coalesce(v_payment.external_id, v_payment.id::text),
    'paymentMessageId', coalesce(v_message.external_id, v_message.id::text),
    'paymentAmount', v_charged_cents / 100.0,
    'paymentChargedAmount', v_charged_cents / 100.0,
    'paymentGrossAmount', v_gross_cents / 100.0,
    'paymentDiscountAmount', v_discount_cents / 100.0,
    'paymentMethod', v_payment.method,
    'paymentConfirmedAt', v_now,
    'paymentConfirmedBy', p_actor_id,
    'walletTransactionId', coalesce(v_transaction.external_id, v_transaction.id::text),
    'detailFlow', 'Pagamento sandbox confirmado e mantido em garantia no staging.',
    'nextAction', 'Acompanhar atendimento',
    'financialAuthority', 'staging_sandbox',
    'updatedAt', v_now
  );

  update public.orders
  set metadata = v_order_metadata, updated_at = v_now
  where id = v_order.id
  returning * into v_order;

  v_message_metadata := coalesce(v_message.metadata, '{}'::jsonb) || jsonb_build_object(
    'paid', true,
    'paymentStatus', 'held',
    'chargeStatus', 'paid',
    'escrowStatus', 'held',
    'paymentId', coalesce(v_payment.external_id, v_payment.id::text),
    'paymentMethod', v_payment.method,
    'paidAmount', v_charged_cents / 100.0,
    'grossAmount', v_gross_cents / 100.0,
    'discountAmount', v_discount_cents / 100.0,
    'paidAt', v_now,
    'financialAuthority', 'staging_sandbox',
    'updatedAt', v_now
  );
  update public.messages
  set metadata = v_message_metadata
  where id = v_message.id
  returning * into v_message;

  v_conversation_metadata := coalesce(v_conversation.metadata, '{}'::jsonb) || jsonb_build_object(
    'paymentStatus', 'held',
    'paymentConfirmed', true,
    'paymentMessageId', coalesce(v_message.external_id, v_message.id::text),
    'financialAuthority', 'staging_sandbox',
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

  select to_jsonb(public.create_transaction_notification(
    p_external_id := 'notif_' || replace(gen_random_uuid()::text, '-', ''),
    p_recipient_id := v_order.professional_id,
    p_type := 'payment_held',
    p_category := 'payments',
    p_title := 'Pagamento confirmado em garantia',
    p_body := 'O pagamento sandbox foi confirmado no staging e está em garantia.',
    p_event_key := 'sandbox_payment_held:' || v_payment.id::text,
    p_target_url := 'pedidos.html?orderId=' || coalesce(v_order.external_id, v_order.id::text),
    p_action_label := 'Ver pedido',
    p_order_external_id := coalesce(v_order.external_id, v_order.id::text),
    p_conversation_external_id := coalesce(v_conversation.external_id, v_conversation.id::text),
    p_service_external_id := null,
    p_data := jsonb_build_object('paymentId', coalesce(v_payment.external_id, v_payment.id::text), 'sandbox', true)
  )) into v_notification;

  return jsonb_build_object(
    'updated', true,
    'action', 'hold_payment',
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

revoke all on function private.finance_sandbox_hold_payment(uuid, jsonb)
  from public, anon, authenticated, service_role;
