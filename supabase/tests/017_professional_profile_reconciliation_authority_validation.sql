-- PROF-001 / PROF-A03 staging validation.
-- Execute only after the PROF-A03 migration. Synthetic identities are rolled back.

begin;

do $block$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'prof-a03-' || replace(gen_random_uuid()::text, '-', '') || '@example.test';
  v_handle text := 'profa03_' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  v_updated_handle text := 'profa03u_' || left(replace(gen_random_uuid()::text, '-', ''), 11);
  v_result jsonb;
  v_professional_payload jsonb;
  v_role text;
  v_status text;
begin
  if has_function_privilege('anon', 'public.update_professional_profile_reconciled(text,text,text,text,text,jsonb,text,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.update_professional_profile_reconciled(text,text,text,text,text,jsonb,text,text,jsonb)', 'EXECUTE') then
    raise exception 'PROF_A03_DIRECT_BROWSER_GRANT';
  end if;

  if not has_function_privilege('service_role', 'public.update_professional_profile_reconciled(text,text,text,text,text,jsonb,text,text,jsonb)', 'EXECUTE') then
    raise exception 'PROF_A03_SERVICE_ROLE_GRANT_MISSING';
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
    crypt('ProfA03!123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"role":"professional","account_status":"active"}'::jsonb,
    jsonb_build_object('name', 'PROF A03 Validation', 'handle', v_handle),
    now(),
    now(),
    false,
    false
  );

  update public.users
  set role = 'professional',
      status = 'active'
  where id = v_user_id;

  insert into public.professional_profiles (
    user_id,
    headline,
    document_status,
    setup_status,
    setup_payload,
    setup_current_step,
    setup_completed_at,
    verification_status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'Perfil profissional original',
    'verified',
    'active',
    jsonb_build_object(
      'mainCategory', 'Pintura',
      'specialties', 'Pintura residencial',
      'shortBio', 'Apresentação profissional original para validação.',
      'serviceRegion', 'Salvador e região',
      'experienceYears', '5 anos',
      'truthConfirmed', true,
      'termsAccepted', true
    ),
    2,
    now(),
    'verified',
    now(),
    now()
  )
  on conflict (user_id) do update set
    document_status = 'verified',
    setup_status = 'active',
    setup_payload = excluded.setup_payload,
    setup_current_step = 2,
    setup_completed_at = now(),
    verification_status = 'verified',
    updated_at = now();

  select public.execute_self_service_operation_internal(
    v_user_id,
    'update_professional_profile_reconciled',
    jsonb_build_object(
      'p_display_name', 'PROF A03 Reconciliado',
      'p_username', v_updated_handle,
      'p_city', 'Salvador',
      'p_state', 'BA',
      'p_bio', 'Apresentação profissional reconciliada pelo servidor.',
      'p_interests', jsonb_build_array('Pintura', 'Acabamento'),
      'p_avatar_url', 'https://example.test/prof-a03-avatar.png',
      'p_cover_url', 'https://example.test/prof-a03-cover.png',
      'p_professional_payload', jsonb_build_object(
        'mainCategory', 'Pintura e acabamento',
        'otherCategory', '',
        'specialties', 'Pintura residencial e acabamento fino',
        'shortBio', 'Apresentação profissional reconciliada pelo servidor.',
        'serviceRegion', 'Salvador e região metropolitana',
        'experienceYears', 'Mais de 5 anos'
      )
    )
  ) into v_result;

  if v_result ->> 'userId' <> v_user_id::text
     or v_result -> 'profile' ->> 'userId' <> v_user_id::text
     or v_result -> 'professionalProfile' ->> 'userId' <> v_user_id::text then
    raise exception 'PROF_A03_RECONCILIATION_SUBJECT_MISMATCH';
  end if;

  if v_result -> 'profile' ->> 'username' <> v_updated_handle
     or v_result -> 'profile' ->> 'displayName' <> 'PROF A03 Reconciliado'
     or v_result -> 'professionalProfile' ->> 'status' <> 'active'
     or v_result -> 'professionalProfile' ->> 'verificationStatus' <> 'verified' then
    raise exception 'PROF_A03_RECONCILED_SNAPSHOT_MISMATCH';
  end if;

  select setup_payload
  into v_professional_payload
  from public.professional_profiles
  where user_id = v_user_id;

  if v_professional_payload ->> 'mainCategory' <> 'Pintura e acabamento'
     or v_professional_payload ->> 'specialties' <> 'Pintura residencial e acabamento fino'
     or coalesce((v_professional_payload ->> 'truthConfirmed')::boolean, false) is not true
     or coalesce((v_professional_payload ->> 'termsAccepted')::boolean, false) is not true then
    raise exception 'PROF_A03_PROFESSIONAL_PAYLOAD_NOT_RECONCILED';
  end if;

  select role, status
  into v_role, v_status
  from public.users
  where id = v_user_id;

  if v_role <> 'professional' or v_status <> 'active' then
    raise exception 'PROF_A03_PROTECTED_ACCOUNT_STATE_MUTATED';
  end if;

  begin
    perform public.execute_self_service_operation_internal(
      v_user_id,
      'update_professional_profile_reconciled',
      jsonb_build_object(
        'p_display_name', 'PROF A03 Reconciliado',
        'p_username', v_updated_handle,
        'p_professional_payload', jsonb_build_object(
          'mainCategory', 'Pintura',
          'specialties', 'Pintura residencial',
          'shortBio', 'Apresentação profissional válida para o teste.',
          'serviceRegion', 'Salvador',
          'experienceYears', '5 anos',
          'verificationStatus', 'verified'
        )
      )
    );
    raise exception 'PROF_A03_FORBIDDEN_FIELD_ACCEPTED';
  exception
    when sqlstate '22023' then
      if position('DOKE_PROFESSIONAL_PROFILE_FIELD_FORBIDDEN' in sqlerrm) = 0 then
        raise;
      end if;
  end;
end;
$block$;

rollback;
