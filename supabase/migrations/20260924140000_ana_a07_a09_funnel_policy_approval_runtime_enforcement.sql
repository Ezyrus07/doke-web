-- ANA-A07/A09: approval-envelope runtime-enforcement candidate for funnel freshness policy.
--
-- Repository-only candidate. Do not apply without separate staging authorization.
-- This migration inserts no freshness policy, writes no snapshot, creates no scheduler and
-- grants no browser/service_role execution authority. When applied it validates the exact
-- repository approval envelope and tombstones the legacy activation path so no policy row
-- can be persisted without a future separately approved activation successor.

create or replace function private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_policy_set_id text,
  p_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_parameters jsonb;
  v_policies jsonb;
  v_boundaries jsonb;
  v_authorization_digest text;
  v_evidence_digest text;
  v_computed_evidence_digest text;
  v_approved_at timestamptz;
  v_evidence_effective_from timestamptz;
  v_expected_policies jsonb;
begin
  if p_expected_repository_head is null
     or p_expected_repository_head !~ '^[0-9a-f]{40}$'
     or p_expected_matrix_version is null
     or p_expected_matrix_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
     or p_authorization_command is null
     or pg_catalog.btrim(p_authorization_command) = ''
     or p_policy_set_id is distinct from 'ana-a07-a09-funnel-v1-r1'
     or p_approval_evidence is null
     or pg_catalog.jsonb_typeof(p_approval_evidence) is distinct from 'object'
     or p_effective_from is null
     or p_effective_until is not null then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_approval_evidence)) <> 18
     or not (
       p_approval_evidence ?& array[
         'schemaId','approvalId','approvalChannel','approvalActorRole',
         'authorizationDigestSha256','approvedAt','environment','repositoryHead',
         'matrixVersion','domain','policySetId','revision','metricVersion','metricCount',
         'approvedParameters','policies','boundaries','evidenceDigestSha256'
       ]::text[]
     ) then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (p_approval_evidence ->> 'schemaId') is distinct from
       'ana-a07-a09-funnel-freshness-policy-activation-approval-evidence-v1'
     or (p_approval_evidence ->> 'approvalChannel') is distinct from 'chat_explicit_authorization'
     or (p_approval_evidence ->> 'approvalActorRole') is distinct from 'project_owner'
     or (p_approval_evidence ->> 'environment') is distinct from 'staging'
     or (p_approval_evidence ->> 'domain') is distinct from 'ANA-001'
     or (p_approval_evidence ->> 'policySetId') is distinct from p_policy_set_id
     or (p_approval_evidence ->> 'revision') is distinct from '1'
     or (p_approval_evidence ->> 'metricVersion') is distinct from 'v1'
     or (p_approval_evidence ->> 'metricCount') is distinct from '8' then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (p_approval_evidence ->> 'repositoryHead') is distinct from p_expected_repository_head
     or (p_approval_evidence ->> 'matrixVersion') is distinct from p_expected_matrix_version then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BINDING_MISMATCH';
  end if;

  v_authorization_digest := p_approval_evidence ->> 'authorizationDigestSha256';
  if v_authorization_digest is null
     or v_authorization_digest !~ '^[0-9a-f]{64}$'
     or v_authorization_digest is distinct from
       pg_catalog.encode(extensions.digest(p_authorization_command,'sha256'),'hex')
     or (p_approval_evidence ->> 'approvalId') is distinct from
       ('ana-a07-a09-funnel-approval-r1-' || pg_catalog.substr(v_authorization_digest,1,12)) then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_AUTHORIZATION_MISMATCH';
  end if;

  if (p_approval_evidence ->> 'approvedAt') is null
     or (p_approval_evidence ->> 'approvedAt') !~
       '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$' then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_EVIDENCE_INVALID';
  end if;

  begin
    v_approved_at := (p_approval_evidence ->> 'approvedAt')::timestamptz;
  exception when others then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_EVIDENCE_INVALID';
  end;

  v_parameters := p_approval_evidence -> 'approvedParameters';
  if v_parameters is null
     or pg_catalog.jsonb_typeof(v_parameters) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_parameters)) <> 5
     or not (
       v_parameters ?& array[
         'windowReferenceSeconds','projectionDelayBudgetSeconds',
         'maxLagSeconds','effectiveFrom','effectiveUntil'
       ]::text[]
     )
     or pg_catalog.jsonb_typeof(v_parameters -> 'windowReferenceSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'projectionDelayBudgetSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'maxLagSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'effectiveFrom') is distinct from 'string'
     or pg_catalog.jsonb_typeof(v_parameters -> 'effectiveUntil') is distinct from 'null'
     or (v_parameters ->> 'windowReferenceSeconds') is distinct from '300'
     or (v_parameters ->> 'projectionDelayBudgetSeconds') is distinct from '60'
     or (v_parameters ->> 'maxLagSeconds') is distinct from '360' then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_VALUE_MISMATCH';
  end if;

  begin
    v_evidence_effective_from := (v_parameters ->> 'effectiveFrom')::timestamptz;
  exception when others then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_VALUE_MISMATCH';
  end;

  if v_evidence_effective_from is distinct from p_effective_from
     or v_evidence_effective_from < v_approved_at then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_VALUE_MISMATCH';
  end if;

  v_expected_policies := pg_catalog.jsonb_build_array(
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-search-ctr-v1-r1','metricKey','funnel.search_ctr','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-impression-click-v1-r1','metricKey','funnel.impression_to_click','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-click-detail-v1-r1','metricKey','funnel.click_to_detail','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-detail-budget-v1-r1','metricKey','funnel.detail_to_budget_cta','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-budget-quote-start-v1-r1','metricKey','funnel.budget_cta_to_quote_started','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-quote-start-complete-v1-r1','metricKey','funnel.quote_started_to_completed','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-quote-complete-submit-v1-r1','metricKey','funnel.quote_completed_to_submitted','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null),
    pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-submit-order-v1-r1','metricKey','funnel.quote_submitted_to_order_requested','metricVersion','v1','sourceDomains',pg_catalog.jsonb_build_array('ANA-001','ORD-001'),'maxLagSeconds',360,'effectiveFrom',v_parameters ->> 'effectiveFrom','effectiveUntil',null)
  );

  v_policies := p_approval_evidence -> 'policies';
  if v_policies is null
     or pg_catalog.jsonb_typeof(v_policies) is distinct from 'array'
     or pg_catalog.jsonb_array_length(v_policies) <> 8
     or v_policies is distinct from v_expected_policies then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_POLICY_SET_MISMATCH';
  end if;

  v_boundaries := p_approval_evidence -> 'boundaries';
  if v_boundaries is null
     or pg_catalog.jsonb_typeof(v_boundaries) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_boundaries)) <> 10
     or (v_boundaries -> 'envelopeRepositoryWriteAuthorized') is distinct from 'true'::jsonb
     or (v_boundaries -> 'policyActivationInvocationAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'policyPersistenceAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'snapshotPublicationAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'runtimeProjectionAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'runtimeSnapshotAuthorityAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'cronOrSchedulerAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'productionAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'pullRequestMergeAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'readyForReviewAuthorized') is distinct from 'false'::jsonb then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BOUNDARY_INVALID';
  end if;

  v_evidence_digest := p_approval_evidence ->> 'evidenceDigestSha256';
  if v_evidence_digest is null
     or v_evidence_digest !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_DIGEST_MISMATCH';
  end if;

  v_computed_evidence_digest :=
    pg_catalog.encode(
      extensions.digest(
        private.canonicalize_analytics_json_v1(
          p_approval_evidence - 'evidenceDigestSha256'
        ),
        'sha256'
      ),
      'hex'
    );

  if v_evidence_digest is distinct from v_computed_evidence_digest then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_DIGEST_MISMATCH';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-a09-funnel-freshness-policy-approval-runtime-enforcement-v1',
    'valid',true,
    'repositoryHead',p_expected_repository_head,
    'matrixVersion',p_expected_matrix_version,
    'policySetId',p_policy_set_id,
    'metricCount',8,
    'maxLagSeconds',360,
    'authorizationDigestSha256',v_authorization_digest,
    'evidenceDigestSha256',v_evidence_digest,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'activationInvocationAuthorized',false,
    'policyPersistenceAuthorized',false
  );
end;
$function$;

alter function private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
  text,text,text,text,jsonb,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
  text,text,text,text,jsonb,timestamptz,timestamptz
) from public, anon, authenticated, service_role;

-- Tombstone the legacy activation path. Historical migration 20260924004500 remains immutable.
create or replace function private.activate_analytics_a09_funnel_freshness_policy_v1(
  p_policy_set_id text,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  raise exception using
    errcode='55000',
    message='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED';
end;
$function$;

alter function private.activate_analytics_a09_funnel_freshness_policy_v1(
  text,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.activate_analytics_a09_funnel_freshness_policy_v1(
  text,timestamptz,timestamptz
) from public, anon, authenticated, service_role;
