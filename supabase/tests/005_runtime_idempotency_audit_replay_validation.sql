-- Doke Sprint 23: runtime idempotency replay/conflict validation.
-- Run after the HTTP staging smoke. The assertions are conservative and do not
-- mutate data; they verify that runtime calls persisted replay-safe signals.

select 'runtime_idempotency_audit: idempotency succeeded rows exist' as check_name
where exists (
  select 1 from public.api_idempotency_keys
  where status = 'succeeded'
    and response_body is not null
    and action in (
      'orders.quote',
      'notifications.create',
      'withdrawals.request',
      'withdrawals.approve',
      'withdrawals.decline',
      'disputes.release',
      'disputes.refund'
    )
);

select 'runtime_idempotency_audit: request hashes are persisted' as check_name
where not exists (
  select 1 from public.api_idempotency_keys
  where request_hash is null or length(request_hash) < 32
);

select 'runtime_idempotency_audit: audited idempotent actions are linked' as check_name
where exists (
  select 1
  from public.admin_audit_events audit
  join public.api_idempotency_keys idem
    on idem.idempotency_key = audit.idempotency_key
  where audit.action = idem.action
    and idem.status = 'succeeded'
);

select 'runtime_idempotency_audit: no mismatched audit idempotency actions' as check_name
where not exists (
  select 1
  from public.admin_audit_events audit
  join public.api_idempotency_keys idem
    on idem.idempotency_key = audit.idempotency_key
  where audit.action is distinct from idem.action
);
