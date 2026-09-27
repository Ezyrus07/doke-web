-- ANA-A08 validation 050: live retention runtimeProjectionAuthority marker alignment.
-- Execute only after a separate staging authorization applies migration 20260927021000.
-- Read-only assertions inside a rollback-only transaction.

begin;

do $validation$
declare
  v_compute regprocedure := to_regprocedure(
    'public.compute_analytics_retention_cohort_v1(text,timestamptz,text,text)'
  );
  v_def text;
  v_true_markers integer;
  v_false_markers integer;
  v_request jsonb;
  v_completion jsonb;
begin
  if v_compute is null then
    raise exception 'VALIDATION_050_RETENTION_COMPUTE_MISSING';
  end if;

  select pg_get_functiondef(v_compute::oid) into v_def;

  select count(*) into v_true_markers
  from regexp_matches(v_def, '''runtimeProjectionAuthority''[[:space:]]*,[[:space:]]*true', 'g');

  select count(*) into v_false_markers
  from regexp_matches(v_def, '''runtimeProjectionAuthority''[[:space:]]*,[[:space:]]*false', 'g');

  if v_true_markers <> 2 or v_false_markers <> 0 then
    raise exception 'VALIDATION_050_RUNTIME_PROJECTION_AUTHORITY_MARKER_INVALID true=% false=%',
      v_true_markers,v_false_markers;
  end if;

  if position('''runtimeSnapshotAuthority'',false' in replace(v_def,' ',''))=0
     or position('''snapshotPublicationAllowed'',false' in replace(v_def,' ',''))=0
     or position('''schedulerAuthority'',false' in replace(v_def,' ',''))=0
     or position('''runtimeSnapshotAuthority'',true' in replace(v_def,' ',''))>0
     or position('''snapshotPublicationAllowed'',true' in replace(v_def,' ',''))>0
     or position('''schedulerAuthority'',true' in replace(v_def,' ',''))>0 then
    raise exception 'VALIDATION_050_SECONDARY_AUTHORITY_BOUNDARY_INVALID';
  end if;

  if position('private.order_metric_watermark_v1()' in v_def)=0
     or position('private.order_metric_events' in v_def)=0
     or position('serviceCategory' in v_def)=0
     or position('serviceState' in v_def)=0
     or position('e.created_at <= v_effective_data_through' in v_def)=0
     or position('e.occurred_at <= v_effective_data_through' in v_def)=0
     or position('e.order_id <> m.first_order_id' in v_def)=0 then
    raise exception 'VALIDATION_050_RETENTION_SEMANTICS_DRIFT';
  end if;

  if position('public.services' in lower(v_def))>0
     or position('public.service_versions' in lower(v_def))>0
     or position('public.orders' in lower(v_def))>0
     or position('insert into' in lower(v_def))>0
     or position('update ' in lower(v_def))>0
     or position('delete from' in lower(v_def))>0
     or position('append_analytics_metric_snapshot' in lower(v_def))>0
     or position('cron.' in lower(v_def))>0 then
    raise exception 'VALIDATION_050_COMPUTE_ONLY_BOUNDARY_VIOLATED';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_compute::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_compute::oid)
     or has_function_privilege('anon',v_compute,'EXECUTE')
     or has_function_privilege('authenticated',v_compute,'EXECUTE')
     or not has_function_privilege('service_role',v_compute,'EXECUTE') then
    raise exception 'VALIDATION_050_EXECUTE_BOUNDARY_INVALID';
  end if;

  v_request := public.compute_analytics_retention_cohort_v1(
    'retention.repeat_request_30d',
    pg_catalog.clock_timestamp(),
    '__validation_050_nonexistent_category__',
    'BA'
  );
  v_completion := public.compute_analytics_retention_cohort_v1(
    'retention.repeat_completion_90d',
    pg_catalog.clock_timestamp(),
    '__validation_050_nonexistent_category__',
    'BA'
  );

  if coalesce((v_request ->> 'runtimeProjectionAuthority')::boolean,false) <> true
     or coalesce((v_completion ->> 'runtimeProjectionAuthority')::boolean,false) <> true
     or coalesce((v_request ->> 'runtimeSnapshotAuthority')::boolean,true) <> false
     or coalesce((v_request ->> 'snapshotPublicationAllowed')::boolean,true) <> false
     or coalesce((v_request ->> 'schedulerAuthority')::boolean,true) <> false
     or coalesce((v_completion ->> 'runtimeSnapshotAuthority')::boolean,true) <> false
     or coalesce((v_completion ->> 'snapshotPublicationAllowed')::boolean,true) <> false
     or coalesce((v_completion ->> 'schedulerAuthority')::boolean,true) <> false then
    raise exception 'VALIDATION_050_RUNTIME_BOUNDARY_INVALID request=% completion=%',
      v_request,v_completion;
  end if;
end;
$validation$;

rollback;
