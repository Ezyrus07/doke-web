-- SEARCH-UX02
-- Exact search remains the first authority. Prefix, synonym and bounded typo
-- recovery are attempted only after an empty exact result. Ranking remains v0.

create extension if not exists pg_trgm with schema extensions;

do $$
begin
  if pg_catalog.to_regprocedure('private.search_public_services_v2_core(jsonb)') is null then
    if pg_catalog.to_regprocedure('public.search_public_services_v2(jsonb)') is null then
      raise exception using errcode = '55000', message = 'DOKE_SEARCH_V2_CORE_MISSING';
    end if;

    alter function public.search_public_services_v2(jsonb) set schema private;
    alter function private.search_public_services_v2(jsonb) rename to search_public_services_v2_core;
  end if;
end;
$$;

revoke all on function private.search_public_services_v2_core(jsonb) from public, anon, authenticated;
grant execute on function private.search_public_services_v2_core(jsonb) to postgres, service_role;

create or replace function private.expand_service_search_query_v1(p_query text)
returns text
language sql
stable
security definer
set search_path = 'pg_catalog'
as $$
  with normalized as (
    select pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(coalesce(p_query, '')))) as query_text
  ), tokens as (
    select token.value as token, token.ordinality as ordinal
    from normalized
    cross join lateral pg_catalog.regexp_split_to_table(
      pg_catalog.regexp_replace(normalized.query_text, '[^[:alnum:]]+', ' ', 'g'),
      E'\\s+'
    ) with ordinality as token(value, ordinality)
    where token.value <> ''
  ), aliases(alias, canonical) as (
    values
      ('faxina', 'limpeza'),
      ('diarista', 'limpeza'),
      ('higienizacao', 'limpeza'),
      ('eletrica', 'eletricista'),
      ('eletrico', 'eletricista'),
      ('hidraulica', 'encanador'),
      ('hidraulico', 'encanador'),
      ('encanamento', 'encanador'),
      ('pintar', 'pintura'),
      ('pintor', 'pintura'),
      ('reformar', 'reforma'),
      ('montador', 'montagem'),
      ('professor', 'aulas'),
      ('professora', 'aulas')
  ), vocabulary_raw as (
    select pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(category.name))) as term, 1 as priority
    from public.service_categories category
    where category.is_active = true
      and pg_catalog.btrim(category.name) <> ''

    union all

    select pg_catalog.lower(extensions.unaccent(pg_catalog.btrim(category.slug))), 1
    from public.service_categories category
    where category.is_active = true
      and pg_catalog.btrim(coalesce(category.slug, '')) <> ''

    union all

    select word.value, 2
    from public.services service
    join public.service_versions approved
      on approved.id = service.approved_version_id
     and approved.service_id = service.id
     and approved.professional_id = service.professional_id
     and approved.review_status = 'approved'
    left join public.service_categories category
      on category.id = service.category_id
     and category.is_active = true
    cross join lateral pg_catalog.regexp_split_to_table(
      pg_catalog.lower(extensions.unaccent(pg_catalog.concat_ws(
        ' ',
        coalesce(nullif(approved.snapshot ->> 'title', ''), service.title, ''),
        coalesce(nullif(approved.snapshot ->> 'category', ''), category.name, nullif(service.metadata ->> 'category', ''), '')
      ))),
      '[^[:alnum:]]+'
    ) as word(value)
    where service.status = 'published'
      and service.approved_version_id is not null
      and service.moderation_status in ('published', 'changes_pending_review', 'changes_required')
      and word.value <> ''

    union all

    select word.value, 3
    from public.services service
    join public.service_versions approved
      on approved.id = service.approved_version_id
     and approved.service_id = service.id
     and approved.professional_id = service.professional_id
     and approved.review_status = 'approved'
    cross join lateral pg_catalog.jsonb_array_elements_text(
      case
        when pg_catalog.jsonb_typeof(coalesce(approved.snapshot -> 'tags', service.metadata -> 'tags', '[]'::jsonb)) = 'array'
          then coalesce(approved.snapshot -> 'tags', service.metadata -> 'tags', '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as tag(value)
    cross join lateral pg_catalog.regexp_split_to_table(
      pg_catalog.lower(extensions.unaccent(tag.value)),
      '[^[:alnum:]]+'
    ) as word(value)
    where service.status = 'published'
      and service.approved_version_id is not null
      and service.moderation_status in ('published', 'changes_pending_review', 'changes_required')
      and word.value <> ''

    union all

    select word.value, 3
    from public.services service
    join public.service_versions approved
      on approved.id = service.approved_version_id
     and approved.service_id = service.id
     and approved.professional_id = service.professional_id
     and approved.review_status = 'approved'
    cross join lateral pg_catalog.jsonb_array_elements_text(
      case
        when pg_catalog.jsonb_typeof(coalesce(approved.snapshot -> 'keywords', service.metadata -> 'keywords', '[]'::jsonb)) = 'array'
          then coalesce(approved.snapshot -> 'keywords', service.metadata -> 'keywords', '[]'::jsonb)
        else '[]'::jsonb
      end
    ) as keyword(value)
    cross join lateral pg_catalog.regexp_split_to_table(
      pg_catalog.lower(extensions.unaccent(keyword.value)),
      '[^[:alnum:]]+'
    ) as word(value)
    where service.status = 'published'
      and service.approved_version_id is not null
      and service.moderation_status in ('published', 'changes_pending_review', 'changes_required')
      and word.value <> ''
  ), vocabulary as (
    select vocabulary_raw.term,
           pg_catalog.min(vocabulary_raw.priority) as priority,
           pg_catalog.count(*) as frequency
    from vocabulary_raw
    where pg_catalog.char_length(vocabulary_raw.term) >= 2
    group by vocabulary_raw.term
  ), expanded as (
    select tokens.ordinal,
           coalesce(
             (select aliases.canonical from aliases where aliases.alias = tokens.token limit 1),
             (
               select vocabulary.term
               from vocabulary
               where pg_catalog.char_length(tokens.token) >= 3
                 and (
                   vocabulary.term like tokens.token || '%'
                   or (
                     pg_catalog.char_length(tokens.token) >= 4
                     and extensions.similarity(vocabulary.term, tokens.token) >= 0.42
                   )
                 )
               order by
                 case
                   when vocabulary.term = tokens.token then 0
                   when vocabulary.term like tokens.token || '%' then 1
                   else 2
                 end,
                 vocabulary.priority,
                 extensions.similarity(vocabulary.term, tokens.token) desc,
                 vocabulary.frequency desc,
                 pg_catalog.char_length(vocabulary.term),
                 vocabulary.term
               limit 1
             ),
             tokens.token
           ) as term
    from tokens
  )
  select coalesce(pg_catalog.string_agg(expanded.term, ' ' order by expanded.ordinal), '')
  from expanded;
$$;

revoke all on function private.expand_service_search_query_v1(text) from public, anon, authenticated;
grant execute on function private.expand_service_search_query_v1(text) to postgres, service_role;

create or replace function public.search_public_services_v2(p_request jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_request jsonb := coalesce(p_request, '{}'::jsonb);
  v_query text;
  v_cursor text;
  v_result jsonb;
  v_expanded_query text;
  v_expanded_request jsonb;
  v_recovery_had_more boolean := false;
begin
  if pg_catalog.jsonb_typeof(v_request) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_REQUEST_INVALID';
  end if;

  v_query := pg_catalog.btrim(coalesce(v_request ->> 'query', ''));
  v_cursor := pg_catalog.btrim(coalesce(v_request ->> 'cursor', ''));
  v_result := private.search_public_services_v2_core(v_request);

  if v_cursor <> ''
     or v_query = ''
     or pg_catalog.jsonb_array_length(coalesce(v_result -> 'items', '[]'::jsonb)) > 0 then
    return v_result || pg_catalog.jsonb_build_object(
      'queryInterpretation', pg_catalog.jsonb_build_object(
        'mode', case when v_query = '' then 'none' else 'exact' end,
        'original', v_query,
        'effective', v_query,
        'recoveryTruncated', false
      )
    );
  end if;

  v_expanded_query := private.expand_service_search_query_v1(v_query);

  if v_expanded_query = ''
     or pg_catalog.lower(extensions.unaccent(v_expanded_query)) = pg_catalog.lower(extensions.unaccent(v_query)) then
    return v_result || pg_catalog.jsonb_build_object(
      'queryInterpretation', pg_catalog.jsonb_build_object(
        'mode', 'none',
        'original', v_query,
        'effective', v_query,
        'recoveryTruncated', false
      )
    );
  end if;

  v_expanded_request := pg_catalog.jsonb_set(v_request, '{query}', pg_catalog.to_jsonb(v_expanded_query), true);
  v_result := private.search_public_services_v2_core(v_expanded_request);
  v_recovery_had_more := coalesce((v_result -> 'page' ->> 'hasNext')::boolean, false);

  -- The existing cursor binds its hash to the effective request. Until the
  -- public contract carries that interpretation back on subsequent pages,
  -- recovery responses are deliberately bounded to one page instead of
  -- emitting a cursor that the browser could replay with the original query.
  v_result := pg_catalog.jsonb_set(v_result, '{request,query}', pg_catalog.to_jsonb(v_query), true);
  v_result := pg_catalog.jsonb_set(v_result, '{page,hasNext}', 'false'::jsonb, true);
  v_result := pg_catalog.jsonb_set(v_result, '{page,nextCursor}', 'null'::jsonb, true);

  return v_result || pg_catalog.jsonb_build_object(
    'queryInterpretation', pg_catalog.jsonb_build_object(
      'mode', 'prefix_synonym_or_typo_recovery',
      'original', v_query,
      'effective', v_expanded_query,
      'recoveryTruncated', v_recovery_had_more
    )
  );
end;
$$;

revoke all on function public.search_public_services_v2(jsonb) from public;
grant execute on function public.search_public_services_v2(jsonb) to anon, authenticated, service_role;

comment on function private.expand_service_search_query_v1(text) is
  'SEARCH-UX02 server-authoritative prefix, synonym and bounded typo recovery from approved catalog vocabulary.';
comment on function public.search_public_services_v2(jsonb) is
  'SEARCH-UX02 wrapper over the closed v2 core. Exact search first; approved-catalog intent recovery only after an empty exact result.';
