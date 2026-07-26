-- AUTH-A11: provider-reconciled profile, onboarding and public-identity authority.
-- Adds a canonical identity snapshot and narrow profile/settings/onboarding mutations
-- behind the JWT-verified self-service Edge Function. No contact, credential, role
-- or account-status field is mutable through this migration.

create or replace function public.get_account_identity_state()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_user public.users;
  v_profile public.user_profiles;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_IDENTITY_AUTH_REQUIRED';
  end if;

  select *
  into v_user
  from public.users
  where id = v_actor_id;

  if v_user.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_IDENTITY_ACCOUNT_NOT_FOUND';
  end if;

  select *
  into v_profile
  from public.user_profiles
  where user_id = v_actor_id;

  if v_profile.user_id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_IDENTITY_PROFILE_NOT_FOUND';
  end if;

  return jsonb_build_object(
    'userId', v_user.id,
    'onboardingStatus', coalesce(v_user.onboarding_status, 'not_started'),
    'onboardingCompletedAt', v_user.onboarding_completed_at,
    'settings', coalesce(v_user.settings, '{}'::jsonb),
    'profile', jsonb_build_object(
      'profileId', v_profile.user_id,
      'userId', v_profile.user_id,
      'displayName', coalesce(v_profile.display_name, ''),
      'username', coalesce(v_profile.username, ''),
      'city', coalesce(v_profile.city, ''),
      'state', coalesce(v_profile.state, ''),
      'bio', coalesce(v_profile.bio, ''),
      'interests', coalesce(v_profile.interests, '[]'::jsonb),
      'avatarUrl', coalesce(v_profile.avatar_url, ''),
      'coverUrl', coalesce(v_profile.cover_url, ''),
      'updatedAt', v_profile.updated_at
    )
  );
end;
$function$;

create or replace function public.update_account_settings(
  p_settings jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  v_actor_id uuid := auth.uid();
  v_source jsonb := coalesce(p_settings, '{}'::jsonb);
  v_settings jsonb;
  v_key text;
  v_allowed_keys constant text[] := array[
    'professional',
    'payments',
    'availability',
    'support',
    'notifications',
    'security',
    'privacy'
  ];
  v_user public.users;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SETTINGS_AUTH_REQUIRED';
  end if;

  if jsonb_typeof(v_source) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SETTINGS_PAYLOAD_INVALID';
  end if;

  if octet_length(v_source::text) > 32768 then
    raise exception using errcode = '22023', message = 'DOKE_SETTINGS_PAYLOAD_TOO_LARGE';
  end if;

  select *
  into v_user
  from public.users
  where id = v_actor_id
  for update;

  if v_user.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_SETTINGS_ACCOUNT_NOT_FOUND';
  end if;

  v_settings := coalesce(v_user.settings, '{}'::jsonb);
  foreach v_key in array v_allowed_keys loop
    if v_source ? v_key then
      if jsonb_typeof(v_source -> v_key) <> 'object' then
        raise exception using errcode = '22023', message = 'DOKE_SETTINGS_SECTION_INVALID';
      end if;
      v_settings := (v_settings - v_key) || jsonb_build_object(v_key, v_source -> v_key);
    end if;
  end loop;

  update public.users
  set settings = v_settings,
      updated_at = now()
  where id = v_actor_id
  returning * into v_user;

  return jsonb_build_object(
    'userId', v_user.id,
    'settings', coalesce(v_user.settings, '{}'::jsonb),
    'updatedAt', v_user.updated_at
  );
end;
$function$;

revoke all on function public.get_account_identity_state() from public, anon, authenticated;
revoke all on function public.update_account_settings(jsonb) from public, anon, authenticated;
grant execute on function public.get_account_identity_state() to service_role;
grant execute on function public.update_account_settings(jsonb) to service_role;

do $block$
begin
  if to_regprocedure('public.execute_self_service_operation_internal_pre_a11(uuid,text,jsonb)') is null then
    alter function public.execute_self_service_operation_internal(uuid, text, jsonb)
      rename to execute_self_service_operation_internal_pre_a11;
  end if;
end;
$block$;

revoke all on function public.execute_self_service_operation_internal_pre_a11(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.execute_self_service_operation_internal_pre_a11(uuid, text, jsonb)
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
    when 'get_account_identity_state' then
      v_result := public.get_account_identity_state();

    when 'complete_account_onboarding_reconciled' then
      perform public.complete_account_onboarding(
        p_city := coalesce(v_payload ->> 'p_city', ''),
        p_state := coalesce(v_payload ->> 'p_state', ''),
        p_postal_code := nullif(v_payload ->> 'p_postal_code', ''),
        p_bio := coalesce(v_payload ->> 'p_bio', ''),
        p_interests := coalesce(v_payload -> 'p_interests', '[]'::jsonb)
      );
      v_result := public.get_account_identity_state();

    when 'update_account_profile_reconciled' then
      perform public.update_account_profile(
        p_display_name := v_payload ->> 'p_display_name',
        p_username := v_payload ->> 'p_username',
        p_city := coalesce(v_payload ->> 'p_city', ''),
        p_state := coalesce(v_payload ->> 'p_state', ''),
        p_bio := coalesce(v_payload ->> 'p_bio', ''),
        p_interests := coalesce(v_payload -> 'p_interests', '[]'::jsonb),
        p_avatar_url := coalesce(v_payload ->> 'p_avatar_url', ''),
        p_cover_url := coalesce(v_payload ->> 'p_cover_url', '')
      );
      v_result := public.get_account_identity_state();

    when 'update_account_settings' then
      v_result := public.update_account_settings(
        p_settings := coalesce(v_payload -> 'p_settings', '{}'::jsonb)
      );

    else
      v_result := public.execute_self_service_operation_internal_pre_a11(
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

comment on function public.get_account_identity_state() is
  'AUTH-A11 canonical identity/profile/settings/onboarding snapshot for the authenticated actor.';
comment on function public.update_account_settings(jsonb) is
  'AUTH-A11 narrow settings mutation; contact, credential, role and account status fields are excluded.';
comment on function public.execute_self_service_operation_internal(uuid, text, jsonb) is
  'AUTH-A11 atomic onboarding/profile reconciliation plus identity snapshot and narrow settings authority.';
