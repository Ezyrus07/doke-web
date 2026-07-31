# SCHED-001 A01 — Repository Baseline and Read-Only Staging Security Preflight

## Objective

Verify the deployed `availability_slots` security boundary and schema shape after the ORD-A11 handoff, without applying migrations, writing data, deploying code, touching production or merging the pull request.

This sublot is read-only. Generic continuation authorized catalog inspection only.

## Repository baseline

The scheduling foundation is currently distributed across three migrations:

- `003_communication_finance_community.sql` creates `availability_slots`;
- `113_availability_reviews_authority.sql` enables RLS and defines owner write policies;
- `119_public_policy_role_separation.sql` separates anonymous reads from authenticated owner/operator reads.

`backend/modules/scheduling` still contains no scheduling service. Order creation still accepts raw `scheduled_at`, and the browser order projection still carries desired date, shift and service availability snapshot data.

## Staging verification

The read-only preflight verified directly in project `zwkczgewzbsorbrjuzpb` that:

- `public.availability_slots` exists and is owned by `postgres`;
- RLS is enabled;
- FORCE RLS is disabled;
- migrations `20260722161200 availability_reviews_authority` and `20260722162204 public_policy_role_separation` are recorded;
- all five expected policies are deployed;
- `anon` has only `SELECT`;
- `authenticated` has `SELECT`, `INSERT`, `UPDATE` and `DELETE`, constrained by RLS;
- `service_role` has CRUD and bypasses RLS as expected for privileged server operations;
- the invalid-range check `ends_at > starts_at` is present;
- the table contains zero rows;
- orders contain zero rows and zero scheduled rows.

This closes the stale security-verification blocker. The repository migrations are not merely theoretical: their RLS, policy and grant effects are present in staging.

## Confirmed policies

The deployed policies are:

1. `availability_slots_anon_select` — anonymous users see only future `available` slots;
2. `availability_slots_authenticated_select` — authenticated users see future available slots, their own slots, or operator-visible rows;
3. `availability_slots_owner_insert` — an authenticated professional may insert only their own valid range;
4. `availability_slots_owner_update` — an authenticated professional may update their own valid range;
5. `availability_slots_owner_delete` — an authenticated professional may delete their own slot only while it is not `booked`.

## Critical authority finding

RLS is present, but the current model is not a safe booking authority.

The owner update policy does not restrict the new `status`. A professional can therefore update their own row to `booked`. There is no trigger, command function or separate reservation table that proves a booking was created by a client/order transaction.

This is not an RLS absence. It is an authority-conflation defect: one table and one owner policy currently represent both availability supply and final booking state.

A new blocker, `SCHED-B05`, records this boundary explicitly.

## Missing scheduling capabilities

The staging schema has no:

- hold table;
- canonical reservation table;
- `order_id` link on `availability_slots`;
- hold expiration timestamp;
- timezone column;
- idempotency key;
- optimistic version;
- `updated_at` audit timestamp;
- exclusion constraint against overlapping active ranges;
- status transition trigger;
- `orders.schedule_reservation_id` reference.

The `btree_gist` extension is also not installed, so a future GiST exclusion design must include a reviewed extension step.

## Blocker disposition

### SCHED-B01 — closed

Read-only staging verification now proves the deployed RLS, policies, grants, schema and migration versions.

### SCHED-B02 — remains open

No canonical scheduling service owns rules, holds, confirmed reservations, expiration, rescheduling, cancellation or timezone.

### SCHED-B03 — remains open

No database-level exclusion or equivalent concurrency contract prevents overlapping active reservations for one professional.

### SCHED-B04 — remains open

Orders still accept raw `scheduled_at` and do not reference a canonical reservation.

### SCHED-B05 — new and open

The professional owner update policy can set `status='booked'` without a canonical reservation command or protected status-transition boundary.

## Canonical next step

The next repository-only sublot is `SCHED-A02 — Command, Event, Timezone and Conflict Contract Freeze`.

It must define:

- availability-rule commands;
- hold and reservation commands;
- status transition authority;
- idempotency keys and optimistic concurrency;
- UTC storage and IANA timezone semantics;
- half-open ranges `[start,end)`;
- durable events;
- anti-overlap behavior;
- the future `schedule_reservation_id` integration with orders.

Only after those contracts pass should the project generate a migration. A generic continuation may generate and test a migration locally when that later readiness gate permits it, but it must not apply the migration to staging.

## Execution record

- read-only SQL queries: 2;
- staging mutations: 0;
- migrations applied: 0;
- deployments: 0;
- production changes: 0;
- merge: not authorized.
