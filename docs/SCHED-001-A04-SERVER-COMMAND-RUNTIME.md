# SCHED-001 A04 — Server Scheduling Command Module and Deterministic Runtime Tests

## Objective

Implement the repository-only server command runtime for canonical scheduling without applying the generated schema, contacting staging, deploying a service or exposing browser mutation authority.

This sublot converts the frozen A02 semantics into executable orchestration against a transaction-capable repository port. It does not claim that a Supabase or production persistence adapter exists.

## Architecture

The runtime is separated by responsibility:

- `scheduling-service.js` owns command dispatch, trusted actor validation, idempotency claim/replay and transaction orchestration;
- `scheduling-command-handlers.js` owns the six canonical command workflows and durable event construction;
- `scheduling-repository-port.js` freezes the transaction adapter required by a future server implementation;
- `scheduling-timezone.js` verifies IANA timezone projections, local wall-clock inputs and explicit offsets;
- `scheduling-normalization.js` owns canonical payload normalization, deterministic hashing and immutable results;
- `scheduling-errors.js` owns runtime error codes.

No module imports Supabase, browser APIs, environment secrets or network clients.

## Transaction boundary

Every command executes inside one injected `repository.transaction` callback.

Within the same transaction, the runtime coordinates as applicable:

1. idempotency claim;
2. canonical order, availability or reservation reads;
3. actor and order-participant validation;
4. optimistic version validation;
5. canonical availability validation;
6. active-range conflict preflight;
7. availability or reservation mutation;
8. durable event insertion;
9. `orders.schedule_reservation_id` and `scheduled_at` projection update or clear;
10. idempotency completion.

Any failure must roll back the entire callback. The database GiST exclusion constraint remains the final anti-double-booking authority after separately authorized migration application.

## Commands implemented

### `upsert_availability_rule`

- professional owner, support or admin only;
- owner identity is checked against `professional_id`;
- IANA timezone is required;
- updates require `expected_version`;
- emits aggregate-aware `schedule.availability_rule_upserted`.

### `create_schedule_hold`

- canonical client participant, support or admin only;
- order and professional must match;
- terminal orders are rejected;
- UTC range, IANA timezone, local projections and explicit start offset are verified;
- canonical availability and active overlap are checked;
- creates a 600-second hold by default;
- emits `schedule.hold_created`.

### `confirm_schedule_reservation`

- order service, support or admin only;
- requires a current `held` row and matching `expected_version`;
- an expired hold cannot be confirmed;
- atomically projects `schedule_reservation_id` and `scheduled_at` to the order;
- emits `schedule.confirmed`.

### `reschedule_reservation`

- order service, support or admin only;
- requires a confirmed reservation and matching version;
- revalidates timezone, availability and conflicts;
- preserves confirmed state while incrementing the version;
- atomically updates the order read projection;
- emits `schedule.rescheduled`.

### `cancel_schedule_reservation`

- order service, support or admin only;
- accepts held or confirmed reservations;
- requires version and reason;
- clears the order scheduling projection;
- emits `schedule.cancelled`.

### `expire_schedule_holds`

- schedule worker or service role only;
- requires a bounded batch and idempotency key;
- transitions every accepted expired hold with one version increment and one durable event;
- executes the batch atomically;
- emits `schedule.hold_expired` per row.

## Idempotency

The normalized command payload is deterministically serialized and hashed with SHA-256.

The scope is:

`command_name + principal_key + idempotency_key`

Behavior:

- same key and same payload after completion returns the immutable original result;
- same key and different payload returns `DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT`;
- the same payload while a claim is active returns `DOKE_SCHEDULE_IDEMPOTENCY_IN_PROGRESS`;
- command failures roll back the claim with the rest of the transaction;
- retention is at least 30 days.

The A03 `failed` ledger state remains available for a future adapter recovery policy, but the reference runtime does not persist a failed claim outside the failed command transaction.

## Timezone and DST

UTC `starts_at` and `ends_at` remain the only ordering authority.

The runtime:

- validates the IANA timezone with `Intl.DateTimeFormat`;
- projects each UTC instant back into the supplied local wall-clock value;
- verifies the explicit offset for the start instant;
- rejects nonexistent local times because they cannot project back to the supplied value;
- accepts an ambiguous repeated time only when the supplied UTC instant and explicit offset identify the intended occurrence;
- independently verifies the end local projection, including offset changes within a range.

### DST compatibility correction

A03 generated `local_end > local_start`. That rule is invalid across a daylight-saving fall-back because a later UTC instant can project to an equal or earlier local clock value.

The append-only repository migration:

`supabase/migrations/20260731151000_sched_a04_dst_local_projection_compatibility.sql`

drops only `schedule_reservations_local_range`. UTC ordering and duration constraints remain intact. This correction is generated but not applied.

## Deterministic proof

`scripts/test-sched-001-a04-scheduling-service-runtime.js` uses an in-memory transaction adapter with rollback snapshots. The explicit fault injection is named `synthetic event failure`.

It proves:

- all six commands;
- professional-owner and client-participant enforcement;
- immutable replay and different-payload rejection;
- overlap rejection and adjacent-range acceptance;
- optimistic version conflicts;
- hold expiry and late-confirmation rejection;
- atomic rollback when durable event insertion fails;
- order projection set, update and clear behavior;
- canonical availability rejection;
- terminal-order rejection;
- invalid IANA timezone rejection;
- nonexistent New York spring-forward time rejection;
- both explicit occurrences of a repeated New York fall-back time;
- PostgreSQL exclusion error `23P01` mapping.

The proof uses no database, network, browser or staging access.

## Blocker disposition

No blocker is closed artificially.

- `SCHED-B02`: the command runtime exists, but a transaction-capable persistence adapter and activation are pending;
- `SCHED-B03`: local overlap behavior and database error mapping are proven, but migrations and a remote concurrent proof are absent;
- `SCHED-B04`: the order projection port exists, but the schema is not applied and ORD-001 is not wired to it;
- `SCHED-B05`: the server actor boundary exists, but the legacy policy hardening is not applied.

## Next step

`SCHED-A05 — Transactional Persistence Adapter and Staging Migration Readiness, Rollback and Compatibility Gate`

It must remain repository-only and read-only against staging unless a separate exact authorization is provided. It should freeze the concrete persistence strategy, preflight both generated migrations, define rollback and validate compatibility without applying DDL.

## Execution evidence

- network requests: 0;
- staging reads: 0;
- staging mutations: 0;
- migrations applied: 0;
- deployments: 0;
- Cron changes: 0;
- production changes: 0;
- merge: not authorized.
