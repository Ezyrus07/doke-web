-- Doke SEC-001 / identity batch 1.
-- Rebuilds self-service identity RPCs around auth.uid() and applies explicit grants.

create or replace function public.complete_account_onboarding(
  p_city text,
  p_state text,
  p_postal_code text default null,
  p_bio text default '',
  p_interests jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.user_profiles%rowtype;
  v_status text;
  v_city text := nullif(regexp_replace(trim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_state text := upper(nullif(trim(coalesce(p_state, '')), ''));
  v_bio text := regexp_replace(trim(coalesce(p_bio, '')), '\s+', ' ', 'g');
  v_postal_code text := regexp_replace(coalesce(p_postal_code, ''), '\D', '', 'g');
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'DOKE_AUTH_REQUIRED';
  end if;

  perform private.materialize_auth_account(v_uid);

  select status into v_status from public.users where id = v_uid;
  if v_status <> 'active' then
    raise exception using errcode = '42501', message = 'DOKE_ACCOUNT_NOT_ACTIVE';
  end if;

  if v_city is null or char_length(v_city) > 60 then
    raise exception using errcode = '22023', message = 'DOKE_ONBOARDING_CITY_INVALID';
  end if;
  if v_state is null or v_state !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'DOKE_ONBOARDING_STATE_INVALID';
  end if;
  if char_length(v_bio) > 500 then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_BIO_TOO_LONG';
  end if;
  if v_postal_code <> '' and char_length(v_postal_code) <> 8 then
    raise exception using errcode = '22023', message = 'DOKE_ONBOARDING_POSTAL_CODE_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_interests, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_interests, '[]'::jsonb)) > 8
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_interests, '[]'::jsonb)) item
       where jsonb_typeof(item) <> 'string'
          or char_length(trim(item #>> '{}')) < 1
          or char_length(trim(item #>> '{}')) > 40
     ) then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_INTERESTS_INVALID';
  end if;

  update public.user_profiles
     set city = v_city,
         state = v_state,
         bio = v_bio,
         interests = coalesce(p_interests, '[]'::jsonb),
         updated_at = now()
   where user_id = v_uid
   returning * into v_profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_PROFILE_NOT_FOUND';
  end if;

  update public.users
     set onboarding_status = 'completed',
         onboarding_completed_at = coalesce(onboarding_completed_at, now()),
         settings = coalesce(settings, '{}'::jsonb)
           || jsonb_build_object('postalCode', v_postal_code),
         updated_at = now()
   where id = v_uid;

  return jsonb_build_object(
    'userId', v_uid,
    'city', v_profile.city,
    'state', v_profile.state,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'onboardingStatus', 'completed'
  );
end;
$$;

create or replace function public.update_account_profile(
  p_display_name text,
  p_username text,
  p_city text default '',
  p_state text default '',
  p_bio text default '',
  p_interests jsonb default '[]'::jsonb,
  p_avatar_url text default '',
  p_cover_url text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.user_profiles%rowtype;
  v_display_name text := regexp_replace(trim(coalesce(p_display_name, '')), '\s+', ' ', 'g');
  v_username text;
  v_city text := nullif(regexp_replace(trim(coalesce(p_city, '')), '\s+', ' ', 'g'), '');
  v_state text := upper(nullif(trim(coalesce(p_state, '')), ''));
  v_bio text := regexp_replace(trim(coalesce(p_bio, '')), '\s+', ' ', 'g');
  v_avatar_url text := nullif(trim(coalesce(p_avatar_url, '')), '');
  v_cover_url text := nullif(trim(coalesce(p_cover_url, '')), '');
  v_status text;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'DOKE_AUTH_REQUIRED';
  end if;

  perform private.materialize_auth_account(v_uid);
  select status into v_status from public.users where id = v_uid;
  if v_status <> 'active' then
    raise exception using errcode = '42501', message = 'DOKE_ACCOUNT_NOT_ACTIVE';
  end if;

  if char_length(v_display_name) < 3 or char_length(v_display_name) > 80 then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_DISPLAY_NAME_INVALID';
  end if;

  v_username := lower(regexp_replace(trim(coalesce(p_username, '')), '[^a-zA-Z0-9._]+', '', 'g'));
  v_username := trim(both '._' from v_username);
  if char_length(v_username) < 3 or char_length(v_username) > 30
     or v_username !~ '^[a-z0-9](?:[a-z0-9._]{1,28}[a-z0-9])?$'
     or v_username = any(array['admin','administrador','doke','suporte','support','moderador','moderator','root','sistema','system']) then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_USERNAME_INVALID';
  end if;

  if exists (
    select 1 from public.user_profiles
    where username = v_username and user_id <> v_uid
  ) then
    raise exception using errcode = '23505', message = 'DOKE_PROFILE_USERNAME_TAKEN';
  end if;
  if v_city is not null and char_length(v_city) > 60 then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_CITY_INVALID';
  end if;
  if v_state is not null and v_state !~ '^[A-Z]{2}$' then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_STATE_INVALID';
  end if;
  if char_length(v_bio) > 500 then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_BIO_TOO_LONG';
  end if;
  if char_length(coalesce(v_avatar_url, '')) > 2048 or char_length(coalesce(v_cover_url, '')) > 2048 then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_MEDIA_URL_TOO_LONG';
  end if;
  if jsonb_typeof(coalesce(p_interests, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_interests, '[]'::jsonb)) > 8
     or exists (
       select 1
       from jsonb_array_elements(coalesce(p_interests, '[]'::jsonb)) item
       where jsonb_typeof(item) <> 'string'
          or char_length(trim(item #>> '{}')) < 1
          or char_length(trim(item #>> '{}')) > 40
     ) then
    raise exception using errcode = '22023', message = 'DOKE_PROFILE_INTERESTS_INVALID';
  end if;

  update public.user_profiles
     set display_name = v_display_name,
         username = v_username,
         city = v_city,
         state = v_state,
         bio = v_bio,
         interests = coalesce(p_interests, '[]'::jsonb),
         avatar_url = coalesce(v_avatar_url, avatar_url),
         cover_url = coalesce(v_cover_url, cover_url),
         updated_at = now()
   where user_id = v_uid
   returning * into v_profile;

  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_PROFILE_NOT_FOUND';
  end if;

  update auth.users
     set raw_user_meta_data = (
           coalesce(raw_user_meta_data, '{}'::jsonb)
           - 'role' - 'type' - 'account_role' - 'account_status'
         ) || jsonb_build_object(
           'name', v_profile.display_name,
           'full_name', v_profile.display_name,
           'handle', v_profile.username,
           'city', v_profile.city,
           'state', v_profile.state,
           'bio', v_profile.bio,
           'interests', v_profile.interests,
           'avatar_url', v_profile.avatar_url,
           'cover_url', v_profile.cover_url
         ),
         updated_at = now()
   where id = v_uid;

  return jsonb_build_object(
    'profileId', v_profile.user_id,
    'displayName', v_profile.display_name,
    'username', v_profile.username,
    'city', v_profile.city,
    'state', v_profile.state,
    'bio', v_profile.bio,
    'interests', v_profile.interests,
    'avatarUrl', v_profile.avatar_url,
    'coverUrl', v_profile.cover_url
  );
end;
$$;

create or replace function public.get_account_onboarding_state()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_user public.users%rowtype;
  v_profile public.user_profiles%rowtype;
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'DOKE_AUTH_REQUIRED';
  end if;

  select * into v_user from public.users where id = v_uid;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_PUBLIC_ACCOUNT_NOT_FOUND';
  end if;

  select * into v_profile from public.user_profiles where user_id = v_uid;

  return jsonb_build_object(
    'userId', v_user.id,
    'role', v_user.role,
    'accountStatus', v_user.status,
    'onboardingStatus', coalesce(v_user.onboarding_status, 'not_started'),
    'onboardingCompletedAt', v_user.onboarding_completed_at,
    'profile', jsonb_build_object(
      'displayName', coalesce(v_profile.display_name, ''),
      'username', coalesce(v_profile.username, ''),
      'city', coalesce(v_profile.city, ''),
      'state', coalesce(v_profile.state, ''),
      'bio', coalesce(v_profile.bio, ''),
      'interests', coalesce(v_profile.interests, '[]'::jsonb),
      'avatarUrl', coalesce(v_profile.avatar_url, ''),
      'coverUrl', coalesce(v_profile.cover_url, '')
    )
  );
end;
$$;

revoke all on function public.complete_account_onboarding(text, text, text, text, jsonb) from public, anon;
revoke all on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) from public, anon;
revoke all on function public.get_account_onboarding_state() from public, anon;
grant execute on function public.complete_account_onboarding(text, text, text, text, jsonb) to authenticated, service_role;
grant execute on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) to authenticated, service_role;
grant execute on function public.get_account_onboarding_state() to authenticated, service_role;

-- Identity/KYC functions are never anonymous APIs. Owner and operator checks remain inside each RPC.
do $$
declare
  v_record record;
begin
  for v_record in
    select p.oid, p.oid::regprocedure as function_identity
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'save_professional_profile_setup',
        'save_professional_verification_draft',
        'submit_professional_identity_verification',
        'reopen_own_professional_identity_verification',
        'start_professional_identity_review',
        'decide_professional_identity_verification',
        'list_professional_identity_verifications_for_admin',
        'get_professional_identity_verification_for_admin'
      )
  loop
    execute format('revoke all on function %s from public, anon', v_record.function_identity);
    execute format('grant execute on function %s to authenticated, service_role', v_record.function_identity);
  end loop;
end;
$$;

-- Public materialization entrypoints are obsolete after all callers use private authority.
drop function if exists public.handle_new_auth_user_doke();
drop function if exists public.materialize_auth_account(uuid, text, text, jsonb);
