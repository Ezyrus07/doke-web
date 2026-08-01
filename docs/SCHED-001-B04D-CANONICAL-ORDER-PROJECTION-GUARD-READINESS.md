# SCHED-001 / B04D — Canonical order projection guard

## Status

The migration was exactly authorized, applied and verified on Doke staging. It was not applied to production.

Remote migration identity:

```text
20260801185150_sched_b04d_canonical_order_projection_guard
```

Project:

```text
zwkczgewzbsorbrjuzpb — doke-web-staging
```

## Root cause

The exactly authorized B04C staging canary reached the canonical reservation cancellation path and failed closed with `DOKE_ORDER_TRANSITION_INVALID` while attempting to restore the linked order from `scheduled` to `accepted`.

The failure exposed an integration mismatch:

- SCHED owns the canonical reservation lifecycle;
- cancellation clears `schedule_reservation_id` and `scheduled_at` and restores the order to `accepted`;
- the previous deployed ORD trigger permitted `scheduled -> in_progress` and `scheduled -> cancelled`, but not the canonical SCHED restoration `scheduled -> accepted`;
- opening that transition globally would weaken ORD authority and allow privileged generic status updates to dismantle schedule state.

The failed canary transaction ended in `ROLLBACK`. All fifteen canary residue counters remained zero and all authority counts were unchanged.

## Applied design

B04D installs two private PostgreSQL functions:

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

The generic ORD graph remains unchanged. `scheduled -> accepted` was not added to `private.doke_order_transition_allowed`.

Direct writes to `orders.schedule_reservation_id` or `orders.scheduled_at` fail with `DOKE_ORDER_SCHEDULE_PROJECTION_CONTEXT_REQUIRED` unless they come from the private canonical functions with a matching transaction context.

## Verification completed

The application was verified through independent read-only checks:

- migration history contains version `20260801185150`;
- both private projection functions exist;
- both are `SECURITY DEFINER` with explicit `search_path`;
- `PUBLIC`, `anon` and `authenticated` cannot execute them;
- `service_role` can execute only the two canonical projection functions;
- `trg_orders_state_machine` remains enabled on `public.orders`;
- canonical project and clear guards are present;
- direct projection writes remain rejected;
- the generic transition graph remains enforced;
- null argument guards returned the exact expected domain errors;
- no B04D-specific security or performance advisor finding was introduced.

The Supabase advisors returned pre-existing notices involving other tables and public RPCs. No remediation outside B04D was performed under this authorization.

## Repository evidence

- migration: `supabase/migrations/20260801183000_sched_b04d_canonical_order_projection_guard.sql`;
- adapter: `backend/modules/scheduling/scheduling-postgres-repository.js`;
- state config: `config/sched-001-b04d-canonical-order-projection-guard-readiness.json`;
- validation evidence: `docs/validation/SCHED-001-B04D-CANONICAL-ORDER-PROJECTION-GUARD-READINESS.json`;
- audit and runtime tests under `scripts/`;
- read-only GitHub Actions gate.

## Consumed authorization

The migration was applied under exactly:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_B04D_CANONICAL_ORDER_PROJECTION_GUARD_MIGRATION_ON_DOKE_STAGING
```

That authorization is consumed and cannot be reused. It covered only the B04D migration and verification on staging.

It did not authorize:

- B04C canary retry;
- production access;
- deployment;
- frontend authority activation;
- Cron or worker activation;
- billing or infrastructure changes;
- merge or auto-merge.

## Required next authorization

The authenticated B04C retry requires a separate authorization:

```text
I_EXPLICITLY_AUTHORIZE_SCHED_B04C_AUTHENTICATED_ORD_SCHED_COMPOSITION_CANARIES_ON_DOKE_STAGING
```

Until that retry passes with final `ROLLBACK`, zero residue and unchanged authority counts, `SCHED-B04` and `ORD-B04` remain open.
