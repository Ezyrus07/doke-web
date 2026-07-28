-- SEARCH-001 / SEARCH-A04 approved-snapshot hardening validation.
-- Execute in staging inside a transaction. Every synthetic row is rolled back.

begin;

do $$
declare
  v_professional_id uuid := 'a0410000-0000-4000-8000-000000000001';
  v_category_id uuid := 'a0410000-0000-4000-8000-000000000010';
  v_service_id uuid := 'a0410000-0000-4000-8000-000000000101';
  v_approved_version_id uuid := 'a0410000-0000-4000-8000-000000000201';
  v_pending_version_id uuid := 'a0410000-0000-4000-8000-000000000202';
  v_result jsonb;
  v_trigger_definition text;
begin
  if to_regprocedure('private.build_approved_service_search_vector(jsonb)') is null then
    raise exception 'SEARCH-A04 approved-snapshot search builder is missing';
  end if;

  if has_function_privilege('anon', 'private.build_approved_service_search_vector(jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.build_approved_service_search_vector(jsonb)', 'EXECUTE') then
    raise exception 'SEARCH-A04 browser roles can execute the private approved-snapshot builder';
  end if;

  select pg_get_triggerdef(oid)
    into v_trigger_definition
    from pg_trigger
   where tgrelid = 'public.services'::regclass
     and tgname = 'trg_services_search_vector'
     and not tgisinternal;

  if coalesce(v_trigger_definition, '') not like '%approved_version_id%'
     or coalesce(v_trigger_definition, '') like '%UPDATE OF title%' then
    raise exception 'SEARCH-A04 trigger is not governed by approved-version transitions';
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values (
    v_professional_id, 'authenticated', 'authenticated',
    'search-a04-approved-snapshot@example.invalid', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
    now(), now()
  );

  insert into public.users (id, email, role, status, onboarding_status)
  values (
    v_professional_id,
    'search-a04-approved-snapshot@example.invalid',
    'professional', 'active', 'completed'
  );

  insert into public.user_profiles (user_id, display_name, username, city, state)
  values (
    v_professional_id,
    'Profissional Snapshot Aprovado',
    'search.a04.approved.snapshot',
    'Salvador', 'BA'
  );

  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values (
    v_professional_id,
    'Especialista de snapshot aprovado',
    'verified', 4.9, 12, 8, 'active', 'verified'
  );

  insert into public.service_categories (id, name, slug, is_active, sort_order)
  values (v_category_id, 'Autoridade Aprovada', 'autoridade-aprovada', true, 1);

  insert into public.services (
    id, professional_id, category_id, title, slug, description, price_mode,
    price_cents, currency, status, city, state, external_id, metadata,
    moderation_status, created_at, updated_at
  ) values (
    v_service_id,
    v_professional_id,
    v_category_id,
    'Título inicial sem autoridade',
    'search-a04-approved-snapshot',
    'Descrição inicial sem autoridade.',
    'fixed', 15000, 'BRL', 'draft', 'Salvador', 'BA',
    'search-a04-approved-snapshot',
    '{"category":"Autoridade Aprovada"}'::jsonb,
    'draft',
    '2026-07-28T11:00:00Z',
    '2026-07-28T12:00:00Z'
  );

  insert into public.service_versions (
    id, service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at, reviewed_at,
    risk_flags, classification_reasons, visibility_action
  ) values (
    v_approved_version_id,
    v_service_id,
    v_professional_id,
    1,
    'create',
    'major',
    'approved',
    jsonb_build_object(
      'title', 'Approved Needle Service',
      'description', 'Approved Needle Description',
      'category', 'Autoridade Aprovada',
      'categorySlug', 'autoridade-aprovada',
      'city', 'Salvador',
      'state', 'BA',
      'neighborhood', 'Centro',
      'providerName', 'Profissional Snapshot Aprovado',
      'tags', jsonb_build_array('approvedneedle'),
      'keywords', jsonb_build_array('approvedneedle')
    ),
    '{}'::jsonb,
    now(), now(), '[]'::jsonb, '[]'::jsonb,
    'not_public_until_approved'
  );

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
     set approved_version_id = v_approved_version_id,
         status = 'published',
         moderation_status = 'published',
         title = 'Approved Needle Service',
         description = 'Approved Needle Description'
   where id = v_service_id;
  perform set_config('doke.service_moderation_apply', 'off', true);

  if (select search_vector is null from public.services where id = v_service_id) then
    raise exception 'SEARCH-A04 approved snapshot did not materialize search_vector';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'approvedneedle',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 1
     or v_result #>> '{items,0,remoteId}' is distinct from v_service_id::text
     or v_result #>> '{items,0,title}' is distinct from 'Approved Needle Service' then
    raise exception 'SEARCH-A04 approved snapshot is not searchable through the public DTO';
  end if;

  insert into public.service_versions (
    id, service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at,
    risk_flags, classification_reasons, visibility_action, baseline_version_id
  ) values (
    v_pending_version_id,
    v_service_id,
    v_professional_id,
    2,
    'edit',
    'major',
    'pending_review',
    jsonb_build_object(
      'title', 'Replacement Approved Needle',
      'description', 'pendingsecretneedle must never affect public discovery before approval',
      'category', 'Autoridade Aprovada',
      'categorySlug', 'autoridade-aprovada',
      'city', 'Salvador',
      'state', 'BA',
      'tags', jsonb_build_array('pendingsecretneedle'),
      'keywords', jsonb_build_array('pendingsecretneedle')
    ),
    '{}'::jsonb,
    now(), '[]'::jsonb, '[]'::jsonb,
    'keep_public',
    v_approved_version_id
  );

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
     set pending_version_id = v_pending_version_id,
         moderation_status = 'changes_pending_review',
         title = 'Pending Secret Needle',
         description = 'pendingsecretneedle must never affect public discovery',
         metadata = jsonb_build_object(
           'category', 'Autoridade Aprovada',
           'tags', jsonb_build_array('pendingsecretneedle'),
           'keywords', jsonb_build_array('pendingsecretneedle')
         )
   where id = v_service_id;
  perform set_config('doke.service_moderation_apply', 'off', true);

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'pendingsecretneedle',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 0 then
    raise exception 'SEARCH-A04 pending service content leaked into public discovery';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'approvedneedle',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 1
     or v_result #>> '{items,0,title}' is distinct from 'Approved Needle Service' then
    raise exception 'SEARCH-A04 pending edit displaced the approved search authority';
  end if;

  update public.service_versions
     set review_status = 'superseded'
   where id = v_approved_version_id;

  update public.service_versions
     set review_status = 'approved',
         reviewed_at = now()
   where id = v_pending_version_id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
     set approved_version_id = v_pending_version_id,
         pending_version_id = null,
         moderation_status = 'published',
         title = 'Replacement Approved Needle',
         description = 'Nova versão aprovada.'
   where id = v_service_id;
  perform set_config('doke.service_moderation_apply', 'off', true);

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'pendingsecretneedle',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 1
     or v_result #>> '{items,0,title}' is distinct from 'Replacement Approved Needle' then
    raise exception 'SEARCH-A04 approved-version transition did not refresh the search document';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'approvedneedle',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 0 then
    raise exception 'SEARCH-A04 superseded approved content remained searchable';
  end if;
end;
$$;

rollback;
