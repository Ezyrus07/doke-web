-- Public server-only dispatcher consumed by the JWT-verified Edge Function.

create or replace function public.execute_staging_finance_sandbox_internal(
  p_actor_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_action text := lower(btrim(coalesce(p_action, '')));
begin
  if v_action not in ('hold_payment', 'request_completion', 'release_payment') then
    raise exception using errcode = '22023', message = 'DOKE_FINANCE_SANDBOX_ACTION_INVALID';
  end if;

  case v_action
    when 'hold_payment' then
      return private.finance_sandbox_hold_payment(p_actor_id, p_payload);
    when 'request_completion' then
      return private.finance_sandbox_request_completion(p_actor_id, p_payload);
    when 'release_payment' then
      return private.finance_sandbox_release_payment(p_actor_id, p_payload);
  end case;
end;
$function$;

revoke all on function public.execute_staging_finance_sandbox_internal(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_staging_finance_sandbox_internal(uuid, text, jsonb)
  to service_role;

comment on function public.execute_staging_finance_sandbox_internal(uuid, text, jsonb) is
  'Staging-project-only payment/escrow sandbox dispatcher. Never a production PSP authority.';
