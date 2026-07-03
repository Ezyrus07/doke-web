-- Doke Sprint 16: local/staging RLS validation matrix.
-- Run after migrations and seed in a disposable Supabase local/staging project.
-- These queries are intentionally read-only except for the transaction-scoped role checks.

begin;

-- Expected seed accounts from supabase/seed/002_mvp_controlled_seed.sql.
select id, email, role
from public.users
where email in (
  'cliente@doke.local',
  'profissional@doke.local',
  'suporte@doke.local',
  'admin@doke.local'
)
order by email;

-- Validate support/admin helper availability.
select public.current_user_role() as current_role;
select public.is_support_or_admin() as support_or_admin;
select public.is_internal_operator() as internal_operator;

-- Validate operational tables have RLS enabled.
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'api_idempotency_keys',
    'receipts',
    'wallet_receivables',
    'withdrawals',
    'payment_disputes',
    'dispute_events',
    'admin_audit_events'
  )
order by tablename;

rollback;
