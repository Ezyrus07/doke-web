-- ANA-A09 validation 047: immutable funnel segmentation runtime candidate.
-- Run only after separately authorized staging application of migration 20260925145500.
-- Synthetic mutations are rollback-only; no snapshot publication is authorized.

begin;

do $validation$
declare
  v_helper regprocedure := to_regprocedure('private.analytics_a09_funnel_segment_for_anchor_v1(uuid,timestamptz,timestamptz)');
  v_compute regprocedure := to_regprocedure('public.compute_analytics_canonical_funnel_segmented_v1(timestamptz,timestamptz,text,text,text)');
  v_helper_def text;
  v_compute_def text;
  v_service constant uuid := 'a9a90000-0000-4000-8000-000000000047';
  v_version_1 constant uuid := 'a9a90000-0000-4000-8000-000000000147';
  v_version_2 constant uuid := 'a9a90000-0000-4000-8000-000000000247';
  v_baseline constant uuid := 'a9a90000-0000-4000-8000-000000000347';
  v_category_1 constant text := '17263173-c179-455f-bd43-2c3d9a55a8fd';
  v_category_2 constant text := '27263173-c179-455f-bd43-2c3d9a55a8fd';
  v_coverage constant timestamptz := '2099-01-01T00:00:00Z';
  v_resolution record;
  v_result jsonb;
begin
  if v_helper is null or v_compute is null then
    raise exception 'VALIDATION_047_SEGMENTATION_FUNCTIONS_MISSING';
  end if;

  select pg_get_functiondef(v_helper::oid) into v_helper_def;
  select pg_get_functiondef(v_compute::oid) into v_compute_def;

  if position('private.cat_listing_visibility_events_v1' in v_helper_def)=0
     or position('private.cat_listing_supply_coverage_epochs_v1' in v_helper_def)=0
     or position('dimension_snapshot_after' in v_helper_def)=0
     or position('public.services' in v_helper_def)>0 then
    raise exception 'VALIDATION_047_IMMUTABLE_CAT_SOURCE_BOUNDARY_INVALID';
  end if;

  if position('private.cat_listing_visibility_watermark_v1()' in v_compute_def)=0
     or position('private.analytics_behavior_watermark_v1()' in v_compute_def)=0
     or position('private.order_metric_watermark_v1()' in v_compute_def)=0
     or position('runtimeSegmentationAuthority' in v_compute_def)=0
     or position('snapshotPublicationAllowed' in v_compute_def)=0
     or position('canonical_impression' in v_compute_def)=0 then
    raise exception 'VALIDATION_047_SEGMENTED_DATATHROUGH_OR_ANCHOR_MISSING';
  end if;

  if position('insert into' in lower(v_compute_def))>0
     or position('update ' in lower(v_compute_def))>0
     or position('delete from' in lower(v_compute_def))>0
     or position('cron.' in lower(v_compute_def))>0
     or position('append_analytics_metric_snapshot' in lower(v_compute_def))>0 then
    raise exception 'VALIDATION_047_COMPUTE_ONLY_BOUNDARY_VIOLATED';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_helper::oid)) <> 'postgres'
     or pg_get_userbyid((select proowner from pg_proc where oid=v_compute::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_helper::oid)
     or not (select prosecdef from pg_proc where oid=v_compute::oid) then
    raise exception 'VALIDATION_047_OWNER_SECURITY_BOUNDARY_INVALID';
  end if;

  if has_function_privilege('anon',v_compute,'EXECUTE')
     or has_function_privilege('authenticated',v_compute,'EXECUTE')
     or not has_function_privilege('service_role',v_compute,'EXECUTE')
     or has_function_privilege('service_role',v_helper,'EXECUTE') then
    raise exception 'VALIDATION_047_EXECUTE_BOUNDARY_INVALID';
  end if;

  if exists(
    select 1 from private.cat_listing_supply_coverage_epochs_v1
    where baseline_run_id=v_baseline or coverage_complete_from=v_coverage
  ) or exists(
    select 1 from private.cat_listing_visibility_events_v1
    where service_id=v_service
  ) then
    raise exception 'VALIDATION_047_SYNTHETIC_KEYS_NOT_EMPTY';
  end if;

  insert into private.cat_listing_supply_coverage_epochs_v1(
    baseline_run_id,contract_id,coverage_complete_from,source_service_count,baseline_event_count,
    source_fingerprint,ledger_fingerprint,certification_state
  ) values(
    v_baseline,'cat-a07-supply-coverage-baseline-v1',v_coverage,0,0,
    repeat('a',64),repeat('b',64),'certified'
  );

  insert into private.cat_listing_visibility_events_v1(
    service_id,sequence_no,occurred_at,transaction_id,source_authority,source_transition_key,
    eligible_before,eligible_after,visible_version_id_before,visible_version_id_after,
    dimension_snapshot_before,dimension_snapshot_after,coverage_kind
  ) values
    (
      v_service,1,v_coverage,47001,'ANA-A09/validation-047','ana-a09-v047-seq-1',
      false,true,null,v_version_1,null,
      pg_catalog.jsonb_build_object('category','Limpeza','state','ba'),'activation_baseline'
    ),
    (
      v_service,2,v_coverage+interval '5 minutes',47002,'ANA-A09/validation-047','ana-a09-v047-seq-2',
      true,true,v_version_1,v_version_1,
      pg_catalog.jsonb_build_object('category','Limpeza','state','ba'),
      pg_catalog.jsonb_build_object(
        'categoryId',v_category_1,'categorySlug','limpeza','category','Limpeza','state','BA'
      ),'observed_transition'
    ),
    (
      v_service,3,v_coverage+interval '5 minutes',47003,'ANA-A09/validation-047','ana-a09-v047-seq-3',
      true,true,v_version_1,v_version_2,
      pg_catalog.jsonb_build_object(
        'categoryId',v_category_1,'categorySlug','limpeza','category','Limpeza','state','BA'
      ),
      pg_catalog.jsonb_build_object(
        'categoryId',v_category_2,'categorySlug','reparos','category','Reparos','state','sp'
      ),'observed_transition'
    ),
    (
      v_service,4,v_coverage+interval '10 minutes',47004,'ANA-A09/validation-047','ana-a09-v047-seq-4',
      true,false,v_version_2,null,
      pg_catalog.jsonb_build_object(
        'categoryId',v_category_2,'categorySlug','reparos','category','Reparos','state','sp'
      ),null,'observed_transition'
    );

  select * into v_resolution
  from private.analytics_a09_funnel_segment_for_anchor_v1(
    v_service,v_coverage+interval '1 minute',v_coverage
  );
  if v_resolution.resolution_state is distinct from 'resolved'
     or v_resolution.category_identity_type is distinct from 'category'
     or v_resolution.category_identity is distinct from 'limpeza'
     or v_resolution.service_state is distinct from 'BA'
     or v_resolution.sequence_no is distinct from 1 then
    raise exception 'VALIDATION_047_LEGACY_FROZEN_SEGMENT_INVALID';
  end if;

  select * into v_resolution
  from private.analytics_a09_funnel_segment_for_anchor_v1(
    v_service,v_coverage+interval '5 minutes',v_coverage
  );
  if v_resolution.resolution_state is distinct from 'resolved'
     or v_resolution.category_identity_type is distinct from 'categoryId'
     or v_resolution.category_identity is distinct from v_category_2
     or v_resolution.service_state is distinct from 'SP'
     or v_resolution.sequence_no is distinct from 3 then
    raise exception 'VALIDATION_047_SAME_TIMESTAMP_SEQUENCE_OR_VERSION_SPLIT_INVALID';
  end if;

  select * into v_resolution
  from private.analytics_a09_funnel_segment_for_anchor_v1(
    v_service,v_coverage+interval '11 minutes',v_coverage
  );
  if v_resolution.resolution_state is distinct from 'unavailable'
     or v_resolution.reason_code is distinct from 'listing_not_eligible' then
    raise exception 'VALIDATION_047_INELIGIBLE_INTERVAL_NOT_FAIL_CLOSED';
  end if;

  select * into v_resolution
  from private.analytics_a09_funnel_segment_for_anchor_v1(
    v_service,'1900-01-01T00:00:01Z'::timestamptz,'1900-01-01T00:00:00Z'::timestamptz
  );
  if v_resolution.resolution_state is distinct from 'unavailable'
     or v_resolution.reason_code is distinct from 'before_coverage_epoch' then
    raise exception 'VALIDATION_047_PRE_COVERAGE_NOT_FAIL_CLOSED';
  end if;

  v_result := public.compute_analytics_canonical_funnel_segmented_v1(
    pg_catalog.clock_timestamp()-interval '1 hour',
    pg_catalog.clock_timestamp(),
    'category',
    'validation-047-nonexistent-category',
    'BA'
  );

  if (v_result->>'contractId') is distinct from 'ana-a09-immutable-funnel-segmentation-runtime-candidate-v1'
     or coalesce((v_result->>'runtimeSegmentationAuthority')::boolean,true)<>false
     or coalesce((v_result->>'snapshotPublicationAllowed')::boolean,true)<>false then
    raise exception 'VALIDATION_047_RUNTIME_AUTHORITY_BOUNDARY_INVALID';
  end if;
end;
$validation$;

rollback;
