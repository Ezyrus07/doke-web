-- ANA-A09 validation 053: runtime execution of authorization validator only.
-- This test is non-mutating and rollback-only.
-- It MUST NOT call private.invoke_a09_canonical_funnel_snapshot_append_v1
-- and MUST NOT call public.append_analytics_metric_snapshot_v1.

begin;

do $validation$
declare
  v_validator regprocedure:=pg_catalog.to_regprocedure(
    'private.validate_a09_snapshot_append_invocation_authorization_v1(text,text,text,timestamp with time zone,timestamp with time zone,jsonb)'
  );
  v_validator_def text;
  v_command text:='validation-053-nonmutating-runtime-validator';
  v_repository_head text:='1111111111111111111111111111111111111111';
  v_window_start timestamptz:='2026-09-28T15:55:00Z'::timestamptz;
  v_window_end timestamptz:='2026-09-28T16:00:00Z'::timestamptz;
  v_authorization_digest text;
  v_evidence_digest text;
  v_evidence jsonb;
  v_result jsonb;
  v_before bigint;
  v_after bigint;
begin
  if v_validator is null then
    raise exception 'VALIDATION_053_A09_SNAPSHOT_APPEND_AUTH_VALIDATOR_MISSING';
  end if;

  select pg_catalog.pg_get_functiondef(v_validator::oid) into v_validator_def;

  if position('jsonb_object_length' in v_validator_def)>0
     or position('jsonb_object_keys' in v_validator_def)=0
     or position('v_evidence_key_count' in v_validator_def)=0
     or position('v_boundary_key_count' in v_validator_def)=0 then
    raise exception 'VALIDATION_053_JSONB_CARDINALITY_REMEDIATION_DRIFT';
  end if;

  if pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE') then
    raise exception 'VALIDATION_053_VALIDATOR_PRIVILEGE_BOUNDARY_INVALID';
  end if;

  select count(*) into v_before from private.analytics_metric_snapshots_v1;

  v_authorization_digest:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_command,'UTF8'),'sha256'),
    'hex'
  );

  v_evidence:=pg_catalog.jsonb_build_object(
    'schemaId','ana-a09-canonical-funnel-snapshot-append-invocation-authorization-evidence-v1',
    'appendInvocationAuthorizationId','validation-053-runtime-validator-only',
    'approvalChannel','chat_explicit_authorization',
    'approvalActorRole','project_owner',
    'authorizationDigestSha256',v_authorization_digest,
    'approvedAt','2026-09-29T00:00:00Z',
    'environment','staging',
    'repositoryHead',v_repository_head,
    'matrixVersion','1.3.132',
    'domain','ANA-001',
    'appendInvocationContractId','ana-a09-canonical-funnel-snapshot-append-invocation-contract-candidate-v1',
    'payloadAdapterContractId','ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1',
    'payloadAdapterStagingEvidenceBlobSha','ddd29090dde2a3b131d8cc1871b3eb82843c130d',
    'a04SnapshotRuntimeBlobSha','64da0e7aec1ea15c9a58656ab1b0a63c8b7065a5',
    'a05ReconciliationRuntimeBlobSha','3bc753fe72a9a031ca43664ac28c8a659920c7ac',
    'windowStart','2026-09-28T15:55:00Z',
    'windowEnd','2026-09-28T16:00:00Z',
    'boundaries',pg_catalog.jsonb_build_object(
      'appendInvocationAuthorized',true,
      'snapshotMutationAuthorized',true,
      'maxSnapshotWrites',8,
      'runtimeSnapshotAuthorityAuthorized',false,
      'snapshotPublicationAuthorityAuthorized',false,
      'schedulerAuthorized',false,
      'productionAuthorized',false,
      'pullRequestMergeAuthorized',false,
      'readyForReviewAuthorized',false
    )
  );

  v_evidence_digest:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_evidence::text,'UTF8'),'sha256'),
    'hex'
  );
  v_evidence:=v_evidence || pg_catalog.jsonb_build_object(
    'evidenceDigestSha256',v_evidence_digest
  );

  v_result:=private.validate_a09_snapshot_append_invocation_authorization_v1(
    v_repository_head,
    '1.3.132',
    v_command,
    v_window_start,
    v_window_end,
    v_evidence
  );

  if coalesce((v_result->>'valid')::boolean,false)<>true
     or coalesce((v_result->>'appendInvocationAuthorized')::boolean,false)<>true
     or coalesce((v_result->>'snapshotMutationAuthorized')::boolean,false)<>true
     or coalesce((v_result->>'maxSnapshotWrites')::integer,0)<>8
     or coalesce((v_result->>'runtimeSnapshotAuthorityAuthorized')::boolean,true)<>false
     or coalesce((v_result->>'snapshotPublicationAuthorityAuthorized')::boolean,true)<>false
     or coalesce((v_result->>'schedulerAuthorized')::boolean,true)<>false then
    raise exception 'VALIDATION_053_VALIDATOR_RESULT_INVALID result=%',v_result;
  end if;

  select count(*) into v_after from private.analytics_metric_snapshots_v1;
  if v_after<>v_before then
    raise exception 'VALIDATION_053_SNAPSHOT_MUTATION_DETECTED before=% after=%',v_before,v_after;
  end if;
end;
$validation$;

rollback;
