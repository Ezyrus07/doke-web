-- Doke Sprint 21: wallet runtime support tables.
-- Adds a first-party bank-account table used by the staging wallet runtime.

create table if not exists public.wallet_bank_accounts (
  user_id uuid primary key references public.wallets(user_id) on delete cascade,
  account_holder text not null,
  document text,
  bank_name text,
  bank_code text,
  branch text,
  account_number text,
  account_type text not null default 'checking',
  pix_key text,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wallet_bank_accounts_status on public.wallet_bank_accounts(status, updated_at);

alter table public.wallet_bank_accounts enable row level security;

drop policy if exists "wallet owner or support reads bank account" on public.wallet_bank_accounts;
create policy "wallet owner or support reads bank account" on public.wallet_bank_accounts
  for select using (user_id = auth.uid() or public.is_support_or_admin());

drop policy if exists "wallet owner saves bank account" on public.wallet_bank_accounts;
create policy "wallet owner saves bank account" on public.wallet_bank_accounts
  for insert with check (user_id = auth.uid());

drop policy if exists "wallet owner updates bank account" on public.wallet_bank_accounts;
create policy "wallet owner updates bank account" on public.wallet_bank_accounts
  for update using (user_id = auth.uid() or public.is_support_or_admin())
  with check (user_id = auth.uid() or public.is_support_or_admin());
