# SCHED-A03 — Scheduling Authority Migration Generation and Local Contract Tests

## Outcome

SCHED-A03 generates the future canonical scheduling migration and validates it as a repository artifact only. The migration was **not applied** to staging or production.

The generated schema separates professional availability intent from booking occupancy and corrects the original reservation-only durable-event envelope found during implementation review.

## Canonical availability authority

`public.schedule_availability_rules` stores recurring or exception rules with:

- professional owner;
- IANA timezone;
- JSON rule object;
- `active`, `paused` or `archived` state;
- optimistic `version`;
- creation and update timestamps.

It exposes no browser DML. Future writes must pass through the SCHED-A04 server command boundary.

## Canonical reservation authority

`public.schedule_reservations` becomes the future source of truth for occupancy. Its states are `held`, `confirmed`, `cancelled` and `expired`.

Only `held` and `confirmed` occupy time. Ranges are half-open `[start,end)`, so adjacent reservations do not conflict.

The table preserves UTC instants, IANA timezone intent, local wall-clock start and end, resolved UTC offset, optimistic `version`, hold expiration and the originating idempotency key. Duration is constrained to a minimum of 15 minutes and a maximum of 30 days.

## Database anti-double-booking

The migration fixes the transaction search path, requires `btree_gist` and creates a partial GiST exclusion constraint equivalent to:

- `professional_id WITH =`;
- `tstzrange(starts_at, ends_at, '[)') WITH &&`;
- predicate `status IN ('held','confirmed')`.

This is the database-level authority that will reject concurrent overlapping active reservations. A remote concurrency proof remains pending until the migration is separately authorized and applied.

## Idempotency

`private.schedule_command_idempotency` claims each command under the unique scope `command_name + principal_key + idempotency_key`.

It stores a SHA-256 request hash, `in_progress/completed/failed` lifecycle, aggregate identity, canonical result or error and at least 30 days of retention. This supports claiming an idempotency key before mutation rather than recording it too late to stop concurrent duplicate commands.

## Aggregate-aware durable events

`private.schedule_domain_events` uses two explicit aggregate types:

- `availability_rule`, requiring `availability_rule_id` and no reservation/order reference;
- `reservation`, requiring `reservation_id` and `order_id`.

Event keys follow `schedule:{aggregate_type}:{aggregate_id}:v{sequence_no}` and sequences are unique per aggregate. This makes `schedule.availability_rule_upserted` representable without fabricating a reservation ID.

The six frozen event types remain unchanged. Canonical mutation and event insertion must be atomic; reservation commands must also update the order projection in that transaction.

## Order integration

The migration generates `public.orders.schedule_reservation_id` as the canonical reference. `orders.scheduled_at` remains a read projection and must not become an independent scheduling authority.

## Permission boundary

The availability-rule, reservation, idempotency and event tables expose no DML grants to `anon` or `authenticated`. Only `service_role` receives explicit CRUD without `TRUNCATE`, `REFERENCES` or `TRIGGER`.

The legacy `availability_slots` owner policies are tightened on both the old and new row states. Authenticated professionals can write only `available` or `blocked`; they cannot create, mutate, clear or delete a `booked` row.

## Blockers

No blocker is closed by generating SQL:

- `SCHED-B02`: server command runtime is still absent;
- `SCHED-B03`: migration application and concurrent proof are still absent;
- `SCHED-B04`: the order reference is generated but not applied or consumed;
- `SCHED-B05`: policy hardening is generated but not applied.

## Safety evidence

- staging reads: 0;
- staging mutations: 0;
- migrations applied: 0;
- deploys: 0;
- Cron changes: 0;
- production changes: 0;
- PR merge: not authorized.

## Next sublot

`SCHED-A04 — Server Scheduling Command Module and Deterministic Runtime Tests`.

A generic “Próximo” may authorize repository-only implementation and local/static testing. It does not authorize application of the A03 migration.
