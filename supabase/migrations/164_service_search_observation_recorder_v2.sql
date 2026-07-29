create or replace function public.record_service_search_observation_v2(
  p_observation jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_observation jsonb := coalesce(p_observation, '{}'::jsonb);
  v_request_id uuid;
  v_existing_id bigint;
  v_source text;
  v_actor_class text;
  v_outcome text;
  v_error_code text;
  v_error_class text;
  v_latency_ms numeric(12,3);
  v_ranking_version text;
  v_ranking_strategy text;
  v_cursor_present boolean;
  v_first_page boolean;
  v_page_size integer;
  v_query_present boolean;
  v_category_count integer;
  v_location_scope text;
  v_service_mode text;
  v_item_count integer;
  v_zero_result boolean;
  v_has_next boolean;
begin
  if pg_catalog.jsonb_typeof(v_observation) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_INVALID';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_observation) as observation_key(key)
    where observation_key.key not in (
      'requestId', 'source', 'actorClass', 'outcome', 'errorClass', 'errorCode',
      'latencyMs', 'rankingVersion', 'rankingStrategy', 'cursorPresent', 'firstPage',
      'pageSize', 'queryPresent', 'categoryCount', 'locationScope', 'serviceMode',
      'itemCount', 'zeroResult', 'hasNext'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_UNKNOWN_FIELD';
  end if;

  begin
    v_request_id := (v_observation ->> 'requestId')::uuid;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_REQUEST_ID_INVALID';
  end;

  if v_request_id is null then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_REQUEST_ID_INVALID';
  end if;

  select observation.id
    into v_existing_id
  from private.service_search_observations_v2 observation
  where observation.request_id = v_request_id;

  if v_existing_id is not null then
    return v_request_id;
  end if;

  v_source := pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'source', 'edge_search_proxy_v2')));
  v_actor_class := pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'actorClass', 'unknown')));
  v_outcome := pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'outcome', '')));
  v_error_code := nullif(pg_catalog.upper(pg_catalog.btrim(coalesce(v_observation ->> 'errorCode', ''))), '');
  v_error_class := case
    when v_outcome = 'success' then 'none'
    else private.normalize_service_search_error_class_v2(v_error_code, v_observation ->> 'errorClass')
  end;

  begin
    v_latency_ms := pg_catalog.round(coalesce((v_observation ->> 'latencyMs')::numeric, 0), 3);
    v_cursor_present := coalesce((v_observation ->> 'cursorPresent')::boolean, false);
    v_first_page := coalesce((v_observation ->> 'firstPage')::boolean, not v_cursor_present);
    v_page_size := nullif(v_observation ->> 'pageSize', '')::integer;
    v_query_present := coalesce((v_observation ->> 'queryPresent')::boolean, false);
    v_category_count := coalesce((v_observation ->> 'categoryCount')::integer, 0);
    v_item_count := nullif(v_observation ->> 'itemCount', '')::integer;
    v_zero_result := coalesce((v_observation ->> 'zeroResult')::boolean, false);
    v_has_next := nullif(v_observation ->> 'hasNext', '')::boolean;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_SHAPE_INVALID';
  end;

  v_ranking_version := nullif(pg_catalog.btrim(coalesce(v_observation ->> 'rankingVersion', '')), '');
  if v_ranking_version is null then
    begin
      v_ranking_version := private.current_service_search_ranking_version();
    exception when others then
      v_ranking_version := null;
    end;
  end if;

  v_ranking_strategy := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'rankingStrategy', ''))), '');
  if v_ranking_strategy is null and v_ranking_version is not null then
    select ranking_version.strategy
      into v_ranking_strategy
    from private.service_search_ranking_versions ranking_version
    where ranking_version.version = v_ranking_version;
  end if;

  v_location_scope := pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'locationScope', 'none')));
  v_service_mode := pg_catalog.lower(pg_catalog.btrim(coalesce(v_observation ->> 'serviceMode', 'invalid')));

  if v_source not in ('edge_search_proxy_v2', 'staging_canary')
     or v_actor_class not in ('anon', 'authenticated', 'unknown')
     or v_outcome not in ('success', 'error')
     or v_location_scope not in ('none', 'state', 'city', 'neighborhood')
     or v_service_mode not in ('any', 'local', 'online', 'invalid') then
    raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_ENUM_INVALID';
  end if;

  if v_outcome = 'success' then
    v_error_code := null;
    v_error_class := 'none';
    if v_item_count is null or v_has_next is null then
      raise exception using errcode = '22023', message = 'DOKE_SEARCH_OBSERVATION_SUCCESS_SHAPE_INVALID';
    end if;
    v_zero_result := v_first_page and v_item_count = 0;
  else
    if v_error_code is null then
      v_error_code := 'DOKE_SEARCH_INTERNAL_ERROR';
    end if;
    v_item_count := null;
    v_has_next := null;
    v_zero_result := false;
  end if;

  insert into private.service_search_observations_v2 (
    request_id,
    source,
    actor_class,
    outcome,
    error_class,
    error_code,
    latency_ms,
    ranking_version,
    ranking_strategy,
    cursor_present,
    first_page,
    page_size,
    query_present,
    category_count,
    location_scope,
    service_mode,
    item_count,
    zero_result,
    has_next,
    observed_at
  ) values (
    v_request_id,
    v_source,
    v_actor_class,
    v_outcome,
    v_error_class,
    v_error_code,
    v_latency_ms,
    v_ranking_version,
    v_ranking_strategy,
    v_cursor_present,
    v_first_page,
    v_page_size,
    v_query_present,
    v_category_count,
    v_location_scope,
    v_service_mode,
    v_item_count,
    v_zero_result,
    v_has_next,
    pg_catalog.clock_timestamp()
  )
  on conflict (request_id) do nothing;

  return v_request_id;
end;
$$;

revoke all on function public.record_service_search_observation_v2(jsonb) from public, anon, authenticated;
grant execute on function public.record_service_search_observation_v2(jsonb) to service_role;

