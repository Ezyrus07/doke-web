-- ANA-001 / ANA-A09: repository-only runtime candidate for immutable category/state funnel segmentation.
-- NOT APPLIED BY THIS LOT. Forward-only candidate; existing A09 runtime remains unchanged.
-- Reads CAT-A06/A07 facts only, performs no source mutation, writes no metric snapshot and creates no scheduler.

begin;

create or replace function private.analytics_a09_funnel_segment_for_anchor_v1(
  p_service_id uuid,
  p_anchor_occurred_at timestamptz,
  p_window_start timestamptz
)
returns table (
  resolution_state text,
  reason_code text,
  category_identity_type text,
  category_identity text,
  service_state text,
  sequence_no bigint,
  coverage_complete_from timestamptz,
  visible_version_id uuid
)
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_coverage_complete_from timestamptz;
  v_defect_count bigint := 0;
  v_event private.cat_listing_visibility_events_v1%rowtype;
  v_snapshot jsonb;
begin
  if p_service_id is null then
    raise exception using errcode='22023',message='DOKE_ANA_A09_SEGMENT_SERVICE_ID_REQUIRED';
  end if;
  if p_anchor_occurred_at is null or p_window_start is null then
    raise exception using errcode='22023',message='DOKE_ANA_A09_SEGMENT_TIME_REQUIRED';
  end if;

  select max(e.coverage_complete_from)
    into v_coverage_complete_from
  from private.cat_listing_supply_coverage_epochs_v1 e
  where e.contract_id='cat-a07-supply-coverage-baseline-v1'
    and e.certification_state='certified'
    and e.coverage_complete_from <= p_window_start;

  if v_coverage_complete_from is null then
    return query select
      'unavailable'::text,'before_coverage_epoch'::text,
      null::text,null::text,null::text,null::bigint,null::timestamptz,null::uuid;
    return;
  end if;

  with ordered as (
    select
      e.sequence_no,e.occurred_at,e.eligible_before,e.eligible_after,e.dimension_snapshot_after,
      pg_catalog.row_number() over(order by e.sequence_no) expected_sequence,
      pg_catalog.lag(e.occurred_at) over(order by e.sequence_no) previous_occurred_at,
      pg_catalog.lag(e.eligible_after) over(order by e.sequence_no) previous_eligible_after
    from private.cat_listing_visibility_events_v1 e
    where e.service_id=p_service_id
      and e.occurred_at <= p_anchor_occurred_at
  )
  select count(*)::bigint
    into v_defect_count
  from ordered o
  where o.sequence_no is distinct from o.expected_sequence
     or (o.previous_occurred_at is not null and o.occurred_at < o.previous_occurred_at)
     or (o.expected_sequence > 1 and o.eligible_before is distinct from o.previous_eligible_after)
     or (
       o.eligible_after
       and (
         coalesce(
           nullif(o.dimension_snapshot_after ->> 'categoryId',''),
           nullif(o.dimension_snapshot_after ->> 'categorySlug',''),
           nullif(o.dimension_snapshot_after ->> 'category','')
         ) is null
         or nullif(pg_catalog.upper(o.dimension_snapshot_after ->> 'state'),'') is null
       )
     );

  if v_defect_count <> 0 then
    return query select
      'unavailable'::text,'cat_ledger_invalid'::text,
      null::text,null::text,null::text,null::bigint,v_coverage_complete_from,null::uuid;
    return;
  end if;

  select e.*
    into v_event
  from private.cat_listing_visibility_events_v1 e
  where e.service_id=p_service_id
    and e.occurred_at <= p_anchor_occurred_at
  order by e.sequence_no desc
  limit 1;

  if not found then
    return query select
      'unavailable'::text,'no_cat_interval'::text,
      null::text,null::text,null::text,null::bigint,v_coverage_complete_from,null::uuid;
    return;
  end if;

  if not v_event.eligible_after then
    return query select
      'unavailable'::text,'listing_not_eligible'::text,
      null::text,null::text,null::text,v_event.sequence_no,v_coverage_complete_from,v_event.visible_version_id_after;
    return;
  end if;

  v_snapshot := v_event.dimension_snapshot_after;
  if coalesce(
       nullif(v_snapshot ->> 'categoryId',''),
       nullif(v_snapshot ->> 'categorySlug',''),
       nullif(v_snapshot ->> 'category','')
     ) is null
     or nullif(pg_catalog.upper(v_snapshot ->> 'state'),'') is null then
    return query select
      'unavailable'::text,'frozen_dimensions_incomplete'::text,
      null::text,null::text,null::text,v_event.sequence_no,v_coverage_complete_from,v_event.visible_version_id_after;
    return;
  end if;

  return query select
    'resolved'::text,
    null::text,
    case
      when nullif(v_snapshot ->> 'categoryId','') is not null then 'categoryId'
      when nullif(v_snapshot ->> 'categorySlug','') is not null then 'categorySlug'
      else 'category'
    end::text,
    pg_catalog.lower(coalesce(
      nullif(v_snapshot ->> 'categoryId',''),
      nullif(v_snapshot ->> 'categorySlug',''),
      nullif(v_snapshot ->> 'category','')
    ))::text,
    pg_catalog.upper(v_snapshot ->> 'state')::text,
    v_event.sequence_no,
    v_coverage_complete_from,
    v_event.visible_version_id_after;
end;
$function$;

alter function private.analytics_a09_funnel_segment_for_anchor_v1(uuid,timestamptz,timestamptz) owner to postgres;
revoke all on function private.analytics_a09_funnel_segment_for_anchor_v1(uuid,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function public.compute_analytics_canonical_funnel_segmented_v1(
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_category_identity_type text,
  p_category_identity text,
  p_service_state text
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
  v_cat_watermark jsonb;
  v_behavior_watermark_at timestamptz;
  v_order_watermark_at timestamptz;
  v_cat_watermark_at timestamptz;
  v_behavior_data_through timestamptz;
  v_cross_data_through timestamptz;
  v_coverage_complete_from timestamptz;
  v_category_identity_type text := pg_catalog.btrim(coalesce(p_category_identity_type,''));
  v_category_identity text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_category_identity,'')));
  v_service_state text := pg_catalog.upper(pg_catalog.btrim(coalesce(p_service_state,'')));
  v_unresolved_exposure_count bigint := 0;
  v_unresolved_behavior_journey_count bigint := 0;
  v_unresolved_cross_journey_count bigint := 0;
  v_computed_at timestamptz := pg_catalog.clock_timestamp();
  v_result jsonb;
begin
  if p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_FUNNEL_SEGMENT_WINDOW_INVALID';
  end if;
  if v_category_identity_type not in ('categoryId','categorySlug','category')
     or v_category_identity=''
     or v_service_state='' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_FUNNEL_SEGMENT_DIMENSION_INVALID';
  end if;

  select max(e.coverage_complete_from)
    into v_coverage_complete_from
  from private.cat_listing_supply_coverage_epochs_v1 e
  where e.contract_id='cat-a07-supply-coverage-baseline-v1'
    and e.certification_state='certified'
    and e.coverage_complete_from <= p_window_start;

  if v_coverage_complete_from is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-immutable-funnel-segmentation-runtime-candidate-v1',
      'state','unavailable_segmentation_coverage',
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'dimensions',pg_catalog.jsonb_build_object(
        'categoryIdentityType',v_category_identity_type,
        'categoryIdentity',v_category_identity,
        'serviceState',v_service_state
      ),
      'runtimeSegmentationAuthority',false,
      'snapshotPublicationAllowed',false
    );
  end if;

  v_behavior_watermark := private.analytics_behavior_watermark_v1();
  v_order_watermark := private.order_metric_watermark_v1();
  v_cat_watermark := private.cat_listing_visibility_watermark_v1();

  if coalesce(v_behavior_watermark ->> 'freshnessState','') <> 'fresh'
     or coalesce(v_order_watermark ->> 'freshnessState','') <> 'fresh'
     or nullif(v_behavior_watermark ->> 'dataThrough','') is null
     or nullif(v_order_watermark ->> 'dataThrough','') is null
     or nullif(v_cat_watermark ->> 'dataThrough','') is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-immutable-funnel-segmentation-runtime-candidate-v1',
      'state','unavailable_dependency',
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'behaviorWatermark',v_behavior_watermark,
      'orderWatermark',v_order_watermark,
      'catWatermark',v_cat_watermark,
      'runtimeSegmentationAuthority',false,
      'snapshotPublicationAllowed',false
    );
  end if;

  v_behavior_watermark_at := (v_behavior_watermark ->> 'dataThrough')::timestamptz;
  v_order_watermark_at := (v_order_watermark ->> 'dataThrough')::timestamptz;
  v_cat_watermark_at := (v_cat_watermark ->> 'dataThrough')::timestamptz;

  select min(x.value_at)
    into v_behavior_data_through
  from (values (p_window_end),(v_behavior_watermark_at),(v_cat_watermark_at)) x(value_at);

  select min(x.value_at)
    into v_cross_data_through
  from (values (p_window_end),(v_behavior_watermark_at),(v_order_watermark_at),(v_cat_watermark_at)) x(value_at);

  if v_behavior_data_through < p_window_start or v_cross_data_through < p_window_start then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-immutable-funnel-segmentation-runtime-candidate-v1',
      'state','unavailable_dependency_coverage',
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'behaviorDataThrough',v_behavior_data_through,
      'crossDomainDataThrough',v_cross_data_through,
      'behaviorWatermark',v_behavior_watermark,
      'orderWatermark',v_order_watermark,
      'catWatermark',v_cat_watermark,
      'runtimeSegmentationAuthority',false,
      'snapshotPublicationAllowed',false
    );
  end if;

  with behavior_source as (
    select e.*
    from private.analytics_behavior_events_v1 e
    where e.occurred_at >= p_window_start
      and e.occurred_at < p_window_end
      and e.occurred_at <= v_behavior_data_through
      and e.received_at <= v_behavior_data_through
  ),
  impressions as (
    select e.search_request_id,e.service_id,min(e.occurred_at) impression_at
    from behavior_source e
    where e.event_name='search.result_impression'
      and e.search_request_id is not null
      and e.service_id is not null
    group by e.search_request_id,e.service_id
  ),
  resolved as (
    select i.*,s.resolution_state
    from impressions i
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      i.service_id,i.impression_at,p_window_start
    ) s
  )
  select count(*) filter (where r.resolution_state <> 'resolved')::bigint
    into v_unresolved_exposure_count
  from resolved r;

  with stages as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_behavior_data_through
    )
  ),
  anchors as (
    select analytics_session_id,service_id,min(stage_at) impression_at
    from stages
    where stage='impression'
    group by analytics_session_id,service_id
  ),
  resolved as (
    select a.*,s.resolution_state
    from anchors a
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      a.service_id,a.impression_at,p_window_start
    ) s
  )
  select count(*) filter (where r.resolution_state <> 'resolved')::bigint
    into v_unresolved_behavior_journey_count
  from resolved r;

  with stages as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_cross_data_through
    )
  ),
  anchors as (
    select analytics_session_id,service_id,min(stage_at) impression_at
    from stages
    where stage='impression'
    group by analytics_session_id,service_id
  ),
  resolved as (
    select a.*,s.resolution_state
    from anchors a
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      a.service_id,a.impression_at,p_window_start
    ) s
  )
  select count(*) filter (where r.resolution_state <> 'resolved')::bigint
    into v_unresolved_cross_journey_count
  from resolved r;

  if v_unresolved_exposure_count <> 0
     or v_unresolved_behavior_journey_count <> 0
     or v_unresolved_cross_journey_count <> 0 then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-immutable-funnel-segmentation-runtime-candidate-v1',
      'state','unavailable_segmentation',
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'coverageCompleteFrom',v_coverage_complete_from,
      'behaviorDataThrough',v_behavior_data_through,
      'crossDomainDataThrough',v_cross_data_through,
      'unresolved',pg_catalog.jsonb_build_object(
        'exposures',v_unresolved_exposure_count,
        'behaviorJourneys',v_unresolved_behavior_journey_count,
        'crossDomainJourneys',v_unresolved_cross_journey_count
      ),
      'runtimeSegmentationAuthority',false,
      'snapshotPublicationAllowed',false
    );
  end if;

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
  impressions_all as (
    select e.search_request_id,e.service_id,min(e.occurred_at) impression_at
    from behavior_source e
    where e.event_name='search.result_impression'
      and e.search_request_id is not null
      and e.service_id is not null
    group by e.search_request_id,e.service_id
  ),
  impressions as (
    select i.*
    from impressions_all i
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      i.service_id,i.impression_at,p_window_start
    ) seg
    where seg.resolution_state='resolved'
      and seg.category_identity_type=v_category_identity_type
      and seg.category_identity=v_category_identity
      and seg.service_state=v_service_state
  ),
  clicks as (
    select e.search_request_id,e.service_id,min(e.occurred_at) click_at
    from behavior_source e
    where e.event_name='search.result_clicked'
      and e.search_request_id is not null
      and e.service_id is not null
    group by e.search_request_id,e.service_id
  ),
  search_counts as (
    select
      (select count(*)::bigint from impressions) impression_count,
      (select count(*)::bigint
         from clicks c join impressions i using(search_request_id,service_id)
        where c.click_at >= i.impression_at) valid_click_count,
      (select count(*)::bigint
         from clicks c left join impressions_all i using(search_request_id,service_id)
        where i.search_request_id is null or c.click_at < i.impression_at) unsegmented_orphan_click_count
  ),
  behavior_stages_all as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_behavior_data_through
    )
  ),
  behavior_anchors as (
    select analytics_session_id,service_id,min(stage_at) impression_at
    from behavior_stages_all
    where stage='impression'
    group by analytics_session_id,service_id
  ),
  behavior_anchors_segment as (
    select a.*
    from behavior_anchors a
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      a.service_id,a.impression_at,p_window_start
    ) seg
    where seg.resolution_state='resolved'
      and seg.category_identity_type=v_category_identity_type
      and seg.category_identity=v_category_identity
      and seg.service_state=v_service_state
  ),
  behavior_stages as (
    select s.*
    from behavior_stages_all s
    join behavior_anchors_segment a using(analytics_session_id,service_id)
  ),
  behavior_counts as (
    select
      count(distinct (analytics_session_id,service_id)) filter (where stage='impression')::bigint impression_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='click')::bigint click_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='detail')::bigint detail_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='budget_cta')::bigint budget_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_started')::bigint quote_started_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_completed')::bigint quote_completed_count,
      count(distinct (analytics_session_id,service_id)) filter (where stage='quote_submitted')::bigint quote_submitted_count
    from behavior_stages
  ),
  cross_stages_all as (
    select * from private.analytics_canonical_funnel_stage_rows_v1(
      p_window_start,p_window_end,v_cross_data_through
    )
  ),
  cross_anchors as (
    select analytics_session_id,service_id,min(stage_at) impression_at
    from cross_stages_all
    where stage='impression'
    group by analytics_session_id,service_id
  ),
  cross_anchors_segment as (
    select a.*
    from cross_anchors a
    cross join lateral private.analytics_a09_funnel_segment_for_anchor_v1(
      a.service_id,a.impression_at,p_window_start
    ) seg
    where seg.resolution_state='resolved'
      and seg.category_identity_type=v_category_identity_type
      and seg.category_identity=v_category_identity
      and seg.service_state=v_service_state
  ),
  cross_submitted as (
    select distinct s.analytics_session_id,s.service_id,s.order_id,s.stage_at
    from cross_stages_all s
    join cross_anchors_segment a using(analytics_session_id,service_id)
    where s.stage='quote_submitted' and s.order_id is not null
  ),
  requested_orders as (
    select e.order_id,min(e.occurred_at) requested_at
    from order_source e
    where e.event_type='order.requested'
    group by e.order_id
  ),
  cross_counts as (
    select
      count(distinct (s.analytics_session_id,s.service_id))::bigint submitted_count,
      count(distinct (s.analytics_session_id,s.service_id)) filter (
        where exists (
          select 1 from requested_orders r
          where r.order_id=s.order_id and r.requested_at >= s.stage_at
        )
      )::bigint requested_count
    from cross_submitted s
  )
  select pg_catalog.jsonb_build_object(
    'contractId','ana-a09-immutable-funnel-segmentation-runtime-candidate-v1',
    'state','computed_candidate',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'coverageCompleteFrom',v_coverage_complete_from,
    'behaviorDataThrough',v_behavior_data_through,
    'crossDomainDataThrough',v_cross_data_through,
    'computedAt',v_computed_at,
    'behaviorWatermark',v_behavior_watermark,
    'orderWatermark',v_order_watermark,
    'catWatermark',v_cat_watermark,
    'dimensions',pg_catalog.jsonb_build_object(
      'categoryIdentityType',v_category_identity_type,
      'categoryIdentity',v_category_identity,
      'serviceState',v_service_state
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
    'unsegmentedOrphanClicks',s.unsegmented_orphan_click_count,
    'journeySegmentAnchor','canonical_impression',
    'globalProjectionUnaffected',true,
    'runtimeSegmentationAuthority',false,
    'runtimeSnapshotAuthority',false,
    'snapshotPublicationAllowed',false
  )
  into v_result
  from search_counts s
  cross join behavior_counts b
  cross join cross_counts x;

  return v_result;
end;
$function$;

alter function public.compute_analytics_canonical_funnel_segmented_v1(
  timestamptz,timestamptz,text,text,text
) owner to postgres;
revoke all on function public.compute_analytics_canonical_funnel_segmented_v1(
  timestamptz,timestamptz,text,text,text
) from public, anon, authenticated, service_role;
grant execute on function public.compute_analytics_canonical_funnel_segmented_v1(
  timestamptz,timestamptz,text,text,text
) to service_role;

comment on function private.analytics_a09_funnel_segment_for_anchor_v1(uuid,timestamptz,timestamptz) is
  'ANA-A09 immutable funnel segment resolver candidate. Resolves category/state only from CAT-A06 frozen dimensions after a CAT-A07 certified coverage epoch; never joins mutable current service state.';
comment on function public.compute_analytics_canonical_funnel_segmented_v1(timestamptz,timestamptz,text,text,text) is
  'ANA-A09 compute-only immutable category/state segmented funnel candidate. Adds CAT watermark to segmented dataThrough, anchors the journey at the canonical impression, writes no snapshots and carries no runtime segmentation/publication authority until separately certified.';

commit;
