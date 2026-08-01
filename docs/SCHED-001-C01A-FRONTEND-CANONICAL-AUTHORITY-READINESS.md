# SCHED-001 / C01A — Frontend canonical scheduling authority readiness

## Objective

Freeze the browser read and command boundaries before any scheduling surface is connected to the canonical ORD/SCHED authority.

This sublot is repository-only. It performs no staging read, staging mutation, migration, deployment, frontend activation, Cron or worker activation, production access or merge.

## Canonical authority

A confirmed booking exists only when the complete tuple is valid:

```text
orders.schedule_reservation_id is present
orders.scheduled_at is present
orders.status = scheduled
referenced reservation is confirmed and belongs to the order
```

A date by itself is never booking authority. The browser may not write `schedule_reservation_id`, `scheduled_at` or `scheduled` directly.

## Current frontend findings

### Orders repository

`assets/js/repositories/orders-repository.js` maps `row.scheduled_at` into `scheduledAt`, but it does not map `row.schedule_reservation_id` into an explicit browser field. It also does not derive `scheduleAuthority` or `hasCanonicalSchedule`.

This means the browser cannot currently distinguish a complete canonical projection from a detached date.

### Orders service

`assets/js/services/orders-service.js` does not define a generic browser transition to `scheduled` and does not define a dedicated generic scheduled action. This is a required safety property and must be preserved.

### Quote form

`assets/js/pages/orcamento.js` submits `desiredDate` and the legacy alias `daté`. It does not submit `scheduledAt` or a reservation reference.

The selected date therefore remains client intent only. C01A does not create holds or reservations during quote submission.

### Orders surface

`assets/js/pages/pedidos-local-orders.js` renders the service's advertised availability schedule. It does not render the canonical reservation projection and does not define a dedicated `scheduled` presentation.

Advertised availability and confirmed booking must become visibly distinct before activation.

## Frozen read contract

The future browser order DTO must expose:

```text
scheduleReservationId
scheduledAt
scheduleAuthority
hasCanonicalSchedule
```

Allowed `scheduleAuthority` values:

- `none`;
- `client_intent`;
- `canonical_confirmed`;
- `incomplete_projection`.

`canonical_confirmed` requires the full tuple. Any incomplete combination must fail closed and render an explicit consistency error instead of presenting a booking.

Service availability remains informational catalog data and must never be displayed as the confirmed appointment.

## Frozen command contract

- no direct Supabase writes from the browser;
- no generic order-status transition to `scheduled`;
- quote date remains client intent;
- hold, confirmation, reschedule and cancellation require server command boundaries;
- every command requires an idempotency key;
- no optimistic mutation of canonical schedule fields;
- no compensating browser writes;
- presentation updates only after the server response is re-read.

## Surface plan

1. `orcamento`: capture client intent only.
2. `pedidos`: read and present canonical schedule separately from service availability.
3. `mensagens`: mirror the same canonical read model in the order summary.

No surface is activated in C01A.

## Next sublot

`SCHED-C01B — Frontend canonical schedule read model and presentation implementation`

C01B will remain repository-only and will:

- map `schedule_reservation_id` into the browser DTO;
- derive fail-closed schedule authority;
- add read-only scheduled presentation;
- distinguish advertised availability from confirmed booking;
- add local contract tests;
- keep all remote scheduling commands disabled.

## Safety result

```text
runtime files modified: 0
frontend behavior changed: no
staging reads: 0
staging mutations: 0
migrations: 0
deployments: 0
production access: 0
merge: no
```
