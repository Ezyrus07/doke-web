-- Doke SEC-001: exact financial RPC authority.
-- User-owned operations remain authenticated. Monetary materialization and legacy idempotency RPCs are removed from the Data API.

create or replace function private.require_active_financial_actor(
  p_actor_id uuid,
  p_allowed_roles text[]
)
returns text
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
begin
  if p_actor_id is null then
    raise exception using errcode = '42501', message = 'DOKE_FINANCIAL_AUTH_REQUIRED';
  end if;

  select account.role
    into v_role
  from public.users account
  where account.id = p_actor_id
    and account.status = 'active';

  if v_role is null or not (v_role = any(coalesce(p_allowed_roles, array[]::text[]))) then
    raise exception using errcode = '42501', message = 'DOKE_FINANCIAL_ROLE_REQUIRED';
  end if;

  return v_role;
end;
$$;

create or replace function private.normalize_financial_metadata(p_metadata jsonb)
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'source', nullif(left(trim(coalesce(p_metadata ->> 'source', '')), 64), ''),
    'clientRequestId', nullif(left(trim(coalesce(p_metadata ->> 'clientRequestId', '')), 120), ''),
    'locale', nullif(left(trim(coalesce(p_metadata ->> 'locale', '')), 20), '')
  ))
$$;

create or replace function public.save_wallet_bank_account(
  p_account_holder text,
  p_document text default null,
  p_bank_name text default null,
  p_bank_code text default null,
  p_branch text default null,
  p_account_number text default null,
  p_account_type text default 'checking',
  p_pix_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns public.wallet_bank_accounts
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_account public.wallet_bank_accounts;
  v_account_type text := lower(trim(coalesce(p_account_type, 'checking')));
begin
  perform private.require_active_financial_actor(v_actor, array['professional']::text[]);

  if nullif(trim(coalesce(p_account_holder, '')), '') is null
     or length(trim(p_account_holder)) > 160 then
    raise exception using errcode = '22023', message = 'DOKE_BANK_ACCOUNT_HOLDER_INVALID';
  end if;
  if length(trim(coalesce(p_document, ''))) > 32
     or length(trim(coalesce(p_bank_name, ''))) > 120
     or length(trim(coalesce(p_bank_code, ''))) > 20
     or length(trim(coalesce(p_branch, ''))) > 30
     or length(trim(coalesce(p_account_number, ''))) > 40
     or length(trim(coalesce(p_pix_key, ''))) > 200 then
    raise exception using errcode = '22023', message = 'DOKE_BANK_ACCOUNT_FIELD_INVALID';
  end if;
  if v_account_type not in ('checking', 'savings', 'payment') then
    raise exception using errcode = '22023', message = 'DOKE_BANK_ACCOUNT_TYPE_INVALID';
  end if;

  insert into public.wallets(user_id, balance_cents, pending_cents, currency, updated_at)
  values (v_actor, 0, 0, 'BRL', now())
  on conflict (user_id) do nothing;

  insert into public.wallet_bank_accounts (
    user_id, account_holder, document, bank_name, bank_code, branch,
    account_number, account_type, pix_key, status, metadata, created_at, updated_at
  ) values (
    v_actor,
    trim(p_account_holder),
    nullif(trim(coalesce(p_document, '')), ''),
    nullif(trim(coalesce(p_bank_name, '')), ''),
    nullif(trim(coalesce(p_bank_code, '')), ''),
    nullif(trim(coalesce(p_branch, '')), ''),
    nullif(trim(coalesce(p_account_number, '')), ''),
    v_account_type,
    nullif(trim(coalesce(p_pix_key, '')), ''),
    'pending',
    private.normalize_financial_metadata(coalesce(p_metadata, '{}'::jsonb)),
    now(),
    now()
  )
  on conflict (user_id) do update set
    account_holder = excluded.account_holder,
    document = excluded.document,
    bank_name = excluded.bank_name,
    bank_code = excluded.bank_code,
    branch = excluded.branch,
    account_number = excluded.account_number,
    account_type = excluded.account_type,
    pix_key = excluded.pix_key,
    metadata = excluded.metadata,
    status = case when public.wallet_bank_accounts.status = 'verified' then 'verified' else 'pending' end,
    updated_at = now()
  returning * into v_account;

  return v_account;
end;
$$;

create or replace function public.request_wallet_withdrawal(
  p_external_id text,
  p_event_key text,
  p_amount_cents integer,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_wallet public.wallets;
  v_account public.wallet_bank_accounts;
  v_withdrawal public.withdrawals;
  v_transaction public.transactions;
  v_external_id text := left(trim(coalesce(p_external_id, '')), 180);
  v_event_key text := left(trim(coalesce(p_event_key, '')), 240);
begin
  perform private.require_active_financial_actor(v_actor, array['professional']::text[]);

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception using errcode = '22023', message = 'DOKE_WITHDRAWAL_AMOUNT_INVALID';
  end if;
  if v_external_id = '' or v_event_key = '' then
    raise exception using errcode = '22023', message = 'DOKE_WITHDRAWAL_IDEMPOTENCY_REQUIRED';
  end if;

  select * into v_wallet
  from public.wallets wallet
  where wallet.user_id = v_actor
  for update;

  if v_wallet.user_id is null or v_wallet.balance_cents < p_amount_cents then
    raise exception using errcode = '22003', message = 'DOKE_WITHDRAWAL_BALANCE_INSUFFICIENT';
  end if;

  select * into v_account
  from public.wallet_bank_accounts account
  where account.user_id = v_actor
  limit 1;

  if v_account.user_id is null then
    raise exception using errcode = '23503', message = 'DOKE_WITHDRAWAL_BANK_ACCOUNT_REQUIRED';
  end if;

  select * into v_withdrawal
  from public.withdrawals withdrawal
  where withdrawal.wallet_user_id = v_actor
    and (withdrawal.event_key = v_event_key or withdrawal.external_id = v_external_id)
  limit 1
  for update;

  if v_withdrawal.id is not null then
    if v_withdrawal.amount_cents <> p_amount_cents then
      raise exception using errcode = '23505', message = 'DOKE_WITHDRAWAL_IDEMPOTENCY_CONFLICT';
    end if;
    select * into v_transaction from public.transactions where id = v_withdrawal.transaction_id;
    return jsonb_build_object(
      'created', false,
      'withdrawal', to_jsonb(v_withdrawal),
      'transaction', to_jsonb(v_transaction),
      'account', to_jsonb(v_account),
      'wallet', to_jsonb(v_wallet)
    );
  end if;

  update public.wallets
  set balance_cents = balance_cents - p_amount_cents,
      updated_at = now()
  where user_id = v_actor
  returning * into v_wallet;

  insert into public.transactions (
    wallet_user_id, type, amount_cents, currency, status, external_id, event_key,
    professional_id, gross_amount_cents, fee_amount_cents, net_amount_cents,
    release_status, metadata, updated_at
  ) values (
    v_actor, 'payout', p_amount_cents, v_wallet.currency, 'processing',
    v_external_id, v_event_key, v_actor, p_amount_cents, 0, p_amount_cents,
    'processando', private.normalize_financial_metadata(coalesce(p_metadata, '{}'::jsonb)), now()
  ) returning * into v_transaction;

  insert into public.withdrawals (
    external_id, event_key, wallet_user_id, amount_cents, currency, status,
    bank_account_snapshot, requested_by, transaction_id, metadata, created_at, updated_at
  ) values (
    'withdrawal_' || replace(gen_random_uuid()::text, '-', ''),
    v_event_key, v_actor, p_amount_cents, v_wallet.currency, 'processing',
    to_jsonb(v_account), v_actor, v_transaction.id,
    private.normalize_financial_metadata(coalesce(p_metadata, '{}'::jsonb)), now(), now()
  ) returning * into v_withdrawal;

  return jsonb_build_object(
    'created', true,
    'withdrawal', to_jsonb(v_withdrawal),
    'transaction', to_jsonb(v_transaction),
    'account', to_jsonb(v_account),
    'wallet', to_jsonb(v_wallet)
  );
end;
$$;

create or replace function public.open_wallet_dispute(
  p_external_id text,
  p_event_key text,
  p_order_external_id text,
  p_payment_external_id text,
  p_transaction_external_id text,
  p_reason text,
  p_reason_code text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_payment public.payments;
  v_transaction public.transactions;
  v_dispute public.payment_disputes;
  v_reason text := left(trim(coalesce(p_reason, '')), 120);
begin
  perform private.require_active_financial_actor(v_actor, array['client']::text[]);

  select * into v_order
  from public.orders order_row
  where order_row.external_id = p_order_external_id
     or order_row.id::text = p_order_external_id
  limit 1;

  if v_order.id is null or v_actor <> v_order.client_id then
    raise exception using errcode = '42501', message = 'DOKE_DISPUTE_CLIENT_REQUIRED';
  end if;
  if v_reason = '' then
    raise exception using errcode = '22023', message = 'DOKE_DISPUTE_REASON_REQUIRED';
  end if;

  select * into v_payment
  from public.payments payment
  where (payment.external_id = p_payment_external_id or payment.id::text = p_payment_external_id)
    and payment.order_id = v_order.id
  limit 1
  for update;

  select * into v_transaction
  from public.transactions transaction_row
  where (transaction_row.external_id = p_transaction_external_id or transaction_row.id::text = p_transaction_external_id)
    and transaction_row.order_id = v_order.id
    and transaction_row.payment_id = v_payment.id
  limit 1
  for update;

  if v_payment.id is null or v_transaction.id is null or v_transaction.status not in ('held', 'pending') then
    raise exception using errcode = '23503', message = 'DOKE_DISPUTE_ESCROW_NOT_FOUND';
  end if;

  select * into v_dispute
  from public.payment_disputes dispute
  where dispute.order_id = v_order.id
    and dispute.status in ('open', 'responded', 'under_review')
  limit 1;

  if v_dispute.id is not null then
    return jsonb_build_object('created', false, 'dispute', to_jsonb(v_dispute), 'transaction', to_jsonb(v_transaction));
  end if;

  insert into public.payment_disputes (
    external_id, event_key, order_id, transaction_id, payment_id, client_id,
    professional_id, opened_by, reason, description, status, metadata, created_at, updated_at
  ) values (
    coalesce(nullif(left(trim(coalesce(p_external_id, '')), 180), ''), 'wallet_dispute_' || replace(gen_random_uuid()::text, '-', '')),
    coalesce(nullif(left(trim(coalesce(p_event_key, '')), 240), ''), 'wallet_dispute:' || v_order.id::text),
    v_order.id, v_transaction.id, v_payment.id, v_order.client_id,
    v_order.professional_id, v_actor, v_reason,
    nullif(left(trim(coalesce(p_reason_code, '')), 80), ''), 'open',
    private.normalize_financial_metadata(coalesce(p_metadata, '{}'::jsonb)), now(), now()
  ) returning * into v_dispute;

  update public.transactions
  set release_status = 'contestacao',
      metadata = metadata || jsonb_build_object('disputeId', v_dispute.external_id, 'disputeStatus', 'contestacao_aberta'),
      updated_at = now()
  where id = v_transaction.id
  returning * into v_transaction;

  update public.wallet_receivables
  set status = 'blocked',
      blocked_reason = v_reason,
      updated_at = now()
  where transaction_id = v_transaction.id;

  insert into public.dispute_events(dispute_id, actor_id, event_type, note, metadata)
  values (
    v_dispute.id, v_actor, 'opened', v_reason,
    private.normalize_financial_metadata(coalesce(p_metadata, '{}'::jsonb))
  );

  return jsonb_build_object('created', true, 'dispute', to_jsonb(v_dispute), 'transaction', to_jsonb(v_transaction));
end;
$$;

create or replace function public.respond_wallet_dispute(
  p_dispute_external_id text,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_dispute public.payment_disputes;
  v_response text := left(trim(coalesce(p_response, '')), 2000);
begin
  perform private.require_active_financial_actor(v_actor, array['professional']::text[]);

  if v_response = '' then
    raise exception using errcode = '22023', message = 'DOKE_DISPUTE_RESPONSE_REQUIRED';
  end if;

  select * into v_dispute
  from public.payment_disputes dispute
  where dispute.external_id = p_dispute_external_id
     or dispute.id::text = p_dispute_external_id
  limit 1
  for update;

  if v_dispute.id is null or v_actor <> v_dispute.professional_id then
    raise exception using errcode = '42501', message = 'DOKE_DISPUTE_PROFESSIONAL_REQUIRED';
  end if;
  if v_dispute.status not in ('open', 'responded', 'under_review') then
    return jsonb_build_object('updated', false, 'dispute', to_jsonb(v_dispute));
  end if;

  update public.payment_disputes
  set status = 'under_review',
      professional_response = v_response,
      response_at = now(),
      updated_at = now()
  where id = v_dispute.id
  returning * into v_dispute;

  insert into public.dispute_events(dispute_id, actor_id, event_type, note)
  values (v_dispute.id, v_actor, 'professional_responded', v_response);

  return jsonb_build_object('updated', true, 'dispute', to_jsonb(v_dispute));
end;
$$;

-- Remove every legacy RPC from inherited or direct browser execution first.
revoke all on function private.require_active_financial_actor(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function private.normalize_financial_metadata(jsonb) from public, anon, authenticated, service_role;

revoke all on function public.claim_idempotency_key(text, text, text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.complete_idempotency_key(text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.fail_idempotency_key(text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.finance_resolve_order(text) from public, anon, authenticated, service_role;
revoke all on function public.record_order_payment(text, text, text, text, text, integer, integer, integer, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.register_order_receivable(text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.release_order_receivable(text, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_withdrawal(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_dispute(text, text, text) from public, anon, authenticated, service_role;

revoke all on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.request_wallet_withdrawal(text, text, integer, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.respond_wallet_dispute(text, text) from public, anon, authenticated, service_role;

grant execute on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.request_wallet_withdrawal(text, text, integer, jsonb) to authenticated;
grant execute on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.respond_wallet_dispute(text, text) to authenticated;

-- Locked legacy functions retain owner-only execution and a safe lookup path.
alter function public.claim_idempotency_key(text, text, text, uuid, text) set search_path = pg_catalog;
alter function public.complete_idempotency_key(text, text, jsonb) set search_path = pg_catalog;
alter function public.fail_idempotency_key(text, text, jsonb) set search_path = pg_catalog;
alter function public.finance_resolve_order(text) set search_path = pg_catalog;
alter function public.record_order_payment(text, text, text, text, text, integer, integer, integer, text, text, jsonb) set search_path = pg_catalog;
alter function public.register_order_receivable(text, text, text, text, text, text, jsonb) set search_path = pg_catalog;
alter function public.release_order_receivable(text, text, text, timestamptz) set search_path = pg_catalog;
alter function public.resolve_wallet_withdrawal(text, text, text) set search_path = pg_catalog;
alter function public.resolve_wallet_dispute(text, text, text) set search_path = pg_catalog;

comment on function public.record_order_payment(text, text, text, text, text, integer, integer, integer, text, text, jsonb) is
  'Locked legacy RPC. Payment state must be materialized by a signed PSP webhook authority.';
comment on function public.register_order_receivable(text, text, text, text, text, text, jsonb) is
  'Locked legacy RPC. Receivables must be derived from provider-confirmed payment events.';
comment on function public.release_order_receivable(text, text, text, timestamptz) is
  'Locked legacy RPC. Escrow release requires server order/payment authority.';
comment on function public.claim_idempotency_key(text, text, text, uuid, text) is
  'Locked legacy RPC. The backend writes api_idempotency_keys with service_role directly.';
