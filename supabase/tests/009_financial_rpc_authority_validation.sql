-- Doke SEC-001 financial RPC authority validation.
-- Execute in staging. Mutation checks should be wrapped in a transaction and rolled back.

-- No anon table privileges on financial authority tables.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'anon'
  and table_name in (
    'api_idempotency_keys','wallets','wallet_bank_accounts','payments','transactions',
    'wallet_receivables','withdrawals','payment_disputes','dispute_events','receipts','admin_audit_events'
  );

-- Authenticated browser access is SELECT-only and excludes the idempotency store.
select table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'authenticated'
  and table_name in (
    'api_idempotency_keys','wallets','wallet_bank_accounts','payments','transactions',
    'wallet_receivables','withdrawals','payment_disputes','dispute_events','receipts','admin_audit_events'
  )
order by table_name, privilege_type;

-- Exact function execution surface.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute,
       p.prosecdef as security_definer,
       p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'claim_idempotency_key','complete_idempotency_key','fail_idempotency_key',
    'finance_resolve_order','record_order_payment','register_order_receivable','release_order_receivable',
    'save_wallet_bank_account','request_wallet_withdrawal','open_wallet_dispute','respond_wallet_dispute',
    'resolve_wallet_withdrawal','resolve_wallet_dispute',
    'resolve_wallet_withdrawal_internal','resolve_wallet_dispute_internal'
  )
order by p.proname;
