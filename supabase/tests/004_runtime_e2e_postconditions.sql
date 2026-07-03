-- runtime_e2e_postconditions
-- Run after `npm run validate:staging-e2e` against local/staging.
-- These assertions are intentionally conservative: they confirm that the
-- runtime smoke produced persistent server-side signals without disabling RLS.

select 'runtime_e2e_postconditions: idempotency table exists' as check_name
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'api_idempotency_keys'
);

select 'runtime_e2e_postconditions: audit table exists' as check_name
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'admin_audit_events'
);

select 'runtime_e2e_postconditions: receipts table exists' as check_name
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'receipts'
);

select 'runtime_e2e_postconditions: withdrawals table exists' as check_name
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'withdrawals'
);

select 'runtime_e2e_postconditions: disputes table exists' as check_name
where exists (
  select 1 from information_schema.tables
  where table_schema = 'public' and table_name = 'payment_disputes'
);

-- After full HTTP validation, staging should contain at least one server-side
-- idempotency claim and one admin audit row from a sensitive route. If this
-- query returns zero rows in a real staging run, the backend runtime is not yet
-- safe to connect to the frontend API provider.
select 'runtime_e2e_postconditions: idempotency claims exist' as check_name
where exists (
  select 1 from public.api_idempotency_keys
  where action in (
    'orders.quote',
    'notifications.create',
    'withdrawals.request',
    'withdrawals.approve',
    'withdrawals.decline',
    'disputes.release',
    'disputes.refund'
  )
);

select 'runtime_e2e_postconditions: admin audit events exist' as check_name
where exists (
  select 1 from public.admin_audit_events
  where action in (
    'notifications.create',
    'withdrawals.approve',
    'withdrawals.decline',
    'disputes.release',
    'disputes.refund'
  )
);
