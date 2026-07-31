-- SCHED-A07 staging canaries.
-- Execute only after exact authorization. This script must remain one transaction ending in ROLLBACK.

begin;
set local search_path = pg_catalog, public, private, extensions;
set local lock_timeout = '5s';
set local statement_timeout = '20s';

do $sched_a07_canary$
declare
  v_client_id uuid;
  v_professional_id uuid;
  v_service_id uuid;
  v_rule_id uuid := extensions.gen_random_uuid();
  v_order_1 uuid := extensions.gen_random_uuid();
  v_order_2 uuid := extensions.gen_random_uuid();
  v_order_3 uuid := extensions.gen_random_uuid();
  v_reservation_1 uuid := extensions.gen_random_uuid();
  v_reservation_adjacent uuid := extensions.gen_random_uuid();
  v_reservation_dst uuid := extensions.gen_random_uuid();
  v_idempotency_id uuid := extensions.gen_random_uuid();
  v_overlap_rejected boolean := false;
  v_idempotency_duplicate_rejected boolean := false;
  v_event_duplicate_rejected boolean := false;
begin
  select s.id, s.professional_id
    into v_service_id, v_professional_id
  from public.services s
  join public.service_versions sv
    on sv.id = s.approved_version_id
   and sv.service_id = s.id
   and sv.professional_id = s.professional_id
   and sv.review_status = 'approved'
  join public.users p
    on p.id = s.professional_id
   and p.role = 'professional'
   and p.status = 'active'
  where s.status = 'published'
    and s.moderation_status in ('published', 'changes_pending_review', 'changes_required')
  order by s.created_at, s.id
  limit 1;

  select id into v_client_id
  from public.users
  where role = 'client'
    and status = 'active'
    and id <> v_professional_id
  order by created_at, id
  limit 1;

  if v_client_id is null or v_professional_id is null or v_service_id is null then
    raise exception 'SCHED_A07_CANARY_ACTORS_OR_SERVICE_MISSING';
  end if;

  insert into public.orders (id, client_id, service_id, title, status, metadata)
  values
    (v_order_1, v_client_id, v_service_id, 'SCHED-A07 canary order 1', 'requested', '{"canary":"SCHED-A07"}'::jsonb),
    (v_order_2, v_client_id, v_service_id, 'SCHED-A07 canary order 2', 'requested', '{"canary":"SCHED-A07"}'::jsonb),
    (v_order_3, v_client_id, v_service_id, 'SCHED-A07 canary DST order', 'requested', '{"canary":"SCHED-A07"}'::jsonb);

  insert into public.schedule_availability_rules (
    id, professional_id, timezone, rule, status, version, created_by
  ) values (
    v_rule_id,
    v_professional_id,
    'America/Bahia',
    '{"weekdays":[1,2,3,4,5],"windows":[{"start":"09:00","end":"18:00"}]}'::jsonb,
    'active',
    1,
    v_professional_id
  );

  insert into public.schedule_reservations (
    id, professional_id, order_id, starts_at, ends_at, timezone,
    local_start, local_end, resolved_offset_minutes, status,
    hold_expires_at, version, idempotency_key, created_by
  ) values (
    v_reservation_1,
    v_professional_id,
    v_order_1,
    '2035-08-06T12:00:00Z',
    '2035-08-06T13:00:00Z',
    'America/Bahia',
    '2035-08-06T09:00:00',
    '2035-08-06T10:00:00',
    -180,
    'held',
    '2035-08-06T12:10:00Z',
    1,
    'sched-a07-hold-1',
    v_client_id
  );

  begin
    insert into public.schedule_reservations (
      professional_id, order_id, starts_at, ends_at, timezone,
      local_start, local_end, resolved_offset_minutes, status,
      hold_expires_at, version, idempotency_key, created_by
    ) values (
      v_professional_id,
      v_order_2,
      '2035-08-06T12:30:00Z',
      '2035-08-06T13:30:00Z',
      'America/Bahia',
      '2035-08-06T09:30:00',
      '2035-08-06T10:30:00',
      -180,
      'held',
      '2035-08-06T12:40:00Z',
      1,
      'sched-a07-overlap',
      v_client_id
    );
  exception
    when exclusion_violation then
      v_overlap_rejected := true;
  end;

  if not v_overlap_rejected then
    raise exception 'SCHED_A07_OVERLAP_NOT_REJECTED';
  end if;

  insert into public.schedule_reservations (
    id, professional_id, order_id, starts_at, ends_at, timezone,
    local_start, local_end, resolved_offset_minutes, status,
    hold_expires_at, version, idempotency_key, created_by
  ) values (
    v_reservation_adjacent,
    v_professional_id,
    v_order_2,
    '2035-08-06T13:00:00Z',
    '2035-08-06T14:00:00Z',
    'America/Bahia',
    '2035-08-06T10:00:00',
    '2035-08-06T11:00:00',
    -180,
    'held',
    '2035-08-06T13:10:00Z',
    1,
    'sched-a07-adjacent',
    v_client_id
  );

  insert into public.schedule_reservations (
    id, professional_id, order_id, starts_at, ends_at, timezone,
    local_start, local_end, resolved_offset_minutes, status,
    hold_expires_at, version, idempotency_key, created_by
  ) values (
    v_reservation_dst,
    v_professional_id,
    v_order_3,
    '2026-11-01T05:30:00Z',
    '2026-11-01T06:15:00Z',
    'America/New_York',
    '2026-11-01T01:30:00',
    '2026-11-01T01:15:00',
    -240,
    'held',
    '2099-01-01T00:00:00Z',
    1,
    'sched-a07-dst-fallback',
    v_client_id
  );

  insert into private.schedule_command_idempotency (
    id, command_name, principal_key, idempotency_key, request_hash,
    state, created_at, expires_at
  ) values (
    v_idempotency_id,
    'create_schedule_hold',
    'client:' || v_client_id::text,
    'sched-a07-idempotency',
    repeat('a', 64),
    'in_progress',
    pg_catalog.now(),
    pg_catalog.now() + interval '30 days'
  );

  begin
    insert into private.schedule_command_idempotency (
      command_name, principal_key, idempotency_key, request_hash,
      state, created_at, expires_at
    ) values (
      'create_schedule_hold',
      'client:' || v_client_id::text,
      'sched-a07-idempotency',
      repeat('b', 64),
      'in_progress',
      pg_catalog.now(),
      pg_catalog.now() + interval '30 days'
    );
  exception
    when unique_violation then
      v_idempotency_duplicate_rejected := true;
  end;

  if not v_idempotency_duplicate_rejected then
    raise exception 'SCHED_A07_IDEMPOTENCY_SCOPE_NOT_UNIQUE';
  end if;

  insert into private.schedule_domain_events (
    event_key, aggregate_type, aggregate_id, reservation_id,
    order_id, professional_id, sequence_no, event_type,
    actor_id, actor_role, command, payload, occurred_at
  ) values (
    'schedule:reservation:' || v_reservation_1::text || ':v1',
    'reservation',
    v_reservation_1,
    v_reservation_1,
    v_order_1,
    v_professional_id,
    1,
    'schedule.hold_created',
    v_client_id,
    'client_order_participant',
    'create_schedule_hold',
    '{"canary":"SCHED-A07"}'::jsonb,
    pg_catalog.now()
  );

  begin
    insert into private.schedule_domain_events (
      event_key, aggregate_type, aggregate_id, reservation_id,
      order_id, professional_id, sequence_no, event_type,
      actor_id, actor_role, command, payload, occurred_at
    ) values (
      'schedule:reservation:' || v_reservation_1::text || ':v1',
      'reservation',
      v_reservation_1,
      v_reservation_1,
      v_order_1,
      v_professional_id,
      1,
      'schedule.hold_created',
      v_client_id,
      'client_order_participant',
      'create_schedule_hold',
      '{"canary":"duplicate"}'::jsonb,
      pg_catalog.now()
    );
  exception
    when unique_violation then
      v_event_duplicate_rejected := true;
  end;

  if not v_event_duplicate_rejected then
    raise exception 'SCHED_A07_EVENT_SEQUENCE_NOT_UNIQUE';
  end if;

  update public.orders
  set schedule_reservation_id = v_reservation_1,
      scheduled_at = '2035-08-06T12:00:00Z',
      updated_at = pg_catalog.now()
  where id = v_order_1;

  if not exists (
    select 1
    from public.orders
    where id = v_order_1
      and schedule_reservation_id = v_reservation_1
      and scheduled_at = '2035-08-06T12:00:00Z'::timestamptz
  ) then
    raise exception 'SCHED_A07_ORDER_PROJECTION_FAILED';
  end if;

  if not exists (
    select 1
    from public.schedule_reservations
    where id = v_reservation_dst
      and ends_at > starts_at
      and local_end < local_start
  ) then
    raise exception 'SCHED_A07_DST_FALLBACK_COMPATIBILITY_FAILED';
  end if;
end;
$sched_a07_canary$;

rollback;
