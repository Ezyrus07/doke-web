-- PROF-001 / PROF-B05 G3 validation
-- Transactional synthetic validation; all fixture writes roll back.

begin;

do $test$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'prof-b05-reopen-' || replace(gen_random_uuid()::text, '-', '') || '@example.test';
  v_handle text := 'profb05_' || left(replace(gen_random_uuid()::text, '-', ''), 12);
  v_verification_id uuid;
  v_result jsonb;
  v_event_count integer;
  v_document_status text;
  v_verification_status text;
  v_row public.professional_identity_verifications%rowtype;
begin
  if pg_catalog.to_regprocedure('public.reopen_own_professional_identity_verification()') is null then
    raise exception 'PROF_B05_REOPEN_FUNCTION_MISSING';
  end if;

  if pg_catalog.has_function_privilege(
       'authenticated',
       'public.reopen_own_professional_identity_verification()',
       'EXECUTE'
     ) then
    raise exception 'PROF_B05_REOPEN_DIRECT_BROWSER_EXECUTE_REMAINS';
  end if;

  if not pg_catalog.has_function_privilege(
       'service_role',
       'public.reopen_own_professional_identity_verification()',
       'EXECUTE'
     ) then
    raise exception 'PROF_B05_REOPEN_SERVICE_ROLE_EXECUTE_MISSING';
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    is_sso_user, is_anonymous
  ) values (
    v_user_id,
    'authenticated',
    'authenticated',
    v_email,
    crypt('ProfB05!123', gen_salt('bf')),
    pg_catalog.now(),
    '{"provider":"email","providers":["email"],"role":"client","account_status":"active"}'::jsonb,
    pg_catalog.jsonb_build_object('name', 'PROF B05 Reopen', 'handle', v_handle),
    pg_catalog.now(),
    pg_catalog.now(),
    false,
    false
  );

  update public.users
     set role = 'client',
         status = 'active'
   where id = v_user_id;

  insert into public.professional_profiles (
    user_id,
    document_status,
    setup_status,
    setup_payload,
    setup_current_step,
    verification_status,
    created_at,
    updated_at
  ) values (
    v_user_id,
    'unverified',
    'pending_verification',
    '{}'::jsonb,
    2,
    'rejected',
    pg_catalog.now(),
    pg_catalog.now()
  );

  insert into public.professional_identity_verifications (
    user_id,
    professional_profile_user_id,
    status,
    verification_type,
    documents,
    payload,
    current_step,
    rejection_reason,
    submitted_at,
    decided_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    'rejected',
    'individual',
    pg_catalog.jsonb_build_object(
      'documentFront', pg_catalog.jsonb_build_object(
        'bucket', 'professional-verification-media',
        'path', v_user_id::text || '/synthetic-front.jpg',
        'type', 'image/jpeg',
        'size', 128
      )
    ),
    '{}'::jsonb,
    4,
    'Documento sintético rejeitado para validação.',
    pg_catalog.now() - interval '1 hour',
    pg_catalog.now(),
    pg_catalog.now(),
    pg_catalog.now()
  )
  returning id into v_verification_id;

  select public.execute_self_service_operation_internal(
    v_user_id,
    'reopen_own_professional_identity_verification',
    '{}'::jsonb
  ) into v_result;

  if v_result ->> 'id' <> v_verification_id::text
     or v_result ->> 'status' <> 'not_started'
     or (v_result ->> 'currentStep')::integer <> 1 then
    raise exception 'PROF_B05_REOPEN_RESULT_MISMATCH';
  end if;

  select *
    into v_row
    from public.professional_identity_verifications
   where id = v_verification_id;

  if v_row.status <> 'not_started'
     or v_row.current_step <> 1
     or v_row.documents <> '{}'::jsonb
     or v_row.reviewer_id is not null
     or v_row.rejection_reason is not null
     or v_row.review_started_at is not null
     or v_row.decided_at is not null
     or v_row.submitted_at is not null then
    raise exception 'PROF_B05_REOPEN_KYC_STATE_MISMATCH';
  end if;

  select document_status, verification_status
    into v_document_status, v_verification_status
    from public.professional_profiles
   where user_id = v_user_id;

  if v_document_status <> 'unverified'
     or v_verification_status <> 'not_started' then
    raise exception 'PROF_B05_REOPEN_PROFILE_STATE_MISMATCH';
  end if;

  select pg_catalog.count(*)
    into v_event_count
    from public.verification_events
   where user_id = v_user_id
     and type = 'professional_document'
     and status = 'pending'
     and reason = 'Verificação reaberta pelo usuário para correção e novo envio.';

  if v_event_count <> 1 then
    raise exception 'PROF_B05_REOPEN_EVENT_MISMATCH';
  end if;

  perform public.execute_self_service_operation_internal(
    v_user_id,
    'reopen_own_professional_identity_verification',
    '{}'::jsonb
  );

  select pg_catalog.count(*)
    into v_event_count
    from public.verification_events
   where user_id = v_user_id
     and type = 'professional_document'
     and status = 'pending'
     and reason = 'Verificação reaberta pelo usuário para correção e novo envio.';

  if v_event_count <> 1 then
    raise exception 'PROF_B05_REOPEN_REPLAY_NOT_IDEMPOTENT';
  end if;
end;
$test$;

rollback;
