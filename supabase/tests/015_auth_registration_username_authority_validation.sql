-- AUTH-001 / AUTH-A04 staging validation.
-- Execute only after migration 146. All synthetic identities are rolled back.

begin;

do $$
declare
  v_available record;
begin
  if public.normalize_username('@Gábríel.Antonio') <> 'gabriel.antonio' then
    raise exception 'AUTH_A04_NORMALIZATION_FAILED';
  end if;

  if not public.is_valid_username('gabriel.antonio') then
    raise exception 'AUTH_A04_VALID_USERNAME_REJECTED';
  end if;

  if public.is_valid_username('admin') or not public.is_reserved_username('@Admin') then
    raise exception 'AUTH_A04_RESERVED_USERNAME_NOT_BLOCKED';
  end if;

  select * into v_available
  from public.check_username_availability('auth.a04.available');

  if not v_available.valid or not v_available.available or v_available.reason <> 'available' then
    raise exception 'AUTH_A04_AVAILABILITY_RPC_FAILED';
  end if;

  if not has_function_privilege('anon', 'public.check_username_availability(text)', 'EXECUTE') then
    raise exception 'AUTH_A04_ANON_RPC_GRANT_MISSING';
  end if;

  if not has_function_privilege('authenticated', 'public.check_username_availability(text)', 'EXECUTE') then
    raise exception 'AUTH_A04_AUTHENTICATED_RPC_GRANT_MISSING';
  end if;

  if has_function_privilege('anon', 'private.enforce_requested_auth_username_doke()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.enforce_requested_auth_username_doke()', 'EXECUTE') then
    raise exception 'AUTH_A04_PRIVATE_TRIGGER_FUNCTION_EXPOSED';
  end if;
end;
$$;

do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_duplicate_id uuid := gen_random_uuid();
  v_reserved_id uuid := gen_random_uuid();
  v_handle text := 'autha04_' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  v_materialized text;
  v_availability record;
  v_duplicate_blocked boolean := false;
  v_reserved_blocked boolean := false;
begin
  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_sso_user,
    is_anonymous
  ) values (
    v_user_id,
    'authenticated',
    'authenticated',
    'auth-a04-' || replace(v_user_id::text, '-', '') || '@example.test',
    crypt('AuthA04!123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', 'AUTH A04 Validation', 'handle', upper(v_handle)),
    now(),
    now(),
    false,
    false
  );

  select username into v_materialized
  from public.user_profiles
  where user_id = v_user_id;

  if v_materialized <> v_handle then
    raise exception 'AUTH_A04_REQUESTED_USERNAME_NOT_MATERIALIZED: %', v_materialized;
  end if;

  if not exists (select 1 from public.users where id = v_user_id)
     or not exists (select 1 from public.client_profiles where user_id = v_user_id) then
    raise exception 'AUTH_A04_ACCOUNT_MATERIALIZATION_INCOMPLETE';
  end if;

  select * into v_availability
  from public.check_username_availability(upper(v_handle));

  if not v_availability.valid or v_availability.available or v_availability.reason <> 'taken' then
    raise exception 'AUTH_A04_TAKEN_USERNAME_NOT_REPORTED';
  end if;

  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    ) values (
      v_duplicate_id,
      'authenticated',
      'authenticated',
      'auth-a04-' || replace(v_duplicate_id::text, '-', '') || '@example.test',
      crypt('AuthA04!123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'AUTH A04 Duplicate', 'handle', upper(v_handle)),
      now(),
      now(),
      false,
      false
    );
  exception
    when unique_violation then
      v_duplicate_blocked := position('DOKE_IDENTITY_USERNAME_TAKEN' in sqlerrm) > 0;
  end;

  if not v_duplicate_blocked then
    raise exception 'AUTH_A04_SIGNUP_RACE_NOT_BLOCKED';
  end if;

  if exists (select 1 from auth.users where id = v_duplicate_id)
     or exists (select 1 from public.user_profiles where user_id = v_duplicate_id) then
    raise exception 'AUTH_A04_DUPLICATE_SIGNUP_LEFT_PARTIAL_ROWS';
  end if;

  begin
    insert into auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, is_anonymous
    ) values (
      v_reserved_id,
      'authenticated',
      'authenticated',
      'auth-a04-' || replace(v_reserved_id::text, '-', '') || '@example.test',
      crypt('AuthA04!123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', 'AUTH A04 Reserved', 'handle', 'ADMIN'),
      now(),
      now(),
      false,
      false
    );
  exception
    when invalid_parameter_value then
      v_reserved_blocked := position('DOKE_IDENTITY_USERNAME_INVALID' in sqlerrm) > 0;
  end;

  if not v_reserved_blocked then
    raise exception 'AUTH_A04_RESERVED_SIGNUP_NOT_BLOCKED';
  end if;

  if exists (select 1 from auth.users where id = v_reserved_id)
     or exists (select 1 from public.user_profiles where user_id = v_reserved_id) then
    raise exception 'AUTH_A04_RESERVED_SIGNUP_LEFT_PARTIAL_ROWS';
  end if;
end;
$$;

rollback;
