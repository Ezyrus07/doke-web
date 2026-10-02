-- ANA-A03 follow-up hardening.
-- Applied after ana_a03_behavioral_event_ledger; preserves immutable migration history.
create unique index if not exists analytics_behavior_server_client_event_unique
  on private.analytics_behavior_events_v1 (client_event_id)
  where analytics_session_id is null and client_event_id is not null;

create or replace function public.record_analytics_behavior_event_v1(p_event jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_event jsonb := coalesce(p_event, '{}'::jsonb);
  v_dimensions jsonb := coalesce(v_event -> 'dimensions', '{}'::jsonb);
  v_existing private.analytics_behavior_events_v1%rowtype;
  v_id uuid;
  v_event_name text;
  v_actor_class text;
  v_actor_id uuid;
  v_client_event_id uuid;
  v_analytics_session_id uuid;
  v_service_id uuid;
  v_search_request_id uuid;
  v_quote_session_id uuid;
  v_order_id uuid;
  v_source_surface text;
  v_payload_hash text;
  v_semantic_key text;
  v_now timestamptz := pg_catalog.clock_timestamp();
begin
  if pg_catalog.jsonb_typeof(v_event) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_event) as event_key(key)
    where event_key.key not in (
      'eventName','eventSchemaVersion','taxonomyVersion','clientEventId','payloadHash','semanticKey',
      'actorClass','actorId','analyticsSessionId','serviceId','searchRequestId','quoteSessionId',
      'orderId','sourceSurface','dimensions'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UNKNOWN_FIELD';
  end if;

  if pg_catalog.jsonb_typeof(v_dimensions) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSIONS_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_dimensions) as dimension_key(key)
    where dimension_key.key not in (
      'resultPosition','rankingVersion','stepIndex','questionCount','answeredQuestionCount',
      'queryPresent','categoryCount','locationScope','serviceMode','resultCount'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_DIMENSION_UNKNOWN_FIELD';
  end if;

  v_event_name := pg_catalog.btrim(coalesce(v_event ->> 'eventName', ''));
  v_actor_class := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'actorClass', '')));
  v_source_surface := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'sourceSurface', 'unknown')));
  v_payload_hash := pg_catalog.lower(pg_catalog.btrim(coalesce(v_event ->> 'payloadHash', '')));
  v_semantic_key := pg_catalog.btrim(coalesce(v_event ->> 'semanticKey', ''));

  if v_event_name not in (
    'search.executed','search.result_impression','search.result_clicked','service.detail_viewed',
    'service.budget_cta_clicked','service.message_cta_clicked','quote.started','quote.progressed',
    'quote.completed','quote.submitted'
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_NAME_INVALID';
  end if;
  if coalesce((v_event ->> 'eventSchemaVersion')::integer, 0) <> 1
     or coalesce(v_event ->> 'taxonomyVersion', '') <> 'ana-event-taxonomy-v1' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_VERSION_INVALID';
  end if;
  if v_actor_class not in ('anon','authenticated')
     or v_source_surface not in ('search','direct','service_detail','quote','unknown')
     or v_payload_hash !~ '^[0-9a-f]{64}$'
     or length(v_semantic_key) not between 8 and 300 then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_SHAPE_INVALID';
  end if;

  begin
    v_actor_id := nullif(v_event ->> 'actorId', '')::uuid;
    v_client_event_id := nullif(v_event ->> 'clientEventId', '')::uuid;
    v_analytics_session_id := nullif(v_event ->> 'analyticsSessionId', '')::uuid;
    v_service_id := nullif(v_event ->> 'serviceId', '')::uuid;
    v_search_request_id := nullif(v_event ->> 'searchRequestId', '')::uuid;
    v_quote_session_id := nullif(v_event ->> 'quoteSessionId', '')::uuid;
    v_order_id := nullif(v_event ->> 'orderId', '')::uuid;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_UUID_INVALID';
  end;

  if (v_actor_class = 'authenticated' and v_actor_id is null)
     or (v_actor_class = 'anon' and v_actor_id is not null) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_EVENT_ACTOR_INVALID';
  end if;

  if v_client_event_id is not null then
    if v_analytics_session_id is null then
      select * into v_existing
      from private.analytics_behavior_events_v1
      where analytics_session_id is null
        and client_event_id = v_client_event_id;
    else
      select * into v_existing
      from private.analytics_behavior_events_v1
      where analytics_session_id = v_analytics_session_id
        and client_event_id = v_client_event_id;
    end if;

    if found then
      if v_existing.payload_hash <> v_payload_hash then
        raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
      end if;
      return v_existing.id;
    end if;
  end if;

  select * into v_existing
  from private.analytics_behavior_events_v1
  where semantic_key = v_semantic_key;
  if found then
    return v_existing.id;
  end if;

  begin
    insert into private.analytics_behavior_events_v1 (
      event_name,event_schema_version,taxonomy_version,client_event_id,payload_hash,semantic_key,
      actor_class,actor_id,analytics_session_id,service_id,search_request_id,quote_session_id,
      order_id,source_surface,dimensions,occurred_at,received_at
    ) values (
      v_event_name,1,'ana-event-taxonomy-v1',v_client_event_id,v_payload_hash,v_semantic_key,
      v_actor_class,v_actor_id,v_analytics_session_id,v_service_id,v_search_request_id,v_quote_session_id,
      v_order_id,v_source_surface,v_dimensions,v_now,v_now
    )
    returning id into v_id;

    return v_id;
  exception when unique_violation then
    -- A concurrent retry or semantically duplicate event may have committed
    -- after the pre-insert checks. Re-resolve deterministically instead of
    -- leaking a transient uniqueness error to the caller.
    if v_client_event_id is not null then
      if v_analytics_session_id is null then
        select * into v_existing
        from private.analytics_behavior_events_v1
        where analytics_session_id is null
          and client_event_id = v_client_event_id;
      else
        select * into v_existing
        from private.analytics_behavior_events_v1
        where analytics_session_id = v_analytics_session_id
          and client_event_id = v_client_event_id;
      end if;

      if found then
        if v_existing.payload_hash <> v_payload_hash then
          raise exception using errcode = '23505', message = 'DOKE_ANALYTICS_IDEMPOTENCY_CONFLICT';
        end if;
        return v_existing.id;
      end if;
    end if;

    select * into v_existing
    from private.analytics_behavior_events_v1
    where semantic_key = v_semantic_key;

    if found then
      return v_existing.id;
    end if;

    raise;
  end;
end;
$$;

comment on function public.record_analytics_behavior_event_v1(jsonb) is
  'ANA-A03 server-only behavioral event recorder with idempotency drift detection for both session-bound and server-originated client event IDs.';
