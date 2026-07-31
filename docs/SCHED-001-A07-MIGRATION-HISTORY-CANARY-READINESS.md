# SCHED-001-A07 — Migration History Reconciliation and Rolled-Back Canary Readiness

## Objective

SCHED-A06 applied the canonical A03 and A04 schema to `doke-web-staging` and verified the resulting authority, grants, RLS, overlap constraint, DST compatibility and legacy `availability_slots` hardening.

The Supabase migration application endpoint recorded execution-time versions instead of the repository filename versions:

| Meaning | Repository version | Remote recorded version |
| --- | --- | --- |
| Canonical scheduling authority | `20260731123000` | `20260731141315` |
| DST local projection correction | `20260731151000` | `20260731141349` |

Supabase compares migration timestamps, not names or SQL content. The schema is correct, but future CLI migration operations would see the local and remote histories as divergent.

## Frozen repair strategy

Only the official Supabase CLI migration-history repair mechanism is accepted. Direct `insert`, `update` or `delete` against `supabase_migrations.schema_migrations` is prohibited.

The future authorized sequence is:

```text
supabase migration repair 20260731141315 20260731141349 --status reverted --linked
supabase migration repair 20260731123000 20260731151000 --status applied --linked
supabase migration list --linked
```

This operation changes migration history only. It must not re-run the A03/A04 SQL, rename the canonical repository files or modify schema objects.

Exact local/remote alignment is a hard gate. Canary execution must abort when any of the four versions differs from the frozen plan.

## Rolled-back staging canary

`supabase/tests/020_sched_a07_rolled_back_canaries.sql` is a single PostgreSQL transaction that always ends with `ROLLBACK`.

It uses one existing staging client and professional selected internally by role without returning their identifiers. All orders, rules, reservations, idempotency records and events created by the canary are synthetic and exist only inside that transaction.

The canary proves:

1. canonical availability-rule insertion;
2. GiST exclusion rejects active overlap;
3. `[start,end)` adjacency remains valid;
4. a valid UTC range can project to a decreasing local wall clock during DST fall-back;
5. idempotency scope uniqueness;
6. durable event aggregate uniqueness;
7. order projection through `schedule_reservation_id` and `scheduled_at`;
8. rollback leaves every aggregate count unchanged.

The canary file has no `COMMIT`, DDL, migration-history statement, production reference, deployment command or runtime activation.

## Current staging evidence

Read-only verification after A06 established:

- PostgreSQL `17.6`;
- canonical scheduling schema applied;
- `btree_gist` installed in `extensions`;
- RLS enabled on all four authorities;
- `anon` and `authenticated` have no DML grants;
- `service_role` has explicit server-side DML grants;
- half-open overlap exclusion active;
- invalid local wall-clock ordering constraint removed;
- legacy browser policies cannot create or mutate `booked`;
- one staging client and one staging professional exist;
- zero orders and zero canonical scheduling rows.

SCHED-B05 is therefore closed. SCHED-B02, SCHED-B03 and SCHED-B04 remain open.

## Authorization firewall

A generic continuation command does not authorize history mutation or a rolled-back database canary.

The exact required phrase is:

`I_EXPLICITLY_AUTHORIZE_SCHED_A07_MIGRATION_HISTORY_REPAIR_AND_ROLLED_BACK_CANARIES_ON_DOKE_STAGING`

That phrase authorizes only:

- the four frozen migration-history repair operations on `doke-web-staging`;
- migration-list verification;
- execution of the single SCHED-A07 SQL transaction ending in rollback;
- read-only aggregate verification after rollback.

It does not authorize persistent rows, runtime activation, ORD-001 wiring, Cron, workers, deployment, production, secrets, billing or PR merge.

## Operational safety

- staging reads in A07 readiness: 1;
- staging mutations in A07 readiness: 0;
- migration-history mutations in A07 readiness: 0;
- canaries executed in A07 readiness: 0;
- production changes: 0;
- deploys: 0;
- PR merge: 0.

## Next controlled sublot

`SCHED-A08 — Authorized Migration History Repair and Rolled-Back Staging Canary Execution`

SCHED-A08 remains blocked until the exact authorization phrase is supplied.
