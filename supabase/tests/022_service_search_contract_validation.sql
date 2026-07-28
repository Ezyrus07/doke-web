-- SEARCH-001 / SEARCH-A04 validation.
-- Execute in staging inside a transaction. Every synthetic row is rolled back.

begin;

do $$
declare
  v_professional_local uuid := 'a0400000-0000-4000-8000-000000000001';
  v_professional_second uuid := 'a0400000-0000-4000-8000-000000000002';
  v_professional_online uuid := 'a0400000-0000-4000-8000-000000000003';
  v_professional_nearby uuid := 'a0400000-0000-4000-8000-000000000004';
  v_category_id uuid := 'a0400000-0000-4000-8000-000000000010';
  v_service_local uuid := 'a0400000-0000-4000-8000-000000000101';
  v_service_second uuid := 'a0400000-0000-4000-8000-000000000102';
  v_service_online uuid := 'a0400000-0000-4000-8000-000000000103';
  v_service_nearby uuid := 'a0400000-0000-4000-8000-000000000104';
  v_service_draft uuid := 'a0400000-0000-4000-8000-000000000105';
  v_version_local uuid := 'a0400000-0000-4000-8000-000000000201';
  v_version_second uuid := 'a0400000-0000-4000-8000-000000000202';
  v_version_online uuid := 'a0400000-0000-4000-8000-000000000203';
  v_version_nearby uuid := 'a0400000-0000-4000-8000-000000000204';
  v_result jsonb;
  v_page_one jsonb;
  v_page_two jsonb;
  v_cursor text;
  v_page_one_ids text[];
  v_page_two_ids text[];
  v_invalid_page_size_blocked boolean := false;
  v_unknown_field_blocked boolean := false;
  v_invalid_cursor_blocked boolean := false;
begin
  if to_regprocedure('public.search_public_services_v1(jsonb)') is null then
    raise exception 'SEARCH-A04 public search RPC is missing';
  end if;

  if to_regprocedure('private.refresh_service_search_vector()') is null then
    raise exception 'SEARCH-A04 search-vector trigger function is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.services'::regclass
      and tgname = 'trg_services_search_vector'
      and not tgisinternal
  ) then
    raise exception 'SEARCH-A04 search-vector trigger is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'services'
      and indexname = 'idx_services_public_search_vector'
  ) then
    raise exception 'SEARCH-A04 public search-vector index is missing';
  end if;

  if not exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'services'
      and indexname = 'idx_services_public_search_cursor'
  ) then
    raise exception 'SEARCH-A04 cursor index is missing';
  end if;

  if not has_function_privilege('anon', 'public.search_public_services_v1(jsonb)', 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.search_public_services_v1(jsonb)', 'EXECUTE') then
    raise exception 'SEARCH-A04 browser roles cannot execute the public-safe search RPC';
  end if;

  if has_function_privilege('anon', 'private.refresh_service_search_vector()', 'EXECUTE')
     or has_function_privilege('authenticated', 'private.refresh_service_search_vector()', 'EXECUTE') then
    raise exception 'SEARCH-A04 browser roles can execute the private search-vector function';
  end if;

  insert into auth.users (
    id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (v_professional_local, 'authenticated', 'authenticated', 'search-a04-local@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_professional_second, 'authenticated', 'authenticated', 'search-a04-second@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_professional_online, 'authenticated', 'authenticated', 'search-a04-online@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
    (v_professional_nearby, 'authenticated', 'authenticated', 'search-a04-nearby@example.invalid', '', now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());

  insert into public.users (id, email, role, status, onboarding_status)
  values
    (v_professional_local, 'search-a04-local@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_second, 'search-a04-second@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_online, 'search-a04-online@example.invalid', 'professional', 'active', 'completed'),
    (v_professional_nearby, 'search-a04-nearby@example.invalid', 'professional', 'active', 'completed')
  on conflict (id) do update
    set email = excluded.email,
        role = excluded.role,
        status = excluded.status,
        onboarding_status = excluded.onboarding_status;

  insert into public.user_profiles (user_id, display_name, username, city, state)
  values
    (v_professional_local, 'Profissional Local', 'search.a04.local', 'Salvador', 'BA'),
    (v_professional_second, 'Profissional Segundo', 'search.a04.second', 'Salvador', 'BA'),
    (v_professional_online, 'Profissional Online', 'search.a04.online', 'São Paulo', 'SP'),
    (v_professional_nearby, 'Profissional Próximo', 'search.a04.nearby', 'Lauro de Freitas', 'BA')
  on conflict (user_id) do update
    set display_name = excluded.display_name,
        username = excluded.username,
        city = excluded.city,
        state = excluded.state;

  insert into public.professional_profiles (
    user_id, headline, document_status, average_rating, reviews_count,
    completed_orders_count, setup_status, verification_status
  ) values
    (v_professional_local, 'Eletricista residencial', 'verified', 4.9, 31, 20, 'active', 'verified'),
    (v_professional_second, 'Encanador residencial', 'verified', 4.7, 18, 12, 'active', 'verified'),
    (v_professional_online, 'Eletricista remoto', 'verified', 4.8, 22, 15, 'active', 'verified'),
    (v_professional_nearby, 'Eletricista metropolitano', 'verified', 4.6, 9, 7, 'active', 'verified')
  on conflict (user_id) do update
    set headline = excluded.headline,
        document_status = excluded.document_status,
        average_rating = excluded.average_rating,
        reviews_count = excluded.reviews_count,
        completed_orders_count = excluded.completed_orders_count,
        setup_status = excluded.setup_status,
        verification_status = excluded.verification_status;

  insert into public.service_categories (id, name, slug, is_active, sort_order)
  values (v_category_id, 'Eletricista', 'eletricista', true, 1);

  insert into public.services (
    id, professional_id, category_id, title, slug, description, price_mode,
    price_cents, currency, status, city, state, external_id, metadata,
    moderation_status, created_at, updated_at
  ) values
    (v_service_local, v_professional_local, v_category_id, 'Eletricista residencial Salvador', 'search-a04-local', 'Instalação elétrica residencial com garantia.', 'fixed', 15000, 'BRL', 'published', 'Salvador', 'BA', 'search-a04-local', '{"category":"Eletricista","neighborhood":"Centro","tags":["elétrica","residencial"],"keywords":["tomada","fiação"],"guaranteed":true,"emergency":true,"availableToday":true}'::jsonb, 'published', '2026-07-28T11:00:00Z', '2026-07-28T12:00:00Z'),
    (v_service_second, v_professional_second, v_category_id, 'Encanador residencial Salvador', 'search-a04-second', 'Reparo hidráulico residencial.', 'quote', null, 'BRL', 'published', 'Salvador', 'BA', 'search-a04-second', '{"category":"Encanador","neighborhood":"Barra","tags":["hidráulica"],"keywords":["vazamento"]}'::jsonb, 'published', '2026-07-28T10:00:00Z', '2026-07-28T11:00:00Z'),
    (v_service_online, v_professional_online, v_category_id, 'Eletricista online', 'search-a04-online', 'Consultoria elétrica por vídeo.', 'fixed', 9000, 'BRL', 'published', 'São Paulo', 'SP', 'search-a04-online', '{"category":"Eletricista","online":true,"tags":["consultoria"],"keywords":["vídeo","remoto"]}'::jsonb, 'published', '2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
    (v_service_nearby, v_professional_nearby, v_category_id, 'Eletricista Lauro de Freitas', 'search-a04-nearby', 'Atendimento elétrico metropolitano.', 'from', 12000, 'BRL', 'published', 'Lauro de Freitas', 'BA', 'search-a04-nearby', '{"category":"Eletricista","neighborhood":"Centro"}'::jsonb, 'published', '2026-07-28T08:00:00Z', '2026-07-28T09:00:00Z'),
    (v_service_draft, v_professional_local, v_category_id, 'Eletricista rascunho secreto', 'search-a04-draft', 'Este anúncio não pode aparecer.', 'fixed', 100, 'BRL', 'draft', 'Salvador', 'BA', 'search-a04-draft', '{"category":"Eletricista"}'::jsonb, 'draft', '2026-07-28T07:00:00Z', '2026-07-28T08:00:00Z');

  if exists (
    select 1 from public.services
    where id in (v_service_local, v_service_second, v_service_online, v_service_nearby)
      and search_vector is not null
  ) then
    raise exception 'SEARCH-A04 service without an approved version acquired a search_vector';
  end if;

  insert into public.service_versions (
    id, service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at, reviewed_at,
    risk_flags, classification_reasons, visibility_action
  ) values
    (v_version_local, v_service_local, v_professional_local, 1, 'create', 'major', 'approved', '{"title":"Eletricista residencial Salvador","description":"Instalação elétrica residencial com garantia.","category":"Eletricista","categorySlug":"eletricista","city":"Salvador","state":"BA","neighborhood":"Centro","tags":["elétrica","residencial"],"keywords":["tomada","fiação"],"guaranteed":true,"emergency":true,"availableToday":true}'::jsonb, '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'),
    (v_version_second, v_service_second, v_professional_second, 1, 'create', 'major', 'approved', '{"title":"Encanador residencial Salvador","description":"Reparo hidráulico residencial.","category":"Encanador","categorySlug":"encanador","city":"Salvador","state":"BA","neighborhood":"Barra","tags":["hidráulica"],"keywords":["vazamento"]}'::jsonb, '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'),
    (v_version_online, v_service_online, v_professional_online, 1, 'create', 'major', 'approved', '{"title":"Eletricista online","description":"Consultoria elétrica por vídeo.","category":"Eletricista","categorySlug":"eletricista","city":"São Paulo","state":"SP","online":true,"tags":["consultoria"],"keywords":["vídeo","remoto"]}'::jsonb, '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved'),
    (v_version_nearby, v_service_nearby, v_professional_nearby, 1, 'create', 'major', 'approved', '{"title":"Eletricista Lauro de Freitas","description":"Atendimento elétrico metropolitano.","category":"Eletricista","categorySlug":"eletricista","city":"Lauro de Freitas","state":"BA","neighborhood":"Centro"}'::jsonb, '{}'::jsonb, now(), now(), '[]'::jsonb, '[]'::jsonb, 'not_public_until_approved');

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set approved_version_id = case id
    when v_service_local then v_version_local
    when v_service_second then v_version_second
    when v_service_online then v_version_online
    when v_service_nearby then v_version_nearby
  end,
  status = 'published',
  moderation_status = 'published'
  where id in (v_service_local, v_service_second, v_service_online, v_service_nearby);
  perform set_config('doke.service_moderation_apply', 'off', true);

  if exists (
    select 1 from public.services
    where id in (v_service_local, v_service_second, v_service_online, v_service_nearby)
      and search_vector is null
  ) then
    raise exception 'SEARCH-A04 approved version transition did not materialize search_vector';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'eletricista',
    'state', 'BA',
    'city', 'Salvador',
    'serviceMode', 'local',
    'pageSize', 12
  )) into v_result;

  if v_result ->> 'authority' is distinct from 'public.search_public_services_v1'
     or v_result ->> 'contractVersion' is distinct from '1.0.0' then
    raise exception 'SEARCH-A04 response authority/version is invalid';
  end if;

  if jsonb_array_length(v_result -> 'items') <> 1
     or not exists (
       select 1 from jsonb_array_elements(v_result -> 'items') item
       where item ->> 'remoteId' = v_service_local::text
     ) then
    raise exception 'SEARCH-A04 exact local geographic eligibility failed';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_result -> 'items') item
    where item ? 'metadata' or item ? 'email' or item ? 'searchVector'
  ) then
    raise exception 'SEARCH-A04 public DTO exposed a private/raw field';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'eletricista',
    'state', 'BA',
    'city', 'Salvador',
    'serviceMode', 'any',
    'pageSize', 12
  )) into v_result;

  if not exists (
    select 1 from jsonb_array_elements(v_result -> 'items') item
    where item ->> 'remoteId' = v_service_local::text
  ) or not exists (
    select 1 from jsonb_array_elements(v_result -> 'items') item
    where item ->> 'remoteId' = v_service_online::text
      and item ->> 'geographicMatch' = 'online'
  ) then
    raise exception 'SEARCH-A04 any-mode did not combine exact local and online eligibility';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_result -> 'items') item
    where item ->> 'remoteId' = v_service_nearby::text
  ) then
    raise exception 'SEARCH-A04 city eligibility leaked a nearby but different city';
  end if;

  select public.search_public_services_v1(jsonb_build_object(
    'query', 'eletricista',
    'serviceMode', 'online',
    'pageSize', 12
  )) into v_result;

  if jsonb_array_length(v_result -> 'items') <> 1
     or not exists (
       select 1 from jsonb_array_elements(v_result -> 'items') item
       where item ->> 'remoteId' = v_service_online::text
     ) then
    raise exception 'SEARCH-A04 online-only eligibility failed';
  end if;

  if exists (
    select 1 from jsonb_array_elements(v_result -> 'items') item
    where item ->> 'remoteId' = v_service_draft::text
  ) then
    raise exception 'SEARCH-A04 draft/unapproved service leaked into discovery';
  end if;

  select public.search_public_services_v1(jsonb_build_object('pageSize', 2)) into v_page_one;
  if jsonb_array_length(v_page_one -> 'items') <> 2
     or coalesce((v_page_one #>> '{page,hasNext}')::boolean, false) is not true then
    raise exception 'SEARCH-A04 first cursor page is invalid';
  end if;
  v_cursor := v_page_one #>> '{page,nextCursor}';
  if coalesce(v_cursor, '') = '' then
    raise exception 'SEARCH-A04 next cursor is missing';
  end if;

  select array_agg(item ->> 'remoteId' order by item ->> 'remoteId')
  into v_page_one_ids
  from jsonb_array_elements(v_page_one -> 'items') item;

  select public.search_public_services_v1(jsonb_build_object('pageSize', 2, 'cursor', v_cursor)) into v_page_two;
  select array_agg(item ->> 'remoteId' order by item ->> 'remoteId')
  into v_page_two_ids
  from jsonb_array_elements(v_page_two -> 'items') item;

  if exists (
    select 1
    from unnest(v_page_one_ids) first_id
    join unnest(v_page_two_ids) second_id on second_id = first_id
  ) then
    raise exception 'SEARCH-A04 cursor pagination returned a duplicate service';
  end if;

  begin
    perform public.search_public_services_v1(jsonb_build_object('pageSize', 25));
  exception when others then
    if sqlerrm = 'DOKE_SEARCH_PAGE_SIZE_INVALID' then
      v_invalid_page_size_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_invalid_page_size_blocked then
    raise exception 'SEARCH-A04 accepted an oversized page';
  end if;

  begin
    perform public.search_public_services_v1(jsonb_build_object('unknownField', true));
  exception when others then
    if sqlerrm = 'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD' then
      v_unknown_field_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_unknown_field_blocked then
    raise exception 'SEARCH-A04 accepted an unknown request field';
  end if;

  begin
    perform public.search_public_services_v1(jsonb_build_object('cursor', 'not-valid-base64'));
  exception when others then
    if sqlerrm = 'DOKE_SEARCH_CURSOR_INVALID' then
      v_invalid_cursor_blocked := true;
    else
      raise;
    end if;
  end;
  if not v_invalid_cursor_blocked then
    raise exception 'SEARCH-A04 accepted an invalid cursor';
  end if;
end;
$$;

rollback;
