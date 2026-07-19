-- Doke Stage 014: shared payments, escrow ledger and wallet runtime.
-- Apply after 009 services, 010 orders, 011 messages, 012 attachments and 013 notifications.
-- This migration provides the application ledger. It does not replace a regulated payment processor.

create extension if not exists pgcrypto;

-- Canonical payment intent / escrow projection shared by client and professional.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  external_id text not null,
  event_key text not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  conversation_id uuid references public.conversations(id) on delete set null,
  message_id uuid references public.messages(id) on delete set null,
  client_id uuid not null references public.users(id) on delete restrict,
  professional_id uuid not null references public.users(id) on delete restrict,
  gross_amount_cents int not null default 0 check (gross_amount_cents >= 0),
  charged_amount_cents int not null default 0 check (charged_amount_cents >= 0),
  discount_amount_cents int not null default 0 check (discount_amount_cents >= 0),
  platform_fee_cents int not null default 0 check (platform_fee_cents >= 0),
  net_amount_cents int not null default 0 check (net_amount_cents >= 0),
  currency text not null default 'BRL',
  method text,
  status text not null default 'processing'
    check (status in ('processing', 'held', 'released', 'refunded', 'failed', 'cancelled')),
  escrow_status text not null default 'processing'
    check (escrow_status in ('processing', 'held', 'released', 'refunded', 'failed', 'cancelled')),
  provider text,
  provider_reference text,
  metadata jsonb not null default '{}'::jsonb,
  held_at timestamptz,
  released_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (external_id),
  unique (event_key),
  check (client_id <> professional_id),
  check (charged_amount_cents <= gross_amount_cents),
  check (discount_amount_cents = gross_amount_cents - charged_amount_cents)
);

create index if not exists payments_order_created_idx
  on public.payments(order_id, created_at desc);
create index if not exists payments_participants_status_idx
  on public.payments(client_id, professional_id, status, updated_at desc);

-- Extend the existing wallet ledger so frontend-stable IDs and escrow metadata survive reloads.
alter table public.transactions
  add column if not exists external_id text,
  add column if not exists event_key text,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists professional_id uuid references public.users(id) on delete set null,
  add column if not exists client_id uuid references public.users(id) on delete set null,
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists gross_amount_cents int not null default 0,
  add column if not exists fee_amount_cents int not null default 0,
  add column if not exists net_amount_cents int not null default 0,
  add column if not exists release_status text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists available_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.transactions drop constraint if exists transactions_type_check;
alter table public.transactions
  add constraint transactions_type_check
  check (type in ('payment', 'platform_fee', 'payout', 'refund', 'adjustment'));

alter table public.transactions drop constraint if exists transactions_status_check;
alter table public.transactions
  add constraint transactions_status_check
  check (status in ('pending', 'processing', 'held', 'available', 'completed', 'succeeded', 'failed', 'cancelled', 'declined', 'refunded'));

create unique index if not exists transactions_external_id_unique
  on public.transactions(external_id) where external_id is not null;
create unique index if not exists transactions_event_key_unique
  on public.transactions(event_key) where event_key is not null and event_key <> '';
create index if not exists transactions_payment_idx
  on public.transactions(payment_id) where payment_id is not null;
create index if not exists transactions_professional_status_idx
  on public.transactions(wallet_user_id, status, created_at desc);

alter table public.wallet_receivables
  add column if not exists external_id text,
  add column if not exists event_key text,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists client_id uuid references public.users(id) on delete set null,
  add column if not exists gross_amount_cents int not null default 0,
  add column if not exists fee_amount_cents int not null default 0,
  add column if not exists net_amount_cents int not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists wallet_receivables_external_id_unique
  on public.wallet_receivables(external_id) where external_id is not null;
create unique index if not exists wallet_receivables_event_key_unique
  on public.wallet_receivables(event_key) where event_key is not null and event_key <> '';

alter table public.withdrawals
  add column if not exists external_id text,
  add column if not exists event_key text,
  add column if not exists transaction_id uuid references public.transactions(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists withdrawals_external_id_unique
  on public.withdrawals(external_id) where external_id is not null;
create unique index if not exists withdrawals_event_key_unique
  on public.withdrawals(event_key) where event_key is not null and event_key <> '';

alter table public.payment_disputes
  add column if not exists external_id text,
  add column if not exists event_key text,
  add column if not exists payment_id uuid references public.payments(id) on delete set null,
  add column if not exists conversation_id uuid references public.conversations(id) on delete set null,
  add column if not exists message_id uuid references public.messages(id) on delete set null,
  add column if not exists response_at timestamptz;

create unique index if not exists payment_disputes_external_id_unique
  on public.payment_disputes(external_id) where external_id is not null;
create unique index if not exists payment_disputes_event_key_unique
  on public.payment_disputes(event_key) where event_key is not null and event_key <> '';

alter table public.admin_audit_events
  add column if not exists external_id text;
create unique index if not exists admin_audit_events_external_id_unique
  on public.admin_audit_events(external_id) where external_id is not null;

alter table public.payments enable row level security;
alter table public.wallets enable row level security;
alter table public.transactions enable row level security;

-- Financial mutations are routed through guarded RPCs. Browser clients receive read-only tables.
drop policy if exists payments_participants_select on public.payments;
create policy payments_participants_select
  on public.payments for select to authenticated
  using (client_id = auth.uid() or professional_id = auth.uid() or public.is_support_or_admin());

drop policy if exists wallets_owner_select on public.wallets;
create policy wallets_owner_select
  on public.wallets for select to authenticated
  using (user_id = auth.uid() or public.is_support_or_admin());

drop policy if exists transactions_owner_select on public.transactions;
create policy transactions_owner_select
  on public.transactions for select to authenticated
  using (wallet_user_id = auth.uid() or public.is_support_or_admin());

revoke insert, update, delete on public.payments from authenticated;
revoke insert, update, delete on public.wallets from authenticated;
revoke insert, update, delete on public.transactions from authenticated;
grant select on public.payments, public.wallets, public.transactions to authenticated;

-- Remove legacy direct-write policies that could bypass atomic balance updates.
drop policy if exists "support manages receivables" on public.wallet_receivables;
drop policy if exists "wallet owner requests withdrawal" on public.withdrawals;
drop policy if exists "support resolves withdrawals" on public.withdrawals;
drop policy if exists "clients open own disputes" on public.payment_disputes;
drop policy if exists "professionals respond to disputes" on public.payment_disputes;
drop policy if exists "support resolves disputes" on public.payment_disputes;
drop policy if exists "participants create dispute events" on public.dispute_events;
drop policy if exists "support writes admin audit" on public.admin_audit_events;

revoke insert, update, delete on public.wallet_receivables from authenticated;
revoke insert, update, delete on public.withdrawals from authenticated;
revoke insert, update, delete on public.payment_disputes from authenticated;
revoke insert, update, delete on public.dispute_events from authenticated;
revoke insert, update, delete on public.admin_audit_events from authenticated;

-- Bank account rows remain owner-scoped. Verification is operational metadata until a payout provider is integrated.
drop policy if exists "wallet owner saves bank account" on public.wallet_bank_accounts;
drop policy if exists "wallet owner updates bank account" on public.wallet_bank_accounts;
drop policy if exists wallet_owner_inserts_bank_account on public.wallet_bank_accounts;
drop policy if exists wallet_owner_updates_bank_account on public.wallet_bank_accounts;
create policy wallet_owner_inserts_bank_account
  on public.wallet_bank_accounts for insert to authenticated
  with check (user_id = auth.uid());
create policy wallet_owner_updates_bank_account
  on public.wallet_bank_accounts for update to authenticated
  using (user_id = auth.uid() or public.is_support_or_admin())
  with check (user_id = auth.uid() or public.is_support_or_admin());

-- Resolve stable public IDs without exposing unrestricted writes.
create or replace function public.finance_resolve_order(p_order_external_id text)
returns public.orders
language sql
stable
security definer
set search_path = public
as $$
  select o.* from public.orders o
   where o.external_id = p_order_external_id or o.id::text = p_order_external_id
   limit 1
$$;

revoke all on function public.finance_resolve_order(text) from public;
grant execute on function public.finance_resolve_order(text) to authenticated;

-- Create/update a payment projection. The client is the only participant allowed to initiate payment.
create or replace function public.record_order_payment(
  p_external_id text,
  p_event_key text,
  p_order_external_id text,
  p_conversation_external_id text default null,
  p_message_external_id text default null,
  p_gross_amount_cents int default 0,
  p_charged_amount_cents int default 0,
  p_discount_amount_cents int default 0,
  p_method text default null,
  p_status text default 'processing',
  p_metadata jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_conversation_id uuid;
  v_message_id uuid;
  v_payment public.payments;
  v_status text := lower(trim(coalesce(p_status, 'processing')));
  v_fee int;
  v_net int;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_order from public.finance_resolve_order(p_order_external_id);
  if v_order.id is null then raise exception 'Order not found.' using errcode = '23503'; end if;
  if v_actor <> v_order.client_id then raise exception 'Only the order client can record payment.' using errcode = '42501'; end if;
  if v_order.professional_id is null or v_order.professional_id = v_order.client_id then
    raise exception 'Order participants are invalid.' using errcode = '23514';
  end if;
  if p_gross_amount_cents < 0 or p_charged_amount_cents < 0 or p_discount_amount_cents < 0 then
    raise exception 'Payment amounts cannot be negative.' using errcode = '22023';
  end if;
  if p_charged_amount_cents > p_gross_amount_cents or p_discount_amount_cents <> p_gross_amount_cents - p_charged_amount_cents then
    raise exception 'Payment amount composition is invalid.' using errcode = '23514';
  end if;
  if v_status not in ('processing', 'held', 'failed', 'cancelled') then
    raise exception 'This transition requires a dedicated finance command.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_conversation_external_id, '')), '') is not null then
    select c.id into v_conversation_id from public.conversations c
     where (c.external_id = p_conversation_external_id or c.id::text = p_conversation_external_id)
       and c.order_id = v_order.id
       and v_actor in (c.client_id, c.professional_id)
     limit 1;
  end if;
  if nullif(trim(coalesce(p_message_external_id, '')), '') is not null and v_conversation_id is not null then
    select m.id into v_message_id from public.messages m
     where (m.external_id = p_message_external_id or m.id::text = p_message_external_id)
       and m.conversation_id = v_conversation_id
     limit 1;
  end if;

  v_fee := round(p_gross_amount_cents * 0.05)::int;
  v_net := greatest(0, p_gross_amount_cents - v_fee);

  select * into v_payment from public.payments
   where event_key = p_event_key or external_id = p_external_id
   limit 1 for update;

  if v_payment.id is not null then
    if v_payment.order_id <> v_order.id
       or v_payment.gross_amount_cents <> p_gross_amount_cents
       or v_payment.charged_amount_cents <> p_charged_amount_cents
       or v_payment.discount_amount_cents <> p_discount_amount_cents then
      raise exception 'Idempotency key belongs to another payment intent.' using errcode = '23505';
    end if;
    if v_payment.status in ('held', 'released', 'refunded') and v_status <> v_payment.status then
      return v_payment;
    end if;
    update public.payments set
      conversation_id = coalesce(v_conversation_id, conversation_id),
      message_id = coalesce(v_message_id, message_id),
      method = coalesce(nullif(trim(p_method), ''), method),
      status = v_status,
      escrow_status = v_status,
      platform_fee_cents = v_fee,
      net_amount_cents = v_net,
      metadata = coalesce(p_metadata, '{}'::jsonb),
      held_at = case when v_status = 'held' then coalesce(held_at, now()) else held_at end,
      updated_at = now()
     where id = v_payment.id returning * into v_payment;
    return v_payment;
  end if;

  insert into public.payments (
    external_id, event_key, order_id, conversation_id, message_id,
    client_id, professional_id, gross_amount_cents, charged_amount_cents,
    discount_amount_cents, platform_fee_cents, net_amount_cents,
    method, status, escrow_status, metadata, held_at
  ) values (
    coalesce(nullif(trim(p_external_id), ''), 'payment_' || replace(gen_random_uuid()::text, '-', '')),
    coalesce(nullif(trim(p_event_key), ''), 'payment:' || v_order.id::text),
    v_order.id, v_conversation_id, v_message_id,
    v_order.client_id, v_order.professional_id, p_gross_amount_cents,
    p_charged_amount_cents, p_discount_amount_cents, v_fee, v_net,
    nullif(trim(p_method), ''), v_status, v_status, coalesce(p_metadata, '{}'::jsonb),
    case when v_status = 'held' then now() else null end
  ) returning * into v_payment;
  return v_payment;
end;
$$;

revoke all on function public.record_order_payment(text,text,text,text,text,int,int,int,text,text,jsonb) from public;
grant execute on function public.record_order_payment(text,text,text,text,text,int,int,int,text,text,jsonb) to authenticated;

-- Register the professional receivable and pending wallet balance exactly once.
create or replace function public.register_order_receivable(
  p_external_id text,
  p_event_key text,
  p_payment_external_id text,
  p_order_external_id text,
  p_conversation_external_id text default null,
  p_message_external_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_payment public.payments;
  v_transaction public.transactions;
  v_receivable public.wallet_receivables;
  v_created boolean := false;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_order from public.finance_resolve_order(p_order_external_id);
  if v_order.id is null then raise exception 'Order not found.' using errcode = '23503'; end if;
  if v_actor <> v_order.client_id then raise exception 'Only the order client can fund escrow.' using errcode = '42501'; end if;

  select * into v_payment from public.payments p
   where (p.external_id = p_payment_external_id or p.id::text = p_payment_external_id)
     and p.order_id = v_order.id
   limit 1 for update;
  if v_payment.id is null or v_payment.status not in ('processing', 'held') then
    raise exception 'Valid payment intent not found.' using errcode = '23503';
  end if;

  insert into public.wallets(user_id, balance_cents, pending_cents, currency, updated_at)
  values (v_order.professional_id, 0, 0, 'BRL', now())
  on conflict (user_id) do nothing;

  select * into v_transaction from public.transactions
   where event_key = p_event_key or external_id = p_external_id
   limit 1 for update;

  if v_transaction.id is null then
    insert into public.transactions (
      wallet_user_id, order_id, type, amount_cents, currency, status,
      external_id, event_key, payment_id, professional_id, client_id,
      conversation_id, message_id, gross_amount_cents, fee_amount_cents,
      net_amount_cents, release_status, metadata, available_at, updated_at
    ) values (
      v_order.professional_id, v_order.id, 'payment', v_payment.net_amount_cents,
      v_payment.currency, 'held',
      coalesce(nullif(trim(p_external_id), ''), 'wallet_tx_' || replace(gen_random_uuid()::text, '-', '')),
      coalesce(nullif(trim(p_event_key), ''), 'wallet_receivable:' || v_payment.id::text),
      v_payment.id, v_order.professional_id, v_order.client_id,
      (select c.id from public.conversations c where c.external_id = p_conversation_external_id or c.id::text = p_conversation_external_id limit 1),
      (select m.id from public.messages m where m.external_id = p_message_external_id or m.id::text = p_message_external_id limit 1),
      v_payment.gross_amount_cents, v_payment.platform_fee_cents,
      v_payment.net_amount_cents, 'em_garantia', coalesce(p_metadata, '{}'::jsonb),
      now(), now()
    ) returning * into v_transaction;
    v_created := true;

    insert into public.wallet_receivables (
      external_id, event_key, professional_id, client_id, order_id,
      transaction_id, payment_id, amount_cents, gross_amount_cents,
      fee_amount_cents, net_amount_cents, currency, status, metadata, created_at, updated_at
    ) values (
      'receivable_' || replace(gen_random_uuid()::text, '-', ''),
      coalesce(nullif(trim(p_event_key), ''), 'wallet_receivable:' || v_payment.id::text),
      v_order.professional_id, v_order.client_id, v_order.id,
      v_transaction.id, v_payment.id, v_payment.net_amount_cents,
      v_payment.gross_amount_cents, v_payment.platform_fee_cents,
      v_payment.net_amount_cents, v_payment.currency, 'pending',
      coalesce(p_metadata, '{}'::jsonb), now(), now()
    ) returning * into v_receivable;

    update public.wallets
       set pending_cents = pending_cents + v_payment.net_amount_cents,
           updated_at = now()
     where user_id = v_order.professional_id;
  else
    select * into v_receivable from public.wallet_receivables
     where transaction_id = v_transaction.id limit 1;
  end if;

  update public.payments set
    status = 'held', escrow_status = 'held', held_at = coalesce(held_at, now()), updated_at = now()
   where id = v_payment.id returning * into v_payment;

  return jsonb_build_object(
    'created', v_created,
    'transaction', to_jsonb(v_transaction),
    'receivable', to_jsonb(v_receivable),
    'payment', to_jsonb(v_payment),
    'wallet', (select to_jsonb(w) from public.wallets w where w.user_id = v_order.professional_id)
  );
end;
$$;

revoke all on function public.register_order_receivable(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.register_order_receivable(text,text,text,text,text,text,jsonb) to authenticated;

-- Release escrow after the client confirms completion. Open disputes block release.
create or replace function public.release_order_receivable(
  p_transaction_external_id text,
  p_payment_external_id text,
  p_order_external_id text,
  p_released_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_payment public.payments;
  v_transaction public.transactions;
  v_receivable public.wallet_receivables;
  v_released_at timestamptz := coalesce(p_released_at, now());
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_order from public.finance_resolve_order(p_order_external_id);
  if v_order.id is null then raise exception 'Order not found.' using errcode = '23503'; end if;
  if v_actor <> v_order.client_id and not public.is_support_or_admin() then
    raise exception 'Only the client or support can release escrow.' using errcode = '42501';
  end if;

  select * into v_payment from public.payments p
   where (p.external_id = p_payment_external_id or p.id::text = p_payment_external_id)
     and p.order_id = v_order.id
   limit 1 for update;
  select * into v_transaction from public.transactions t
   where (t.external_id = p_transaction_external_id or t.id::text = p_transaction_external_id)
     and t.order_id = v_order.id and t.payment_id = v_payment.id
   limit 1 for update;
  if v_payment.id is null or v_transaction.id is null then
    raise exception 'Escrow transaction not found.' using errcode = '23503';
  end if;
  if exists (
    select 1 from public.payment_disputes d
     where d.order_id = v_order.id and d.status in ('open','responded','under_review')
  ) then
    raise exception 'Escrow is blocked by an active dispute.' using errcode = '55000';
  end if;
  if v_transaction.status = 'available' and v_payment.status = 'released' then
    select * into v_receivable from public.wallet_receivables where transaction_id = v_transaction.id limit 1;
    return jsonb_build_object('updated', false, 'transaction', to_jsonb(v_transaction), 'receivable', to_jsonb(v_receivable), 'payment', to_jsonb(v_payment));
  end if;
  if v_transaction.status not in ('held','pending') or v_payment.status not in ('held','processing') then
    raise exception 'Escrow is not available for release.' using errcode = '55000';
  end if;

  update public.wallets
     set pending_cents = greatest(0, pending_cents - v_transaction.net_amount_cents),
         balance_cents = balance_cents + v_transaction.net_amount_cents,
         updated_at = v_released_at
   where user_id = v_order.professional_id;

  update public.transactions set
    status = 'available', release_status = 'liberado', available_at = v_released_at,
    updated_at = v_released_at
   where id = v_transaction.id returning * into v_transaction;

  update public.wallet_receivables set
    status = 'available', release_at = v_released_at, updated_at = v_released_at
   where transaction_id = v_transaction.id returning * into v_receivable;

  update public.payments set
    status = 'released', escrow_status = 'released', released_at = v_released_at,
    updated_at = v_released_at
   where id = v_payment.id returning * into v_payment;

  return jsonb_build_object(
    'updated', true,
    'transaction', to_jsonb(v_transaction),
    'receivable', to_jsonb(v_receivable),
    'payment', to_jsonb(v_payment),
    'wallet', (select to_jsonb(w) from public.wallets w where w.user_id = v_order.professional_id)
  );
end;
$$;

revoke all on function public.release_order_receivable(text,text,text,timestamptz) from public;
grant execute on function public.release_order_receivable(text,text,text,timestamptz) to authenticated;

-- Save the payout destination for the current wallet owner.
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
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_account public.wallet_bank_accounts;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_account_holder, '')), '') is null then raise exception 'Account holder is required.' using errcode = '22023'; end if;
  insert into public.wallets(user_id, balance_cents, pending_cents, currency, updated_at)
  values (v_actor, 0, 0, 'BRL', now()) on conflict (user_id) do nothing;
  insert into public.wallet_bank_accounts (
    user_id, account_holder, document, bank_name, bank_code, branch,
    account_number, account_type, pix_key, status, metadata, created_at, updated_at
  ) values (
    v_actor, trim(p_account_holder), nullif(trim(coalesce(p_document,'')),''),
    nullif(trim(coalesce(p_bank_name,'')),''), nullif(trim(coalesce(p_bank_code,'')),''),
    nullif(trim(coalesce(p_branch,'')),''), nullif(trim(coalesce(p_account_number,'')),''),
    coalesce(nullif(trim(p_account_type),''),'checking'), nullif(trim(coalesce(p_pix_key,'')),''),
    'pending', coalesce(p_metadata,'{}'::jsonb), now(), now()
  ) on conflict (user_id) do update set
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

revoke all on function public.save_wallet_bank_account(text,text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.save_wallet_bank_account(text,text,text,text,text,text,text,text,jsonb) to authenticated;

-- Reserve available balance immediately, preventing concurrent double-withdrawal.
create or replace function public.request_wallet_withdrawal(
  p_external_id text,
  p_event_key text,
  p_amount_cents int,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_wallet public.wallets;
  v_account public.wallet_bank_accounts;
  v_withdrawal public.withdrawals;
  v_transaction public.transactions;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  if p_amount_cents <= 0 then raise exception 'Withdrawal amount must be positive.' using errcode = '22023'; end if;
  select * into v_wallet from public.wallets where user_id = v_actor for update;
  if v_wallet.user_id is null or v_wallet.balance_cents < p_amount_cents then
    raise exception 'Insufficient available balance.' using errcode = '22003';
  end if;
  select * into v_account from public.wallet_bank_accounts where user_id = v_actor limit 1;
  if v_account.user_id is null then raise exception 'Bank account is required.' using errcode = '23503'; end if;

  select * into v_withdrawal from public.withdrawals
   where event_key = p_event_key or external_id = p_external_id limit 1 for update;
  if v_withdrawal.id is not null then
    select * into v_transaction from public.transactions where id = v_withdrawal.transaction_id;
    return jsonb_build_object('created', false, 'withdrawal', to_jsonb(v_withdrawal), 'transaction', to_jsonb(v_transaction), 'account', to_jsonb(v_account), 'wallet', to_jsonb(v_wallet));
  end if;

  update public.wallets set balance_cents = balance_cents - p_amount_cents, updated_at = now()
   where user_id = v_actor returning * into v_wallet;

  insert into public.transactions (
    wallet_user_id, type, amount_cents, currency, status, external_id, event_key,
    professional_id, gross_amount_cents, fee_amount_cents, net_amount_cents,
    release_status, metadata, updated_at
  ) values (
    v_actor, 'payout', p_amount_cents, v_wallet.currency, 'processing',
    coalesce(nullif(trim(p_external_id),''), 'wallet_tx_' || replace(gen_random_uuid()::text,'-','')),
    coalesce(nullif(trim(p_event_key),''), 'withdraw:' || replace(gen_random_uuid()::text,'-','')),
    v_actor, p_amount_cents, 0, p_amount_cents, 'processando', coalesce(p_metadata,'{}'::jsonb), now()
  ) returning * into v_transaction;

  insert into public.withdrawals (
    external_id, event_key, wallet_user_id, amount_cents, currency, status,
    bank_account_snapshot, requested_by, transaction_id, metadata, created_at, updated_at
  ) values (
    'withdrawal_' || replace(gen_random_uuid()::text,'-',''),
    coalesce(nullif(trim(p_event_key),''), v_transaction.event_key),
    v_actor, p_amount_cents, v_wallet.currency, 'processing',
    to_jsonb(v_account), v_actor, v_transaction.id, coalesce(p_metadata,'{}'::jsonb), now(), now()
  ) returning * into v_withdrawal;

  return jsonb_build_object('created', true, 'withdrawal', to_jsonb(v_withdrawal), 'transaction', to_jsonb(v_transaction), 'account', to_jsonb(v_account), 'wallet', to_jsonb(v_wallet));
end;
$$;

revoke all on function public.request_wallet_withdrawal(text,text,int,jsonb) from public;
grant execute on function public.request_wallet_withdrawal(text,text,int,jsonb) to authenticated;

create or replace function public.resolve_wallet_withdrawal(
  p_transaction_external_id text,
  p_action text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(trim(coalesce(p_action,'')));
  v_transaction public.transactions;
  v_withdrawal public.withdrawals;
  v_wallet public.wallets;
  v_now timestamptz := now();
begin
  if v_actor is null or not public.is_support_or_admin() then
    raise exception 'Support or admin access required.' using errcode = '42501';
  end if;
  if v_action not in ('approve','approved','complete','completed','decline','declined','reject','rejected') then
    raise exception 'Invalid withdrawal resolution.' using errcode = '22023';
  end if;
  select * into v_transaction from public.transactions
   where (external_id = p_transaction_external_id or id::text = p_transaction_external_id)
     and type = 'payout' limit 1 for update;
  if v_transaction.id is null then raise exception 'Withdrawal transaction not found.' using errcode = '23503'; end if;
  select * into v_withdrawal from public.withdrawals where transaction_id = v_transaction.id limit 1 for update;
  select * into v_wallet from public.wallets where user_id = v_transaction.wallet_user_id for update;
  if v_transaction.status <> 'processing' then
    return jsonb_build_object('updated', false, 'transaction', to_jsonb(v_transaction), 'withdrawal', to_jsonb(v_withdrawal), 'wallet', to_jsonb(v_wallet));
  end if;

  if v_action in ('decline','declined','reject','rejected') then
    update public.wallets set balance_cents = balance_cents + v_transaction.net_amount_cents, updated_at = v_now
     where user_id = v_transaction.wallet_user_id returning * into v_wallet;
    update public.transactions set status = 'declined', release_status = 'recusado', completed_at = v_now,
      metadata = metadata || jsonb_build_object('adminReason', coalesce(p_reason,''), 'resolvedBy', v_actor), updated_at = v_now
     where id = v_transaction.id returning * into v_transaction;
    update public.withdrawals set status = 'declined', decided_by = v_actor, decided_at = v_now,
      reason = p_reason, updated_at = v_now where id = v_withdrawal.id returning * into v_withdrawal;
  else
    update public.transactions set status = 'completed', release_status = 'concluido', completed_at = v_now,
      metadata = metadata || jsonb_build_object('resolvedBy', v_actor), updated_at = v_now
     where id = v_transaction.id returning * into v_transaction;
    update public.withdrawals set status = 'completed', decided_by = v_actor, decided_at = v_now,
      reason = p_reason, updated_at = v_now where id = v_withdrawal.id returning * into v_withdrawal;
  end if;

  insert into public.admin_audit_events(actor_id, actor_role, action, entity_type, entity_id, metadata)
  values (v_actor, public.current_user_role(), case when v_transaction.status='declined' then 'decline_withdrawal' else 'complete_withdrawal' end,
    'withdrawal', v_withdrawal.id, jsonb_build_object('reason',coalesce(p_reason,''),'transactionExternalId',v_transaction.external_id));

  return jsonb_build_object('updated', true, 'action', v_transaction.status, 'transaction', to_jsonb(v_transaction), 'withdrawal', to_jsonb(v_withdrawal), 'wallet', to_jsonb(v_wallet));
end;
$$;

revoke all on function public.resolve_wallet_withdrawal(text,text,text) from public;
grant execute on function public.resolve_wallet_withdrawal(text,text,text) to authenticated;

-- Dispute lifecycle commands keep escrow mutations server-side.
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
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_order public.orders;
  v_payment public.payments;
  v_transaction public.transactions;
  v_dispute public.payment_disputes;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode = '42501'; end if;
  select * into v_order from public.finance_resolve_order(p_order_external_id);
  if v_order.id is null or v_actor <> v_order.client_id then raise exception 'Only the order client can open a dispute.' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_reason,'')),'') is null then raise exception 'Dispute reason is required.' using errcode = '22023'; end if;
  select * into v_payment from public.payments where (external_id=p_payment_external_id or id::text=p_payment_external_id) and order_id=v_order.id limit 1 for update;
  select * into v_transaction from public.transactions where (external_id=p_transaction_external_id or id::text=p_transaction_external_id) and order_id=v_order.id limit 1 for update;
  if v_payment.id is null or v_transaction.id is null or v_transaction.status not in ('held','pending') then
    raise exception 'Held escrow was not found.' using errcode = '23503';
  end if;
  select * into v_dispute from public.payment_disputes where order_id=v_order.id and status in ('open','responded','under_review') limit 1;
  if v_dispute.id is not null then return jsonb_build_object('created',false,'dispute',to_jsonb(v_dispute),'transaction',to_jsonb(v_transaction)); end if;
  insert into public.payment_disputes(
    external_id,event_key,order_id,transaction_id,payment_id,client_id,professional_id,opened_by,
    reason,description,status,metadata,created_at,updated_at
  ) values (
    coalesce(nullif(trim(p_external_id),''),'wallet_dispute_'||replace(gen_random_uuid()::text,'-','')),
    coalesce(nullif(trim(p_event_key),''),'wallet_dispute:'||v_order.id::text),
    v_order.id,v_transaction.id,v_payment.id,v_order.client_id,v_order.professional_id,v_actor,
    trim(p_reason),p_reason_code,'open',coalesce(p_metadata,'{}'::jsonb),now(),now()
  ) returning * into v_dispute;
  update public.transactions set release_status='contestacao', metadata=metadata||jsonb_build_object('disputeId',v_dispute.external_id,'disputeStatus','contestacao_aberta'),updated_at=now() where id=v_transaction.id returning * into v_transaction;
  update public.wallet_receivables set status='blocked',blocked_reason=trim(p_reason),updated_at=now() where transaction_id=v_transaction.id;
  insert into public.dispute_events(dispute_id,actor_id,event_type,note,metadata) values(v_dispute.id,v_actor,'opened',trim(p_reason),coalesce(p_metadata,'{}'::jsonb));
  return jsonb_build_object('created',true,'dispute',to_jsonb(v_dispute),'transaction',to_jsonb(v_transaction));
end;
$$;

revoke all on function public.open_wallet_dispute(text,text,text,text,text,text,text,jsonb) from public;
grant execute on function public.open_wallet_dispute(text,text,text,text,text,text,text,jsonb) to authenticated;

create or replace function public.respond_wallet_dispute(
  p_dispute_external_id text,
  p_response text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_dispute public.payment_disputes;
begin
  if v_actor is null then raise exception 'Authentication required.' using errcode='42501'; end if;
  if nullif(trim(coalesce(p_response,'')),'') is null then raise exception 'Response is required.' using errcode='22023'; end if;
  select * into v_dispute from public.payment_disputes where external_id=p_dispute_external_id or id::text=p_dispute_external_id limit 1 for update;
  if v_dispute.id is null or v_actor<>v_dispute.professional_id then raise exception 'Only the linked professional can respond.' using errcode='42501'; end if;
  if v_dispute.status not in ('open','responded','under_review') then return jsonb_build_object('updated',false,'dispute',to_jsonb(v_dispute)); end if;
  update public.payment_disputes set status='under_review',professional_response=trim(p_response),response_at=now(),updated_at=now() where id=v_dispute.id returning * into v_dispute;
  insert into public.dispute_events(dispute_id,actor_id,event_type,note) values(v_dispute.id,v_actor,'professional_responded',trim(p_response));
  return jsonb_build_object('updated',true,'dispute',to_jsonb(v_dispute));
end;
$$;

revoke all on function public.respond_wallet_dispute(text,text) from public;
grant execute on function public.respond_wallet_dispute(text,text) to authenticated;

create or replace function public.resolve_wallet_dispute(
  p_dispute_external_id text,
  p_resolution text,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_resolution text := lower(trim(coalesce(p_resolution,'')));
  v_dispute public.payment_disputes;
  v_transaction public.transactions;
  v_payment public.payments;
  v_wallet public.wallets;
  v_now timestamptz := now();
begin
  if v_actor is null or not public.is_support_or_admin() then raise exception 'Support or admin access required.' using errcode='42501'; end if;
  if v_resolution not in ('cliente','client','refund','refunded','profissional','professional','release','released') then raise exception 'Invalid dispute resolution.' using errcode='22023'; end if;
  select * into v_dispute from public.payment_disputes where external_id=p_dispute_external_id or id::text=p_dispute_external_id limit 1 for update;
  if v_dispute.id is null then raise exception 'Dispute not found.' using errcode='23503'; end if;
  select * into v_transaction from public.transactions where id=v_dispute.transaction_id limit 1 for update;
  select * into v_payment from public.payments where id=v_dispute.payment_id limit 1 for update;
  select * into v_wallet from public.wallets where user_id=v_dispute.professional_id limit 1 for update;
  if v_dispute.status in ('released','refunded','cancelled') then return jsonb_build_object('updated',false,'dispute',to_jsonb(v_dispute),'transaction',to_jsonb(v_transaction),'payment',to_jsonb(v_payment)); end if;

  if v_resolution in ('cliente','client','refund','refunded') then
    update public.wallets set pending_cents=greatest(0,pending_cents-v_transaction.net_amount_cents),updated_at=v_now where user_id=v_dispute.professional_id returning * into v_wallet;
    update public.transactions set type='refund',status='refunded',release_status='reembolsado',amount_cents=-abs(net_amount_cents),completed_at=v_now,updated_at=v_now where id=v_transaction.id returning * into v_transaction;
    update public.wallet_receivables set status='refunded',updated_at=v_now where transaction_id=v_transaction.id;
    update public.payments set status='refunded',escrow_status='refunded',refunded_at=v_now,updated_at=v_now where id=v_payment.id returning * into v_payment;
    update public.payment_disputes set status='refunded',resolution='refund_client',resolved_by=v_actor,resolved_at=v_now,updated_at=v_now where id=v_dispute.id returning * into v_dispute;
    insert into public.dispute_events(dispute_id,actor_id,event_type,note) values(v_dispute.id,v_actor,'refunded',p_reason);
  else
    update public.wallets set pending_cents=greatest(0,pending_cents-v_transaction.net_amount_cents),balance_cents=balance_cents+v_transaction.net_amount_cents,updated_at=v_now where user_id=v_dispute.professional_id returning * into v_wallet;
    update public.transactions set status='available',release_status='liberado',available_at=v_now,updated_at=v_now where id=v_transaction.id returning * into v_transaction;
    update public.wallet_receivables set status='available',release_at=v_now,updated_at=v_now where transaction_id=v_transaction.id;
    update public.payments set status='released',escrow_status='released',released_at=v_now,updated_at=v_now where id=v_payment.id returning * into v_payment;
    update public.payment_disputes set status='released',resolution='release_professional',resolved_by=v_actor,resolved_at=v_now,updated_at=v_now where id=v_dispute.id returning * into v_dispute;
    insert into public.dispute_events(dispute_id,actor_id,event_type,note) values(v_dispute.id,v_actor,'released',p_reason);
  end if;
  insert into public.admin_audit_events(actor_id,actor_role,action,entity_type,entity_id,metadata)
  values(v_actor,public.current_user_role(),'resolve_dispute','payment_dispute',v_dispute.id,jsonb_build_object('resolution',v_resolution,'reason',coalesce(p_reason,'')));
  return jsonb_build_object('updated',true,'resolution',v_resolution,'dispute',to_jsonb(v_dispute),'transaction',to_jsonb(v_transaction),'payment',to_jsonb(v_payment),'wallet',to_jsonb(v_wallet));
end;
$$;

revoke all on function public.resolve_wallet_dispute(text,text,text) from public;
grant execute on function public.resolve_wallet_dispute(text,text,text) to authenticated;
