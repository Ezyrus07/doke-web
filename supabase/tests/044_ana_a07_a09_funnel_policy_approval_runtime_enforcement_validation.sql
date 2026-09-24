-- ANA-A07/A09 validation 044: approval-envelope runtime-enforcement candidate.
-- Rollback-only. Proves exact envelope compatibility, tamper rejection, ACL and legacy tombstone.
begin;

do $validation$
declare
  v_validator regprocedure;
  v_legacy regprocedure;
  v_evidence jsonb := $json${"schemaId":"ana-a07-a09-funnel-freshness-policy-activation-approval-evidence-v1","approvalId":"ana-a07-a09-funnel-approval-r1-4a96845c6659","approvalChannel":"chat_explicit_authorization","approvalActorRole":"project_owner","authorizationDigestSha256":"4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a","approvedAt":"2026-09-24T13:26:00Z","environment":"staging","repositoryHead":"0c45856b82b08fe5265c3e71b40c0d83fed871a7","matrixVersion":"1.3.132","domain":"ANA-001","policySetId":"ana-a07-a09-funnel-v1-r1","revision":1,"metricVersion":"v1","metricCount":8,"approvedParameters":{"windowReferenceSeconds":300,"projectionDelayBudgetSeconds":60,"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},"policies":[{"policyId":"ana-a07-a09-funnel-search-ctr-v1-r1","metricKey":"funnel.search_ctr","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-impression-click-v1-r1","metricKey":"funnel.impression_to_click","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-click-detail-v1-r1","metricKey":"funnel.click_to_detail","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-detail-budget-v1-r1","metricKey":"funnel.detail_to_budget_cta","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-budget-quote-start-v1-r1","metricKey":"funnel.budget_cta_to_quote_started","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-quote-start-complete-v1-r1","metricKey":"funnel.quote_started_to_completed","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-quote-complete-submit-v1-r1","metricKey":"funnel.quote_completed_to_submitted","metricVersion":"v1","sourceDomains":["ANA-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null},{"policyId":"ana-a07-a09-funnel-submit-order-v1-r1","metricKey":"funnel.quote_submitted_to_order_requested","metricVersion":"v1","sourceDomains":["ANA-001","ORD-001"],"maxLagSeconds":360,"effectiveFrom":"2026-09-24T14:00:00Z","effectiveUntil":null}],"boundaries":{"envelopeRepositoryWriteAuthorized":true,"policyActivationInvocationAuthorized":false,"policyPersistenceAuthorized":false,"snapshotPublicationAuthorized":false,"runtimeProjectionAuthorityAuthorized":false,"runtimeSnapshotAuthorityAuthorized":false,"cronOrSchedulerAuthorized":false,"productionAuthorized":false,"pullRequestMergeAuthorized":false,"readyForReviewAuthorized":false},"evidenceDigestSha256":"9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5"}$json$::jsonb;
  v_result jsonb;
  v_before integer;
  v_after integer;
begin
  v_validator := pg_catalog.to_regprocedure(
    'private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(text,text,text,text,jsonb,timestamptz,timestamptz)'
  );
  v_legacy := pg_catalog.to_regprocedure(
    'private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz)'
  );

  if v_validator is null then raise exception 'VALIDATION_044_VALIDATOR_MISSING'; end if;
  if v_legacy is null then raise exception 'VALIDATION_044_LEGACY_TOMBSTONE_MISSING'; end if;

  if pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE') then
    raise exception 'VALIDATION_044_VALIDATOR_PUBLIC_EXECUTE';
  end if;

  select pg_catalog.count(*) into v_before
  from private.analytics_metric_freshness_policies_v1
  where policy_id like 'ana-a07-a09-funnel-%-v1-r1';

  v_result := private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
    '0c45856b82b08fe5265c3e71b40c0d83fed871a7',
    '1.3.132',
    'authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null',
    'ana-a07-a09-funnel-v1-r1',
    v_evidence,
    '2026-09-24T14:00:00Z'::timestamptz,
    null
  );

  if (v_result ->> 'valid') is distinct from 'true'
     or (v_result ->> 'policySetId') is distinct from 'ana-a07-a09-funnel-v1-r1'
     or (v_result ->> 'metricCount') is distinct from '8'
     or (v_result ->> 'maxLagSeconds') is distinct from '360'
     or (v_result ->> 'authorizationDigestSha256') is distinct from
       '4a96845c66599a0092e34d0bf02c41684c8eaccf8768c403b648159bc53ddc2a'
     or (v_result ->> 'evidenceDigestSha256') is distinct from
       '9b4db03b33bdb7084899225fa2d08b78fdf4f87687b55e077b3a956a0aa981a5'
     or (v_result ->> 'activationInvocationAuthorized') is distinct from 'false'
     or (v_result ->> 'policyPersistenceAuthorized') is distinct from 'false' then
    raise exception 'VALIDATION_044_VALID_ENVELOPE_RESULT_INVALID';
  end if;

  begin
    perform private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
      'ffffffffffffffffffffffffffffffffffffffff','1.3.132','authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null',
      'ana-a07-a09-funnel-v1-r1',v_evidence,'2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_044_EXPECTED_HEAD_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_HEAD_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BINDING_MISMATCH%' then raise; end if;
  end;

  begin
    perform private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
      '0c45856b82b08fe5265c3e71b40c0d83fed871a7','1.3.132','tampered-authorization',
      'ana-a07-a09-funnel-v1-r1',v_evidence,'2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_044_EXPECTED_AUTH_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_AUTH_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_AUTHORIZATION_MISMATCH%' then raise; end if;
  end;

  begin
    perform private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
      '0c45856b82b08fe5265c3e71b40c0d83fed871a7','1.3.132','authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null',
      'ana-a07-a09-funnel-v1-r1',
      pg_catalog.jsonb_set(v_evidence,'{boundaries,policyPersistenceAuthorized}','true'::jsonb),
      '2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_044_EXPECTED_BOUNDARY_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_BOUNDARY_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_BOUNDARY_INVALID%' then raise; end if;
  end;

  begin
    perform private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(
      '0c45856b82b08fe5265c3e71b40c0d83fed871a7','1.3.132','authorize-ana-a07-a09-funnel-freshness-policy-activation-envelope-repository-only head=0c45856b82b08fe5265c3e71b40c0d83fed871a7 matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 effectiveFrom=2026-09-24T14:00:00Z effectiveUntil=null',
      'ana-a07-a09-funnel-v1-r1',
      pg_catalog.jsonb_set(v_evidence,'{evidenceDigestSha256}',pg_catalog.to_jsonb(pg_catalog.repeat('0',64))),
      '2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_044_EXPECTED_DIGEST_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_DIGEST_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_DIGEST_MISMATCH%' then raise; end if;
  end;

  begin
    perform private.activate_analytics_a09_funnel_freshness_policy_v1(
      'ana-a07-a09-funnel-v1-r1','2026-09-24T14:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_044_EXPECTED_LEGACY_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_LEGACY_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED%' then raise; end if;
  end;

  select pg_catalog.count(*) into v_after
  from private.analytics_metric_freshness_policies_v1
  where policy_id like 'ana-a07-a09-funnel-%-v1-r1';

  if v_after is distinct from v_before then
    raise exception 'VALIDATION_044_POLICY_ROW_DRIFT';
  end if;
end;
$validation$;

rollback;
