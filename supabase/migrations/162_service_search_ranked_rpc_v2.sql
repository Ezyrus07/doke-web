-- SEARCH-001 / SEARCH-A08
-- Version-bound, tamper-evident ranked search RPC.
-- This migration adds a parallel v2 RPC and leaves the browser on v1.
-- The active ranking pointer remains search-rank-v0 unless changed separately by service_role.

create table if not exists private.service_search_cursor_keys (
  singleton boolean primary key default true,
  signing_key bytea not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint service_search_cursor_keys_singleton_check check (singleton),
  constraint service_search_cursor_keys_length_check check (pg_catalog.octet_length(signing_key) >= 32)
);

revoke all on table private.service_search_cursor_keys from public, anon, authenticated;

insert into private.service_search_cursor_keys (singleton, signing_key)
values (true, extensions.gen_random_bytes(32))
on conflict (singleton) do nothing;

create index if not exists idx_service_search_ranking_state_active_version
  on private.service_search_ranking_state (active_version);

create index if not exists idx_service_search_ranking_events_previous_version
  on private.service_search_ranking_state_events (previous_version);

create index if not exists idx_service_search_ranking_events_active_version
  on private.service_search_ranking_state_events (active_version);

create index if not exists idx_reviews_search_published_order
  on public.reviews (order_id, reviewed_user_id)
  include (rating)
  where status = 'published';

create index if not exists idx_orders_search_completed_service
  on public.orders (service_id, professional_id, id)
  where status = 'completed' and service_id is not null;

create index if not exists idx_availability_search_future
  on public.availability_slots (professional_id, starts_at)
  where status = 'available';

create or replace function private.service_search_request_hash_v2(p_request jsonb)
returns text
language sql
immutable
security definer
set search_path = 'pg_catalog'
as $$
  select pg_catalog.encode(
    extensions.digest(coalesce(p_request, '{}'::jsonb)::text, 'sha256'),
    'hex'
  );
$$;

revoke all on function private.service_search_request_hash_v2(jsonb) from public, anon, authenticated;

create or replace function private.encode_service_search_cursor_v2(p_payload jsonb)
returns text
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_key bytea;
  v_payload jsonb := coalesce(p_payload, '{}'::jsonb);
  v_payload_text text;
  v_signature text;
  v_envelope jsonb;
begin
  if pg_catalog.jsonb_typeof(v_payload) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
  end if;

  select cursor_key.signing_key
    into v_key
  from private.service_search_cursor_keys cursor_key
  where cursor_key.singleton = true;

  if v_key is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_CURSOR_KEY_MISSING';
  end if;

  v_payload_text := v_payload::text;
  v_signature := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(v_payload_text, 'UTF8'),
      v_key,
      'sha256'
    ),
    'hex'
  );
  v_envelope := pg_catalog.jsonb_build_object(
    'payload', v_payload,
    'signature', v_signature
  );

  return pg_catalog.replace(
    pg_catalog.encode(
      pg_catalog.convert_to(v_envelope::text, 'UTF8'),
      'base64'
    ),
    E'\n',
    ''
  );
end;
$$;

revoke all on function private.encode_service_search_cursor_v2(jsonb) from public, anon, authenticated;

create or replace function private.decode_service_search_cursor_v2(p_cursor text)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_cursor text := pg_catalog.btrim(coalesce(p_cursor, ''));
  v_key bytea;
  v_envelope jsonb;
  v_payload jsonb;
  v_signature text;
  v_expected_signature text;
begin
  if v_cursor = '' or pg_catalog.char_length(v_cursor) > 2048 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
  end if;

  select cursor_key.signing_key
    into v_key
  from private.service_search_cursor_keys cursor_key
  where cursor_key.singleton = true;

  if v_key is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_CURSOR_KEY_MISSING';
  end if;

  v_envelope := pg_catalog.convert_from(
    pg_catalog.decode(v_cursor, 'base64'),
    'UTF8'
  )::jsonb;
  v_payload := v_envelope -> 'payload';
  v_signature := pg_catalog.lower(coalesce(v_envelope ->> 'signature', ''));

  if pg_catalog.jsonb_typeof(v_envelope) <> 'object'
     or pg_catalog.jsonb_typeof(v_payload) <> 'object'
     or pg_catalog.char_length(v_signature) <> 64 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
  end if;

  v_expected_signature := pg_catalog.encode(
    extensions.hmac(
      pg_catalog.convert_to(v_payload::text, 'UTF8'),
      v_key,
      'sha256'
    ),
    'hex'
  );

  if v_signature <> v_expected_signature then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_SIGNATURE_INVALID';
  end if;

  return v_payload;
exception
  when invalid_text_representation or character_not_in_repertoire or data_exception then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
end;
$$;

revoke all on function private.decode_service_search_cursor_v2(text) from public, anon, authenticated;

create or replace function public.search_public_services_v2(p_request jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_request jsonb := coalesce(p_request, '{}'::jsonb);
  v_query text := pg_catalog.btrim(coalesce(v_request ->> 'query', ''));
  v_query_document text := pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(v_request ->> 'query', ''))));
  v_query_tsquery tsquery;
  v_categories text[] := array[]::text[];
  v_state text := pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(v_request ->> 'state', ''))));
  v_city text := pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(v_request ->> 'city', ''))));
  v_neighborhood text := pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(v_request ->> 'neighborhood', ''))));
  v_service_mode text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_request ->> 'serviceMode', 'any')));
  v_min_rating numeric := coalesce((v_request ->> 'minRating')::numeric, 0);
  v_guaranteed boolean := coalesce((v_request ->> 'guaranteed')::boolean, false);
  v_emergency boolean := coalesce((v_request ->> 'emergency')::boolean, false);
  v_available_today boolean := coalesce((v_request ->> 'availableToday')::boolean, false);
  v_page_size integer := coalesce((v_request ->> 'pageSize')::integer, 12);
  v_cursor text := pg_catalog.btrim(coalesce(v_request ->> 'cursor', ''));
  v_normalized_request jsonb;
  v_request_hash text;
  v_cursor_payload jsonb;
  v_cursor_score numeric;
  v_cursor_tiebreak_at timestamptz;
  v_cursor_id uuid;
  v_ranking_version text;
  v_ranking_strategy text;
  v_ranking_config jsonb;
  v_availability_window_days integer;
  v_as_of timestamptz := pg_catalog.statement_timestamp();
  v_has_location boolean;
  v_result jsonb;
begin
  if pg_catalog.jsonb_typeof(v_request) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_REQUEST_INVALID';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_request) as request_key(key)
    where request_key.key not in (
      'query', 'categories', 'state', 'city', 'neighborhood', 'serviceMode',
      'minRating', 'guaranteed', 'emergency', 'availableToday', 'pageSize', 'cursor'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_REQUEST_UNKNOWN_FIELD';
  end if;

  if pg_catalog.char_length(v_query) > 120
     or pg_catalog.char_length(v_state) > 40
     or pg_catalog.char_length(v_city) > 100
     or pg_catalog.char_length(v_neighborhood) > 120 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_REQUEST_TOO_LONG';
  end if;

  if v_request ? 'categories' then
    if pg_catalog.jsonb_typeof(v_request -> 'categories') <> 'array'
       or pg_catalog.jsonb_array_length(v_request -> 'categories') > 10 then
      raise exception using errcode = '22023', message = 'DOKE_SEARCH_CATEGORIES_INVALID';
    end if;
    select coalesce(
      pg_catalog.array_agg(pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(category.value)))) filter (where pg_catalog.btrim(category.value) <> ''),
      array[]::text[]
    )
    into v_categories
    from pg_catalog.jsonb_array_elements_text(v_request -> 'categories') as category(value);
  end if;

  if v_request ? 'pageSize' and pg_catalog.jsonb_typeof(v_request -> 'pageSize') <> 'number' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_PAGE_SIZE_INVALID';
  end if;
  if v_page_size < 1 or v_page_size > 24 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_PAGE_SIZE_INVALID';
  end if;

  if v_request ? 'minRating' and pg_catalog.jsonb_typeof(v_request -> 'minRating') <> 'number' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_MIN_RATING_INVALID';
  end if;
  if v_min_rating < 0 or v_min_rating > 5 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_MIN_RATING_INVALID';
  end if;

  if v_service_mode not in ('any', 'local', 'online') then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_SERVICE_MODE_INVALID';
  end if;

  if pg_catalog.char_length(v_cursor) > 2048 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
  end if;

  if v_query_document <> '' then
    v_query_tsquery := pg_catalog.websearch_to_tsquery(
      'pg_catalog.portuguese'::pg_catalog.regconfig,
      extensions.unaccent(v_query)
    );
  end if;

  v_ranking_version := private.current_service_search_ranking_version();

  select ranking_version.strategy, ranking_version.config
    into v_ranking_strategy, v_ranking_config
  from private.service_search_ranking_versions ranking_version
  where ranking_version.version = v_ranking_version;

  if v_ranking_strategy not in ('legacy_updated_at', 'bounded_quality_v1')
     or v_ranking_config is null then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_STATE_INVALID';
  end if;

  v_availability_window_days := (v_ranking_config ->> 'availabilityWindowDays')::integer;
  if v_availability_window_days < 1 or v_availability_window_days > 30 then
    raise exception using errcode = '55000', message = 'DOKE_SEARCH_RANKING_CONFIG_INVALID';
  end if;

  v_normalized_request := pg_catalog.jsonb_build_object(
    'query', v_query,
    'categories', pg_catalog.to_jsonb(v_categories),
    'state', v_state,
    'city', v_city,
    'neighborhood', v_neighborhood,
    'serviceMode', v_service_mode,
    'minRating', v_min_rating,
    'guaranteed', v_guaranteed,
    'emergency', v_emergency,
    'availableToday', v_available_today,
    'pageSize', v_page_size
  );
  v_request_hash := private.service_search_request_hash_v2(v_normalized_request);

  if v_cursor <> '' then
    v_cursor_payload := private.decode_service_search_cursor_v2(v_cursor);

    if coalesce((v_cursor_payload ->> 'cursorVersion')::integer, 0) <> 2 then
      raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_VERSION_INVALID';
    end if;
    if coalesce(v_cursor_payload ->> 'rankingVersion', '') <> v_ranking_version then
      raise exception using errcode = '40001', message = 'DOKE_SEARCH_CURSOR_RANKING_VERSION_CONFLICT';
    end if;
    if coalesce(v_cursor_payload ->> 'requestHash', '') <> v_request_hash then
      raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_REQUEST_MISMATCH';
    end if;

    begin
      v_as_of := (v_cursor_payload ->> 'asOf')::timestamptz;
      v_cursor_score := (v_cursor_payload ->> 'score')::numeric;
      v_cursor_tiebreak_at := (v_cursor_payload ->> 'tiebreakAt')::timestamptz;
      v_cursor_id := (v_cursor_payload ->> 'id')::uuid;
      if v_as_of is null or v_cursor_score is null or v_cursor_tiebreak_at is null or v_cursor_id is null then
        raise exception 'invalid cursor payload';
      end if;
    exception when others then
      raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
    end;
  end if;

  v_has_location := v_state <> '' or v_city <> '' or v_neighborhood <> '';

  with candidates as (
    select
      s.id,
      coalesce(nullif(s.external_id, ''), s.id::text) as public_id,
      s.professional_id,
      s.category_id,
      coalesce(nullif(av.snapshot ->> 'title', ''), s.title) as title,
      coalesce(nullif(av.snapshot ->> 'description', ''), s.description) as description,
      coalesce(nullif(av.snapshot ->> 'category', ''), sc.name, nullif(s.metadata ->> 'category', ''), 'Serviço') as category_name,
      coalesce(nullif(sc.slug, ''), nullif(av.snapshot ->> 'categorySlug', ''), nullif(s.metadata ->> 'categorySlug', '')) as category_slug,
      coalesce(nullif(av.snapshot ->> 'city', ''), s.city, '') as city,
      coalesce(nullif(av.snapshot ->> 'state', ''), s.state, '') as state,
      coalesce(nullif(av.snapshot ->> 'neighborhood', ''), nullif(s.metadata ->> 'neighborhood', ''), '') as neighborhood,
      coalesce(nullif(up.display_name, ''), nullif(av.snapshot ->> 'providerName', ''), 'Profissional Doke') as provider_name,
      coalesce(nullif(up.username, ''), nullif(av.snapshot ->> 'providerHandle', ''), '') as provider_handle,
      coalesce(nullif(up.avatar_url, ''), nullif(av.snapshot ->> 'providerAvatar', ''), '') as provider_avatar,
      coalesce(pp.average_rating, 0)::numeric as average_rating,
      coalesce(pp.reviews_count, 0)::integer as reviews_count,
      (coalesce(pp.verification_status, 'not_started') = 'verified' or coalesce(pp.document_status, 'unverified') = 'verified') as verified,
      s.price_mode,
      s.price_cents,
      s.currency,
      coalesce(av.snapshot -> 'tags', s.metadata -> 'tags', '[]'::jsonb) as tags,
      coalesce(av.snapshot -> 'keywords', s.metadata -> 'keywords', '[]'::jsonb) as keywords,
      coalesce(media.images, '[]'::jsonb) as images,
      coalesce(media.first_image, '') as first_image,
      coalesce(metrics.views_count, 0)::bigint as views_count,
      coalesce(metrics.contacts_count, 0)::bigint as contacts_count,
      s.updated_at,
      coalesce(av.reviewed_at, av.created_at) as approved_at,
      case
        when v_query_tsquery is null then 0::numeric
        else pg_catalog.ts_rank_cd(s.search_vector, v_query_tsquery, 32)::numeric
      end as text_rank,
      coalesce(review_signals.review_sum, 0)::numeric as review_sum,
      coalesce(review_signals.review_count, 0)::integer as order_backed_review_count,
      exists (
        select 1
        from public.availability_slots availability
        where availability.professional_id = s.professional_id
          and availability.status = 'available'
          and availability.starts_at >= v_as_of
          and availability.starts_at < v_as_of + pg_catalog.make_interval(days => v_availability_window_days)
      ) as has_available_slot,
      (
        pg_catalog.lower(coalesce(av.snapshot ->> 'online', s.metadata ->> 'online', 'false')) in ('true', '1', 'yes', 'sim')
      ) as is_online,
      (
        pg_catalog.lower(coalesce(av.snapshot ->> 'guaranteed', s.metadata ->> 'guaranteed', 'false')) in ('true', '1', 'yes', 'sim')
      ) as is_guaranteed,
      (
        pg_catalog.lower(coalesce(av.snapshot ->> 'emergency', s.metadata ->> 'emergency', 'false')) in ('true', '1', 'yes', 'sim')
      ) as is_emergency,
      (
        pg_catalog.lower(coalesce(av.snapshot ->> 'availableToday', s.metadata ->> 'availableToday', 'false')) in ('true', '1', 'yes', 'sim')
      ) as is_available_today,
      pg_catalog.lower(extensions.unaccent(coalesce(nullif(av.snapshot ->> 'city', ''), s.city, ''))) as normalized_city,
      pg_catalog.lower(extensions.unaccent(coalesce(nullif(av.snapshot ->> 'state', ''), s.state, ''))) as normalized_state,
      pg_catalog.lower(extensions.unaccent(coalesce(nullif(av.snapshot ->> 'neighborhood', ''), nullif(s.metadata ->> 'neighborhood', ''), ''))) as normalized_neighborhood,
      pg_catalog.lower(extensions.unaccent(coalesce(nullif(av.snapshot ->> 'category', ''), sc.name, nullif(s.metadata ->> 'category', ''), ''))) as normalized_category,
      pg_catalog.lower(extensions.unaccent(coalesce(nullif(sc.slug, ''), nullif(av.snapshot ->> 'categorySlug', ''), nullif(s.metadata ->> 'categorySlug', '')))) as normalized_category_slug
    from public.services s
    join public.service_versions av
      on av.id = s.approved_version_id
     and av.service_id = s.id
     and av.professional_id = s.professional_id
     and av.review_status = 'approved'
    left join public.service_categories sc on sc.id = s.category_id and sc.is_active = true
    left join public.user_profiles up on up.user_id = s.professional_id
    left join public.professional_profiles pp on pp.user_id = s.professional_id
    left join public.service_metric_totals metrics on metrics.service_id = s.id
    left join lateral (
      select
        coalesce(pg_catalog.sum(review.rating), 0)::numeric as review_sum,
        pg_catalog.count(*)::integer as review_count
      from public.reviews review
      join public.orders completed_order
        on completed_order.id = review.order_id
       and completed_order.service_id = s.id
       and completed_order.professional_id = s.professional_id
       and completed_order.status = 'completed'
      where review.status = 'published'
        and review.reviewed_user_id = s.professional_id
    ) review_signals on true
    left join lateral (
      select
        coalesce(pg_catalog.jsonb_agg(media_row.url order by media_row.sort_order, media_row.id), '[]'::jsonb) as images,
        coalesce((pg_catalog.array_agg(media_row.url order by media_row.sort_order, media_row.id))[1], '') as first_image
      from (
        select sm.id, sm.url, sm.sort_order
        from public.service_media sm
        where sm.service_id = s.id
          and sm.media_type in ('image', 'before_after')
        order by sm.sort_order, sm.id
        limit 4
      ) media_row
    ) media on true
    where s.status = 'published'
      and s.approved_version_id is not null
      and (
        s.moderation_status in ('published', 'changes_pending_review')
        or s.moderation_status = 'changes_required'
      )
      and (
        v_query_tsquery is null
        or s.search_vector @@ v_query_tsquery
      )
  ), eligible as (
    select
      candidates.*,
      case
        when candidates.is_online then 'online'
        when v_neighborhood <> '' then 'neighborhood'
        when v_city <> '' then 'city'
        when v_state <> '' then 'state'
        else 'unrestricted'
      end as geographic_match
    from candidates
    where (pg_catalog.cardinality(v_categories) = 0 or candidates.normalized_category = any(v_categories) or candidates.normalized_category_slug = any(v_categories))
      and candidates.average_rating >= v_min_rating
      and (not v_guaranteed or candidates.is_guaranteed)
      and (not v_emergency or candidates.is_emergency)
      and (not v_available_today or candidates.is_available_today)
      and (
        (v_service_mode = 'online' and candidates.is_online)
        or (
          v_service_mode = 'local'
          and not candidates.is_online
          and (v_state = '' or candidates.normalized_state = v_state)
          and (v_city = '' or candidates.normalized_city = v_city)
          and (v_neighborhood = '' or candidates.normalized_neighborhood = v_neighborhood)
        )
        or (
          v_service_mode = 'any'
          and (
            not v_has_location
            or candidates.is_online
            or (
              (v_state = '' or candidates.normalized_state = v_state)
              and (v_city = '' or candidates.normalized_city = v_city)
              and (v_neighborhood = '' or candidates.normalized_neighborhood = v_neighborhood)
            )
          )
        )
      )
  ), ranked as (
    select
      eligible.*,
      case
        when v_ranking_strategy = 'legacy_updated_at' then 0::numeric
        else private.compute_service_search_ranking_score(
          v_ranking_version,
          eligible.text_rank,
          eligible.review_sum,
          eligible.order_backed_review_count,
          eligible.has_available_slot,
          eligible.approved_at,
          v_as_of
        )
      end as rank_score,
      case
        when v_ranking_strategy = 'legacy_updated_at' then eligible.updated_at
        else eligible.approved_at
      end as rank_tiebreak_at
    from eligible
  ), after_cursor as (
    select *
    from ranked
    where v_cursor_id is null
       or (ranked.rank_score, ranked.rank_tiebreak_at, ranked.id) < (v_cursor_score, v_cursor_tiebreak_at, v_cursor_id)
  ), page_rows as (
    select *
    from after_cursor
    order by rank_score desc, rank_tiebreak_at desc, id desc
    limit v_page_size + 1
  ), visible_rows as (
    select *
    from page_rows
    order by rank_score desc, rank_tiebreak_at desc, id desc
    limit v_page_size
  ), page_meta as (
    select
      (select pg_catalog.count(*) > v_page_size from page_rows) as has_next,
      (select rank_score from visible_rows order by rank_score asc, rank_tiebreak_at asc, id asc limit 1) as last_score,
      (select rank_tiebreak_at from visible_rows order by rank_score asc, rank_tiebreak_at asc, id asc limit 1) as last_tiebreak_at,
      (select id from visible_rows order by rank_score asc, rank_tiebreak_at asc, id asc limit 1) as last_id
  )
  select pg_catalog.jsonb_build_object(
    'authority', 'public.search_public_services_v2',
    'contractVersion', '2.0.0',
    'request', v_normalized_request,
    'ranking', pg_catalog.jsonb_build_object(
      'version', v_ranking_version,
      'strategy', v_ranking_strategy,
      'asOf', v_as_of
    ),
    'items', coalesce((
      select pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'id', visible.public_id,
          'remoteId', visible.id,
          'serviceId', visible.id,
          'professionalId', visible.professional_id,
          'providerId', visible.professional_id,
          'categoryId', visible.category_id,
          'title', visible.title,
          'description', visible.description,
          'category', visible.category_name,
          'categorySlug', visible.category_slug,
          'city', visible.city,
          'state', visible.state,
          'neighborhood', visible.neighborhood,
          'location', pg_catalog.concat_ws(', ', nullif(visible.neighborhood, ''), nullif(visible.city, ''), nullif(visible.state, '')),
          'providerName', visible.provider_name,
          'providerHandle', visible.provider_handle,
          'providerUsername', visible.provider_handle,
          'providerAvatarUrl', visible.provider_avatar,
          'rating', visible.average_rating,
          'reviewsCount', visible.reviews_count,
          'verified', visible.verified,
          'priceMode', visible.price_mode,
          'priceCents', visible.price_cents,
          'priceValue', case when visible.price_cents is null then null else visible.price_cents::numeric / 100 end,
          'currency', visible.currency,
          'tags', case when pg_catalog.jsonb_typeof(visible.tags) = 'array' then visible.tags else '[]'::jsonb end,
          'keywords', case when pg_catalog.jsonb_typeof(visible.keywords) = 'array' then visible.keywords else '[]'::jsonb end,
          'images', visible.images,
          'image', visible.first_image,
          'online', visible.is_online,
          'guaranteed', visible.is_guaranteed,
          'emergency', visible.is_emergency,
          'availableToday', visible.is_available_today,
          'geographicMatch', visible.geographic_match,
          'updatedAt', visible.updated_at,
          'metrics', pg_catalog.jsonb_build_object(
            'viewsCount', visible.views_count,
            'contactsCount', visible.contacts_count
          )
        )
        order by visible.rank_score desc, visible.rank_tiebreak_at desc, visible.id desc
      )
      from visible_rows visible
    ), '[]'::jsonb),
    'page', pg_catalog.jsonb_build_object(
      'pageSize', v_page_size,
      'hasNext', coalesce(page_meta.has_next, false),
      'rankingVersion', v_ranking_version,
      'asOf', v_as_of,
      'nextCursor', case
        when coalesce(page_meta.has_next, false) and page_meta.last_id is not null then
          private.encode_service_search_cursor_v2(
            pg_catalog.jsonb_build_object(
              'cursorVersion', 2,
              'rankingVersion', v_ranking_version,
              'asOf', v_as_of,
              'requestHash', v_request_hash,
              'score', page_meta.last_score,
              'tiebreakAt', page_meta.last_tiebreak_at,
              'id', page_meta.last_id
            )
          )
        else null
      end
    )
  )
  into v_result
  from page_meta;

  return coalesce(v_result, pg_catalog.jsonb_build_object(
    'authority', 'public.search_public_services_v2',
    'contractVersion', '2.0.0',
    'request', v_normalized_request,
    'ranking', pg_catalog.jsonb_build_object(
      'version', v_ranking_version,
      'strategy', v_ranking_strategy,
      'asOf', v_as_of
    ),
    'items', '[]'::jsonb,
    'page', pg_catalog.jsonb_build_object(
      'pageSize', v_page_size,
      'hasNext', false,
      'rankingVersion', v_ranking_version,
      'asOf', v_as_of,
      'nextCursor', null
    )
  ));
end;
$$;

revoke all on function public.search_public_services_v2(jsonb) from public, anon, authenticated;
grant execute on function public.search_public_services_v2(jsonb) to anon, authenticated;

comment on table private.service_search_cursor_keys is
  'SEARCH-A08 private HMAC key authority for tamper-evident search cursors. Never exposed to browser roles.';

comment on function private.encode_service_search_cursor_v2(jsonb) is
  'SEARCH-A08 server-only cursor signer binding ranking version, as-of instant, normalized request and stable sort tuple.';

comment on function private.decode_service_search_cursor_v2(text) is
  'SEARCH-A08 server-only cursor verifier. Tampered, cross-request and cross-ranking cursors fail closed.';

comment on function public.search_public_services_v2(jsonb) is
  'SEARCH-A08 parallel public-safe search RPC. Reads the private active ranking version, freezes score time with asOf and uses a signed version-bound score/tiebreak/id cursor. search-rank-v0 preserves legacy updated_at/id ordering.';
