-- ANA-A07/A09 validation 045: approval-aware activation successor candidate.
-- Apply/run only under a separate staging authorization. Rollback-only.

begin;

do $validation$
declare
  v_validator regprocedure:=pg_catalog.to_regprocedure(
    'private.validate_a09_funnel_activation_approval_v1(text,text,text,text,text,jsonb,timestamp with time zone,timestamp with time zone)'
  );
  v_successor regprocedure:=pg_catalog.to_regprocedure(
    'private.activate_a09_funnel_policy_approved_v1(text,text,text,jsonb,jsonb,timestamp with time zone,timestamp with time zone)'
  );
  v_legacy regprocedure:=pg_catalog.to_regprocedure(
    'private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamp with time zone,timestamp with time zone)'
  );
  v_approval jsonb:=$approval${"schemaId":"ana-a07-a09-funnel-freshness-policy-activation-invocation-evidence-v1","activationApprovalId":"ana-a07-a09-funnel-activation-approval-r1-d72f3930dffb","approvalChannel":"chat_explicit_authorization","approvalActorRole":"project_owner","authorizationDigestSha256":"d72f3930dffb8ba36d49c22eaebec4f20cf88121280c4201a6eb8a140a7dc494","approvedAt":"2026-09-24T14:43:00Z","environment":"staging","repositoryHead":"9c54828972aa2d745491baf0c11335c00700035b","matrixVersion":"1.3.132","domain":"ANA-001","activationContractId":"ana-a07-a09-funnel-freshness-policy-activation-invocation-v1","policySetId":"ana-a07-a09-funnel-v1-r1","approvalEnvelopeEvidenceDigestSha256":"9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5","runtimeEnforcementEvidenceBlobSha":"118ca5f948f93ca09c7a7305d1b230880fa98630","effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null,"boundaries":{"policyInsertAuthorized":true,"activationInvocationLimit":1,"snapshotPublicationAuthorized":false,"runtimeProjectionAuthorityAuthorized":false,"runtimeSnapshotAuthorityAuthorized":false,"cronOrSchedulerAuthorized":false,"productionAuthorized":false,"pullRequestMergeAuthorized":false,"readyForReviewAuthorized":false},"evidenceDigestSha256":"ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603"}$approval$::jsonb;
  v_original jsonb:=$original${"schemaId":"ana-a07-a09-funnel-freshness-policy-activation-approval-evidence-v1","approvalId":"ana-a07-a09-funnel-approval-r1-4a96845c6659","approvalChannel":"chat_explicit_authorization","approvalActorRole":"project_owner","authorizationDigestSha256":"4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a","approvedAt":"2026-09-24T13:26:00Z","environment":"staging","repositoryHead":"0c45856b82b08fe5265c3e71b40c0d83fed871a7","matrixVersion":"1.3.132","domain":"ANA-001","policySetId":"ana-a07-a09-funnel-v1-r1","revision":1,"metricVersion":"v1","metricCount":8,"approvedParameters":{"windowReferenceSeconds":300,"projectionDelayBudgetSeconds":60,"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},"policies":[{"policyId":"ana-a07-a09-funnel-search-ctr-v1-r1","metricKey":"funnel.search_ctr","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-impression-click-v1-r1","metricKey":"funnel.impression_to_click","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-click-detail-v1-r1","metricKey":"funnel.click_to_detail","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-detail-budget-v1-r1","metricKey":"funnel.detail_to_budget_cta","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-budget-quote-start-v1-r1","metricKey":"funnel.budget_cta_to_quote_started","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-quote-start-complete-v1-r1","metricKey":"funnel.quote_started_to_completed","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-quote-complete-submit-v1-r1","metricKey":"funnel.quote_completed_to_submitted","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-submit-order-v1-r1","metricKey":"funnel.quote_submitted_to_order_requested","metricVersion":"v1","sourceDomains":["ANA-001","ORD-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null}],"boundaries":{"envelopeRepositoryWriteAuthorized":true,"policyActivationInvocationAuthorized":false,"policyPersistenceAuthorized":false,"snapshotPublicationAuthorized":false,"runtimeProjectionAuthorityAuthorized":false,"runtimeSnapshotAuthorityAuthorized":false,"cronOrSchedulerAuthorized":false,"productionAuthorized":false,"pullRequestMergeAuthorized":false,"readyForReviewAuthorized":false},"evidenceDigestSha256":"9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5"}$original$::jsonb;
  v_before integer;
  v_transient integer;
  v_result jsonb;
  v_replay_rejected boolean:=false;
  v_legacy_rejected boolean:=false;
begin
  if v_validator is null then raise exception 'VALIDATION_045_VALIDATOR_MISSING'; end if;
  if v_successor is null then raise exception 'VALIDATION_045_SUCCESSOR_MISSING'; end if;
  if v_legacy is null then raise exception 'VALIDATION_045_LEGACY_TOMBSTONE_MISSING'; end if;

  if pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_validator::oid))<>'postgres'
     or pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_successor::oid))<>'postgres'
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_validator::oid)
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_successor::oid)
     or pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_successor,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_successor,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_successor,'EXECUTE') then
    raise exception 'VALIDATION_045_PRIVILEGE_BOUNDARY_INVALID';
  end if;

  v_result:=private.validate_a09_funnel_activation_approval_v1(
    '9c54828972aa2d745491baf0c11335c00700035b',
    '1.3.132',
    $auth$authorize-ana-a07-a09-funnel-freshness-policy-activation-approval-repository-only head=9c54828972aa2d745491baf0c11335c00700035b matrix=v1.3.132 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 approvalEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null$auth$,
    'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1',
    'ana-a07-a09-funnel-v1-r1',
    v_approval,
    '2026-09-24T14:00:00Z'::timestamptz,
    null
  );

  if (v_result->>'valid') is distinct from 'true'
     or (v_result->>'policyInsertApproved') is distinct from 'true'
     or (v_result->>'activationInvocationLimit') is distinct from '1'
     or (v_result->>'evidenceDigestSha256') is distinct from 'ca2bc22dcf252f0b1924c24ba522252cab37312ff5f436435723c0b1ceacb603' then
    raise exception 'VALIDATION_045_APPROVAL_RESULT_INVALID';
  end if;

  begin
    perform private.validate_a09_funnel_activation_approval_v1(
      repeat('f',40),'1.3.132',$auth$authorize-ana-a07-a09-funnel-freshness-policy-activation-approval-repository-only head=9c54828972aa2d745491baf0c11335c00700035b matrix=v1.3.132 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 approvalEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null$auth$,
      'ana-a07-a09-funnel-freshness-policy-activation-invocation-v1',
      'ana-a07-a09-funnel-v1-r1',v_approval,
      '2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_045_EXPECTED_HEAD_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_045_EXPECTED_HEAD_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_ACTIVATION_APPROVAL_REPOSITORY_BINDING_MISMATCH%' then raise; end if;
  end;

  select pg_catalog.count(*)::integer into v_before
  from private.analytics_metric_freshness_policies_v1
  where policy_id like 'ana-a07-a09-funnel-%-v1-r1';

  v_result:=private.activate_a09_funnel_policy_approved_v1(
    '9c54828972aa2d745491baf0c11335c00700035b',
    '1.3.132',
    $auth$authorize-ana-a07-a09-funnel-freshness-policy-activation-approval-repository-only head=9c54828972aa2d745491baf0c11335c00700035b matrix=v1.3.132 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 approvalEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null$auth$,
    v_approval,
    v_original,
    '2026-09-24T14:00:00Z'::timestamptz,
    null
  );

  if (v_result->>'rowsInserted') is distinct from '8'
     or (v_result->>'originalApprovalValidated') is distinct from 'true'
     or (v_result->>'activationApprovalValidated') is distinct from 'true' then
    raise exception 'VALIDATION_045_SUCCESSOR_RESULT_INVALID';
  end if;

  select pg_catalog.count(*)::integer into v_transient
  from private.analytics_metric_freshness_policies_v1
  where policy_id like 'ana-a07-a09-funnel-%-v1-r1';

  if v_transient<>v_before+8 then
    raise exception 'VALIDATION_045_TRANSIENT_CARDINALITY_INVALID';
  end if;

  begin
    perform private.activate_a09_funnel_policy_approved_v1(
      '9c54828972aa2d745491baf0c11335c00700035b','1.3.132',$auth$authorize-ana-a07-a09-funnel-freshness-policy-activation-approval-repository-only head=9c54828972aa2d745491baf0c11335c00700035b matrix=v1.3.132 activationContractId=ana-a07-a09-funnel-freshness-policy-activation-invocation-v1 policySetId=ana-a07-a09-funnel-v1-r1 approvalEvidenceDigest=9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5 runtimeEvidenceBlobSha=118ca5f948f93ca09c7a7305d1b230880fa98630 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null$auth$,
      v_approval,v_original,'2026-09-24T14:00:00Z'::timestamptz,null
    );
  exception when others then
    if sqlerrm='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP' then v_replay_rejected:=true; else raise; end if;
  end;
  if not v_replay_rejected then raise exception 'VALIDATION_045_REPLAY_NOT_REJECTED'; end if;

  begin
    perform private.activate_analytics_a09_funnel_freshness_policy_v1(
      'ana-a07-a09-funnel-v1-r1','2026-09-24T14:00:00Z'::timestamptz,null
    );
  exception when others then
    if sqlerrm='DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED' then v_legacy_rejected:=true; else raise; end if;
  end;
  if not v_legacy_rejected then raise exception 'VALIDATION_045_LEGACY_TOMBSTONE_BYPASS'; end if;
end;
$validation$;

rollback;
