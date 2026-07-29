begin;

-- ORD-A05: an explicit JWT persona must win over the administrative database
-- session used by rollback canaries and operational tooling. Privileged fallback
-- remains available only when no authenticated persona is present.
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
  v_jwt_role text := lower(coalesce(nullif(trim(current_setting('request.jwt.claim.role', true)), ''), ''));
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

  if v_jwt_role = 'service_role' then
    v_capability := 'service_role';
  elsif v_actor_id is not null then
    if v_actor_id = v_order.client_id then
      v_capability := 'client';
    elsif v_actor_id = v_order.professional_id then
      v_capability := 'professional';
    else
      raise exception using errcode = '42501', message = 'DOKE_ORDER_PARTICIPANT_REQUIRED';
    end if;
  elsif v_jwt_role in ('authenticated', 'anon') then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_PARTICIPANT_REQUIRED';
  elsif session_user in ('postgres', 'supabase_admin', 'service_role')
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    v_capability := 'service_role';
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

revoke all on function public.transition_order_status(uuid, text, text, text, text) from public, anon;
grant execute on function public.transition_order_status(uuid, text, text, text, text) to authenticated, service_role;

comment on function public.transition_order_status(uuid, text, text, text, text) is
  'ORD-A05 participant-scoped optimistic lifecycle command. Explicit JWT personas take precedence over administrative session fallback.';

commit;
