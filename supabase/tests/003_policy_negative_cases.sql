-- Doke Sprint 16: policy negative cases to execute manually with JWT role switching.
-- The backend validation harness should run each block with a client, professional,
-- support and admin JWT, then assert the expected allow/deny result.

-- Client must not read admin audit queue.
-- expect: zero rows or permission denied for role client.
select * from public.admin_audit_events limit 1;

-- Professional must not resolve a dispute through admin-only mutation paths.
-- expect: permission denied for role professional.
with target_dispute as (
  select id
  from public.payment_disputes
  where status in ('open', 'responded', 'under_review')
  limit 1
)
update public.payment_disputes
set status = 'released', resolution = 'release_professional'
where id in (select id from target_dispute);

-- Support/admin should be able to read operational queues.
-- expect: rows from seeded controlled dataset for role support/admin.
select * from public.payment_disputes order by created_at desc limit 10;
select * from public.withdrawals order by created_at desc limit 10;
