-- Doke: correct actor resolution inside the SECURITY DEFINER order trigger.
-- current_user is the function owner in a SECURITY DEFINER function; session_user
-- preserves the original database session role and must be used for trusted SQL sessions.

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
  if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
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

comment on function private.enforce_order_state_machine() is
  'Rejects invalid order transitions and participant ownership rewrites using JWT actor identity; session_user is trusted only for direct privileged SQL sessions.';
