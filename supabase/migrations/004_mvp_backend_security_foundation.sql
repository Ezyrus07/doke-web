-- Doke Sprint 15: backend security foundation for controlled MVP.
-- Intended for Supabase/PostgreSQL review before production execution.
-- Scope: roles, financial tables, idempotency, receipts, server-side audit and RLS.

create extension if not exists pgcrypto;

-- Align backend roles with the frontend/auth contract. Existing Stage 21 migration did
-- not include support; the support role is required for operational dispute/withdrawal flows.
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('client', 'professional', 'moderator', 'support', 'admin'));

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.users where id = auth.uid()), 'guest')
$$;

create or replace function public.is_support_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('support', 'admin')
$$;

create or replace function public.is_internal_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'support', 'admin')
$$;

-- Preserve the existing helper name used by older RLS policies while expanding it
-- to include support, because support needs read access to operational queues.
create or replace function public.is_admin_or_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() in ('moderator', 'support', 'admin')
$$;

create table if not exists public.api_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  idempotency_key text not null unique,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  request_hash text not null,
  status text not null default 'claimed' check (status in ('claimed', 'succeeded', 'failed', 'expired')),
  response_body jsonb,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  receipt_type text not null check (receipt_type in ('payment', 'payout', 'refund', 'withdrawal', 'adjustment')),
  code text not null unique,
  gross_amount_cents int not null default 0,
  fee_amount_cents int not null default 0,
  net_amount_cents int not null default 0,
  currency text not null default 'BRL',
  status text not null default 'issued' check (status in ('draft', 'issued', 'voided')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_receivables (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  transaction_id uuid references public.transactions(id) on delete set null,
  amount_cents int not null check (amount_cents >= 0),
  currency text not null default 'BRL',
  status text not null default 'scheduled' check (status in ('scheduled', 'pending', 'blocked', 'available', 'released', 'refunded', 'cancelled')),
  release_at timestamptz,
  blocked_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  wallet_user_id uuid not null references public.wallets(user_id) on delete cascade,
  amount_cents int not null check (amount_cents > 0),
  currency text not null default 'BRL',
  status text not null default 'requested' check (status in ('requested', 'processing', 'approved', 'completed', 'declined', 'cancelled', 'failed')),
  bank_account_snapshot jsonb not null default '{}'::jsonb,
  requested_by uuid references public.users(id) on delete set null,
  decided_by uuid references public.users(id) on delete set null,
  decided_at timestamptz,
  reason text,
  receipt_id uuid references public.receipts(id) on delete set null,
  idempotency_key text references public.api_idempotency_keys(idempotency_key),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (wallet_user_id = requested_by or requested_by is null)
);

create table if not exists public.payment_disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  opened_by uuid not null references public.users(id) on delete cascade,
  reason text not null,
  description text,
  status text not null default 'open' check (status in ('open', 'responded', 'under_review', 'released', 'refunded', 'cancelled')),
  professional_response text,
  resolution text check (resolution is null or resolution in ('release_professional', 'refund_client', 'cancelled')),
  resolved_by uuid references public.users(id) on delete set null,
  resolved_at timestamptz,
  receipt_id uuid references public.receipts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.dispute_events (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.payment_disputes(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('opened', 'professional_responded', 'moved_under_review', 'released', 'refunded', 'cancelled', 'note')),
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  idempotency_key text references public.api_idempotency_keys(idempotency_key),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_idempotency_actor_action on public.api_idempotency_keys(actor_id, action, status);
create index if not exists idx_receipts_user_type on public.receipts(user_id, receipt_type, created_at);
create index if not exists idx_receipts_transaction on public.receipts(transaction_id);
create index if not exists idx_receivables_professional_status on public.wallet_receivables(professional_id, status, release_at);
create index if not exists idx_withdrawals_wallet_status on public.withdrawals(wallet_user_id, status, created_at);
create index if not exists idx_payment_disputes_order_status on public.payment_disputes(order_id, status);
create index if not exists idx_payment_disputes_participants on public.payment_disputes(client_id, professional_id, status);
create index if not exists idx_dispute_events_dispute on public.dispute_events(dispute_id, created_at);
create index if not exists idx_admin_audit_entity on public.admin_audit_events(entity_type, entity_id, created_at);

alter table public.api_idempotency_keys enable row level security;
alter table public.receipts enable row level security;
alter table public.wallet_receivables enable row level security;
alter table public.withdrawals enable row level security;
alter table public.payment_disputes enable row level security;
alter table public.dispute_events enable row level security;
alter table public.admin_audit_events enable row level security;

create policy "idempotency owner or support can read" on public.api_idempotency_keys
  for select using (actor_id = auth.uid() or public.is_support_or_admin());

create policy "actors claim own idempotency keys" on public.api_idempotency_keys
  for insert with check (actor_id = auth.uid());

create policy "support updates idempotency results" on public.api_idempotency_keys
  for update using (public.is_support_or_admin()) with check (public.is_support_or_admin());

create policy "receipt owner or support can read" on public.receipts
  for select using (user_id = auth.uid() or public.is_support_or_admin());

create policy "support issues receipts" on public.receipts
  for insert with check (public.is_support_or_admin());

create policy "receivable owner or support can read" on public.wallet_receivables
  for select using (professional_id = auth.uid() or public.is_support_or_admin());

create policy "support manages receivables" on public.wallet_receivables
  for all using (public.is_support_or_admin()) with check (public.is_support_or_admin());

create policy "withdrawal owner or support can read" on public.withdrawals
  for select using (wallet_user_id = auth.uid() or public.is_support_or_admin());

create policy "wallet owner requests withdrawal" on public.withdrawals
  for insert with check (wallet_user_id = auth.uid() and requested_by = auth.uid() and status = 'requested');

create policy "support resolves withdrawals" on public.withdrawals
  for update using (public.is_support_or_admin()) with check (public.is_support_or_admin());

create policy "dispute participants or support can read" on public.payment_disputes
  for select using (client_id = auth.uid() or professional_id = auth.uid() or public.is_support_or_admin());

create policy "clients open own disputes" on public.payment_disputes
  for insert with check (client_id = auth.uid() and opened_by = auth.uid() and status = 'open');

create policy "professionals respond to disputes" on public.payment_disputes
  for update using (professional_id = auth.uid() and status in ('open', 'responded', 'under_review'))
  with check (professional_id = auth.uid() and status in ('responded', 'under_review'));

create policy "support resolves disputes" on public.payment_disputes
  for update using (public.is_support_or_admin()) with check (public.is_support_or_admin());

create policy "dispute events visible to participants" on public.dispute_events
  for select using (exists (
    select 1 from public.payment_disputes d
    where d.id = dispute_events.dispute_id
      and (d.client_id = auth.uid() or d.professional_id = auth.uid() or public.is_support_or_admin())
  ));

create policy "participants create dispute events" on public.dispute_events
  for insert with check (exists (
    select 1 from public.payment_disputes d
    where d.id = dispute_events.dispute_id
      and (d.client_id = auth.uid() or d.professional_id = auth.uid() or public.is_support_or_admin())
  ));

create policy "support reads admin audit" on public.admin_audit_events
  for select using (public.is_support_or_admin());

create policy "support writes admin audit" on public.admin_audit_events
  for insert with check (public.is_support_or_admin());

create or replace function public.claim_idempotency_key(
  p_idempotency_key text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_key public.api_idempotency_keys%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to claim an idempotency key.';
  end if;

  select * into existing_key
  from public.api_idempotency_keys
  where idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'claimed', false,
      'status', existing_key.status,
      'response', existing_key.response_body
    );
  end if;

  insert into public.api_idempotency_keys (
    idempotency_key,
    actor_id,
    action,
    entity_type,
    entity_id,
    request_hash
  ) values (
    p_idempotency_key,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_request_hash
  );

  return jsonb_build_object('claimed', true, 'status', 'claimed');
end;
$$;
