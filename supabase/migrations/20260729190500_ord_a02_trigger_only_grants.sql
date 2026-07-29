begin;

-- ORD-A02: these routines are invoked only by triggers on
-- private.order_operational_alerts. Trigger execution does not require callers
-- to hold EXECUTE on the trigger function, so browser and service roles must not
-- inherit PostgreSQL's default PUBLIC execution grant.
revoke execute on function private.prepare_order_operational_incident()
  from public, anon, authenticated, service_role;
revoke execute on function private.audit_order_operational_incident_lifecycle()
  from public, anon, authenticated, service_role;
revoke execute on function private.materialize_order_operational_postmortem()
  from public, anon, authenticated, service_role;

comment on function private.prepare_order_operational_incident() is
  'ORD-001 trigger-only incident preparation authority; no direct role execution.';
comment on function private.audit_order_operational_incident_lifecycle() is
  'ORD-001 trigger-only incident audit authority; no direct role execution.';
comment on function private.materialize_order_operational_postmortem() is
  'ORD-001 trigger-only postmortem projection authority; no direct role execution.';

commit;
