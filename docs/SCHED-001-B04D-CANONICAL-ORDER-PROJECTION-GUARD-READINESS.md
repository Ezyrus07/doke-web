# SCHED-001 / B04D — Canonical order projection guard readiness

## Status

Repository-only readiness. No migration was applied to staging or production.

## Root cause

The exactly authorized B04C staging canary reached the canonical reservation cancellation path and failed closed with `DOKE_ORDER_TRANSITION_INVALID` while attempting to restore the linked order from `scheduled` to `accepted`.

The failure exposed an integration mismatch:

- SCHED owns the canonical reservation lifecycle;
- cancellation clears `schedule_reservation_id` and `scheduled_at` and restores the order to `accepted`;
- the deployed ORD trigger permits `scheduled -> in_progress` and `scheduled -> cancelled`, but not the canonical SCHED rollback `scheduled -> accepted`;
- opening that transition globally would weaken ORD authority and allow privileged generic status updates to dismantle schedule state.

The failed transaction ended in `ROLLBACK`. All fifteen canary residue counters remained zero and all authority counts were unchanged.

## Design

B04D introduces two private PostgreSQL functions:

- `private.apply_order_schedule_projection(order_id, reservation_id, scheduled_at)`;
- `private.clear_order_schedule_projection(order_id, reservation_id)`.

They are executable only by `service_role` and establish a transaction-local context containing:

- operation mode (`project` or `clear`);
- expected order ID;
- expected reservation ID.

The order trigger accepts schedule-field mutations only when that context matches the exact row mutation.

### Projection requirements

Projection succeeds only when:

- the reservation belongs to the order;
- the reservation is `confirmed`;
- the projected time equals the reservation start;
- the order is `accepted` or already `scheduled`;
- an existing reservation reference is either absent or identical.

### Clear requirements

Clearing succeeds only when:

- the reservation belongs to the order;
- the reservation is `cancelled` or `expired`;
- the order references that reservation;
- reference and time are cleared together;
- a `scheduled` order returns to `accepted` atomically.

### Fail-closed behavior

The generic ORD graph remains unchanged. `scheduled -> accepted` is not added to `private.doke_order_transition_allowed`.

Direct writes to `orders.schedule_reservation_id` or `orders.scheduled_at` fail with `DOKE_ORDER_SCHEDULE_PROJECTION_CONTEXT_REQUIRED` unless they come from the private canonical functions with a matching transaction context.

## Repository changes

- migration: `supabase/migrations/20260801183000_sched_b04d_canonical_order_projection_guard.sql`;
- adapter target: `backend/modules/scheduling/scheduling-postgres-repository.js`;
- readiness config: `config/sched-001-b04d-canonical-order-projection-guard-readiness.json`;
- validation evidence: `docs/validation/SCHED-001-B04D-CANONICAL-ORDER-PROJECTION-GUARD-READINESS.json`;
- audit and runtime tests under `scripts/`;
- read-only GitHub Actions gate.

## Security boundaries

This sublot does not authorize or perform:

- staging migration application;
- production access;
- manual edits to `supabase_migrations.schema_migrations`;
- deployment;
- frontend authority activation;
- Cron or worker activation;
- billing or infrastructure changes;
- merge or auto-merge.

## Required next authorization

Migration application to Doke staging requires exactly:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_B04D_CANONICAL_ORDER_PROJECTION_GUARD_MIGRATION_ON_DOKE_STAGING
```

That phrase covers only the B04D migration on staging. A B04C canary retry requires a separate, later authorization after migration verification.
