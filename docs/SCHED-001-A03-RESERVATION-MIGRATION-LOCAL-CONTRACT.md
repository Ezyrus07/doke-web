# SCHED-A03 — Reservation Migration Generation and Local Contract Tests

## Outcome

SCHED-A03 generates the future canonical reservation migration and validates it as a repository artifact only. The migration was **not applied** to staging or production.

The generated schema keeps professional availability intent separate from booking authority. Professionals may declare `available` or `blocked` time, but cannot materialize `booked` state directly.

## Canonical reservation authority

`public.schedule_reservations` becomes the future source of truth for occupancy. Its states are:

- `held`;
- `confirmed`;
- `cancelled`;
- `expired`.

Only `held` and `confirmed` occupy time. Ranges are half-open `[start,end)`, so adjacent reservations do not conflict.

The table preserves:

- UTC instants in `timestamptz`;
- IANA timezone intent;
- local wall-clock start and end;
- resolved UTC offset;
- optimistic `version`;
- hold expiration;
- the originating idempotency key.

Duration is constrained to a minimum of 15 minutes and a maximum of 30 days.

## Database anti-double-booking

The migration requires `btree_gist` and creates a partial GiST exclusion constraint equivalent to:

- `professional_id WITH =`;
- `tstzrange(starts_at, ends_at, '[)') WITH &&`;
- predicate `status IN ('held','confirmed')`.

This is the database-level authority that will reject concurrent overlapping active reservations. A remote concurrency proof remains pending until the migration is separately authorized and applied.

## Idempotency and events

`private.schedule_command_idempotency` persists command replay decisions under the unique scope:

`command_name + principal_key + idempotency_key`.

It stores a SHA-256 request hash, the canonical result and at least 30 days of retention.

`private.schedule_domain_events` stores durable event keys and a unique sequence per reservation for:

- `schedule.availability_rule_upserted`;
- `schedule.hold_created`;
- `schedule.hold_expired`;
- `schedule.confirmed`;
- `schedule.rescheduled`;
- `schedule.cancelled`.

The future command runtime must write the canonical mutation, durable event and order projection in one transaction.

## Order integration

The migration generates `public.orders.schedule_reservation_id` as the canonical reference. `orders.scheduled_at` remains a read projection and must not become an independent scheduling authority.

## Permission boundary

The new reservation, idempotency and event tables expose no DML grants to `anon` or `authenticated`. Only `service_role` receives explicit CRUD without `TRUNCATE`, `REFERENCES` or `TRIGGER`.

The legacy `availability_slots` owner policies are tightened so authenticated professionals can write only `available` or `blocked`; they cannot insert or update a slot to `booked`.

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
