-- Doke: authoritative order lifecycle guard.
-- Prevents participants from skipping lifecycle states or rewriting ownership
-- fields through direct Data API updates.

create or replace function private.doke_order_transition_allowed(
  p_from_status text,
  p_to_status text,
  p_actor_role text
)
returns boolean
language sql
immutable
security invoker
set search_path = private, public, pg_temp
as $$
  select case lower(coalesce(p_actor_role, ''))
    when 'client' then (p_from_status, p_to_status) in (
      ('draft', 'requested'),
      ('draft', 'cancelled'),
      ('requested', 'cancelled'),
      ('accepted', 'cancelled'),
      ('quoted', 'accepted'),
      ('quoted', 'in_progress'),
      ('quoted', 'cancelled'),
      ('scheduled', 'cancelled'),
      ('in_progress', 'completed'),
      ('in_progress', 'cancelled'),
      ('in_progress', 'disputed'),
      ('completed', 'disputed')
    )
    when 'professional' then (p_from_status, p_to_status) in (
      ('requested', 'accepted'),
      ('requested', 'quoted'),
      ('requested', 'cancelled'),
      ('accepted', 'quoted'),
      ('accepted', 'scheduled'),
      ('accepted', 'in_progress'),
      ('accepted', 'cancelled'),
      ('quoted', 'scheduled'),
      ('quoted', 'in_progress'),
      ('quoted', 'cancelled'),
      ('scheduled', 'in_progress'),
      ('scheduled', 'cancelled'),
      ('in_progress', 'completed'),
      ('in_progress', 'cancelled'),
      ('in_progress', 'disputed'),
      ('completed', 'disputed')
    )
    when 'support' then (p_from_status, p_to_status) in (
      ('draft', 'requested'), ('draft', 'cancelled'),
      ('requested', 'accepted'), ('requested', 'quoted'), ('requested', 'cancelled'),
      ('accepted', 'quoted'), ('accepted', 'scheduled'), ('accepted', 'in_progress'), ('accepted', 'cancelled'),
      ('quoted', 'accepted'), ('quoted', 'scheduled'), ('quoted', 'in_progress'), ('quoted', 'cancelled'),
      ('scheduled', 'in_progress'), ('scheduled', 'cancelled'),
      ('in_progress', 'completed'), ('in_progress', 'cancelled'), ('in_progress', 'disputed'),
      ('completed', 'disputed'),
      ('disputed', 'completed'), ('disputed', 'cancelled')
    )
    when 'admin' then (p_from_status, p_to_status) in (
      ('draft', 'requested'), ('draft', 'cancelled'),
      ('requested', 'accepted'), ('requested', 'quoted'), ('requested', 'cancelled'),
      ('accepted', 'quoted'), ('accepted', 'scheduled'), ('accepted', 'in_progress'), ('accepted', 'cancelled'),
      ('quoted', 'accepted'), ('quoted', 'scheduled'), ('quoted', 'in_progress'), ('quoted', 'cancelled'),
      ('scheduled', 'in_progress'), ('scheduled', 'cancelled'),
      ('in_progress', 'completed'), ('in_progress', 'cancelled'), ('in_progress', 'disputed'),
      ('completed', 'disputed'),
      ('disputed', 'completed'), ('disputed', 'cancelled')
    )
    when 'moderator' then (p_from_status, p_to_status) in (
      ('draft', 'requested'), ('draft', 'cancelled'),
      ('requested', 'accepted'), ('requested', 'quoted'), ('requested', 'cancelled'),
      ('accepted', 'quoted'), ('accepted', 'scheduled'), ('accepted', 'in_progress'), ('accepted', 'cancelled'),
      ('quoted', 'accepted'), ('quoted', 'scheduled'), ('quoted', 'in_progress'), ('quoted', 'cancelled'),
      ('scheduled', 'in_progress'), ('scheduled', 'cancelled'),
      ('in_progress', 'completed'), ('in_progress', 'cancelled'), ('in_progress', 'disputed'),
      ('completed', 'disputed'),
      ('disputed', 'completed'), ('disputed', 'cancelled')
    )
    when 'service_role' then (p_from_status, p_to_status) in (
      ('draft', 'requested'), ('draft', 'cancelled'),
      ('requested', 'accepted'), ('requested', 'quoted'), ('requested', 'cancelled'),
      ('accepted', 'quoted'), ('accepted', 'scheduled'), ('accepted', 'in_progress'), ('accepted', 'cancelled'),
      ('quoted', 'accepted'), ('quoted', 'scheduled'), ('quoted', 'in_progress'), ('quoted', 'cancelled'),
      ('scheduled', 'in_progress'), ('scheduled', 'cancelled'),
      ('in_progress', 'completed'), ('in_progress', 'cancelled'), ('in_progress', 'disputed'),
      ('completed', 'disputed'),
      ('disputed', 'completed'), ('disputed', 'cancelled')
    )
    else false
  end;
$$;

revoke all on function private.doke_order_transition_allowed(text, text, text) from public, anon, authenticated;
grant execute on function private.doke_order_transition_allowed(text, text, text) to service_role;

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
begin
  if v_jwt_role = 'service_role' or current_user in ('postgres', 'supabase_admin', 'service_role') then
    v_actor_role := 'service_role';
  elsif v_actor_id is not null then
    select lower(u.role) into v_actor_role
    from public.users u
    where u.id = v_actor_id;
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

revoke all on function private.enforce_order_state_machine() from public, anon, authenticated;

drop trigger if exists trg_orders_state_machine on public.orders;
create trigger trg_orders_state_machine
before update on public.orders
for each row
execute function private.enforce_order_state_machine();

comment on function private.doke_order_transition_allowed(text, text, text) is
  'Authoritative order lifecycle graph by actor role.';
comment on function private.enforce_order_state_machine() is
  'Rejects invalid order transitions and participant ownership rewrites.';
