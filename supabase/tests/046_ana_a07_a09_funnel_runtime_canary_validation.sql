-- ANA-A07/A09 validation 046: complete + orphan + empty-window runtime canary candidate.
-- Repository-only candidate. Execution in staging requires separate explicit authorization.
-- All source mutations are synthetic and this file MUST end in ROLLBACK.
-- The late-fact case is intentionally excluded: it requires the separately orchestrated
-- transient_pg_cron_second_session protocol defined by the runtime canary contract.

begin;

do $canary$
declare
  v_client uuid;
  v_professional uuid;
  v_client_email constant text := 'cliente@doke.local';
  v_professional_email constant text := 'profissional@doke.local';
  v_service constant uuid := 'a7a90000-0000-4000-8000-000000000046';
  v_order constant uuid := 'a7a90000-0000-4000-8000-000000000146';
  v_session constant uuid := 'a7a90000-0000-4000-8000-000000000246';
  v_search constant uuid := 'a7a90000-0000-4000-8000-000000000346';
  v_quote constant uuid := 'a7a90000-0000-4000-8000-000000000446';
  v_orphan_session constant uuid := 'a7a90000-0000-4000-8000-000000000546';
  v_orphan_search constant uuid := 'a7a90000-0000-4000-8000-000000000646';
  v_window_start constant timestamptz := '2001-01-01T00:00:00Z';
  v_window_end constant timestamptz := '2001-01-01T00:10:00Z';
  v_empty_start constant timestamptz := '2001-01-02T00:00:00Z';
  v_empty_end constant timestamptz := '2001-01-02T00:10:00Z';
  v_result jsonb;
  v_empty jsonb;
  v_metric jsonb;
  v_metric_key text;
  v_expected_keys text[] := array[
    'funnel.search_ctr','funnel.impression_to_click','funnel.click_to_detail',
    'funnel.detail_to_budget_cta','funnel.budget_cta_to_quote_started',
    'funnel.quote_started_to_completed','funnel.quote_completed_to_submitted',
    'funnel.quote_submitted_to_order_requested'
  ];
  v_offset integer := 0;
begin
  select au.id
    into v_client
    from auth.users au
    join public.users pu on pu.id=au.id
   where lower(au.email)=v_client_email
     and lower(pu.email)=v_client_email
     and pu.role='client'
     and pu.status='active';

  select au.id
    into v_professional
    from auth.users au
    join public.users pu on pu.id=au.id
   where lower(au.email)=v_professional_email
     and lower(pu.email)=v_professional_email
     and pu.role='professional'
     and pu.status='active';

  if v_client is null or v_professional is null then
    raise exception 'VALIDATION_046_CANARY_IDENTITY_RESOLUTION_FAILED';
  end if;

  if v_client=v_professional then
    raise exception 'VALIDATION_046_CANARY_IDENTITY_COLLISION';
  end if;

  if exists(select 1 from private.analytics_behavior_events_v1 where occurred_at>=v_window_start and occurred_at<v_window_end)
     or exists(select 1 from private.order_metric_events where occurred_at>=v_window_start and occurred_at<v_window_end)
     or exists(select 1 from private.analytics_behavior_events_v1 where occurred_at>=v_empty_start and occurred_at<v_empty_end)
     or exists(select 1 from private.order_metric_events where occurred_at>=v_empty_start and occurred_at<v_empty_end) then
    raise exception 'VALIDATION_046_RESERVED_WINDOW_NOT_EMPTY';
  end if;

  insert into public.services(id,professional_id,title,slug,description,status,created_at,updated_at)
  values(v_service,v_professional,'ANA A07/A09 runtime canary','ana-a07-a09-runtime-canary-v1-046',
    'Synthetic rollback-only analytics runtime canary fixture.','draft',pg_catalog.clock_timestamp(),pg_catalog.clock_timestamp());

  insert into public.orders(id,client_id,professional_id,service_id,title,description,status,created_at,updated_at)
  values(v_order,v_client,v_professional,v_service,'ANA A07/A09 runtime canary order',
    'Synthetic rollback-only analytics runtime canary fixture.','requested',pg_catalog.clock_timestamp(),pg_catalog.clock_timestamp());

  update private.order_metric_events
     set occurred_at=v_window_start+interval '80 seconds',
         created_at=v_window_start+interval '80 seconds'
   where order_id=v_order and event_type='order.requested';
  if not found then raise exception 'VALIDATION_046_ORDER_METRIC_FIXTURE_MISSING'; end if;

  insert into private.analytics_behavior_events_v1(
    id,event_name,event_schema_version,taxonomy_version,client_event_id,payload_hash,semantic_key,
    actor_class,actor_id,analytics_session_id,service_id,search_request_id,quote_session_id,order_id,
    source_surface,dimensions,occurred_at,received_at,created_at
  ) values
    ('a7a90000-0000-4000-8000-000000001001','search.result_impression',1,'ana-event-taxonomy-v1',null,repeat('1',64),'ana-a07-a09-canary-complete-impression-v1','anon',null,v_session,v_service,v_search,null,null,'search','{}',v_window_start+interval '10 seconds',v_window_start+interval '10 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001002','search.result_clicked',1,'ana-event-taxonomy-v1',null,repeat('2',64),'ana-a07-a09-canary-complete-click-v1','anon',null,v_session,v_service,v_search,null,null,'search','{}',v_window_start+interval '20 seconds',v_window_start+interval '20 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001003','service.detail_viewed',1,'ana-event-taxonomy-v1',null,repeat('3',64),'ana-a07-a09-canary-complete-detail-v1','anon',null,v_session,v_service,null,null,null,'service_detail','{}',v_window_start+interval '30 seconds',v_window_start+interval '30 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001004','service.budget_cta_clicked',1,'ana-event-taxonomy-v1',null,repeat('4',64),'ana-a07-a09-canary-complete-budget-v1','anon',null,v_session,v_service,null,null,null,'service_detail','{}',v_window_start+interval '40 seconds',v_window_start+interval '40 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001005','quote.started',1,'ana-event-taxonomy-v1',null,repeat('5',64),'ana-a07-a09-canary-complete-quote-start-v1','anon',null,v_session,v_service,null,v_quote,null,'quote','{}',v_window_start+interval '50 seconds',v_window_start+interval '50 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001006','quote.completed',1,'ana-event-taxonomy-v1',null,repeat('6',64),'ana-a07-a09-canary-complete-quote-complete-v1','anon',null,v_session,v_service,null,v_quote,null,'quote','{}',v_window_start+interval '60 seconds',v_window_start+interval '60 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001007','quote.submitted',1,'ana-event-taxonomy-v1',null,repeat('7',64),'ana-a07-a09-canary-complete-quote-submit-v1','anon',null,v_session,v_service,null,v_quote,v_order,'quote','{}',v_window_start+interval '70 seconds',v_window_start+interval '70 seconds',pg_catalog.clock_timestamp()),
    ('a7a90000-0000-4000-8000-000000001008','search.result_clicked',1,'ana-event-taxonomy-v1',null,repeat('8',64),'ana-a07-a09-canary-orphan-click-v1','anon',null,v_orphan_session,v_service,v_orphan_search,null,null,'search','{}',v_window_start+interval '25 seconds',v_window_start+interval '25 seconds',pg_catalog.clock_timestamp());

  v_result:=public.compute_analytics_canonical_funnel_v1(v_window_start,v_window_end);

  if (v_result->>'contractId') is distinct from 'ana-a09-server-side-funnel-projector-v1'
     or coalesce((v_result->>'snapshotPublicationAllowed')::boolean,true)<>false
     or coalesce((v_result->>'runtimeAuthority')::boolean,true)<>false
     or coalesce((v_result->>'searchOrphanClicks')::bigint,-1)<>1 then
    raise exception 'VALIDATION_046_COMPLETE_ORPHAN_BOUNDARY_INVALID';
  end if;

  foreach v_metric_key in array v_expected_keys loop
    select value into v_metric
    from pg_catalog.jsonb_array_elements(v_result->'metrics') value
    where value->>'metricKey'=v_metric_key;

    if v_metric is null
       or coalesce((v_metric->>'numerator')::bigint,-1)<>1
       or coalesce((v_metric->>'denominator')::bigint,-1)<>1
       or coalesce((v_metric->>'sampleCount')::bigint,-1)<>1 then
      raise exception 'VALIDATION_046_COMPLETE_METRIC_INVALID: %',v_metric_key;
    end if;
  end loop;

  v_empty:=public.compute_analytics_canonical_funnel_v1(v_empty_start,v_empty_end);

  if pg_catalog.jsonb_array_length(v_empty->'metrics')<>8
     or (v_empty->>'behaviorDataThrough')::timestamptz is distinct from v_empty_end
     or (v_empty->>'crossDomainDataThrough')::timestamptz is distinct from v_empty_end
     or coalesce((v_empty->>'snapshotPublicationAllowed')::boolean,true)<>false then
    raise exception 'VALIDATION_046_EMPTY_WINDOW_BOUNDARY_INVALID';
  end if;

  if exists(
    select 1
    from pg_catalog.jsonb_array_elements(v_empty->'metrics') m
    where coalesce((m->>'sampleCount')::bigint,-1)<>0
       or m->'value' is distinct from 'null'::jsonb
  ) then
    raise exception 'VALIDATION_046_EMPTY_WINDOW_VALUE_INVALID';
  end if;
end;
$canary$;

rollback;
