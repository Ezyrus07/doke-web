-- Doke staging finance sandbox validation.
-- Runs the full financial lifecycle in one transaction and always rolls back.
-- Expected result: one JSON row with passed=true and assertions=15.

begin;
create temp table doke_finance_canary(result jsonb) on commit drop;

do $canary$
declare
  v_client uuid := 'd1370000-0000-4000-8000-000000000001';
  v_professional uuid := 'd1370000-0000-4000-8000-000000000002';
  v_order uuid := 'd1370000-0000-4000-8000-000000000003';
  v_conversation uuid := 'd1370000-0000-4000-8000-000000000004';
  v_message uuid := 'd1370000-0000-4000-8000-000000000005';
  v_hold jsonb;
  v_request jsonb;
  v_payment public.payments%rowtype;
  v_transaction public.transactions%rowtype;
  v_receivable public.wallet_receivables%rowtype;
  v_wallet public.wallets%rowtype;
  v_order_row public.orders%rowtype;
  v_notifications integer;
begin
  insert into auth.users(id, email, raw_user_meta_data, created_at, updated_at)
  values
    (v_client, 'doke.finance.canary.client@example.com', '{"name":"Finance Canary Client"}'::jsonb, now(), now()),
    (v_professional, 'doke.finance.canary.professional@example.com', '{"name":"Finance Canary Professional"}'::jsonb, now(), now())
  on conflict (id) do nothing;

  insert into public.users(id, email, role, status, onboarding_status, settings)
  values
    (v_client, 'doke.finance.canary.client@example.com', 'client', 'active', 'completed', '{}'::jsonb),
    (v_professional, 'doke.finance.canary.professional@example.com', 'professional', 'active', 'completed', '{}'::jsonb)
  on conflict (id) do update
  set role=excluded.role, status='active', onboarding_status='completed';

  insert into public.orders(id, external_id, client_id, professional_id, title, status, metadata)
  values (
    v_order,
    'finance_canary_order_137',
    v_client,
    v_professional,
    'Finance sandbox canary',
    'in_progress',
    jsonb_build_object(
      'proposalApprovedAt', now(),
      'proposalAmount', '100,00',
      'chargeMessageId', 'finance_canary_charge_137'
    )
  );

  insert into public.conversations(id, external_id, order_id, client_id, professional_id, status, metadata)
  values (
    v_conversation,
    'finance_canary_conversation_137',
    v_order,
    v_client,
    v_professional,
    'active',
    jsonb_build_object('order', jsonb_build_object('id', 'finance_canary_order_137'))
  );

  insert into public.messages(id, external_id, conversation_id, sender_id, body, message_type, status, metadata)
  values (
    v_message,
    'finance_canary_charge_137',
    v_conversation,
    v_professional,
    'Cobrança sandbox',
    'charge',
    'sent',
    jsonb_build_object('type','charge','financialKind','charge','amount','100,00')
  );

  v_hold := public.execute_staging_finance_sandbox_internal(
    v_client,
    'hold_payment',
    jsonb_build_object(
      'orderId','finance_canary_order_137',
      'conversationId','finance_canary_conversation_137',
      'messageId','finance_canary_charge_137',
      'grossAmountCents',10000,
      'chargedAmountCents',9500,
      'discountAmountCents',500,
      'method','sandbox_pix',
      'paymentId','finance_canary_payment_137',
      'eventKey','finance_canary_payment_event_137',
      'transactionId','finance_canary_transaction_137'
    )
  );

  select * into v_payment from public.payments where external_id='finance_canary_payment_137';
  select * into v_transaction from public.transactions where external_id='finance_canary_transaction_137';
  select * into v_receivable from public.wallet_receivables where transaction_id=v_transaction.id;
  select * into v_wallet from public.wallets where user_id=v_professional;

  if v_payment.status <> 'held'
     or v_transaction.status <> 'held'
     or v_receivable.status <> 'pending'
     or v_wallet.pending_cents <> 9500
     or v_wallet.balance_cents <> 0 then
    raise exception 'DOKE_CANARY_HOLD_FAILED';
  end if;

  v_request := public.execute_staging_finance_sandbox_internal(
    v_professional,
    'request_completion',
    jsonb_build_object(
      'orderId','finance_canary_order_137',
      'conversationId','finance_canary_conversation_137',
      'messageId','finance_canary_charge_137',
      'note','Serviço concluído no canário.'
    )
  );

  select * into v_order_row from public.orders where id=v_order;
  if v_order_row.metadata ->> 'completionStatus' <> 'requested' then
    raise exception 'DOKE_CANARY_COMPLETION_REQUEST_FAILED';
  end if;

  perform public.execute_staging_finance_sandbox_internal(
    v_client,
    'release_payment',
    jsonb_build_object(
      'orderId','finance_canary_order_137',
      'conversationId','finance_canary_conversation_137',
      'messageId','finance_canary_charge_137'
    )
  );

  select * into v_order_row from public.orders where id=v_order;
  select * into v_payment from public.payments where external_id='finance_canary_payment_137';
  select * into v_transaction from public.transactions where external_id='finance_canary_transaction_137';
  select * into v_receivable from public.wallet_receivables where transaction_id=v_transaction.id;
  select * into v_wallet from public.wallets where user_id=v_professional;
  select count(*) into v_notifications
  from public.notifications
  where event_key like 'sandbox_%' and order_id=v_order;

  if v_order_row.status <> 'completed'
     or v_order_row.metadata ->> 'paymentStatus' <> 'released'
     or v_payment.status <> 'released'
     or v_transaction.status <> 'available'
     or v_receivable.status <> 'available'
     or v_wallet.pending_cents <> 0
     or v_wallet.balance_cents <> 9500
     or v_notifications <> 3 then
    raise exception 'DOKE_CANARY_RELEASE_FAILED';
  end if;

  insert into doke_finance_canary(result)
  values (jsonb_build_object(
    'passed', true,
    'assertions', 15,
    'hold', jsonb_build_object(
      'paymentStatus', v_hold #>> '{payment,status}',
      'transactionStatus', v_hold #>> '{transaction,status}',
      'receivableStatus', v_hold #>> '{receivable,status}'
    ),
    'completion', jsonb_build_object(
      'requested', v_request #>> '{order,metadata,completionStatus}'
    ),
    'release', jsonb_build_object(
      'orderStatus', v_order_row.status,
      'paymentStatus', v_payment.status,
      'transactionStatus', v_transaction.status,
      'receivableStatus', v_receivable.status,
      'walletBalanceCents', v_wallet.balance_cents,
      'walletPendingCents', v_wallet.pending_cents,
      'notificationCount', v_notifications
    )
  ));
end;
$canary$;

select result from doke_finance_canary;
rollback;
