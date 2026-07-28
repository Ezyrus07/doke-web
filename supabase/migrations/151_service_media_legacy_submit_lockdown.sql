-- CAT-001 / CAT-A04: fail closed if an older Edge Function attempts to route
-- service submission through the pre-media dispatcher without an upload intent.

do $block$
begin
  if to_regprocedure('public.execute_self_service_operation_internal_pre_cat_a04(uuid,text,jsonb)') is null then
    alter function public.execute_self_service_operation_internal(uuid, text, jsonb)
      rename to execute_self_service_operation_internal_pre_cat_a04;
  end if;
end;
$block$;

revoke all on function public.execute_self_service_operation_internal_pre_cat_a04(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal_pre_cat_a04(uuid, text, jsonb)
  to service_role;

create or replace function public.execute_self_service_operation_internal(
  p_actor_id uuid,
  p_operation text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_operation text := lower(btrim(coalesce(p_operation, '')));
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SELF_SERVICE_AUTH_REQUIRED';
  end if;
  if jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SELF_SERVICE_PAYLOAD_INVALID';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_actor_id) then
    raise exception using errcode = '28000', message = 'DOKE_SELF_SERVICE_ACTOR_NOT_FOUND';
  end if;

  if v_operation = 'submit_service_for_review' then
    raise exception using errcode = '42501', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED';
  end if;

  return coalesce(
    public.execute_self_service_operation_internal_pre_cat_a04(
      p_actor_id := p_actor_id,
      p_operation := v_operation,
      p_payload := v_payload
    ),
    '{}'::jsonb
  );
end;
$function$;

revoke all on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  to service_role;

comment on function public.execute_self_service_operation_internal(uuid, text, jsonb) is
  'CAT-A04 dispatcher wrapper; legacy service submission fails closed and media-aware submission is handled explicitly by the JWT-verified Edge Function.';
