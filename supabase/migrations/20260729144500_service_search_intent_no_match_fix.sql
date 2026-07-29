-- SEARCH-UX02 follow-up: only report recovery when the expanded query
-- actually produces approved catalog results.

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
  v_exact_result jsonb;
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
  v_exact_result := private.search_public_services_v2_core(v_request);

  if v_cursor <> ''
     or v_query = ''
     or pg_catalog.jsonb_array_length(coalesce(v_exact_result -> 'items', '[]'::jsonb)) > 0 then
    return v_exact_result || pg_catalog.jsonb_build_object(
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
    return v_exact_result || pg_catalog.jsonb_build_object(
      'queryInterpretation', pg_catalog.jsonb_build_object(
        'mode', 'no_match',
        'original', v_query,
        'effective', v_query,
        'recoveryTruncated', false
      )
    );
  end if;

  v_expanded_request := pg_catalog.jsonb_set(v_request, '{query}', pg_catalog.to_jsonb(v_expanded_query), true);
  v_result := private.search_public_services_v2_core(v_expanded_request);

  if pg_catalog.jsonb_array_length(coalesce(v_result -> 'items', '[]'::jsonb)) = 0 then
    return v_exact_result || pg_catalog.jsonb_build_object(
      'queryInterpretation', pg_catalog.jsonb_build_object(
        'mode', 'no_match',
        'original', v_query,
        'effective', v_query,
        'recoveryTruncated', false
      )
    );
  end if;

  v_recovery_had_more := coalesce((v_result -> 'page' ->> 'hasNext')::boolean, false);

  -- The existing cursor binds its hash to the effective request. Recovery is
  -- deliberately bounded to one page until the public cursor contract carries
  -- the effective query across subsequent requests.
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
