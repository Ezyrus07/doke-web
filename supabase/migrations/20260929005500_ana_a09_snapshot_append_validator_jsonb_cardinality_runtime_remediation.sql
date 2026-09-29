-- ANA-A09 forward-only runtime remediation for validator JSONB cardinality.
-- Historical migration 20260928134000 remains untouched.
-- This migration only replaces the private authorization validator.
-- It does not grant EXECUTE, invoke append, mutate snapshots, create a scheduler,
-- publish runtime snapshot authority, touch production, merge, or mark Ready.

create or replace function private.validate_a09_snapshot_append_invocation_authorization_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_authorization_evidence jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_evidence jsonb := coalesce(p_authorization_evidence,'{}'::jsonb);
  v_boundaries jsonb := coalesce(v_evidence -> 'boundaries','{}'::jsonb);
  v_evidence_key_count integer;
  v_boundary_key_count integer;
  v_authorization_digest text;
  v_computed_authorization_digest text;
  v_evidence_digest text;
  v_computed_evidence_digest text;
begin
  if p_expected_repository_head !~ '^[0-9a-f]{40}$'
     or p_expected_matrix_version is null
     or pg_catalog.btrim(p_expected_matrix_version)=''
     or p_authorization_command is null
     or pg_catalog.btrim(p_authorization_command)=''
     or p_window_start is null
     or p_window_end is null
     or p_window_end <= p_window_start then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_INPUT_INVALID';
  end if;

  if pg_catalog.jsonb_typeof(v_evidence)<>'object'
     or pg_catalog.jsonb_typeof(v_boundaries)<>'object' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_SHAPE_INVALID';
  end if;

  select count(*)::integer
  into v_evidence_key_count
  from pg_catalog.jsonb_object_keys(v_evidence);

  select count(*)::integer
  into v_boundary_key_count
  from pg_catalog.jsonb_object_keys(v_boundaries);

  if v_evidence_key_count<>19 or v_boundary_key_count<>9 then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_SHAPE_INVALID';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_evidence) as k(key)
    where k.key not in (
      'schemaId','appendInvocationAuthorizationId','approvalChannel','approvalActorRole',
      'authorizationDigestSha256','approvedAt','environment','repositoryHead','matrixVersion',
      'domain','appendInvocationContractId','payloadAdapterContractId',
      'payloadAdapterStagingEvidenceBlobSha','a04SnapshotRuntimeBlobSha','a05ReconciliationRuntimeBlobSha',
      'windowStart','windowEnd','boundaries','evidenceDigestSha256'
    )
  ) then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_UNKNOWN_FIELD';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(v_boundaries) as k(key)
    where k.key not in (
      'appendInvocationAuthorized','snapshotMutationAuthorized','maxSnapshotWrites',
      'runtimeSnapshotAuthorityAuthorized','snapshotPublicationAuthorityAuthorized',
      'schedulerAuthorized','productionAuthorized','pullRequestMergeAuthorized','readyForReviewAuthorized'
    )
  ) then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_BOUNDARY_UNKNOWN_FIELD';
  end if;

  if v_evidence ->> 'schemaId' <> 'ana-a09-canonical-funnel-snapshot-append-invocation-authorization-evidence-v1'
     or v_evidence ->> 'approvalChannel' <> 'chat_explicit_authorization'
     or v_evidence ->> 'approvalActorRole' <> 'project_owner'
     or v_evidence ->> 'environment' <> 'staging'
     or v_evidence ->> 'repositoryHead' <> p_expected_repository_head
     or v_evidence ->> 'matrixVersion' <> p_expected_matrix_version
     or v_evidence ->> 'domain' <> 'ANA-001'
     or v_evidence ->> 'appendInvocationContractId' <> 'ana-a09-canonical-funnel-snapshot-append-invocation-contract-candidate-v1'
     or v_evidence ->> 'payloadAdapterContractId' <> 'ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1'
     or v_evidence ->> 'payloadAdapterStagingEvidenceBlobSha' <> 'ddd29090dde2a3b131d8cc1871b3eb82843c130d'
     or v_evidence ->> 'a04SnapshotRuntimeBlobSha' <> '64da0e7aec1ea15c9a58656ab1b0a63c8b7065a5'
     or v_evidence ->> 'a05ReconciliationRuntimeBlobSha' <> '3bc753fe72a9a031ca43664ac28c8a659920c7ac'
     or (v_evidence ->> 'windowStart')::timestamptz is distinct from p_window_start
     or (v_evidence ->> 'windowEnd')::timestamptz is distinct from p_window_end then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_BINDING_MISMATCH';
  end if;

  if (v_boundaries -> 'appendInvocationAuthorized') is distinct from 'true'::jsonb
     or (v_boundaries -> 'snapshotMutationAuthorized') is distinct from 'true'::jsonb
     or (v_boundaries ->> 'maxSnapshotWrites') is distinct from '8'
     or (v_boundaries -> 'runtimeSnapshotAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'snapshotPublicationAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'schedulerAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'productionAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'pullRequestMergeAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'readyForReviewAuthorized') is distinct from 'false'::jsonb then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_BOUNDARY_INVALID';
  end if;

  v_authorization_digest:=pg_catalog.lower(coalesce(v_evidence ->> 'authorizationDigestSha256',''));
  v_computed_authorization_digest:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(p_authorization_command,'UTF8'),'sha256'),'hex'
  );
  if v_authorization_digest !~ '^[0-9a-f]{64}$'
     or v_authorization_digest is distinct from v_computed_authorization_digest then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_AUTH_DIGEST_MISMATCH';
  end if;

  v_evidence_digest:=pg_catalog.lower(coalesce(v_evidence ->> 'evidenceDigestSha256',''));
  v_computed_evidence_digest:=pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to((v_evidence - 'evidenceDigestSha256')::text,'UTF8'),
      'sha256'
    ),
    'hex'
  );
  if v_evidence_digest !~ '^[0-9a-f]{64}$'
     or v_evidence_digest is distinct from v_computed_evidence_digest then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_SNAPSHOT_APPEND_EVIDENCE_DIGEST_MISMATCH';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-canonical-funnel-snapshot-append-invocation-authorization-runtime-validator-v1',
    'valid',true,
    'repositoryHead',p_expected_repository_head,
    'matrixVersion',p_expected_matrix_version,
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'authorizationDigestSha256',v_authorization_digest,
    'evidenceDigestSha256',v_evidence_digest,
    'appendInvocationAuthorized',true,
    'snapshotMutationAuthorized',true,
    'maxSnapshotWrites',8,
    'runtimeSnapshotAuthorityAuthorized',false,
    'snapshotPublicationAuthorityAuthorized',false,
    'schedulerAuthorized',false
  );
end;
$function$;

alter function private.validate_a09_snapshot_append_invocation_authorization_v1(
  text,text,text,timestamptz,timestamptz,jsonb
) owner to postgres;

revoke all privileges on function private.validate_a09_snapshot_append_invocation_authorization_v1(
  text,text,text,timestamptz,timestamptz,jsonb
) from public,anon,authenticated,service_role;

comment on function private.validate_a09_snapshot_append_invocation_authorization_v1(
  text,text,text,timestamptz,timestamptz,jsonb
) is 'ANA-A09 fail-closed validator with JSONB cardinality counted through jsonb_object_keys; forward remediation for the unavailable jsonb_object_length call.';
