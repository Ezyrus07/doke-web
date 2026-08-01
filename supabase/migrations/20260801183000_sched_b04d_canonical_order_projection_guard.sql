-- Doke SCHED-B04D: canonical ORD/SCHED projection transition guard.
-- Repository-only until an exact, independent staging migration authorization is issued.

begin;
set local search_path = pg_catalog, public, private, auth;

create or replace function private.apply_order_schedule_projection(
  p_order_id uuid,
  p_reservation_id uuid,
  p_scheduled_at timestamptz
)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_order public.orders;
begin
  if p_order_id is null or p_reservation_id is null or p_scheduled_at is null then
    raise exception using
      errcode = '22023',
      message = 'DOKE_SCHEDULE_ORDER_PROJECTION_ARGUMENT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.schedule_reservations reservation
    where reservation.id = p_reservation_id
      and reservation.order_id = p_order_id
      and reservation.status = 'confirmed'
      and reservation.starts_at = p_scheduled_at
  ) then
    raise exception using
      errcode = '23514',
      message = 'DOKE_SCHEDULE_RESERVATION_PROJECTION_INVALID';
  end if;

  perform set_config('doke.order_schedule_projection_mode', 'project', true);
  perform set_config('doke.order_schedule_projection_order_id', p_order_id::text, true);
  perform set_config('doke.order_schedule_projection_reservation_id', p_reservation_id::text, true);

  update public.orders
     set schedule_reservation_id = p_reservation_id,
         scheduled_at = p_scheduled_at,
         status = 'scheduled',
         updated_at = pg_catalog.now()
   where id = p_order_id
     and status in ('accepted', 'scheduled')
     and (schedule_reservation_id is null or schedule_reservation_id = p_reservation_id)
  returning * into v_order;

  perform set_config('doke.order_schedule_projection_mode', '', true);
  perform set_config('doke.order_schedule_projection_order_id', '', true);
  perform set_config('doke.order_schedule_projection_reservation_id', '', true);

  if v_order.id is null then
    raise exception using
      errcode = '40001',
      message = 'DOKE_SCHEDULE_ORDER_PROJECTION_FAILED';
  end if;

  return v_order;
exception
  when others then
    perform set_config('doke.order_schedule_projection_mode', '', true);
    perform set_config('doke.order_schedule_projection_order_id', '', true);
    perform set_config('doke.order_schedule_projection_reservation_id', '', true);
    raise;
end;
$$;

create or replace function private.clear_order_schedule_projection(
  p_order_id uuid,
  p_reservation_id uuid
)
returns public.orders
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_order public.orders;
begin
  if p_order_id is null or p_reservation_id is null then
    raise exception using
      errcode = '22023',
      message = 'DOKE_SCHEDULE_ORDER_CLEAR_ARGUMENT_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.schedule_reservations reservation
    where reservation.id = p_reservation_id
      and reservation.order_id = p_order_id
      and reservation.status in ('cancelled', 'expired')
  ) then
    raise exception using
      errcode = '23514',
      message = 'DOKE_SCHEDULE_RESERVATION_CLEAR_INVALID';
  end if;

  perform set_config('doke.order_schedule_projection_mode', 'clear', true);
  perform set_config('doke.order_schedule_projection_order_id', p_order_id::text, true);
  perform set_config('doke.order_schedule_projection_reservation_id', p_reservation_id::text, true);

  update public.orders
     set schedule_reservation_id = null,
         scheduled_at = null,
         status = case when status = 'scheduled' then 'accepted' else status end,
         updated_at = pg_catalog.now()
   where id = p_order_id
     and status in ('accepted', 'scheduled')
     and schedule_reservation_id = p_reservation_id
  returning * into v_order;

  perform set_config('doke.order_schedule_projection_mode', '', true);
  perform set_config('doke.order_schedule_projection_order_id', '', true);
  perform set_config('doke.order_schedule_projection_reservation_id', '', true);

  if v_order.id is null then
    raise exception using
      errcode = '40001',
      message = 'DOKE_SCHEDULE_ORDER_CLEAR_FAILED';
  end if;

  return v_order;
exception
  when others then
    perform set_config('doke.order_schedule_projection_mode', '', true);
    perform set_config('doke.order_schedule_projection_order_id', '', true);
    perform set_config('doke.order_schedule_projection_reservation_id', '', true);
    raise;
end;
$$;

revoke all on function private.apply_order_schedule_projection(uuid, uuid, timestamptz)
  from public, anon, authenticated;
revoke all on function private.clear_order_schedule_projection(uuid, uuid)
  from public, anon, authenticated;
grant execute on function private.apply_order_schedule_projection(uuid, uuid, timestamptz)
  to service_role;
grant execute on function private.clear_order_schedule_projection(uuid, uuid)
  to service_role;

create or replace function private.enforce_order_state_machine()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_projection_mode text := coalesce(current_setting('doke.order_schedule_projection_mode', true), '');
  v_projection_order_id text := coalesce(current_setting('doke.order_schedule_projection_order_id', true), '');
  v_projection_reservation_id text := coalesce(current_setting('doke.order_schedule_projection_reservation_id', true), '');
  v_schedule_fields_changed boolean;
  v_canonical_project boolean;
  v_canonical_clear boolean;
begin
  if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
    v_actor_role := 'service_role';
  elsif v_actor_id is not null then
    select lower(app_user.role) into v_actor_role
    from public.users app_user
    where app_user.id = v_actor_id;
  end if;

  if v_actor_role is null then
    raise exception using
      errcode = '42501',
      message = 'DOKE_ORDER_ACTOR_UNRESOLVED';
  end if;

  if v_actor_role <> 'service_role' and (
    new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.professional_id is distinct from old.professional_id
    or new.service_id is distinct from old.service_id
    or new.created_at is distinct from old.created_at
    or new.external_id is distinct from old.external_id
  ) then
    raise exception using
      errcode = '42501',
      message = 'DOKE_ORDER_OWNERSHIP_IMMUTABLE';
  end if;

  v_schedule_fields_changed :=
    new.schedule_reservation_id is distinct from old.schedule_reservation_id
    or new.scheduled_at is distinct from old.scheduled_at;

  v_canonical_project :=
    v_actor_role = 'service_role'
    and v_projection_mode = 'project'
    and v_projection_order_id = new.id::text
    and v_projection_reservation_id = coalesce(new.schedule_reservation_id::text, '')
    and new.schedule_reservation_id is not null
    and new.scheduled_at is not null
    and new.status = 'scheduled'
    and old.status in ('accepted', 'scheduled')
    and (old.schedule_reservation_id is null or old.schedule_reservation_id = new.schedule_reservation_id);

  v_canonical_clear :=
    v_actor_role = 'service_role'
    and v_projection_mode = 'clear'
    and v_projection_order_id = new.id::text
    and v_projection_reservation_id = coalesce(old.schedule_reservation_id::text, '')
    and old.schedule_reservation_id is not null
    and new.schedule_reservation_id is null
    and new.scheduled_at is null
    and old.status in ('accepted', 'scheduled')
    and new.status = case when old.status = 'scheduled' then 'accepted' else old.status end;

  if v_schedule_fields_changed and not (v_canonical_project or v_canonical_clear) then
    raise exception using
      errcode = '42501',
      message = 'DOKE_ORDER_SCHEDULE_PROJECTION_CONTEXT_REQUIRED';
  end if;

  if new.status is distinct from old.status then
    if not (v_canonical_project or v_canonical_clear)
       and not private.doke_order_transition_allowed(old.status, new.status, v_actor_role) then
      raise exception using
        errcode = '23514',
        message = 'DOKE_ORDER_TRANSITION_INVALID',
        detail = old.status || ' -> ' || new.status || ' for ' || v_actor_role;
    end if;
    new.updated_at := pg_catalog.now();
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_order_state_machine()
  from public, anon, authenticated;

comment on function private.apply_order_schedule_projection(uuid, uuid, timestamptz) is
  'Projects a confirmed canonical schedule reservation into ORD under a transaction-local, service-role-only context.';
comment on function private.clear_order_schedule_projection(uuid, uuid) is
  'Clears a cancelled or expired canonical schedule reservation from ORD and restores scheduled orders to accepted.';
comment on function private.enforce_order_state_machine() is
  'Rejects invalid order transitions and direct schedule projection writes; canonical projection and clearing require the private SCHED context.';

commit;
