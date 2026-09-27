-- ANA-A08 validation 049: retention cohort projector candidate.
-- Run only after separate staging authorization applies migration 20260927010000.
-- Read-only assertions inside a rollback-only transaction.

begin;

do $validation$
declare
  v_compute regprocedure := to_regprocedure(
    'public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text)'
  );
  v_def text;
  v_request jsonb;
  v_completion jsonb;
begin
  if v_compute is null then
    raise exception 'VALIDATION_049_RETENTION_COMPUTE_MISSING';
  end if;

  select pg_get_functiondef(v_compute::oid) into v_def;

  if position('private.order_metric_watermark_v1()' in v_def)=0
     or position('private.order_metric_events' in v_def)=0
     or position('serviceCategory' in v_def)=0
     or position('serviceState' in v_def)=0
     or position('e.created_at <= v_effective_data_through' in v_def)=0
     or position('e.occurred_at <= v_effective_data_through' in v_def)=0
     or position('e.order_id <> m.first_order_id' in v_def)=0 then
    raise exception 'VALIDATION_049_RETENTION_SEMANTICS_DRIFT';
  end if;

  if position('public.services' in lower(v_def))>0
     or position('public.service_versions' in lower(v_def))>0
     or position('public.orders' in lower(v_def))>0
     or position('insert into' in lower(v_def))>0
     or position('update ' in lower(v_def))>0
     or position('delete from' in lower(v_def))>0
     or position('append_analytics_metric_snapshot' in lower(v_def))>0
     or position('cron.' in lower(v_def))>0 then
    raise exception 'VALIDATION_049_COMPUTE_ONLY_OR_IMMUTABLE_DIMENSION_BOUNDARY_VIOLATED';
  end if;

  if position('''runtimeProjectionAuthority'',false' in replace(v_def,' ',''))=0
     or position('''runtimeSnapshotAuthority'',false' in replace(v_def,' ',''))=0
     or position('''snapshotPublicationAllowed'',false' in replace(v_def,' ',''))=0
     or position('''schedulerAuthority'',false' in replace(v_def,' ',''))=0 then
    raise exception 'VALIDATION_049_AUTHORITY_MARKERS_INVALID';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_compute::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_compute::oid)
     or has_function_privilege('anon',v_compute,'EXECUTE')
     or has_function_privilege('authenticated',v_compute,'EXECUTE')
     or not has_function_privilege('service_role',v_compute,'EXECUTE') then
    raise exception 'VALIDATION_049_EXECUTE_BOUNDARY_INVALID';
  end if;

  v_request := public.compute_analytics_retention_cohort_v1(
    'retention.repeat_request_30d',
    pg_catalog.clock_timestamp(),
    '__validation_049_nonexistent_category__',
    'BA'
  );
  v_completion := public.compute_analytics_retention_cohort_v1(
    'retention.repeat_completion_90d',
    pg_catalog.clock_timestamp(),
    '__validation_049_nonexistent_category__',
    'BA'
  );

  if coalesce(v_request ->> 'metricKey','') <> 'retention.repeat_request_30d'
     or coalesce(v_completion ->> 'metricKey','') <> 'retention.repeat_completion_90d'
     or coalesce((v_request ->> 'runtimeProjectionAuthority')::boolean,true) <> false
     or coalesce((v_request ->> 'runtimeSnapshotAuthority')::boolean,true) <> false
     or coalesce((v_request ->> 'snapshotPublicationAllowed')::boolean,true) <> false
     or coalesce((v_request ->> 'schedulerAuthority')::boolean,true) <> false
     or coalesce((v_completion ->> 'runtimeProjectionAuthority')::boolean,true) <> false
     or coalesce((v_completion ->> 'snapshotPublicationAllowed')::boolean,true) <> false then
    raise exception 'VALIDATION_049_RUNTIME_BOUNDARY_INVALID request=% completion=%',
      v_request,v_completion;
  end if;
end;
$validation$;

rollback;
