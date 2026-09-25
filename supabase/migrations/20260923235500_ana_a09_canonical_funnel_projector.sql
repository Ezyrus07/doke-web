-- ANA-A09 canonical acquisition-to-order funnel projector.
-- Repository candidate only. Applying this migration requires separate staging authorization.
-- Compute-only: no snapshot/source mutations, no scheduler, no freshness threshold invention.

create or replace function private.analytics_canonical_funnel_stage_rows_v1(
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_data_through timestamptz
)
returns table(
  analytics_session_id uuid,
  service_id uuid,
  stage text,
  stage_at timestamptz,
  quote_session_id uuid,
  order_id uuid
)
language sql
stable
security definer
set search_path = 'pg_catalog'
as $function$
with eligible as (
  select e.*
  from private.analytics_behavior_events_v1 e
  where e.occurred_at >= p_window_start
    and e.occurred_at < p_window_end
    and e.occurred_at <= p_data_through
    and e.received_at <= p_data_through
    and e.analytics_session_id is not null
    and e.service_id is not null
),
impression as (
  select e.analytics_session_id,e.service_id,min(e.occurred_at) as stage_at
  from eligible e
  where e.event_name='search.result_impression'
    and e.search_request_id is not null
  group by e.analytics_session_id,e.service_id
),
click as (
  select i.analytics_session_id,i.service_id,min(e.occurred_at) as stage_at
  from impression i
  join eligible e
    on e.analytics_session_id=i.analytics_session_id
   and e.service_id=i.service_id
   and e.event_name='search.result_clicked'
   and e.search_request_id is not null
   and e.occurred_at >= i.stage_at
  group by i.analytics_session_id,i.service_id
),
detail as (
  select c.analytics_session_id,c.service_id,min(e.occurred_at) as stage_at
  from click c
  join eligible e
    on e.analytics_session_id=c.analytics_session_id
   and e.service_id=c.service_id
   and e.event_name='service.detail_viewed'
   and e.occurred_at >= c.stage_at
  group by c.analytics_session_id,c.service_id
),
budget as (
  select d.analytics_session_id,d.service_id,min(e.occurred_at) as stage_at
  from detail d
  join eligible e
    on e.analytics_session_id=d.analytics_session_id
   and e.service_id=d.service_id
   and e.event_name='service.budget_cta_clicked'
   and e.occurred_at >= d.stage_at
  group by d.analytics_session_id,d.service_id
),
quote_started as (
  select b.analytics_session_id,b.service_id,e.quote_session_id,min(e.occurred_at) as stage_at
  from budget b
  join eligible e
    on e.analytics_session_id=b.analytics_session_id
   and e.service_id=b.service_id
   and e.event_name='quote.started'
   and e.quote_session_id is not null
   and e.occurred_at >= b.stage_at
  group by b.analytics_session_id,b.service_id,e.quote_session_id
),
quote_completed as (
  select q.analytics_session_id,q.service_id,q.quote_session_id,min(e.occurred_at) as stage_at
  from quote_started q
  join eligible e
    on e.analytics_session_id=q.analytics_session_id
   and e.service_id=q.service_id
   and e.quote_session_id=q.quote_session_id
   and e.event_name='quote.completed'
   and e.occurred_at >= q.stage_at
  group by q.analytics_session_id,q.service_id,q.quote_session_id
),
quote_submitted as (
  select distinct on (q.analytics_session_id,q.service_id,q.quote_session_id)
    q.analytics_session_id,q.service_id,q.quote_session_id,e.occurred_at as stage_at,e.order_id
  from quote_completed q
  join eligible e
    on e.analytics_session_id=q.analytics_session_id
   and e.service_id=q.service_id
   and e.quote_session_id=q.quote_session_id
   and e.event_name='quote.submitted'
   and e.order_id is not null
   and e.occurred_at >= q.stage_at
  order by q.analytics_session_id,q.service_id,q.quote_session_id,e.occurred_at,e.id
)
select i.analytics_session_id,i.service_id,'impression'::text,i.stage_at,null::uuid,null::uuid from impression i
union all
select c.analytics_session_id,c.service_id,'click',c.stage_at,null::uuid,null::uuid from click c
union all
select d.analytics_session_id,d.service_id,'detail',d.stage_at,null::uuid,null::uuid from detail d
union all
select b.analytics_session_id,b.service_id,'budget_cta',b.stage_at,null::uuid,null::uuid from budget b
union all
select q.analytics_session_id,q.service_id,'quote_started',q.stage_at,q.quote_session_id,null::uuid from quote_started q
union all
select q.analytics_session_id,q.service_id,'quote_completed',q.stage_at,q.quote_session_id,null::uuid from quote_completed q
union all
select q.analytics_session_id,q.service_id,'quote_submitted',q.stage_at,q.quote_session_id,q.order_id from quote_submitted q;
$function$;

alter function private.analytics_canonical_funnel_stage_rows_v1(timestamptz,timestamptz,timestamptz) owner to postgres;
revoke all on function private.analytics_canonical_funnel_stage_rows_v1(timestamptz,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.compute_analytics_canonical_funnel_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_behavior_watermark jsonb;
  v_order_watermark jsonb;
  v_behavior_watermark_at timestamptz;
  v_order_watermark_at timestamptz;
  v_behavior_data_through timestamptz;
  v_cross_data_through timestamptz;
  v_computed_at timestamptz := pg_catalog.clock_timestamp();
  v_result jsonb;
begin
  if p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_FUNNEL_WINDOW_INVALID';
  end if;

  v_behavior_watermark := private.analytics_behavior_watermark_v1();
  v_order_watermark := private.order_metric_watermark_v1();

  if coalesce(v_behavior_watermark ->> 'freshnessState','') <> 'fresh'
     or coalesce(v_order_watermark ->> 'freshnessState','') <> 'fresh'
     or nullif(v_behavior_watermark ->> 'dataThrough','') is null
     or nullif(v_order_watermark ->> 'dataThrough','') is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-server-side-funnel-projector-v1',
      'state','unavailable_dependency',
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'behaviorWatermark',v_behavior_watermark,
      'orderWatermark',v_order_watermark,
      'snapshotPublicationAllowed',false,
      'runtimeAuthority',false
    );
  end if;

  v_behavior_watermark_at := (v_behavior_watermark ->> 'dataThrough')::timestamptz;
  v_order_watermark_at := (v_order_watermark ->> 'dataThrough')::timestamptz;

  v_behavior_data_through := case
    when v_behavior_watermark_at < p_window_end then v_behavior_watermark_at
    else p_window_end
  end;

  v_cross_data_through := case
    when v_behavior_watermark_at <= v_order_watermark_at and v_behavior_watermark_at <= p_window_end then v_behavior_watermark_at
    when v_order_watermark_at <= p_window_end then v_order_watermark_at
    else p_window_end
  end;

  with behavior_source as (
    select e.*
    from private.analytics_behavior_events_v1 e
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
      and e.occurred_at <= v_behavior_data_through
      and e.received_at <= v_behavior_data_through
  ),
  cross_behavior_source as (
    select e.*
    from private.analytics_behavior_events_v1 e
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
      and e.occurred_at <= v_cross_data_through
      and e.received_at <= v_cross_data_through
  ),
  order_source as (
    select e.*
    from private.order_metric_events e
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
      and e.occurred_at <= v_cross_data_through
      and e.created_at <= v_cross_data_through
  ),
  impressions as (
    select e.search_request_id,e.service_id,min(e.occurred_at) as impression_at
    from behavior_source e
    where e.event_name='search.result_impression'
      and e.search_request_id is not null
      and e.service_id is not null
    group by e.search_request_id,e.service_id
  ),
  clicks as (
    select e.search_request_id,e.service_id,min(e.occurred_at) as click_at
    from behavior_source e
    where e.event_name='search.result_clicked'
      and e.search_request_id is not null
      and e.service_id is not null
    group by e.search_request_id,e.service_id
  ),
  search_counts as (
    select
      (select count(*)::bigint from impressions) as impression_count,
      (select count(*)::bigint
         from clicks c join impressions i using(search_request_id,service_id)
        where c.click_at >= i.impression_at) as valid_click_count,
      (select count(*)::bigint
         from clicks c left join impressions i using(search_request_id,service_id)
        where i.search_request_id is null or c.click_at < i.impression_at) as orphan_click_count
  ),
  behavior_stages as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_behavior_data_through
    )
  ),
  cross_stages as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_cross_data_through
    )
  ),
  behavior_counts as (
    select
      count(distinct (analytics_session_id,service_id)) filter (where stage='impression')::bigint as impression_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='click')::bigint as click_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='detail')::bigint as detail_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='budget_cta')::bigint as budget_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_started')::bigint as quote_started_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_completed')::bigint as quote_completed_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_submitted')::bigint as quote_submitted_count
    from behavior_stages
  ),
  cross_submitted as (
    select distinct analytics_session_id,service_id,order_id,stage_at
    from cross_stages
    where stage='quote_submitted' and order_id is not null
  ),
  requested_orders as (
    select e.order_id,min(e.occurred_at) as requested_at
    from order_source e
    where e.event_type='order.requested'
    group by e.order_id
  ),
  cross_counts as (
    select
      count(distinct (s.analytics_session_id,s.service_id))::bigint as submitted_count,
      count(distinct (s.analytics_session_id,s.service_id)) filter (
        where exists (
          select 1 from requested_orders r
          where r.order_id=s.order_id and r.requested_at >= s.stage_at
        )
      )::bigint as requested_count
    from cross_submitted s
  ),
  fingerprints as (
    select
      pg_catalog.encode(extensions.digest(pg_catalog.convert_to(coalesce((
        select pg_catalog.string_agg(
          e.id::text||'|'||e.event_name||'|'||e.occurred_at::text||'|'||e.received_at::text||'|'||
          coalesce(e.analytics_session_id::text,'')||'|'||coalesce(e.service_id::text,'')||'|'||
          coalesce(e.search_request_id::text,'')||'|'||coalesce(e.quote_session_id::text,'')||'|'||
          coalesce(e.order_id::text,''),
          E'\n' order by e.id
        ) from behavior_source e
      ),''),'UTF8'),'sha256'),'hex') as behavior_fingerprint,
      pg_catalog.encode(extensions.digest(pg_catalog.convert_to(coalesce((
        select pg_catalog.string_agg(
          e.id::text||'|'||e.event_name||'|'||e.occurred_at::text||'|'||e.received_at::text||'|'||
          coalesce(e.analytics_session_id::text,'')||'|'||coalesce(e.service_id::text,'')||'|'||
          coalesce(e.quote_session_id::text,'')||'|'||coalesce(e.order_id::text,''),
          E'\n' order by e.id
        ) from cross_behavior_source e
      ),''),'UTF8'),'sha256'),'hex') as cross_behavior_fingerprint,
      pg_catalog.encode(extensions.digest(pg_catalog.convert_to(coalesce((
        select pg_catalog.string_agg(
          e.id::text||'|'||e.event_type||'|'||e.occurred_at::text||'|'||e.created_at::text||'|'||e.order_id::text,
          E'\n' order by e.id
        ) from order_source e
      ),''),'UTF8'),'sha256'),'hex') as order_fingerprint
  )
  select pg_catalog.jsonb_build_object(
    'contractId','ana-a09-server-side-funnel-projector-v1',
    'state','computed_policy_pending',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'behaviorDataThrough',v_behavior_data_through,
    'crossDomainDataThrough',v_cross_data_through,
    'computedAt',v_computed_at,
    'behaviorWatermark',v_behavior_watermark,
    'orderWatermark',v_order_watermark,
    'sourceFingerprints',pg_catalog.jsonb_build_object(
      'behavior',f.behavior_fingerprint,
      'crossBehavior',f.cross_behavior_fingerprint,
      'order',f.order_fingerprint
    ),
    'metrics',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.search_ctr','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',s.valid_click_count,'denominator',s.impression_count,
        'value',case when s.impression_count=0 then null else pg_catalog.round(s.valid_click_count::numeric/s.impression_count,6) end,
        'sampleCount',s.impression_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.impression_to_click','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.click_count,'denominator',b.impression_count,
        'value',case when b.impression_count=0 then null else pg_catalog.round(b.click_count::numeric/b.impression_count,6) end,
        'sampleCount',b.impression_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.click_to_detail','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.detail_count,'denominator',b.click_count,
        'value',case when b.click_count=0 then null else pg_catalog.round(b.detail_count::numeric/b.click_count,6) end,
        'sampleCount',b.click_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.detail_to_budget_cta','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.budget_count,'denominator',b.detail_count,
        'value',case when b.detail_count=0 then null else pg_catalog.round(b.budget_count::numeric/b.detail_count,6) end,
        'sampleCount',b.detail_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.budget_cta_to_quote_started','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.quote_started_count,'denominator',b.budget_count,
        'value',case when b.budget_count=0 then null else pg_catalog.round(b.quote_started_count::numeric/b.budget_count,6) end,
        'sampleCount',b.budget_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.quote_started_to_completed','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.quote_completed_count,'denominator',b.quote_started_count,
        'value',case when b.quote_started_count=0 then null else pg_catalog.round(b.quote_completed_count::numeric/b.quote_started_count,6) end,
        'sampleCount',b.quote_started_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.quote_completed_to_submitted','metricVersion','v1',
        'dataThrough',v_behavior_data_through,'numerator',b.quote_submitted_count,'denominator',b.quote_completed_count,
        'value',case when b.quote_completed_count=0 then null else pg_catalog.round(b.quote_submitted_count::numeric/b.quote_completed_count,6) end,
        'sampleCount',b.quote_completed_count
      ),
      pg_catalog.jsonb_build_object(
        'metricKey','funnel.quote_submitted_to_order_requested','metricVersion','v1',
        'dataThrough',v_cross_data_through,'numerator',x.requested_count,'denominator',x.submitted_count,
        'value',case when x.submitted_count=0 then null else pg_catalog.round(x.requested_count::numeric/x.submitted_count,6) end,
        'sampleCount',x.submitted_count
      )
    ),
    'searchOrphanClicks',s.orphan_click_count,
    'snapshotHandoff',pg_catalog.jsonb_build_object(
      'appendRpc','public.append_analytics_metric_snapshot_v1',
      'appendOnly',true,
      'lateFactRevisionAuthority','ANA-A05',
      'snapshotPublicationAllowed',false,
      'reason','A07_METRIC_SPECIFIC_THRESHOLD_POLICY_PENDING'
    ),
    'segmentation','global_only',
    'anonymousIdentityStitching',false,
    'temporalHeuristicJoin',false,
    'snapshotPublicationAllowed',false,
    'freshnessPolicyState','threshold_pending',
    'runtimeAuthority',false
  )
  into v_result
  from search_counts s
  cross join behavior_counts b
  cross join cross_counts x
  cross join fingerprints f;

  return v_result;
end;
$function$;

alter function public.compute_analytics_canonical_funnel_v1(timestamptz,timestamptz) owner to postgres;
revoke all on function public.compute_analytics_canonical_funnel_v1(timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.compute_analytics_canonical_funnel_v1(timestamptz,timestamptz) to service_role;

comment on function private.analytics_canonical_funnel_stage_rows_v1(timestamptz,timestamptz,timestamptz) is
  'ANA-A09 strict explicit-key chronological funnel stage projector bounded by behavior materialization/event time.';
comment on function public.compute_analytics_canonical_funnel_v1(timestamptz,timestamptz) is
  'ANA-A09 compute-only canonical funnel projector. Consumes certified A07 watermarks; snapshot publication stays blocked until metric-specific freshness policy and staging canaries.';
