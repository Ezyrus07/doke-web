-- SEARCH-001 / SEARCH-A04
-- Canonical bounded public service search contract.
-- This migration is committed as a candidate only and is not applied by this change.

create or replace function private.refresh_service_search_vector()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog'
as $$
declare
  v_metadata jsonb := coalesce(new.metadata, '{}'::jsonb);
  v_tags text := case
    when pg_catalog.jsonb_typeof(v_metadata -> 'tags') = 'array'
      then coalesce((select pg_catalog.string_agg(value, ' ') from pg_catalog.jsonb_array_elements_text(v_metadata -> 'tags') as tag(value)), '')
    else ''
  end;
  v_keywords text := case
    when pg_catalog.jsonb_typeof(v_metadata -> 'keywords') = 'array'
      then coalesce((select pg_catalog.string_agg(value, ' ') from pg_catalog.jsonb_array_elements_text(v_metadata -> 'keywords') as keyword(value)), '')
    else ''
  end;
begin
  new.search_vector :=
      pg_catalog.setweight(
        pg_catalog.to_tsvector('pg_catalog.portuguese'::pg_catalog.regconfig, extensions.unaccent(coalesce(new.title, ''))),
        'A'
      )
    || pg_catalog.setweight(
        pg_catalog.to_tsvector(
          'pg_catalog.portuguese'::pg_catalog.regconfig,
          extensions.unaccent(
            pg_catalog.concat_ws(
              ' ',
              coalesce(new.description, ''),
              coalesce(v_metadata ->> 'category', ''),
              coalesce(v_metadata ->> 'providerName', ''),
              v_tags,
              v_keywords
            )
          )
        ),
        'B'
      )
    || pg_catalog.setweight(
        pg_catalog.to_tsvector(
          'pg_catalog.portuguese'::pg_catalog.regconfig,
          extensions.unaccent(pg_catalog.concat_ws(' ', coalesce(new.city, ''), coalesce(new.state, ''), coalesce(v_metadata ->> 'neighborhood', '')))
        ),
        'C'
      );
  return new;
end;
$$;

revoke all on function private.refresh_service_search_vector() from public, anon, authenticated;

comment on function private.refresh_service_search_vector() is
  'SEARCH-A04 trigger authority that maintains the bounded public service search document from canonical service fields.';

drop trigger if exists trg_services_search_vector on public.services;
create trigger trg_services_search_vector
before insert or update of title, description, city, state, metadata
on public.services
for each row
execute function private.refresh_service_search_vector();

update public.services
set search_vector =
    pg_catalog.setweight(
      pg_catalog.to_tsvector('pg_catalog.portuguese'::pg_catalog.regconfig, extensions.unaccent(coalesce(title, ''))),
      'A'
    )
  || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.portuguese'::pg_catalog.regconfig,
        extensions.unaccent(
          pg_catalog.concat_ws(
            ' ',
            coalesce(description, ''),
            coalesce(metadata ->> 'category', ''),
            coalesce(metadata ->> 'providerName', ''),
            case when pg_catalog.jsonb_typeof(metadata -> 'tags') = 'array'
              then coalesce((select pg_catalog.string_agg(value, ' ') from pg_catalog.jsonb_array_elements_text(metadata -> 'tags') as tag(value)), '')
              else ''
            end,
            case when pg_catalog.jsonb_typeof(metadata -> 'keywords') = 'array'
              then coalesce((select pg_catalog.string_agg(value, ' ') from pg_catalog.jsonb_array_elements_text(metadata -> 'keywords') as keyword(value)), '')
              else ''
            end
          )
        )
      ),
      'B'
    )
  || pg_catalog.setweight(
      pg_catalog.to_tsvector(
        'pg_catalog.portuguese'::pg_catalog.regconfig,
        extensions.unaccent(pg_catalog.concat_ws(' ', coalesce(city, ''), coalesce(state, ''), coalesce(metadata ->> 'neighborhood', '')))
      ),
      'C'
    )
where search_vector is null;

create index if not exists idx_services_public_search_vector
  on public.services using gin (search_vector)
  where status = 'published' and approved_version_id is not null;

create index if not exists idx_services_public_search_cursor
  on public.services (updated_at desc, id desc)
  where status = 'published' and approved_version_id is not null;

create or replace function public.search_public_services_v1(p_request jsonb default '{}'::jsonb)
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
  v_cursor_payload jsonb;
  v_cursor_updated_at timestamptz;
  v_cursor_id uuid;
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

  if pg_catalog.char_length(v_cursor) > 512 then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_CURSOR_INVALID';
  end if;

  if v_cursor <> '' then
    begin
      v_cursor_payload := pg_catalog.convert_from(pg_catalog.decode(v_cursor, 'base64'), 'UTF8')::jsonb;
      v_cursor_updated_at := (v_cursor_payload ->> 'updatedAt')::timestamptz;
      v_cursor_id := (v_cursor_payload ->> 'id')::uuid;
      if v_cursor_updated_at is null or v_cursor_id is null then
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
        v_query_document = ''
        or s.search_vector @@ pg_catalog.websearch_to_tsquery('pg_catalog.portuguese'::pg_catalog.regconfig, extensions.unaccent(v_query))
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
      and (
        v_cursor_updated_at is null
        or (candidates.updated_at, candidates.id) < (v_cursor_updated_at, v_cursor_id)
      )
  ), page_rows as (
    select *
    from eligible
    order by updated_at desc, id desc
    limit v_page_size + 1
  ), visible_rows as (
    select *
    from page_rows
    order by updated_at desc, id desc
    limit v_page_size
  ), page_meta as (
    select
      (select pg_catalog.count(*) > v_page_size from page_rows) as has_next,
      (select updated_at from visible_rows order by updated_at asc, id asc limit 1) as last_updated_at,
      (select id from visible_rows order by updated_at asc, id asc limit 1) as last_id
  )
  select pg_catalog.jsonb_build_object(
    'authority', 'public.search_public_services_v1',
    'contractVersion', '1.0.0',
    'request', pg_catalog.jsonb_build_object(
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
        order by visible.updated_at desc, visible.id desc
      )
      from visible_rows visible
    ), '[]'::jsonb),
    'page', pg_catalog.jsonb_build_object(
      'pageSize', v_page_size,
      'hasNext', coalesce(page_meta.has_next, false),
      'nextCursor', case
        when coalesce(page_meta.has_next, false) and page_meta.last_id is not null then
          pg_catalog.replace(
            pg_catalog.encode(
              pg_catalog.convert_to(
                pg_catalog.jsonb_build_object('updatedAt', page_meta.last_updated_at, 'id', page_meta.last_id)::text,
                'UTF8'
              ),
              'base64'
            ),
            E'\n',
            ''
          )
        else null
      end
    )
  )
  into v_result
  from page_meta;

  return coalesce(v_result, pg_catalog.jsonb_build_object(
    'authority', 'public.search_public_services_v1',
    'contractVersion', '1.0.0',
    'items', '[]'::jsonb,
    'page', pg_catalog.jsonb_build_object('pageSize', v_page_size, 'hasNext', false, 'nextCursor', null)
  ));
end;
$$;

revoke all on function public.search_public_services_v1(jsonb) from public;
grant execute on function public.search_public_services_v1(jsonb) to anon, authenticated;

comment on function public.search_public_services_v1(jsonb) is
  'SEARCH-A04 public-safe bounded service discovery DTO. Enforces approved publication, exact geographic eligibility, allowlisted filters and opaque updated_at/id cursor pagination.';
