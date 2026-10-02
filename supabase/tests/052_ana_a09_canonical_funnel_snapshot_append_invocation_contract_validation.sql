-- ANA-A09 validation 052: snapshot append invocation contract structural candidate.
-- Apply/run only under a separate staging-structure authorization.
-- This validation MUST NOT invoke the append successor and MUST NOT write snapshots.

begin;

do $validation$
declare
  v_validator regprocedure:=pg_catalog.to_regprocedure(
    'private.validate_a09_snapshot_append_invocation_authorization_v1(text,text,text,timestamp with time zone,timestamp with time zone,jsonb)'
  );
  v_invoker regprocedure:=pg_catalog.to_regprocedure(
    'private.invoke_a09_canonical_funnel_snapshot_append_v1(timestamp with time zone,timestamp with time zone,text,text,text,jsonb)'
  );
  v_validator_def text;
  v_invoker_def text;
  v_before bigint;
  v_after bigint;
begin
  if v_validator is null then
    raise exception 'VALIDATION_052_A09_SNAPSHOT_APPEND_AUTH_VALIDATOR_MISSING';
  end if;
  if v_invoker is null then
    raise exception 'VALIDATION_052_A09_SNAPSHOT_APPEND_INVOKER_MISSING';
  end if;

  if pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_validator::oid))<>'postgres'
     or pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_invoker::oid))<>'postgres'
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_validator::oid)
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_invoker::oid)
     or pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_invoker,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_invoker,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_invoker,'EXECUTE') then
    raise exception 'VALIDATION_052_PRIVILEGE_BOUNDARY_INVALID';
  end if;

  select pg_catalog.pg_get_functiondef(v_validator::oid) into v_validator_def;
  select pg_catalog.pg_get_functiondef(v_invoker::oid) into v_invoker_def;

  if position('ana-a09-canonical-funnel-snapshot-append-invocation-authorization-evidence-v1' in v_validator_def)=0
     or position('ddd29090dde2a3b131d8cc1871b3eb82843c130d' in v_validator_def)=0
     or position('64da0e7aec1ea15c9a58656ab1b0a63c8b7065a5' in v_validator_def)=0
     or position('3bc753fe72a9a031ca43664ac28c8a659920c7ac' in v_validator_def)=0
     or position('maxSnapshotWrites' in v_validator_def)=0 then
    raise exception 'VALIDATION_052_AUTHORIZATION_BINDINGS_DRIFT';
  end if;

  if position('public.compute_analytics_canonical_funnel_snapshot_payloads_v1' in v_invoker_def)=0
     or position('public.append_analytics_metric_snapshot_v1' in v_invoker_def)=0
     or position('v_payload_count<>8' in replace(v_invoker_def,' ',''))=0
     or position('v_processed>=8' in replace(v_invoker_def,' ',''))=0 then
    raise exception 'VALIDATION_052_INVOKER_CONTRACT_DRIFT';
  end if;

  if position('cron.' in lower(v_invoker_def))>0
     or position('snapshotpublicationauthority'',true' in replace(lower(v_invoker_def),' ',''))>0
     or position('runtimesnapshotauthority'',true' in replace(lower(v_invoker_def),' ',''))>0 then
    raise exception 'VALIDATION_052_PROHIBITED_AUTHORITY_DRIFT';
  end if;

  select count(*) into v_before from private.analytics_metric_snapshots_v1;

  -- Structural-only validation intentionally does not call either the validator or invoker.
  perform pg_catalog.length(v_validator_def)+pg_catalog.length(v_invoker_def);

  select count(*) into v_after from private.analytics_metric_snapshots_v1;
  if v_after<>v_before then
    raise exception 'VALIDATION_052_SNAPSHOT_MUTATION_DETECTED before=% after=%',v_before,v_after;
  end if;
end;
$validation$;

rollback;
