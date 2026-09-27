-- ANA-001 / ANA-A08: forward-only live retention runtime projection authority marker alignment candidate.
-- REPOSITORY-ONLY CANDIDATE. DO NOT APPLY without separate exact-head staging authorization.
-- Bound to certified staging evidence blob 3249080dec64c1aeec1119309dbf1db9992fb85c and validation 049 PASS.
-- The only compute-function behavior change is runtimeProjectionAuthority=false -> true (2 markers).
-- runtimeSnapshotAuthority/snapshotPublicationAllowed/schedulerAuthority remain false.

begin;

create or replace function public.compute_analytics_retention_cohort_v1(
  p_metric_key text,
  p_data_through timestamptz,
  p_service_category text default null,
  p_service_state text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_metric_key text := pg_catalog.btrim(coalesce(p_metric_key,''));
  v_service_category text := nullif(pg_catalog.btrim(coalesce(p_service_category,'')),'');
  v_service_state text := nullif(pg_catalog.upper(pg_catalog.btrim(coalesce(p_service_state,''))),'');
  v_window_days integer;
  v_repeat_event_type text;
  v_order_watermark jsonb;
  v_order_watermark_at timestamptz;
  v_effective_data_through timestamptz;
  v_computed_at timestamptz := pg_catalog.clock_timestamp();
  v_missing_client bigint := 0;
  v_no_completion bigint := 0;
  v_immature bigint := 0;
  v_missing_requested_dimensions bigint := 0;
  v_cohort_missing_dimensions bigint := 0;
  v_denominator bigint := 0;
  v_numerator bigint := 0;
begin
  if p_data_through is null then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_RETENTION_DATATHROUGH_REQUIRED';
  end if;

  case v_metric_key
    when 'retention.repeat_request_30d' then
      v_window_days := 30;
      v_repeat_event_type := 'order.requested';
    when 'retention.repeat_completion_90d' then
      v_window_days := 90;
      v_repeat_event_type := 'order.completed';
    else
      raise exception using errcode='22023',message='DOKE_ANALYTICS_RETENTION_METRIC_INVALID';
  end case;

  v_order_watermark := private.order_metric_watermark_v1();

  if coalesce(v_order_watermark ->> 'freshnessState','') <> 'fresh'
     or nullif(v_order_watermark ->> 'dataThrough','') is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a08-retention-runtime-projector-candidate-v1',
      'sourceContractId','ana-a08-retention-cohort-projection-v1',
      'state','unavailable_dependency',
      'metricKey',v_metric_key,
      'requestedDataThrough',p_data_through,
      'dataThrough',null,
      'orderWatermark',v_order_watermark,
      'runtimeProjectionAuthority',true,
      'runtimeSnapshotAuthority',false,
      'snapshotPublicationAllowed',false,
      'schedulerAuthority',false
    );
  end if;

  v_order_watermark_at := (v_order_watermark ->> 'dataThrough')::timestamptz;
  v_effective_data_through := case
    when v_order_watermark_at < p_data_through then v_order_watermark_at
    else p_data_through
  end;

  with source_all as (
    select
      e.id,
      e.order_id,
      e.client_id,
      e.event_type,
      e.occurred_at,
      e.created_at,
      coalesce(e.dimensions,'{}'::jsonb) as dimensions
    from private.order_metric_events e
    where e.occurred_at <= v_effective_data_through
      and e.created_at <= v_effective_data_through
  ),
  source as (
    select * from source_all where client_id is not null
  ),
  clients as (
    select distinct client_id from source
  ),
  first_completion as (
    select distinct on (e.client_id)
      e.client_id,
      e.order_id as first_order_id,
      e.occurred_at as first_completed_at,
      nullif(pg_catalog.btrim(e.dimensions ->> 'serviceCategory'),'') as service_category,
      nullif(pg_catalog.upper(pg_catalog.btrim(e.dimensions ->> 'serviceState')),'') as service_state
    from source e
    where e.event_type='order.completed'
    order by e.client_id,e.occurred_at,e.order_id::text,e.id
  ),
  mature as (
    select f.*
    from first_completion f
    where f.first_completed_at + pg_catalog.make_interval(days => v_window_days)
      <= v_effective_data_through
  ),
  eligible_cohort as (
    select m.*
    from mature m
    where (v_service_category is null or m.service_category = v_service_category)
      and (v_service_state is null or m.service_state = v_service_state)
  )
  select
    (select count(*)::bigint from source_all where client_id is null),
    (select count(*)::bigint
       from clients c
       left join first_completion f using(client_id)
      where f.client_id is null),
    (select count(*)::bigint
       from first_completion f
      where f.first_completed_at + pg_catalog.make_interval(days => v_window_days)
        > v_effective_data_through),
    (select count(*)::bigint
       from mature m
      where (v_service_category is not null and m.service_category is null)
         or (v_service_state is not null and m.service_state is null)),
    (select count(*)::bigint
       from mature m
      where m.service_category is null or m.service_state is null),
    (select count(*)::bigint from eligible_cohort),
    (select count(*)::bigint
       from eligible_cohort m
      where exists (
        select 1
        from source e
        where e.client_id=m.client_id
          and e.event_type=v_repeat_event_type
          and e.order_id <> m.first_order_id
          and e.occurred_at > m.first_completed_at
          and e.occurred_at <= m.first_completed_at + pg_catalog.make_interval(days => v_window_days)
      ))
  into
    v_missing_client,
    v_no_completion,
    v_immature,
    v_missing_requested_dimensions,
    v_cohort_missing_dimensions,
    v_denominator,
    v_numerator;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a08-retention-runtime-projector-candidate-v1',
    'sourceContractId','ana-a08-retention-cohort-projection-v1',
    'state','computed_candidate',
    'metricKey',v_metric_key,
    'metricVersion','v1',
    'windowDays',v_window_days,
    'repeatEventType',v_repeat_event_type,
    'requestedDataThrough',p_data_through,
    'dataThrough',v_effective_data_through,
    'computedAt',v_computed_at,
    'orderWatermark',v_order_watermark,
    'dimensions',pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'serviceCategory',v_service_category,
      'serviceState',v_service_state
    )),
    'numerator',v_numerator,
    'denominator',v_denominator,
    'value',case when v_denominator=0 then null
      else pg_catalog.round(v_numerator::numeric/v_denominator,6) end,
    'sampleCount',v_denominator,
    'coverageState',case when v_cohort_missing_dimensions>0 then 'partial' else 'complete' end,
    'excluded',pg_catalog.jsonb_build_object(
      'missingClientId',v_missing_client,
      'noCompletion',v_no_completion,
      'immatureCohort',v_immature,
      'missingRequestedSegmentDimensions',v_missing_requested_dimensions,
      'cohortMissingDimensions',v_cohort_missing_dimensions
    ),
    'identityScope','canonical_authenticated_client_id_only',
    'cohortAnchor','first_order_completed',
    'segmentationAnchor','first_completion_immutable_service_dimensions',
    'dimensionSourceAuthority','ANA-A04_ORDER_SERVICE_SNAPSHOT_ENRICHMENT',
    'crossSegmentRepeatCounts',true,
    'rehireInferred',false,
    'currentServiceJoinAllowed',false,
    'runtimeProjectionAuthority',true,
    'runtimeSnapshotAuthority',false,
    'snapshotPublicationAllowed',false,
    'schedulerAuthority',false
  );
end;
$function$;

alter function public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text) owner to postgres;
revoke all on function public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text)
  to service_role;

comment on function public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text) is
  'ANA-A08 compute-only retention cohort projector. Repository runtime projection authority is granted; this forward-only candidate aligns only the live runtimeProjectionAuthority marker to true while preserving immutable A04 dimensions, ANA-A07 dataThrough, service-role-only execution, zero snapshot/publication authority and zero scheduler authority.';

commit;
