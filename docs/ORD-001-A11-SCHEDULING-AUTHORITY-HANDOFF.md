# ORD-001 A11 — Scheduling Authority Handoff

## Objective

Transfer the unresolved scheduling responsibility represented by `ORD-B04` to the canonical implementation authority of `SCHED-001`, without closing the blocker, creating a second scheduling system inside `ORD-001`, or changing any live environment.

This sublot is repository-only. It performs no staging mutation, migration application, deployment, provider action, production change or pull-request merge.

## Corrected baseline

The previous matrix statement that `availability_slots` simply had RLS disabled is incomplete relative to the current repository.

- migration `113_availability_reviews_authority.sql` enables RLS and defines owner/operator write policies;
- migration `119_public_policy_role_separation.sql` separates anonymous available-slot reads from authenticated owner/operator reads;
- `SCHED-A01` now proves the deployed schema, RLS, policies, grants and migration versions through read-only staging inspection;
- `backend/modules/scheduling` still has no implemented scheduling service;
- no database-level active-range anti-double-booking contract is present;
- order creation still accepts raw `scheduledAt`/`scheduled_at` directly;
- browser order projections still carry desired date, shift and service availability snapshot data.

Therefore, `SCHED-B01` is closed. The server-authority, concurrency, order-integration and reservation-status boundaries remain open implementation problems.

## SCHED-A01 security finding

RLS is correctly deployed, but the owner update policy does not constrain the new status. A professional can currently update their own slot to `booked` without a canonical reservation command. `SCHED-B05` records this authority-conflation defect.

## Canonical ownership

### `SCHED-001` owns

- professional availability rules and exceptions;
- public available-slot projection;
- temporary booking holds and their expiration;
- confirmed reservations;
- conflict detection and anti-double-booking enforcement;
- rescheduling and cancellation policy;
- timezone and daylight-saving interpretation;
- schedule command idempotency and optimistic concurrency;
- durable schedule lifecycle events.

### `ORD-001` owns

- the order lifecycle and participant authorization;
- proposal acceptance and service-execution states;
- a reference to one canonical schedule reservation;
- a read projection of the confirmed time;
- reactions to durable schedule events.

`ORD-001` must not own independent availability rules, browser-only booking authority, parallel conflict checks, or raw `scheduled_at` as the final reservation authority.

## Target reservation model

The implementation phase should converge on one occupancy authority, conceptually named `schedule_reservations`, with at least:

- professional and order references;
- `starts_at` and `ends_at` as `timestamptz`;
- an IANA timezone;
- status `held`, `confirmed`, `cancelled` or `expired`;
- hold expiration;
- optimistic version;
- idempotency key;
- audit timestamps.

Active `held` or `confirmed` ranges for one professional must not overlap. The preferred PostgreSQL primitive is a GiST exclusion constraint over `professional_id` and a half-open `tstzrange(starts_at, ends_at, '[)')`, scoped to active occupancy.

Orders should eventually reference the canonical reservation through `schedule_reservation_id`. `orders.scheduled_at` may remain as a denormalized read projection, but must stop acting as booking authority.

## Command and event boundary

Expected commands:

1. `upsert_availability_rule`;
2. `create_schedule_hold`;
3. `confirm_schedule_reservation`;
4. `reschedule_reservation`;
5. `cancel_schedule_reservation`;
6. `expire_schedule_holds`.

Expected durable events:

- `schedule.hold_created`;
- `schedule.hold_expired`;
- `schedule.confirmed`;
- `schedule.rescheduled`;
- `schedule.cancelled`.

## Time policy

- canonical instants are stored in UTC using `timestamptz`;
- recurring availability retains an IANA timezone and local wall-clock intent;
- nonexistent local times during daylight-saving transitions are rejected explicitly;
- ambiguous repeated local times require an explicit offset or one documented deterministic policy;
- occupied ranges use the half-open convention `[start,end)`.

## Remaining execution order

1. freeze the SCHED command, event, timezone, idempotency, status-authority and conflict contracts;
2. generate and test a migration locally without applying it;
3. implement the server scheduling module;
4. wire accepted proposals and orders to canonical reservation references;
5. only then run separately authorized staging application and concurrency canaries.

## Closure decision

`ORD-B04` remains open. `SCHED-001` also remains incomplete.

The handoff eliminates ambiguity of ownership; it does not implement the scheduling backend or authorize any live change. Generic continuation does not authorize migration application, staging mutation, deployment, production or merge.


## Progression after SCHED-A02

SCHED-A02 is complete as a repository-only executable contract. The next safe sublot is SCHED-A03 migration generation and local tests; no migration application or staging mutation is authorized.
