-- ANA-A09 validation 051: canonical funnel snapshot payload adapter candidate.
-- Execute only after a separate staging authorization applies migration 20260927230000.
-- Read-only assertions inside a rollback-only transaction.

begin;

do $validation$
declare
  v_adapter regprocedure := to_regprocedure(
    'public.compute_analytics_canonical_funnel_snapshot_payloads_v1(timestamptz,timestamptz)'
  );
  v_def text;
  v_before bigint;
  v_after bigint;
  v_result jsonb;
  v_payload jsonb;
  v_payload_count integer;
begin
  if v_adapter is null then
    raise exception 'VALIDATION_051_A09_SNAPSHOT_PAYLOAD_ADAPTER_MISSING';
  end if;

  select pg_get_functiondef(v_adapter::oid) into v_def;

  if position('public.compute_analytics_canonical_funnel_v1' in v_def)=0
     or position('private.analytics_metric_freshness_policies_v1' in v_def)=0
     or position('projectionState' in v_def)=0
     or position('coverageState' in v_def)=0
     or position('reconciliationState' in v_def)=0
     or position('sourceFingerprint' in v_def)=0
     or position('projectionFingerprint' in v_def)=0 then
    raise exception 'VALIDATION_051_ADAPTER_SEMANTICS_DRIFT';
  end if;

  if position('append_analytics_metric_snapshot_v1(' in lower(v_def))>0
     or position('insert into' in lower(v_def))>0
     or position('update ' in lower(v_def))>0
     or position('delete from' in lower(v_def))>0
     or position('cron.' in lower(v_def))>0 then
    raise exception 'VALIDATION_051_COMPUTE_ONLY_BOUNDARY_VIOLATED';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_adapter::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_adapter::oid)
     or has_function_privilege('anon',v_adapter,'EXECUTE')
     or has_function_privilege('authenticated',v_adapter,'EXECUTE')
     or not has_function_privilege('service_role',v_adapter,'EXECUTE') then
    raise exception 'VALIDATION_051_EXECUTE_BOUNDARY_INVALID';
  end if;

  select count(*) into v_before from private.analytics_metric_snapshots_v1;

  v_result := public.compute_analytics_canonical_funnel_snapshot_payloads_v1(
    pg_catalog.clock_timestamp()-interval '5 minutes',
    pg_catalog.clock_timestamp()-interval '1 minute'
  );

  select count(*) into v_after from private.analytics_metric_snapshots_v1;

  if v_after <> v_before then
    raise exception 'VALIDATION_051_SNAPSHOT_MUTATION_DETECTED before=% after=%',v_before,v_after;
  end if;

  if coalesce(v_result ->> 'state','') <> 'payloads_computed_candidate'
     or coalesce((v_result ->> 'appendInvoked')::boolean,true) <> false
     or coalesce((v_result ->> 'runtimeSnapshotAuthority')::boolean,true) <> false
     or coalesce((v_result ->> 'snapshotPublicationAllowed')::boolean,true) <> false
     or coalesce((v_result ->> 'schedulerAuthority')::boolean,true) <> false then
    raise exception 'VALIDATION_051_AUTHORITY_BOUNDARY_INVALID result=%',v_result;
  end if;

  v_payload_count := coalesce((v_result ->> 'payloadCount')::integer,0);
  if v_payload_count <> 8
     or pg_catalog.jsonb_array_length(coalesce(v_result -> 'payloads','[]'::jsonb)) <> 8
     or pg_catalog.jsonb_array_length(coalesce(v_result -> 'policyBindings','[]'::jsonb)) <> 8 then
    raise exception 'VALIDATION_051_PAYLOAD_CARDINALITY_INVALID result=%',v_result;
  end if;

  for v_payload in
    select value from pg_catalog.jsonb_array_elements(v_result -> 'payloads')
  loop
    if coalesce(v_payload ->> 'metricKey','') !~ '^funnel[.]'
       or coalesce(v_payload ->> 'metricVersion','') <> 'v1'
       or coalesce(v_payload ->> 'projectionState','') not in ('authoritative','stale')
       or coalesce(v_payload ->> 'coverageState','') <> 'complete'
       or coalesce(v_payload ->> 'reconciliationState','') <> 'not_applicable'
       or coalesce(v_payload ->> 'sourceFingerprint','') !~ '^[0-9a-f]{64}$'
       or coalesce(v_payload ->> 'projectionFingerprint','') !~ '^[0-9a-f]{64}$'
       or v_payload -> 'dimensions' <> '{}'::jsonb
       or nullif(v_payload ->> 'windowStart','') is null
       or nullif(v_payload ->> 'windowEnd','') is null
       or nullif(v_payload ->> 'dataThrough','') is null
       or nullif(v_payload ->> 'computedAt','') is null then
      raise exception 'VALIDATION_051_PAYLOAD_SHAPE_INVALID payload=%',v_payload;
    end if;
  end loop;
end;
$validation$;

rollback;
