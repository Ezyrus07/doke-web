# SCHED-001 A02 — Command, Event, Timezone and Conflict Contract Freeze

## Objective

Freeze the server-authoritative scheduling contract before any reservation migration or runtime implementation exists.

This sublot is repository-only. It adds an executable pure contract and deterministic tests, but performs no staging read, staging mutation, migration application, deployment, production change or pull-request merge.

## Authority

`SCHED-001` is the only canonical owner of availability, holds, confirmed reservations, conflicts, rescheduling, cancellation, timezone interpretation and scheduling lifecycle events.

The professional owns availability intent. A professional cannot directly mark a slot as booked. Confirmed occupancy can only be produced by a server command after validating the order authorization context.

`ORD-001` owns the order lifecycle and participant authorization. It will eventually retain only `schedule_reservation_id` and an event-driven schedule projection. Raw `scheduled_at` cannot remain booking authority.

## Canonical entities

### Availability rule

An availability rule preserves recurring local wall-clock intent and explicit exceptions. It requires an IANA timezone and uses optimistic versioning.

States: `active`, `paused`, `archived`.

### Schedule reservation

A schedule reservation is the single occupancy authority for both temporary holds and confirmed bookings.

States: `held`, `confirmed`, `cancelled`, `expired`.

Only `held` and `confirmed` occupy time. `cancelled` and `expired` are terminal and do not block a new reservation.

## Command boundary

### `upsert_availability_rule`

Authorized for the professional owner, support or admin. Updates require `expected_version`. It emits `schedule.availability_rule_upserted` on the `availability_rule` aggregate.

### `create_schedule_hold`

Authorized for the authenticated client who participates in the order, plus support or admin. It requires an eligible order, matching professional, canonical availability, valid UTC range and IANA timezone, idempotency key and no active overlap. Default hold TTL is 600 seconds and may vary only between 300 and 900 seconds.

### Reservation mutation commands

`confirm_schedule_reservation`, `reschedule_reservation` and `cancel_schedule_reservation` execute only through the server command boundary after validating actor, order context, version and conflicts. The professional or browser cannot confirm booking directly.

### `expire_schedule_holds`

Only the scheduling worker or service role can expire held rows. The command is batch-bounded and emits one durable reservation event for every accepted transition.

## State transitions

Allowed transitions:

- `held` → `confirmed`;
- `held` → `cancelled`;
- `held` → `expired`;
- `confirmed` → `confirmed` through atomic rescheduling;
- `confirmed` → `cancelled`.

All other transitions fail with `DOKE_SCHEDULE_INVALID_TRANSITION`.

## Idempotency and optimistic concurrency

Idempotency is scoped by command name, authenticated actor or service principal, and idempotency key.

- same key and same payload: return the original canonical result without another mutation or event;
- same key and different payload: reject with `DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT`.

Every canonical mutation requires `expected_version` and a locked row. A mismatch returns `DOKE_SCHEDULE_VERSION_CONFLICT`. The version starts at 1 and increments once per accepted mutation.

## Timezone policy

- canonical instants are stored as UTC `timestamptz`;
- availability rules retain an IANA timezone and local wall-clock intent;
- reservation ranges use half-open `[start,end)` semantics;
- adjacent ranges do not conflict;
- nonexistent local times are rejected;
- ambiguous local times require an explicit offset or are rejected;
- original timezone, local input and resolved offset must be retained for audit;
- minimum duration is 15 minutes;
- maximum duration is 30 days.

## Conflict policy

Two ranges conflict when `startA < endB AND startB < endA`.

The future database rule must use `btree_gist` and a partial GiST exclusion constraint equivalent to:

- `professional_id WITH =`;
- `tstzrange(starts_at, ends_at, '[)') WITH &&`;
- active predicate `status IN ('held','confirmed')`.

Expired holds must be transitioned to `expired` before they stop participating in the exclusion constraint. The create-hold transaction must lazily expire stale conflicting holds before insert; the scheduled expiration worker is defense in depth.

A conflict returns `DOKE_SCHEDULE_CONFLICT`.

## Durable event boundary

The future event store is `private.schedule_domain_events` and is aggregate-aware.

- availability changes use aggregate type `availability_rule` and reference `availability_rule_id` without a reservation or order reference;
- hold and reservation changes use aggregate type `reservation` and require `reservation_id` plus `order_id`.

Event keys follow `schedule:{aggregate_type}:{aggregate_id}:v{sequence_no}`. This corrects the original reservation-only key shape, which could not represent `schedule.availability_rule_upserted` truthfully.

Event types:

- `schedule.availability_rule_upserted`;
- `schedule.hold_created`;
- `schedule.hold_expired`;
- `schedule.confirmed`;
- `schedule.rescheduled`;
- `schedule.cancelled`.

Canonical mutation and durable event insertion must commit atomically. Reservation commands that change the order projection must update that projection in the same transaction.

## Executable contract

`backend/modules/scheduling/scheduling-contract.js` provides deterministic, side-effect-free checks for valid ranges, half-open overlap behavior, active occupancy conflicts, actor authorization, state transitions, optimistic versions, idempotency replay, aggregate-aware event keys and hold expiration.

`scripts/test-sched-001-a02-contract-runtime.js` proves the frozen semantics without database, network or browser access.

## Blocker disposition

No blocker is closed by this sublot.

- `SCHED-B02`: command contract frozen; server runtime remains absent;
- `SCHED-B03`: conflict contract frozen; migration and concurrent proof remain absent;
- `SCHED-B04`: order integration frozen; migration application and runtime integration remain absent;
- `SCHED-B05`: direct-booking prohibition frozen; policy hardening application and server commands remain absent.

## Compatibility correction recorded in SCHED-A03

SCHED-A03 found that the original reservation-only durable-event envelope could not represent an availability-rule event. Contract v2 introduces explicit aggregate type and aggregate ID while preserving the six frozen event types and all command semantics.

## Next step

The next safe sublot is `SCHED-A04 — Server Scheduling Command Module and Deterministic Runtime Tests`.

Generic continuation may implement repository-only server commands and tests. It must not apply the A03 migration to staging.

## Execution evidence

- network requests: 0;
- staging reads: 0;
- staging mutations: 0;
- migrations applied: 0;
- deployments: 0;
- production changes: 0;
- merge: not authorized.
