-- ANA-A09 validation 048: live segmented runtime authority marker alignment.
-- Run only after separate staging authorization applies migration 20260926235900.
-- Read-only assertions inside a rollback-only transaction.

begin;

do $validation$
declare
  v_compute regprocedure := to_regprocedure(
    'public.compute_analytics_canonical_funnel_segmented_v1(timestamptz,timestamptz,text,text,text)'
  );
  v_def text;
  v_true_markers integer;
  v_false_markers integer;
  v_result jsonb;
begin
  if v_compute is null then
    raise exception 'VALIDATION_048_SEGMENTED_COMPUTE_MISSING';
  end if;

  select pg_get_functiondef(v_compute::oid) into v_def;

  select count(*)::integer into v_true_markers
  from regexp_matches(v_def,'''runtimeSegmentationAuthority''[[:space:]]*,[[:space:]]*true','g');

  select count(*)::integer into v_false_markers
  from regexp_matches(v_def,'''runtimeSegmentationAuthority''[[:space:]]*,[[:space:]]*false','g');

  if v_true_markers <> 5 or v_false_markers <> 0 then
    raise exception 'VALIDATION_048_RUNTIME_SEGMENTATION_AUTHORITY_MARKER_INVALID true=% false=%',
      v_true_markers,v_false_markers;
  end if;

  if position('private.analytics_a09_funnel_segment_for_anchor_v1' in v_def)=0
     or position('private.cat_listing_visibility_watermark_v1()' in v_def)=0
     or position('private.analytics_behavior_watermark_v1()' in v_def)=0
     or position('private.order_metric_watermark_v1()' in v_def)=0
     or position('canonical_impression' in v_def)=0 then
    raise exception 'VALIDATION_048_SEGMENTATION_SEMANTICS_DRIFT';
  end if;

  if position('''runtimeSnapshotAuthority'',false' in replace(v_def,' ',''))=0
     or position('''snapshotPublicationAllowed'',false' in replace(v_def,' ',''))=0
     or position('''runtimeSnapshotAuthority'',true' in replace(v_def,' ',''))>0
     or position('''snapshotPublicationAllowed'',true' in replace(v_def,' ',''))>0 then
    raise exception 'VALIDATION_048_SNAPSHOT_PUBLICATION_BOUNDARY_INVALID';
  end if;

  if position('insert into' in lower(v_def))>0
     or position('update ' in lower(v_def))>0
     or position('delete from' in lower(v_def))>0
     or position('cron.' in lower(v_def))>0
     or position('append_analytics_metric_snapshot' in lower(v_def))>0 then
    raise exception 'VALIDATION_048_COMPUTE_ONLY_BOUNDARY_VIOLATED';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_compute::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_compute::oid)
     or has_function_privilege('anon',v_compute,'EXECUTE')
     or has_function_privilege('authenticated',v_compute,'EXECUTE')
     or not has_function_privilege('service_role',v_compute,'EXECUTE') then
    raise exception 'VALIDATION_048_EXECUTE_BOUNDARY_INVALID';
  end if;

  v_result := public.compute_analytics_canonical_funnel_segmented_v1(
    pg_catalog.clock_timestamp()-interval '5 minutes',
    pg_catalog.clock_timestamp(),
    'category',
    '__validation_048_nonexistent_category__',
    'BA'
  );

  if coalesce((v_result->>'runtimeSegmentationAuthority')::boolean,false)<>true
     or coalesce((v_result->>'snapshotPublicationAllowed')::boolean,true)<>false then
    raise exception 'VALIDATION_048_LIVE_MARKER_OR_PUBLICATION_BOUNDARY_INVALID result=%',v_result;
  end if;
end;
$validation$;

rollback;
