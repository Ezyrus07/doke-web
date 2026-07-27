-- PROF-001 / PROF-A03: atomic active-professional profile reconciliation.
-- The browser reaches this authority only through the JWT-verified
-- self-service-operations Edge Function and its service-role dispatcher.

create or replace function public.update_professional_profile_reconciled(
  p_display_name text,
  p_username text,
  p_city text default '',
  p_state text default '',
  p_bio text default '',
  p_interests jsonb default '[]'::jsonb,
  p_avatar_url text default '',
  p_cover_url text default '',
  p_professional_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_now timestamptz := now();
  v_user public.users%rowtype;
  v_professional public.professional_profiles%rowtype;
  v_identity jsonb;
  v_source jsonb := coalesce(p_professional_payload, '{}'::jsonb);
  v_main_category text;
  v_other_category text;
  v_specialties text;
  v_short_bio text;
  v_service_region text;
  v_experience_years text;
  v_next_payload jsonb;
  v_key text;
  v_allowed_keys constant text[] := array[
    'mainCategory',
    'otherCategory',
    'specialties',
    'shortBio',
    'serviceRegion',
    'experienceYears'
  ];
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_PROFESSIONAL_PROFILE_AUTH_REQUIRED';
  end if;

  if jsonb_typeof(v_source) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_PROFILE_PAYLOAD_INVALID';
  end if;
  if octet_length(v_source::text) > 16384 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_PROFILE_PAYLOAD_TOO_LARGE';
  end if;

  for v_key in select jsonb_object_keys(v_source)
  loop
    if not (v_key = any(v_allowed_keys)) then
      raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_PROFILE_FIELD_FORBIDDEN';
    end if;
  end loop;

  select *
  into v_user
  from public.users
  where id = v_actor_id
  for update;

  if v_user.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_PROFESSIONAL_PROFILE_ACCOUNT_NOT_FOUND';
  end if;
  if v_user.status <> 'active' then
    raise exception using errcode = '42501', message = 'DOKE_ACCOUNT_NOT_ACTIVE';
  end if;
  if v_user.role <> 'professional' then
    raise exception using errcode = '42501', message = 'DOKE_PROFESSIONAL_ROLE_REQUIRED';
  end if;

  select *
  into v_professional
  from public.professional_profiles
  where user_id = v_actor_id
  for update;

  if v_professional.user_id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_PROFESSIONAL_PROFILE_NOT_FOUND';
  end if;
  if v_professional.setup_status <> 'active'
     or v_professional.verification_status <> 'verified'
     or v_professional.document_status <> 'verified' then
    raise exception using errcode = '42501', message = 'DOKE_ACTIVE_VERIFIED_PROFESSIONAL_REQUIRED';
  end if;

  v_main_category := regexp_replace(trim(coalesce(v_source ->> 'mainCategory', '')), '\s+', ' ', 'g');
  v_other_category := regexp_replace(trim(coalesce(v_source ->> 'otherCategory', '')), '\s+', ' ', 'g');
  v_specialties := regexp_replace(trim(coalesce(v_source ->> 'specialties', '')), '\s+', ' ', 'g');
  v_short_bio := regexp_replace(trim(coalesce(v_source ->> 'shortBio', '')), '\s+', ' ', 'g');
  v_service_region := regexp_replace(trim(coalesce(v_source ->> 'serviceRegion', '')), '\s+', ' ', 'g');
  v_experience_years := regexp_replace(trim(coalesce(v_source ->> 'experienceYears', '')), '\s+', ' ', 'g');

  if char_length(v_main_category) < 2 or char_length(v_main_category) > 80 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_CATEGORY_INVALID';
  end if;
  if char_length(v_other_category) > 80 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_OTHER_CATEGORY_INVALID';
  end if;
  if char_length(v_specialties) < 3 or char_length(v_specialties) > 180 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_SPECIALTIES_INVALID';
  end if;
  if char_length(v_short_bio) < 20 or char_length(v_short_bio) > 350 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_SHORT_BIO_INVALID';
  end if;
  if char_length(v_service_region) < 3 or char_length(v_service_region) > 140 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_SERVICE_REGION_INVALID';
  end if;
  if char_length(v_experience_years) < 1 or char_length(v_experience_years) > 60 then
    raise exception using errcode = '22023', message = 'DOKE_PROFESSIONAL_EXPERIENCE_INVALID';
  end if;

  -- This mutation remains atomic: any professional update failure rolls back
  -- the base identity mutation performed earlier in the same transaction.
  perform public.update_account_profile(
    p_display_name := p_display_name,
    p_username := p_username,
    p_city := coalesce(p_city, ''),
    p_state := coalesce(p_state, ''),
    p_bio := v_short_bio,
    p_interests := coalesce(p_interests, '[]'::jsonb),
    p_avatar_url := coalesce(p_avatar_url, ''),
    p_cover_url := coalesce(p_cover_url, '')
  );

  v_next_payload := (
    coalesce(v_professional.setup_payload, '{}'::jsonb)
    - 'mainCategory'
    - 'otherCategory'
    - 'specialties'
    - 'shortBio'
    - 'serviceRegion'
    - 'experienceYears'
  ) || jsonb_build_object(
    'mainCategory', v_main_category,
    'otherCategory', v_other_category,
    'specialties', v_specialties,
    'shortBio', v_short_bio,
    'serviceRegion', v_service_region,
    'experienceYears', v_experience_years
  );

  update public.professional_profiles
  set headline = v_short_bio,
      setup_payload = v_next_payload,
      updated_at = v_now
  where user_id = v_actor_id
  returning * into v_professional;

  v_identity := public.get_account_identity_state();

  return jsonb_build_object(
    'userId', v_actor_id,
    'profile', v_identity -> 'profile',
    'professionalProfile', jsonb_build_object(
      'id', 'professional_profile_' || v_actor_id::text,
      'userId', v_actor_id,
      'status', v_professional.setup_status,
      'currentStep', v_professional.setup_current_step,
      'payload', coalesce(v_professional.setup_payload, '{}'::jsonb),
      'verificationStatus', v_professional.verification_status,
      'documentStatus', v_professional.document_status,
      'completedAt', v_professional.setup_completed_at,
      'updatedAt', v_professional.updated_at
    )
  );
end;
$function$;

revoke all on function public.update_professional_profile_reconciled(
  text, text, text, text, text, jsonb, text, text, jsonb
) from public, anon, authenticated;
grant execute on function public.update_professional_profile_reconciled(
  text, text, text, text, text, jsonb, text, text, jsonb
) to service_role;

do $block$
begin
  if to_regprocedure('public.execute_self_service_operation_internal_pre_prof_a03(uuid,text,jsonb)') is null then
    alter function public.execute_self_service_operation_internal(uuid, text, jsonb)
      rename to execute_self_service_operation_internal_pre_prof_a03;
  end if;
end;
$block$;

revoke all on function public.execute_self_service_operation_internal_pre_prof_a03(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal_pre_prof_a03(uuid, text, jsonb)
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
    when 'update_professional_profile_reconciled' then
      v_result := public.update_professional_profile_reconciled(
        p_display_name := v_payload ->> 'p_display_name',
        p_username := v_payload ->> 'p_username',
        p_city := coalesce(v_payload ->> 'p_city', ''),
        p_state := coalesce(v_payload ->> 'p_state', ''),
        p_bio := coalesce(v_payload ->> 'p_bio', ''),
        p_interests := coalesce(v_payload -> 'p_interests', '[]'::jsonb),
        p_avatar_url := coalesce(v_payload ->> 'p_avatar_url', ''),
        p_cover_url := coalesce(v_payload ->> 'p_cover_url', ''),
        p_professional_payload := coalesce(v_payload -> 'p_professional_payload', '{}'::jsonb)
      );

    else
      v_result := public.execute_self_service_operation_internal_pre_prof_a03(
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

comment on function public.update_professional_profile_reconciled(
  text, text, text, text, text, jsonb, text, text, jsonb
) is
  'PROF-A03 atomic base-identity and active-professional profile mutation with canonical reconciliation.';
comment on function public.execute_self_service_operation_internal(uuid, text, jsonb) is
  'PROF-A03 self-service dispatcher wrapper; delegates all earlier operations to the pre-PROF-A03 authority.';
