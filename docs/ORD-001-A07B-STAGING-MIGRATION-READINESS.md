# ORD-001 A07B — Staging Migration Application Readiness

## Objective

Prepare a fail-closed, auditable path for applying the worker invocation nonce ledger migration to Doke staging without treating a generic continuation command as permission to mutate the database.

## Canonical migration identity

Only this migration is eligible:

`supabase/migrations/20260730144324_ord_a07b_worker_invocation_nonce_ledger.sql`

Required SHA-256:

`8060dae0b5cd896c558872cd9abd1dc7bc5ba06a3707816f228ab5bc429abe68`

A hash mismatch blocks the operation. Renamed, regenerated or edited variants are not interchangeable.

## Read-only staging preflight

The current staging inspection confirmed:

- nonce ledger table absent;
- nonce consume RPC absent;
- migration version `20260730144324` absent from migration history;
- `pgcrypto` installed;
- `service_role` already has `USAGE` on `extensions`;
- `service_role` does not yet have `USAGE` on `private`, which the migration grants explicitly;
- zero orders, budgets, status history, domain events, metrics and delivery attempts.

This inspection performed no mutation.

## Authorization boundary

Applying SQL to staging requires exactly:

`I_EXPLICITLY_AUTHORIZE_ORD_A07B_NONCE_LEDGER_MIGRATION_ON_DOKE_STAGING`

Commands such as `proximo`, `próximo`, `pode prosseguir` and `continue` are not authorization.

Even the exact phrase authorizes only:

1. applying the canonical migration to Doke staging;
2. read-only post-application verification.

It does not authorize Cron changes, Edge Function wiring or deployment, replay canaries, production changes, Railway, billing, accounts or secrets.

## Planner behavior

`scripts/plan-ord-001-a07b-staging-migration.js` supports only:

- `--dry-run`;
- `--check-env`.

There is no execute mode. The planner performs no network request and no database mutation.

`--check-env` recognizes readiness only when:

- target environment is exactly `staging`;
- the operator-supplied digest matches the canonical SHA-256;
- the exact authorization phrase matches;
- no production environment marker is present.

Recognition does not apply the migration. It only proves that a later, separately implemented execution path received the required inputs.

## Mandatory post-application verification

After an authorized application, the controlled flow must verify:

1. migration history contains `20260730144324`;
2. private ledger table exists;
3. consume RPC exists;
4. RLS is enabled;
5. `anon` and `authenticated` cannot execute the RPC;
6. `service_role` can execute the RPC;
7. first use of a test nonce succeeds;
8. duplicate use fails;
9. stale and excessively future timestamps fail;
10. all order-domain row counts remain unchanged.

The verification nonce must be explicitly test-scoped and removed by the bounded retention behavior. No real order is required.

## Rollback strategy

Rollback is forward-only. Migration history must never be edited manually.

If rollback becomes necessary:

1. keep Cron and the Edge Function disconnected;
2. prove the ledger has no non-test operational rows;
3. create a separate reviewed rollback migration;
4. revoke RPC execution;
5. drop the RPC;
6. drop the private table and index;
7. apply the rollback only to staging;
8. prove order-domain counts remain unchanged.

## Current state

- migration application: unauthorized;
- staging database mutations: zero;
- Edge Function wiring: absent;
- Cron header changes: absent;
- remote replay canary: absent;
- production: blocked;
- Railway: unselected.
