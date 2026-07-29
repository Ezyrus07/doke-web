begin;

-- ORD-A03: submitted orders are server commands. Browser-only drafts never enter
-- the canonical orders table, so its first persisted lifecycle state is requested.
alter table public.orders alter column status set default 'requested';

drop policy if exists orders_client_insert on public.orders;
drop policy if exists orders_participants_update on public.orders;
drop policy if exists orders_client_delete_draft on public.orders;
drop policy if exists budgets_professional_insert on public.budgets;

revoke insert, update, delete on table public.orders from anon, authenticated;
revoke insert, update, delete on table public.budgets from anon, authenticated;

-- Lifecycle triggers use a transaction-local capability selected only by the
-- canonical command boundary. A professional account can therefore act as the
-- client when it hires a different professional.
create or replace function private.enforce_order_state_machine()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := nullif(trim(current_setting('doke.order_actor_role', true)), '');
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
begin
  if v_actor_role is null then
    if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
      v_actor_role := 'service_role';
    elsif v_actor_id is not null then
      select lower(u.role) into v_actor_role
      from public.users u
      where u.id = v_actor_id;
    end if;
  end if;

  if v_actor_role is null then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_ACTOR_UNRESOLVED';
  end if;

  if v_actor_role <> 'service_role' and (
    new.id is distinct from old.id
    or new.client_id is distinct from old.client_id
    or new.professional_id is distinct from old.professional_id
    or new.service_id is distinct from old.service_id
    or new.created_at is distinct from old.created_at
    or new.external_id is distinct from old.external_id
  ) then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_OWNERSHIP_IMMUTABLE';
  end if;

  if new.status is distinct from old.status then
    if not private.doke_order_transition_allowed(old.status, new.status, v_actor_role) then
      raise exception using
        errcode = '23514',
        message = 'DOKE_ORDER_TRANSITION_INVALID',
        detail = old.status || ' -> ' || new.status || ' for ' || v_actor_role;
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.create_order_command(
  p_service_ref text,
  p_title text,
  p_description text default null,
  p_city text default null,
  p_state text default null,
  p_scheduled_at timestamptz default null,
  p_metadata jsonb default '{}'::jsonb,
  p_external_id text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_service public.services;
  v_existing public.orders;
  v_order public.orders;
  v_ref text := trim(coalesce(p_service_ref, ''));
  v_external_id text := nullif(left(trim(coalesce(p_external_id, '')), 160), '');
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_AUTH_REQUIRED';
  end if;

  select lower(u.role) into v_actor_role
  from public.users u
  where u.id = v_actor_id;

  if v_actor_role not in ('client', 'professional') then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_CLIENT_CAPABILITY_REQUIRED';
  end if;
  if v_ref = '' then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_SERVICE_REQUIRED';
  end if;

  if v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    select * into v_service from public.services where id = v_ref::uuid;
  else
    select * into v_service from public.services where external_id = v_ref;
  end if;

  if v_service.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_SERVICE_NOT_FOUND';
  end if;
  if v_service.status <> 'published'
     or v_service.approved_version_id is null
     or lower(coalesce(v_service.moderation_status, '')) not in ('published', 'changes_pending_review', 'changes_required') then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE';
  end if;
  if v_service.professional_id = v_actor_id then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN';
  end if;
  if nullif(trim(coalesce(p_title, '')), '') is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_TITLE_REQUIRED';
  end if;

  if v_external_id is not null then
    select * into v_existing from public.orders where external_id = v_external_id;
    if v_existing.id is not null then
      if v_existing.client_id <> v_actor_id then
        raise exception using errcode = '23505', message = 'DOKE_ORDER_EXTERNAL_ID_CONFLICT';
      end if;
      return v_existing;
    end if;
  end if;

  perform set_config('doke.order_actor_role', 'client', true);
  perform set_config('doke.order_transition_action', 'create', true);
  perform set_config('doke.order_transition_note', 'Pedido solicitado pelo cliente.', true);

  insert into public.orders (
    client_id,
    professional_id,
    service_id,
    title,
    description,
    status,
    city,
    state,
    scheduled_at,
    metadata,
    external_id
  ) values (
    v_actor_id,
    v_service.professional_id,
    v_service.id,
    left(trim(p_title), 140),
    nullif(left(trim(coalesce(p_description, '')), 4000), ''),
    'requested',
    nullif(left(trim(coalesce(p_city, '')), 80), ''),
    nullif(left(trim(coalesce(p_state, '')), 40), ''),
    p_scheduled_at,
    coalesce(p_metadata, '{}'::jsonb) - array['professionalId', 'providerId', 'serviceSnapshot', 'service_snapshot'],
    v_external_id
  ) returning * into v_order;

  return v_order;
exception
  when unique_violation then
    if v_external_id is not null then
      select * into v_existing
      from public.orders
      where external_id = v_external_id
        and client_id = v_actor_id;
      if v_existing.id is not null then
        return v_existing;
      end if;
    end if;
    raise;
end;
$$;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_expected_status text,
  p_next_status text,
  p_action text default 'updateStatus',
  p_note text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_capability text;
  v_order public.orders;
  v_updated public.orders;
begin
  if p_order_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_ID_REQUIRED';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_NOT_FOUND';
  end if;

  if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
    v_capability := 'service_role';
  elsif v_actor_id = v_order.client_id then
    v_capability := 'client';
  elsif v_actor_id = v_order.professional_id then
    v_capability := 'professional';
  else
    raise exception using errcode = '42501', message = 'DOKE_ORDER_PARTICIPANT_REQUIRED';
  end if;

  if lower(trim(coalesce(v_order.status, ''))) <> lower(trim(coalesce(p_expected_status, ''))) then
    raise exception using errcode = '40001', message = 'DOKE_ORDER_CONFLICT';
  end if;
  if not private.doke_order_transition_allowed(
    v_order.status,
    lower(trim(coalesce(p_next_status, ''))),
    v_capability
  ) then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_TRANSITION_INVALID',
      detail = v_order.status || ' -> ' || coalesce(p_next_status, '') || ' for ' || v_capability;
  end if;

  perform set_config('doke.order_actor_role', v_capability, true);
  perform set_config('doke.order_transition_action', left(trim(coalesce(p_action, 'updateStatus')), 80), true);
  perform set_config('doke.order_transition_note', left(trim(coalesce(p_note, '')), 800), true);

  update public.orders
  set status = lower(trim(p_next_status)),
      updated_at = now()
  where id = p_order_id
  returning * into v_updated;

  return v_updated;
end;
$$;

create or replace function public.submit_order_quote_command(
  p_order_id uuid,
  p_expected_status text,
  p_amount_cents integer,
  p_currency text default 'BRL',
  p_description text default null,
  p_valid_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order public.orders;
  v_updated public.orders;
  v_budget public.budgets;
begin
  if v_actor_id is null then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_AUTH_REQUIRED';
  end if;
  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_QUOTE_AMOUNT_INVALID';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if v_order.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_NOT_FOUND';
  end if;
  if v_order.professional_id <> v_actor_id then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_PROFESSIONAL_REQUIRED';
  end if;
  if lower(v_order.status) <> lower(trim(coalesce(p_expected_status, ''))) then
    raise exception using errcode = '40001', message = 'DOKE_ORDER_CONFLICT';
  end if;

  insert into public.budgets (
    order_id,
    professional_id,
    amount_cents,
    currency,
    description,
    status,
    valid_until
  ) values (
    v_order.id,
    v_actor_id,
    p_amount_cents,
    upper(left(trim(coalesce(p_currency, 'BRL')), 3)),
    nullif(left(trim(coalesce(p_description, '')), 1200), ''),
    'sent',
    p_valid_until
  ) returning * into v_budget;

  select * into v_updated
  from public.transition_order_status(
    v_order.id,
    v_order.status,
    'quoted',
    'quote',
    'Orçamento enviado pelo profissional.'
  );

  return jsonb_build_object('order', to_jsonb(v_updated), 'budget', to_jsonb(v_budget));
end;
$$;

revoke all on function public.create_order_command(text, text, text, text, text, timestamptz, jsonb, text) from public, anon;
revoke all on function public.transition_order_status(uuid, text, text, text, text) from public, anon;
revoke all on function public.submit_order_quote_command(uuid, text, integer, text, text, timestamptz) from public, anon;

grant execute on function public.create_order_command(text, text, text, text, text, timestamptz, jsonb, text) to authenticated, service_role;
grant execute on function public.transition_order_status(uuid, text, text, text, text) to authenticated, service_role;
grant execute on function public.submit_order_quote_command(uuid, text, integer, text, text, timestamptz) to authenticated, service_role;

comment on function public.create_order_command(text, text, text, text, text, timestamptz, jsonb, text) is
  'ORD-A03 canonical submitted-order creation boundary. Drafts remain browser-local only.';
comment on function public.transition_order_status(uuid, text, text, text, text) is
  'ORD-A03 participant-scoped optimistic lifecycle command; direct table UPDATE is revoked.';
comment on function public.submit_order_quote_command(uuid, text, integer, text, text, timestamptz) is
  'ORD-A03 atomic quote insertion and order transition command.';
comment on column public.orders.status is
  'Canonical submitted lifecycle. Browser-only drafts are not persisted in public.orders.';

commit;
