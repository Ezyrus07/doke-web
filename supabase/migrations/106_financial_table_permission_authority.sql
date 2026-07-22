-- Doke SEC-001: financial tables expose read-only participant projections to browsers.
-- All writes are controlled by explicit RPCs, server routes or JWT-protected operator functions.

alter table public.api_idempotency_keys enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_bank_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.transactions enable row level security;
alter table public.wallet_receivables enable row level security;
alter table public.withdrawals enable row level security;
alter table public.payment_disputes enable row level security;
alter table public.dispute_events enable row level security;
alter table public.receipts enable row level security;
alter table public.admin_audit_events enable row level security;

-- Remove broad API grants, including structural privileges not protected by RLS.
revoke all privileges on table public.api_idempotency_keys from public, anon, authenticated, service_role;
revoke all privileges on table public.wallets from public, anon, authenticated, service_role;
revoke all privileges on table public.wallet_bank_accounts from public, anon, authenticated, service_role;
revoke all privileges on table public.payments from public, anon, authenticated, service_role;
revoke all privileges on table public.transactions from public, anon, authenticated, service_role;
revoke all privileges on table public.wallet_receivables from public, anon, authenticated, service_role;
revoke all privileges on table public.withdrawals from public, anon, authenticated, service_role;
revoke all privileges on table public.payment_disputes from public, anon, authenticated, service_role;
revoke all privileges on table public.dispute_events from public, anon, authenticated, service_role;
revoke all privileges on table public.receipts from public, anon, authenticated, service_role;
revoke all privileges on table public.admin_audit_events from public, anon, authenticated, service_role;

-- Browser sessions are read-only and always constrained by RLS.
grant select on table public.wallets to authenticated;
grant select on table public.wallet_bank_accounts to authenticated;
grant select on table public.payments to authenticated;
grant select on table public.transactions to authenticated;
grant select on table public.wallet_receivables to authenticated;
grant select on table public.withdrawals to authenticated;
grant select on table public.payment_disputes to authenticated;
grant select on table public.dispute_events to authenticated;
grant select on table public.receipts to authenticated;
grant select on table public.admin_audit_events to authenticated;

-- Server clients receive only DML privileges, never TRUNCATE/REFERENCES/TRIGGER.
grant select, insert, update, delete on table public.api_idempotency_keys to service_role;
grant select, insert, update, delete on table public.wallets to service_role;
grant select, insert, update, delete on table public.wallet_bank_accounts to service_role;
grant select, insert, update, delete on table public.payments to service_role;
grant select, insert, update, delete on table public.transactions to service_role;
grant select, insert, update, delete on table public.wallet_receivables to service_role;
grant select, insert, update, delete on table public.withdrawals to service_role;
grant select, insert, update, delete on table public.payment_disputes to service_role;
grant select, insert, update, delete on table public.dispute_events to service_role;
grant select, insert, update, delete on table public.receipts to service_role;
grant select, insert, update, delete on table public.admin_audit_events to service_role;

-- Idempotency is a server-side store. Browser policies are intentionally removed.
drop policy if exists "actors claim own idempotency keys" on public.api_idempotency_keys;
drop policy if exists "idempotency owner or support can read" on public.api_idempotency_keys;
drop policy if exists "support updates idempotency results" on public.api_idempotency_keys;

-- Bank details must be mutated only through the validated owner RPC.
drop policy if exists "wallet owner saves bank account" on public.wallet_bank_accounts;
drop policy if exists "wallet owner updates bank account" on public.wallet_bank_accounts;
drop policy if exists wallet_owner_inserts_bank_account on public.wallet_bank_accounts;
drop policy if exists wallet_owner_updates_bank_account on public.wallet_bank_accounts;

-- Replace legacy PUBLIC policies with explicit authenticated read contracts.
drop policy if exists wallets_owner_select on public.wallets;
create policy wallets_owner_select on public.wallets
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "wallet owner or support reads bank account" on public.wallet_bank_accounts;
drop policy if exists wallet_bank_accounts_owner_select on public.wallet_bank_accounts;
create policy wallet_bank_accounts_owner_select on public.wallet_bank_accounts
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists payments_participants_select on public.payments;
create policy payments_participants_select on public.payments
for select to authenticated
using (
  client_id = (select auth.uid())
  or professional_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists transactions_owner_select on public.transactions;
create policy transactions_owner_select on public.transactions
for select to authenticated
using (
  wallet_user_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "receivable owner or support can read" on public.wallet_receivables;
drop policy if exists wallet_receivables_owner_select on public.wallet_receivables;
create policy wallet_receivables_owner_select on public.wallet_receivables
for select to authenticated
using (
  professional_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "withdrawal owner or support can read" on public.withdrawals;
drop policy if exists withdrawals_owner_select on public.withdrawals;
create policy withdrawals_owner_select on public.withdrawals
for select to authenticated
using (
  wallet_user_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "dispute participants or support can read" on public.payment_disputes;
drop policy if exists payment_disputes_participants_select on public.payment_disputes;
create policy payment_disputes_participants_select on public.payment_disputes
for select to authenticated
using (
  client_id = (select auth.uid())
  or professional_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "dispute events visible to participants" on public.dispute_events;
drop policy if exists dispute_events_participants_select on public.dispute_events;
create policy dispute_events_participants_select on public.dispute_events
for select to authenticated
using (
  exists (
    select 1
    from public.payment_disputes dispute
    where dispute.id = dispute_events.dispute_id
      and (
        dispute.client_id = (select auth.uid())
        or dispute.professional_id = (select auth.uid())
        or public.is_support_or_admin()
      )
  )
);

drop policy if exists "receipt owner or support can read" on public.receipts;
drop policy if exists receipts_owner_select on public.receipts;
create policy receipts_owner_select on public.receipts
for select to authenticated
using (
  user_id = (select auth.uid())
  or public.is_support_or_admin()
);

drop policy if exists "support reads admin audit" on public.admin_audit_events;
drop policy if exists admin_audit_events_operator_select on public.admin_audit_events;
create policy admin_audit_events_operator_select on public.admin_audit_events
for select to authenticated
using (public.is_support_or_admin());

comment on table public.api_idempotency_keys is
  'Server-only persistent idempotency store. No browser table or RPC authority.';
comment on table public.wallet_bank_accounts is
  'Private payout destination data. Browser reads are owner-scoped; writes use save_wallet_bank_account.';
