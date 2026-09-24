-- ANA-A07/A09: approval-aware activation successor candidate.
--
-- Repository-only candidate. Applying this migration requires a separate staging authorization.
-- Applying it defines owner-only functions only; it does not invoke activation or persist policy rows.

create or replace function private.validate_a09_funnel_activation_approval_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_activation_contract_id text,
  p_policy_set_id text,
  p_activation_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_boundaries jsonb;
  v_authorization_digest text;
  v_evidence_digest text;
  v_computed_evidence_digest text;
begin
  if p_expected_repository_head is null
     or p_expected_repository_head !~ '^[0-9a-f]{40}$'
     or p_expected_matrix_version is null
     or p_expected_matrix_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
     or p_authorization_command is null
     or pg_catalog.btrim(p_authorization_command)=''
     or p_activation_contract_id is distinct from 'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1'
     or p_policy_set_id is distinct from 'ana-a07-a09-funnel-v1-r1'
     or p_activation_approval_evidence is null
     or pg_catalog.jsonb_typeof(p_activation_approval_evidence) is distinct from 'object'
     or p_effective_from is null
     or p_effective_until is not null then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_activation_approval_evidence)) <> 18
     or not (
       p_activation_approval_evidence ?& array[
         'schemaId','activationApprovalId','approvalChannel','approvalActorRole',
         'authorizationDigestSha256','approvedAt','environment','repositoryHead',
         'matrixVersion','domain','activationContractId','policySetId',
         'approvalEnvelopeEvidenceDigestSha256','runtimeEnforcementEvidenceBlobSha',
         'effectiveFrom','effectiveUntil','boundaries','evidenceDigestSha256'
       ]::text[]
     ) then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (p_activation_approval_evidence->>'schemaId') is distinct from 'ana-a07-a09-funnel-freshness-policy-activation-invocation-evidence-v1'
     or (p_activation_approval_evidence->>'approvalChannel') is distinct from 'chat_explicit_authorization'
     or (p_activation_approval_evidence->>'approvalActorRole') is distinct from 'project_owner'
     or (p_activation_approval_evidence->>'environment') is distinct from 'staging'
     or (p_activation_approval_evidence->>'domain') is distinct from 'ANA-001'
     or (p_activation_approval_evidence->>'activationContractId') is distinct from p_activation_contract_id
     or (p_activation_approval_evidence->>'policySetId') is distinct from p_policy_set_id
     or (p_activation_approval_evidence->>'approvalEnvelopeEvidenceDigestSha256') is distinct from
       '9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5'
     or (p_activation_approval_evidence->>'runtimeEnforcementEvidenceBlobSha') is distinct from
       '118ca5f948f93ca09c7a7305d1b230880fa98630' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_BINDING_INVALID';
  end if;

  if (p_activation_approval_evidence->>'repositoryHead') is distinct from p_expected_repository_head
     or (p_activation_approval_evidence->>'matrixVersion') is distinct from p_expected_matrix_version then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_REPOSITORY_BINDING_MISMATCH';
  end if;

  v_authorization_digest:=p_activation_approval_evidence->>'authorizationDigestSha256';
  if v_authorization_digest is null
     or v_authorization_digest !~ '^[0-9a-f]{64}$'
     or v_authorization_digest is distinct from pg_catalog.encode(extensions.digest(p_authorization_command,'sha256'),'hex')
     or (p_activation_approval_evidence->>'activationApprovalId') is distinct from
       ('ana-a07-a09-funnel-activation-approval-r1-'||pg_catalog.substr(v_authorization_digest,1,12)) then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_AUTHORIZATION_MISMATCH';
  end if;

  if (p_activation_approval_evidence->>'approvedAt') is null
     or (p_activation_approval_evidence->>'approvedAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'
     or (p_activation_approval_evidence->>'effectiveFrom') is distinct from '2026-09-24T14:00:00Z'
     or pg_catalog.jsonb_typeof(p_activation_approval_evidence->'effectiveUntil') is distinct from 'null'
     or (p_activation_approval_evidence->>'effectiveFrom')::timestamptz is distinct from p_effective_from
     or p_effective_until is not null then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_WINDOW_MISMATCH';
  end if;

  v_boundaries:=p_activation_approval_evidence->'boundaries';
  if v_boundaries is null
     or pg_catalog.jsonb_typeof(v_boundaries) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_boundaries)) <> 9
     or (v_boundaries->'policyInsertAuthorized') is distinct from 'true'::jsonb
     or (v_boundaries->>'activationInvocationLimit') is distinct from '1'
     or (v_boundaries->'snapshotPublicationAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'runtimeProjectionAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'runtimeSnapshotAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'cronOrSchedulerAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'productionAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'pullRequestMergeAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries->'readyForReviewAuthorized') is distinct from 'false'::jsonb then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_BOUNDARY_INVALID';
  end if;

  v_evidence_digest:=p_activation_approval_evidence->>'evidenceDigestSha256';
  if v_evidence_digest is null or v_evidence_digest !~ '^[0-9a-f]{64}$' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_DIGEST_MISMATCH';
  end if;

  v_computed_evidence_digest:=pg_catalog.encode(
    extensions.digest(
      private.canonicalize_analytics_json_v1(p_activation_approval_evidence-'evidenceDigestSha256'),
      'sha256'
    ),
    'hex'
  );

  if v_evidence_digest is distinct from v_computed_evidence_digest then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_DIGEST_MISMATCH';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-a09-funnel-activation-approval-runtime-validator-v1',
    'valid',true,
    'repositoryHead',p_expected_repository_head,
    'matrixVersion',p_expected_matrix_version,
    'policySetId',p_policy_set_id,
    'activationApprovalId',p_activation_approval_evidence->>'activationApprovalId',
    'authorizationDigestSha256',v_authorization_digest,
    'evidenceDigestSha256',v_evidence_digest,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'policyInsertApproved',true,
    'activationInvocationLimit',1
  );
end;
$function$;

alter function private.validate_a09_funnel_activation_approval_v1(
  text,text,text,text,text,jsonb,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.validate_a09_funnel_activation_approval_v1(
  text,text,text,text,text,jsonb,timestamptz,timestamptz
) from public,anon,authenticated,service_role;

create or replace function private.activate_a09_funnel_policy_approved_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_activation_authorization_command text,
  p_activation_approval_evidence jsonb,
  p_original_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_original_validation jsonb;
  v_activation_validation jsonb;
  v_inserted integer:=0;
begin
  v_original_validation:=private.validate_analytics_a09_funnel_freshness_policy_approval_envelop(
    '0c45856b82b08fe5265c3e71b40c0d83fed871a7',
    '1.3.132',
    'authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null',
    'ana-a07-a09-funnel-v1-r1',
    p_original_approval_evidence,
    p_effective_from,
    p_effective_until
  );

  v_activation_validation:=private.validate_a09_funnel_activation_approval_v1(
    p_expected_repository_head,
    p_expected_matrix_version,
    p_activation_authorization_command,
    'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1',
    'ana-a07-a09-funnel-v1-r1',
    p_activation_approval_evidence,
    p_effective_from,
    p_effective_until
  );

  if exists (
    select 1
    from private.analytics_metric_freshness_policies_v1 f
    join (
      values
        ('funnel.search_ctr'),('funnel.impression_to_click'),('funnel.click_to_detail'),
        ('funnel.detail_to_budget_cta'),('funnel.budget_cta_to_quote_started'),
        ('funnel.quote_started_to_completed'),('funnel.quote_completed_to_submitted'),
        ('funnel.quote_submitted_to_order_requested')
    ) as expected(metric_key) on expected.metric_key=f.metric_key
    where f.metric_version='v1'
      and f.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
      and p_effective_from < coalesce(f.effective_until,'infinity'::timestamptz)
  ) then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP';
  end if;

  insert into private.analytics_metric_freshness_policies_v1(
    policy_id,metric_key,metric_version,max_lag_seconds,effective_from,effective_until
  )
  values
    ('ana-a07-a09-funnel-search-ctr-v1-r1','funnel.search_ctr','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-impression-click-v1-r1','funnel.impression_to_click','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-click-detail-v1-r1','funnel.click_to_detail','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-detail-budget-v1-r1','funnel.detail_to_budget_cta','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-budget-quote-start-v1-r1','funnel.budget_cta_to_quote_started','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-quote-start-complete-v1-r1','funnel.quote_started_to_completed','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-quote-complete-submit-v1-r1','funnel.quote_completed_to_submitted','v1',360,p_effective_from,p_effective_until),
    ('ana-a07-a09-funnel-submit-order-v1-r1','funnel.quote_submitted_to_order_requested','v1',360,p_effective_from,p_effective_until);

  get diagnostics v_inserted=row_count;
  if v_inserted<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_CARDINALITY';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-a09-funnel-policy-approved-activation-v1',
    'policySetId','ana-a07-a09-funnel-v1-r1',
    'originalApprovalValidated',true,
    'activationApprovalValidated',true,
    'originalApprovalValidation',v_original_validation,
    'activationApprovalValidation',v_activation_validation,
    'rowsInserted',v_inserted,
    'maxLagSeconds',360,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'publicationPolicyInserted',false,
    'snapshotWritten',false,
    'cronCreated',false
  );
end;
$function$;

alter function private.activate_a09_funnel_policy_approved_v1(
  text,text,text,jsonb,jsonb,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.activate_a09_funnel_policy_approved_v1(
  text,text,text,jsonb,jsonb,timestamptz,timestamptz
) from public,anon,authenticated,service_role;

comment on function private.validate_a09_funnel_activation_approval_v1(
  text,text,text,text,text,jsonb,timestamptz,timestamptz
) is 'ANA-A07/A09 owner-only validator for the single-use activation approval evidence.';

comment on function private.activate_a09_funnel_policy_approved_v1(
  text,text,text,jsonb,jsonb,timestamptz,timestamptz
) is 'ANA-A07/A09 owner-only approved activation successor candidate. It validates both approval layers before inserting exactly eight freshness policy rows; no publication policy, snapshot or cron is created.';
