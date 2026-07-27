-- CAT-001 / CAT-A03: canonical owner lifecycle authority for services.
-- Browser clients reach this mutation only through the JWT-verified
-- self-service-operations Edge Function and its service-role dispatcher.

create or replace function public.transition_owned_service_lifecycle(
  p_service_ref text,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_ref text := btrim(coalesce(p_service_ref, ''));
  v_action text := lower(btrim(coalesce(p_action, '')));
  v_service public.services%rowtype;
  v_next_status text;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SERVICE_LIFECYCLE_AUTH_REQUIRED';
  end if;
  if v_ref = '' or char_length(v_ref) > 140 then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_REFERENCE_INVALID';
  end if;
  if v_action not in ('pause', 'reactivate', 'archive') then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_LIFECYCLE_ACTION_INVALID';
  end if;

  if not exists (
    select 1
    from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = v_actor_id
      and u.role = 'professional'
      and u.status = 'active'
      and u.onboarding_status = 'completed'
      and p.setup_status = 'active'
      and p.verification_status = 'verified'
      and p.document_status = 'verified'
  ) then
    raise exception using errcode = '42501', message = 'PROFESSIONAL_APPROVAL_REQUIRED';
  end if;

  select s.*
  into v_service
  from public.services s
  where s.external_id = v_ref
     or (v_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' and s.id = v_ref::uuid)
  order by case when s.external_id = v_ref then 0 else 1 end
  limit 1
  for update;

  if v_service.id is null then
    raise exception using errcode = 'P0002', message = 'SERVICE_NOT_FOUND';
  end if;
  if v_service.professional_id <> v_actor_id then
    raise exception using errcode = '42501', message = 'SERVICE_OWNERSHIP_REQUIRED';
  end if;

  if v_action = 'pause' then
    if v_service.status <> 'published' then
      raise exception using errcode = '22023', message = 'SERVICE_PAUSE_TRANSITION_INVALID';
    end if;
    v_next_status := 'paused';
  elsif v_action = 'reactivate' then
    if v_service.status <> 'paused' or v_service.approved_version_id is null then
      raise exception using errcode = '22023', message = 'SERVICE_REACTIVATE_TRANSITION_INVALID';
    end if;
    if v_service.moderation_status = 'suspended' then
      raise exception using errcode = '42501', message = 'SERVICE_SUSPENDED';
    end if;
    v_next_status := 'published';
  else
    if v_service.status not in ('draft', 'published', 'paused', 'archived') then
      raise exception using errcode = '22023', message = 'SERVICE_ARCHIVE_TRANSITION_INVALID';
    end if;
    v_next_status := 'archived';
  end if;

  if v_service.status = v_next_status then
    return jsonb_build_object(
      'serviceId', v_service.id,
      'externalId', v_service.external_id,
      'publicStatus', v_service.status,
      'moderationStatus', v_service.moderation_status,
      'approvedVersionId', v_service.approved_version_id,
      'pendingVersionId', v_service.pending_version_id,
      'action', v_action,
      'changed', false
    );
  end if;

  if v_action = 'archive' and v_service.pending_version_id is not null then
    update public.service_versions
    set review_status = 'superseded', updated_at = now()
    where service_id = v_service.id
      and review_status in ('pending_review', 'changes_required');
  end if;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set status = v_next_status,
      pending_version_id = case when v_action = 'archive' then null else pending_version_id end,
      moderation_status = case
        when v_action = 'archive' and approved_version_id is null then 'draft'
        when v_action = 'archive' and approved_version_id is not null then 'published'
        else moderation_status
      end,
      review_reason = case when v_action = 'archive' then null else review_reason end,
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'statusChangedAt', now(),
        'lifecycleAction', v_action
      ),
      updated_at = now()
  where id = v_service.id
  returning * into v_service;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'publicStatus', v_service.status,
    'moderationStatus', v_service.moderation_status,
    'approvedVersionId', v_service.approved_version_id,
    'pendingVersionId', v_service.pending_version_id,
    'action', v_action,
    'changed', true,
    'updatedAt', v_service.updated_at
  );
end;
$function$;

revoke all on function public.transition_owned_service_lifecycle(text, text)
  from public, anon, authenticated;
grant execute on function public.transition_owned_service_lifecycle(text, text)
  to service_role;

revoke insert, update, delete on table public.services from anon, authenticated;

do $block$
begin
  if to_regprocedure('public.execute_self_service_operation_internal_pre_cat_a03(uuid,text,jsonb)') is null then
    alter function public.execute_self_service_operation_internal(uuid, text, jsonb)
      rename to execute_self_service_operation_internal_pre_cat_a03;
  end if;
end;
$block$;

revoke all on function public.execute_self_service_operation_internal_pre_cat_a03(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal_pre_cat_a03(uuid, text, jsonb)
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
  v_result jsonb;
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

  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
    true
  );

  case v_operation
    when 'transition_owned_service_lifecycle' then
      v_result := public.transition_owned_service_lifecycle(
        p_service_ref := v_payload ->> 'p_service_ref',
        p_action := v_payload ->> 'p_action'
      );
    else
      v_result := public.execute_self_service_operation_internal_pre_cat_a03(
        p_actor_id := p_actor_id,
        p_operation := v_operation,
        p_payload := v_payload
      );
  end case;

  return coalesce(v_result, '{}'::jsonb);
end;
$function$;

revoke all on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal(uuid, text, jsonb)
  to service_role;

comment on function public.transition_owned_service_lifecycle(text, text) is
  'CAT-A03 owner-only service pause, reactivate and archive authority behind the JWT-verified self-service Edge Function.';
comment on function public.execute_self_service_operation_internal(uuid, text, jsonb) is
  'CAT-A03 self-service dispatcher wrapper; delegates earlier operations to the pre-CAT-A03 authority.';
