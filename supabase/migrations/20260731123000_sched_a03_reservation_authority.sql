-- Doke SCHED-A03: canonical scheduling authority schema.
-- Repository-generated migration only. Do not apply without an exact, independent staging authorization.

begin;
set local search_path = pg_catalog, public, private, extensions;

create extension if not exists btree_gist with schema extensions;

create table if not exists public.schedule_availability_rules (
  id uuid primary key default extensions.gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  timezone text not null,
  rule jsonb not null,
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  version bigint not null default 1 check (version > 0),
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint schedule_availability_rules_timezone_shape check (
    timezone ~ '^(UTC|[A-Za-z][A-Za-z0-9._+-]*(/[A-Za-z0-9._+-]+)+)$'
  ),
  constraint schedule_availability_rules_rule_object check (
    jsonb_typeof(rule) = 'object'
  )
);

create index if not exists schedule_availability_rules_professional_status
  on public.schedule_availability_rules(professional_id, status, updated_at desc);

create table if not exists public.schedule_reservations (
  id uuid primary key default extensions.gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null,
  local_start timestamp without time zone not null,
  local_end timestamp without time zone not null,
  resolved_offset_minutes smallint not null,
  status text not null default 'held'
    check (status in ('held', 'confirmed', 'cancelled', 'expired')),
  hold_expires_at timestamptz,
  version bigint not null default 1 check (version > 0),
  idempotency_key text not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  constraint schedule_reservations_valid_range check (ends_at > starts_at),
  constraint schedule_reservations_duration_bounds check (
    ends_at - starts_at >= interval '15 minutes'
    and ends_at - starts_at <= interval '30 days'
  ),
  constraint schedule_reservations_timezone_shape check (
    timezone ~ '^(UTC|[A-Za-z][A-Za-z0-9._+-]*(/[A-Za-z0-9._+-]+)+)$'
  ),
  constraint schedule_reservations_local_range check (local_end > local_start),
  constraint schedule_reservations_offset_bounds check (
    resolved_offset_minutes between -840 and 840
  ),
  constraint schedule_reservations_hold_expiry check (
    (status = 'held' and hold_expires_at is not null)
    or status <> 'held'
  )
);

create unique index if not exists schedule_reservations_one_active_order
  on public.schedule_reservations(order_id)
  where status in ('held', 'confirmed');

create index if not exists schedule_reservations_professional_time
  on public.schedule_reservations(professional_id, starts_at, ends_at);

create index if not exists schedule_reservations_expiring_holds
  on public.schedule_reservations(hold_expires_at)
  where status = 'held';

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'schedule_reservations_no_active_overlap'
      and conrelid = 'public.schedule_reservations'::regclass
  ) then
    alter table public.schedule_reservations
      add constraint schedule_reservations_no_active_overlap
      exclude using gist (
        professional_id with =,
        tstzrange(starts_at, ends_at, '[)') with &&
      )
      where (status in ('held', 'confirmed'));
  end if;
end;
$$;

alter table public.orders
  add column if not exists schedule_reservation_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'orders_schedule_reservation_id_fkey'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
      add constraint orders_schedule_reservation_id_fkey
      foreign key (schedule_reservation_id)
      references public.schedule_reservations(id)
      on delete set null;
  end if;
end;
$$;

create unique index if not exists orders_schedule_reservation_id_unique
  on public.orders(schedule_reservation_id)
  where schedule_reservation_id is not null;

create table if not exists private.schedule_command_idempotency (
  id uuid primary key default extensions.gen_random_uuid(),
  command_name text not null,
  principal_key text not null,
  idempotency_key text not null,
  request_hash text not null,
  state text not null default 'in_progress'
    check (state in ('in_progress', 'completed', 'failed')),
  aggregate_type text check (aggregate_type in ('availability_rule', 'reservation')),
  aggregate_id uuid,
  availability_rule_id uuid references public.schedule_availability_rules(id) on delete set null,
  reservation_id uuid references public.schedule_reservations(id) on delete set null,
  result_payload jsonb,
  error_payload jsonb,
  created_at timestamptz not null default pg_catalog.now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (pg_catalog.now() + interval '30 days'),
  constraint schedule_command_idempotency_request_hash check (
    request_hash ~ '^[a-f0-9]{64}$'
  ),
  constraint schedule_command_idempotency_retention check (
    expires_at >= created_at + interval '30 days'
  ),
  constraint schedule_command_idempotency_aggregate_reference check (
    (aggregate_type is null and aggregate_id is null and availability_rule_id is null and reservation_id is null)
    or (
      aggregate_type = 'availability_rule'
      and aggregate_id is not null
      and availability_rule_id = aggregate_id
      and reservation_id is null
    )
    or (
      aggregate_type = 'reservation'
      and aggregate_id is not null
      and reservation_id = aggregate_id
      and availability_rule_id is null
    )
  ),
  constraint schedule_command_idempotency_state_payload check (
    (state = 'in_progress' and completed_at is null and result_payload is null and error_payload is null)
    or (state = 'completed' and completed_at is not null and result_payload is not null and error_payload is null)
    or (state = 'failed' and completed_at is not null and result_payload is null and error_payload is not null)
  ),
  unique (command_name, principal_key, idempotency_key)
);

create index if not exists schedule_command_idempotency_expiry
  on private.schedule_command_idempotency(expires_at);

create table if not exists private.schedule_domain_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_key text not null unique,
  aggregate_type text not null check (aggregate_type in ('availability_rule', 'reservation')),
  aggregate_id uuid not null,
  availability_rule_id uuid references public.schedule_availability_rules(id) on delete restrict,
  reservation_id uuid references public.schedule_reservations(id) on delete restrict,
  order_id uuid references public.orders(id) on delete restrict,
  professional_id uuid not null references public.users(id) on delete restrict,
  sequence_no bigint not null check (sequence_no > 0),
  event_type text not null check (event_type in (
    'schedule.availability_rule_upserted',
    'schedule.hold_created',
    'schedule.hold_expired',
    'schedule.confirmed',
    'schedule.rescheduled',
    'schedule.cancelled'
  )),
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null,
  command text not null,
  payload jsonb not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint schedule_domain_events_aggregate_reference check (
    (
      aggregate_type = 'availability_rule'
      and availability_rule_id is not null
      and availability_rule_id = aggregate_id
      and reservation_id is null
      and order_id is null
    )
    or (
      aggregate_type = 'reservation'
      and reservation_id is not null
      and reservation_id = aggregate_id
      and availability_rule_id is null
      and order_id is not null
    )
  ),
  constraint schedule_domain_events_event_aggregate check (
    (event_type = 'schedule.availability_rule_upserted' and aggregate_type = 'availability_rule')
    or (
      event_type in (
        'schedule.hold_created',
        'schedule.hold_expired',
        'schedule.confirmed',
        'schedule.rescheduled',
        'schedule.cancelled'
      )
      and aggregate_type = 'reservation'
    )
  ),
  unique (aggregate_type, aggregate_id, sequence_no)
);

create index if not exists schedule_domain_events_order_created
  on private.schedule_domain_events(order_id, created_at)
  where order_id is not null;

create index if not exists schedule_domain_events_aggregate_sequence
  on private.schedule_domain_events(aggregate_type, aggregate_id, sequence_no);

alter table public.schedule_availability_rules enable row level security;
alter table public.schedule_reservations enable row level security;
alter table private.schedule_command_idempotency enable row level security;
alter table private.schedule_domain_events enable row level security;

revoke all privileges on table public.schedule_availability_rules
  from public, anon, authenticated, service_role;
revoke all privileges on table public.schedule_reservations
  from public, anon, authenticated, service_role;
revoke all privileges on table private.schedule_command_idempotency
  from public, anon, authenticated, service_role;
revoke all privileges on table private.schedule_domain_events
  from public, anon, authenticated, service_role;

grant select, insert, update, delete on table public.schedule_availability_rules
  to service_role;
grant select, insert, update, delete on table public.schedule_reservations
  to service_role;
grant select, insert, update, delete on table private.schedule_command_idempotency
  to service_role;
grant select, insert, update, delete on table private.schedule_domain_events
  to service_role;

-- availability_slots remains a legacy professional intent surface until A04 command adoption.
-- Professionals may change only non-booked intent rows and can never create, clear or mutate booked state.
drop policy if exists availability_slots_owner_insert on public.availability_slots;
drop policy if exists availability_slots_owner_update on public.availability_slots;
drop policy if exists availability_slots_owner_delete on public.availability_slots;

create policy availability_slots_owner_insert
  on public.availability_slots
  for insert
  to authenticated
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status in ('available', 'blocked')
    and ends_at > starts_at
  );

create policy availability_slots_owner_update
  on public.availability_slots
  for update
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status in ('available', 'blocked')
  )
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status in ('available', 'blocked')
    and ends_at > starts_at
  );

create policy availability_slots_owner_delete
  on public.availability_slots
  for delete
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status in ('available', 'blocked')
  );

comment on table public.schedule_availability_rules is
  'Canonical SCHED-001 availability-rule authority mutated only through server commands.';
comment on table public.schedule_reservations is
  'Canonical SCHED-001 occupancy authority. Only held and confirmed rows occupy time.';
comment on column public.orders.schedule_reservation_id is
  'Canonical scheduling reference. orders.scheduled_at remains a read projection only.';
comment on table private.schedule_command_idempotency is
  'Persistent command replay ledger scoped by command, principal and idempotency key.';
comment on table private.schedule_domain_events is
  'Aggregate-aware durable SCHED-001 event stream written atomically with canonical scheduling mutations.';

notify pgrst, 'reload schema';

commit;
