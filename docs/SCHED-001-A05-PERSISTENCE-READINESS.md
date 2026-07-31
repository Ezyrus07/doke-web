# SCHED-001 A05 — PostgreSQL Persistence Adapter and Staging Readiness

## Status

SCHED-A05 is complete at repository and read-only staging-preflight level. The canonical scheduling migrations remain unapplied and unauthorized.

## Why a PostgreSQL adapter

`supabase-js` and PostgREST do not expose a client-controlled transaction that can group multiple table calls. The A04 command runtime requires idempotency, canonical mutation, durable event insertion and order projection to commit or roll back as one unit. A05 therefore implements a concrete PostgreSQL adapter over an injected server-side pool/client.

The adapter does not read environment variables, create credentials or expose a service-role key. Composition and secret delivery remain deployment concerns.

## Adapter contract

`backend/modules/scheduling/scheduling-postgres-repository.js` implements all 15 transaction-port methods required by A04.

Each command runs under:

- one acquired PostgreSQL connection;
- `SERIALIZABLE` isolation by default;
- read-write transaction semantics;
- transaction-local lock and statement timeouts;
- parameterized SQL;
- commit on success;
- rollback on every failure;
- connection release in `finally`.

Optimistic updates return SQLSTATE-compatible `40001` when the expected version no longer matches. The A04 boundary maps exclusion constraint SQLSTATE `23P01` to `DOKE_SCHEDULE_CONFLICT`.

Expired hold batches use `FOR UPDATE SKIP LOCKED`, allowing multiple trusted workers to divide work without processing the same rows.

## Idempotency

The adapter first attempts an insert into `private.schedule_command_idempotency`. A duplicate key is read with `FOR UPDATE` inside the same transaction.

This preserves new claim arbitration, immutable completed replay, fail-closed in-progress behavior, request-hash validation in A04 and rollback of a newly inserted claim when the command fails.

No cleanup or recovery of abandoned in-progress claims is activated in A05.

## Availability rule v1

The persisted v1 evaluator recognizes the frozen local rule shape used by A04:

```json
{
  "weekdays": [1, 2, 3, 4, 5],
  "windows": [{ "start": "09:00", "end": "18:00" }]
}
```

The evaluator fails closed when the timezone differs, the rule shape is unknown, the range crosses a local calendar date, a window is malformed or the requested range falls outside the window.

UTC remains the reservation ordering authority. Local values are availability intent and audited projections.

## Read-only staging preflight

Project: `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

Three aggregate-only SQL reads were executed. No user-level rows or identifying values were retrieved.

Observed state:

- PostgreSQL `17.6`;
- project healthy;
- `public.schedule_availability_rules` absent;
- `public.schedule_reservations` absent;
- `private.schedule_command_idempotency` absent;
- `private.schedule_domain_events` absent;
- `orders.schedule_reservation_id` absent;
- `btree_gist` absent;
- migration versions `20260731123000` and `20260731151000` absent;
- `availability_slots` rows: `0`;
- `orders` rows: `0`;
- overlapping legacy slot pairs: `0`.

The current legacy policies still permit a professional to insert `booked`, update a row already marked `booked`, or change another state to `booked`. A03 contains the required hardening but has not been applied.

## Compatibility decision

The migrations are application-ready but not application-authorized.

Compatibility gates passed because staging runs PostgreSQL 17, A03 creates `btree_gist` before the GiST exclusion constraint, the canonical scheduling tables do not already exist, no order backfill is required, no existing scheduling data can conflict, and A04 is ordered immediately after A03.

Required migration order:

1. `20260731123000_sched_a03_reservation_authority.sql`;
2. `20260731151000_sched_a04_dst_local_projection_compatibility.sql`.

## Authorization firewall

Generic commands such as `próximo`, `continue` or `pode prosseguir` do not authorize application.

The exact phrase required for a future staging-only application is:

`I_EXPLICITLY_AUTHORIZE_SCHED_A03_A04_MIGRATIONS_ON_DOKE_STAGING`

Even after that phrase, runtime activation, ORD wiring, workers, deployments, production, billing and PR merge remain blocked.

## Rollback

Rollback must be forward-only through a separately reviewed migration. Migration-history rows must never be deleted manually.

Before rollback, confirm runtime and workers remain disconnected, verify the four authority tables have no operational rows, decide whether restoring weaker legacy policies is acceptable, remove the order reference before reservation authority, preserve `btree_gist` when another object depends on it, and verify aggregate counts afterward.

## Blockers

No SCHED blocker is closed in A05:

- `SCHED-B02`: adapter exists; schema, composition root and activation are pending;
- `SCHED-B03`: readiness exists; application and remote concurrent proof are pending;
- `SCHED-B04`: projection SQL exists; schema application and ORD wiring are pending;
- `SCHED-B05`: hardening is ready; application is pending.

## Operational evidence

- staging reads: 3;
- staging mutations: 0;
- migrations applied: 0;
- deployments: 0;
- Cron changes: 0;
- production changes: 0;
- merge: 0.

## Next sublot

`SCHED-A06 — Authorized Staging Migration Application and Read-Only Post-Application Verification`

A06 cannot start from a generic next-step command. It requires the exact authorization phrase above.
