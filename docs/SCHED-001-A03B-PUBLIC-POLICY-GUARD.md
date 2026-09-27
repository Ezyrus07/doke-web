# SCHED-A03B — Public Policy Guard

## Root cause

The canonical platform ACL validation requires every public table to have RLS and at least one policy. Staging exposed two SCHED-A03 exceptions:

- `public.schedule_availability_rules`;
- `public.schedule_reservations`.

Both already had RLS enabled, browser grants revoked and explicit CRUD granted only to `service_role`. Their server-only authority was correct, but the absence of any `pg_policy` row violated the global post-creation ACL gate.

## Decision

SCHED-A03B adds one explicit restrictive fail-closed policy to each table:

- applies only to `anon` and `authenticated`;
- covers all commands;
- `USING (false)`;
- `WITH CHECK (false)`.

No browser privilege is granted. The policy is defense in depth on top of the existing table-level revokes.

## Server compatibility

The canonical server path remains unchanged. Supabase staging reports `service_role.rolbypassrls = true`, and the original SCHED-A03 grants remain `SELECT, INSERT, UPDATE, DELETE` for `service_role`.

The new policies intentionally do not target `service_role` and do not change any server grants.

## Migration discipline

The already-applied SCHED-A03 migration is not modified. This sublot is an additive migration so Git history remains compatible with staging migration history.

## Validation

Repository validation must prove:

- both policies are restrictive and always false;
- browser grants remain absent;
- service-role CRUD remains present in the original authority;
- RLS cannot be disabled by the patch;
- the platform ACL contract remains unchanged.

After repository validation, staging promotion must run:

1. the SCHED-A03B transactional validation;
2. `supabase/tests/013_platform_default_acl_validation.sql`;
3. read-only privilege/policy inspection.

No production application or PR merge is authorized by this sublot.
