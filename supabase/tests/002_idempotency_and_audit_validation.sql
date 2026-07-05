-- Doke Sprint 16: idempotency and audit validation smoke script.
-- Run in local/staging only. Production actions must be executed by server actions,
-- never directly from a browser.

begin;

-- Execute the smoke claim as the controlled professional identity. The
-- production function correctly rejects unauthenticated callers.
select set_config(
  'request.jwt.claim.sub',
  (select id::text from public.users where email = 'profissional@doke.local'),
  true
);

-- claim_idempotency_key should create one canonical claim per key/action/hash.
select public.claim_idempotency_key(
  'doke-sprint-16-smoke-key',
  'withdrawals.approve',
  'withdrawal',
  null,
  encode(digest('withdrawals.approve:demo', 'sha256'), 'hex')
) as first_claim;

select public.claim_idempotency_key(
  'doke-sprint-16-smoke-key',
  'withdrawals.approve',
  'withdrawal',
  null,
  encode(digest('withdrawals.approve:demo', 'sha256'), 'hex')
) as repeated_claim;

select action, entity_type, status, created_at
from public.api_idempotency_keys
where idempotency_key = 'doke-sprint-16-smoke-key';

-- Audit table should be writable only by privileged server-side paths/RLS policy.
select action, entity_type, actor_role, created_at
from public.admin_audit_events
order by created_at desc
limit 10;

rollback;
