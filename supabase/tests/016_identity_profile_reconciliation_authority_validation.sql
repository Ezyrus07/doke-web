-- AUTH-001 / AUTH-A11 staging validation.
-- Execute only after migration 147. All synthetic identities are rolled back.

begin;

do $block$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'auth-a11-' || replace(gen_random_uuid()::text, '-', '') || '@example.test';
  v_handle text := 'autha11_' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  v_updated_handle text := 'autha11u_' || left(replace(gen_random_uuid()::text, '-', ''), 11);
  v_identity jsonb;
  v_settings jsonb;
  v_email_after text;
  v_role_after text;
  v_status_after text;
  v_metadata_handle text;
begin
  if has_function_privilege('anon', 'public.get_account_identity_state()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.get_account_identity_state()', 'EXECUTE') then
    raise exception 'AUTH_A11_IDENTITY_STATE_DIRECT_BROWSER_GRANT';
  end if;

  if has_function_privilege('anon', 'public.update_account_settings(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.update_account_settings(jsonb)', 'EXECUTE') then
    raise exception 'AUTH_A11_SETTINGS_DIRECT_BROWSER_GRANT';
  end if;

  if not has_function_privilege('service_role', 'public.get_account_identity_state()', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.update_account_settings(jsonb)', 'EXECUTE') then
    raise exception 'AUTH_A11_SERVICE_ROLE_GRANT_MISSING';
  end if;

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
    v_email,
    crypt('AuthA11!123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"client","account_status":"active"}'::jsonb,
    jsonb_build_object('name', 'AUTH A11 Validation', 'handle', v_handle),
    now(),
    now(),
    false,
    false
  );

  update public.users
  set settings = jsonb_build_object('postalCode', '40100000', 'notifications', jsonb_build_object('messages', true))
  where id = v_user_id;

  select public.execute_self_service_operation_internal(
    v_user_id,
    'update_account_profile_reconciled',
    jsonb_build_object(
      'p_display_name', 'AUTH A11 Reconciled',
      'p_username', v_updated_handle,
      'p_city', 'Salvador',
      'p_state', 'BA',
      'p_bio', 'Canonical profile reconciliation',
      'p_interests', jsonb_build_array('Tecnologia', 'Empreendedorismo'),
      'p_avatar_url', 'https://example.test/avatar.png',
      'p_cover_url', 'https://example.test/cover.png'
    )
  ) into v_identity;

  if v_identity ->> 'userId' <> v_user_id::text
     or v_identity -> 'profile' ->> 'userId' <> v_user_id::text then
    raise exception 'AUTH_A11_RECONCILED_PROFILE_SUBJECT_MISMATCH';
  end if;
  if v_identity -> 'profile' ->> 'username' <> v_updated_handle
     or v_identity -> 'profile' ->> 'displayName' <> 'AUTH A11 Reconciled'
     or v_identity -> 'profile' ->> 'city' <> 'Salvador'
     or v_identity -> 'profile' ->> 'state' <> 'BA' then
    raise exception 'AUTH_A11_RECONCILED_PROFILE_SNAPSHOT_MISMATCH';
  end if;

  select raw_user_meta_data ->> 'handle'
  into v_metadata_handle
  from auth.users
  where id = v_user_id;

  if v_metadata_handle <> v_updated_handle then
    raise exception 'AUTH_A11_PROVIDER_METADATA_NOT_RECONCILED';
  end if;

  select public.execute_self_service_operation_internal(
    v_user_id,
    'update_account_settings',
    jsonb_build_object(
      'p_settings', jsonb_build_object(
        'notifications', jsonb_build_object('messages', false),
        'privacy', jsonb_build_object('publicProfile', false),
        'account', jsonb_build_object('email', 'forbidden@example.test'),
        'role', 'admin',
        'accountStatus', 'disabled'
      )
    )
  ) into v_settings;

  if coalesce((v_settings -> 'settings' -> 'notifications' ->> 'messages')::boolean, true) then
    raise exception 'AUTH_A11_ALLOWED_SETTINGS_NOT_UPDATED';
  end if;
  if coalesce(v_settings -> 'settings' ->> 'postalCode', '') <> '40100000' then
    raise exception 'AUTH_A11_SYSTEM_SETTING_NOT_PRESERVED';
  end if;
  if (v_settings -> 'settings') ? 'account'
     or (v_settings -> 'settings') ? 'role'
     or (v_settings -> 'settings') ? 'accountStatus' then
    raise exception 'AUTH_A11_PROTECTED_SETTING_ACCEPTED';
  end if;

  select email, role, status
  into v_email_after, v_role_after, v_status_after
  from public.users
  where id = v_user_id;

  if v_email_after <> lower(v_email) or v_role_after <> 'client' or v_status_after <> 'active' then
    raise exception 'AUTH_A11_PROTECTED_IDENTITY_MUTATED';
  end if;

  select public.execute_self_service_operation_internal(
    v_user_id,
    'get_account_identity_state',
    '{}'::jsonb
  ) into v_identity;

  if v_identity ->> 'userId' <> v_user_id::text then
    raise exception 'AUTH_A11_IDENTITY_SUBJECT_MISMATCH';
  end if;
  if v_identity -> 'profile' ->> 'username' <> v_updated_handle then
    raise exception 'AUTH_A11_PROFILE_SNAPSHOT_MISMATCH';
  end if;
  if coalesce(v_identity -> 'settings' ->> 'postalCode', '') <> '40100000' then
    raise exception 'AUTH_A11_IDENTITY_SETTINGS_MISMATCH';
  end if;

  begin
    perform public.execute_self_service_operation_internal(
      v_user_id,
      'update_account_settings',
      jsonb_build_object('p_settings', jsonb_build_object('privacy', 'invalid'))
    );
    raise exception 'AUTH_A11_INVALID_SETTINGS_SECTION_ACCEPTED';
  exception
    when sqlstate '22023' then
      if position('DOKE_SETTINGS_SECTION_INVALID' in sqlerrm) = 0 then raise; end if;
  end;
end;
$block$;

rollback;
