-- Doke SEC-001: support/admin financial decisions are service-role RPCs behind a JWT-protected Edge Function.

create or replace function public.resolve_wallet_withdrawal_internal(
  p_actor_id uuid,
  p_transaction_external_id text,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_action text := lower(trim(coalesce(p_action, '')));
  v_transaction public.transactions;
  v_withdrawal public.withdrawals;
  v_wallet public.wallets;
  v_now timestamptz := now();
begin
  perform private.require_active_financial_actor(p_actor_id, array['support', 'admin']::text[]);

  if v_action not in ('approve', 'approved', 'complete', 'completed', 'decline', 'declined', 'reject', 'rejected') then
    raise exception using errcode = '22023', message = 'DOKE_WITHDRAWAL_RESOLUTION_INVALID';
  end if;

  select * into v_transaction
  from public.transactions transaction_row
  where (transaction_row.external_id = p_transaction_external_id or transaction_row.id::text = p_transaction_external_id)
    and transaction_row.type = 'payout'
  limit 1
  for update;

  if v_transaction.id is null then
    raise exception using errcode = '23503', message = 'DOKE_WITHDRAWAL_TRANSACTION_NOT_FOUND';
  end if;

  select * into v_withdrawal
  from public.withdrawals withdrawal
  where withdrawal.transaction_id = v_transaction.id
  limit 1
  for update;

  select * into v_wallet
  from public.wallets wallet
  where wallet.user_id = v_transaction.wallet_user_id
  for update;

  if v_withdrawal.id is null or v_wallet.user_id is null then
    raise exception using errcode = '23503', message = 'DOKE_WITHDRAWAL_STATE_NOT_FOUND';
  end if;

  if v_transaction.status <> 'processing' then
    return jsonb_build_object(
      'updated', false,
      'action', v_transaction.status,
      'transaction', to_jsonb(v_transaction),
      'withdrawal', to_jsonb(v_withdrawal),
      'wallet', to_jsonb(v_wallet)
    );
  end if;

  if v_action in ('decline', 'declined', 'reject', 'rejected') then
    update public.wallets
    set balance_cents = balance_cents + v_transaction.net_amount_cents,
        updated_at = v_now
    where user_id = v_transaction.wallet_user_id
    returning * into v_wallet;

    update public.transactions
    set status = 'declined',
        release_status = 'recusado',
        completed_at = v_now,
        metadata = metadata || jsonb_build_object('adminReason', left(coalesce(p_reason, ''), 500), 'resolvedBy', p_actor_id),
        updated_at = v_now
    where id = v_transaction.id
    returning * into v_transaction;

    update public.withdrawals
    set status = 'declined',
        decided_by = p_actor_id,
        decided_at = v_now,
        reason = left(p_reason, 500),
        updated_at = v_now
    where id = v_withdrawal.id
    returning * into v_withdrawal;
  else
    update public.transactions
    set status = 'completed',
        release_status = 'concluido',
        completed_at = v_now,
        metadata = metadata || jsonb_build_object('resolvedBy', p_actor_id),
        updated_at = v_now
    where id = v_transaction.id
    returning * into v_transaction;

    update public.withdrawals
    set status = 'completed',
        decided_by = p_actor_id,
        decided_at = v_now,
        reason = left(p_reason, 500),
        updated_at = v_now
    where id = v_withdrawal.id
    returning * into v_withdrawal;
  end if;

  insert into public.admin_audit_events(actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (
    p_actor_id,
    (select role from public.users where id = p_actor_id),
    case when v_transaction.status = 'declined' then 'decline_withdrawal' else 'complete_withdrawal' end,
    'withdrawal',
    v_withdrawal.id,
    jsonb_build_object('reason', left(coalesce(p_reason, ''), 500), 'transactionExternalId', v_transaction.external_id)
  );

  return jsonb_build_object(
    'updated', true,
    'action', v_transaction.status,
    'transaction', to_jsonb(v_transaction),
    'withdrawal', to_jsonb(v_withdrawal),
    'wallet', to_jsonb(v_wallet)
  );
end;
$$;

create or replace function public.resolve_wallet_dispute_internal(
  p_actor_id uuid,
  p_dispute_external_id text,
  p_resolution text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_resolution text := lower(trim(coalesce(p_resolution, '')));
  v_dispute public.payment_disputes;
  v_transaction public.transactions;
  v_payment public.payments;
  v_wallet public.wallets;
  v_now timestamptz := now();
begin
  perform private.require_active_financial_actor(p_actor_id, array['support', 'admin']::text[]);

  if v_resolution not in ('cliente', 'client', 'refund', 'refunded', 'profissional', 'professional', 'release', 'released') then
    raise exception using errcode = '22023', message = 'DOKE_DISPUTE_RESOLUTION_INVALID';
  end if;

  select * into v_dispute
  from public.payment_disputes dispute
  where dispute.external_id = p_dispute_external_id
     or dispute.id::text = p_dispute_external_id
  limit 1
  for update;

  if v_dispute.id is null then
    raise exception using errcode = '23503', message = 'DOKE_DISPUTE_NOT_FOUND';
  end if;

  select * into v_transaction from public.transactions where id = v_dispute.transaction_id limit 1 for update;
  select * into v_payment from public.payments where id = v_dispute.payment_id limit 1 for update;
  select * into v_wallet from public.wallets where user_id = v_dispute.professional_id limit 1 for update;

  if v_transaction.id is null or v_payment.id is null or v_wallet.user_id is null then
    raise exception using errcode = '23503', message = 'DOKE_DISPUTE_FINANCIAL_STATE_NOT_FOUND';
  end if;

  if v_dispute.status in ('released', 'refunded', 'cancelled') then
    return jsonb_build_object(
      'updated', false,
      'resolution', v_dispute.resolution,
      'dispute', to_jsonb(v_dispute),
      'transaction', to_jsonb(v_transaction),
      'payment', to_jsonb(v_payment),
      'wallet', to_jsonb(v_wallet)
    );
  end if;

  if v_resolution in ('cliente', 'client', 'refund', 'refunded') then
    update public.wallets
    set pending_cents = greatest(0, pending_cents - v_transaction.net_amount_cents),
        updated_at = v_now
    where user_id = v_dispute.professional_id
    returning * into v_wallet;

    update public.transactions
    set type = 'refund',
        status = 'refunded',
        release_status = 'reembolsado',
        amount_cents = -abs(net_amount_cents),
        completed_at = v_now,
        updated_at = v_now
    where id = v_transaction.id
    returning * into v_transaction;

    update public.wallet_receivables
    set status = 'refunded', updated_at = v_now
    where transaction_id = v_transaction.id;

    update public.payments
    set status = 'refunded', escrow_status = 'refunded', refunded_at = v_now, updated_at = v_now
    where id = v_payment.id
    returning * into v_payment;

    update public.payment_disputes
    set status = 'refunded', resolution = 'refund_client', resolved_by = p_actor_id, resolved_at = v_now, updated_at = v_now
    where id = v_dispute.id
    returning * into v_dispute;

    insert into public.dispute_events(dispute_id, actor_id, event_type, note)
    values (v_dispute.id, p_actor_id, 'refunded', left(p_reason, 500));
  else
    update public.wallets
    set pending_cents = greatest(0, pending_cents - v_transaction.net_amount_cents),
        balance_cents = balance_cents + v_transaction.net_amount_cents,
        updated_at = v_now
    where user_id = v_dispute.professional_id
    returning * into v_wallet;

    update public.transactions
    set status = 'available', release_status = 'liberado', available_at = v_now, updated_at = v_now
    where id = v_transaction.id
    returning * into v_transaction;

    update public.wallet_receivables
    set status = 'available', release_at = v_now, updated_at = v_now
    where transaction_id = v_transaction.id;

    update public.payments
    set status = 'released', escrow_status = 'released', released_at = v_now, updated_at = v_now
    where id = v_payment.id
    returning * into v_payment;

    update public.payment_disputes
    set status = 'released', resolution = 'release_professional', resolved_by = p_actor_id, resolved_at = v_now, updated_at = v_now
    where id = v_dispute.id
    returning * into v_dispute;

    insert into public.dispute_events(dispute_id, actor_id, event_type, note)
    values (v_dispute.id, p_actor_id, 'released', left(p_reason, 500));
  end if;

  insert into public.admin_audit_events(actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (
    p_actor_id,
    (select role from public.users where id = p_actor_id),
    'resolve_dispute',
    'payment_dispute',
    v_dispute.id,
    jsonb_build_object('resolution', v_resolution, 'reason', left(coalesce(p_reason, ''), 500))
  );

  return jsonb_build_object(
    'updated', true,
    'resolution', v_resolution,
    'dispute', to_jsonb(v_dispute),
    'transaction', to_jsonb(v_transaction),
    'payment', to_jsonb(v_payment),
    'wallet', to_jsonb(v_wallet)
  );
end;
$$;

revoke all on function public.resolve_wallet_withdrawal_internal(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_dispute_internal(uuid, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.resolve_wallet_withdrawal_internal(uuid, text, text, text) to service_role;
grant execute on function public.resolve_wallet_dispute_internal(uuid, text, text, text) to service_role;

comment on function public.resolve_wallet_withdrawal_internal(uuid, text, text, text) is
  'Service-role-only support/admin withdrawal decision. Caller identity is revalidated against public.users.';
comment on function public.resolve_wallet_dispute_internal(uuid, text, text, text) is
  'Service-role-only support/admin dispute decision. Caller identity is revalidated against public.users.';
