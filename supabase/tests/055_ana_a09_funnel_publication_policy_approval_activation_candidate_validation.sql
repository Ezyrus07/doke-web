-- ANA-A09 validation 055: publication-policy approval/activation candidate.
-- Rollback-only. It transiently exercises exactly eight publication-policy inserts and rolls them back.
-- It must not write snapshots or create a scheduler.

begin;

do $validation$
declare
  v_validator regprocedure:=pg_catalog.to_regprocedure(
    'private.validate_analytics_a09_funnel_publication_policy_approval_v1(text,text,text,text,jsonb,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  );
  v_activator regprocedure:=pg_catalog.to_regprocedure(
    'private.activate_analytics_a09_funnel_publication_policy_approved_v1(text,text,text,jsonb,timestamp with time zone,timestamp with time zone,timestamp with time zone)'
  );
  v_command text:='authorize-test-ana-a09-funnel-publication-policy-activation head=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa matrix=v1.3.132 policySetId=ana-a07-a09-funnel-v1-r1 windowAnchor=1970-01-01T00:00:00Z effectiveFrom=2099-01-01T00:00:00Z effectiveUntil=null';
  v_auth_digest text;
  v_evidence_digest text;
  v_approval jsonb;
  v_result jsonb;
  v_current jsonb;
  v_a11_before integer;
  v_a11_after integer;
  v_funnel_before integer;
  v_funnel_transient integer;
  v_snapshots_before integer;
  v_snapshots_after integer;
  v_cron_before integer;
  v_cron_after integer;
  v_replay_rejected boolean:=false;
begin
  if v_validator is null or v_activator is null then
    raise exception 'VALIDATION_055_FUNCTION_MISSING';
  end if;

  if pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_validator::oid))<>'postgres'
     or pg_catalog.pg_get_userbyid((select proowner from pg_catalog.pg_proc where oid=v_activator::oid))<>'postgres'
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_validator::oid)
     or not (select prosecdef from pg_catalog.pg_proc where oid=v_activator::oid)
     or pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('anon',v_activator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_activator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_activator,'EXECUTE') then
    raise exception 'VALIDATION_055_PRIVILEGE_BOUNDARY_INVALID';
  end if;

  select count(*)::integer into v_a11_before
  from private.analytics_metric_publication_policies_v1
  where policy_id='ana-a11-liquidity-v1-r1';

  select count(*)::integer into v_funnel_before
  from private.analytics_metric_publication_policies_v1
  where metric_key like 'funnel.%';

  select count(*)::integer into v_snapshots_before
  from private.analytics_metric_snapshots_v1
  where metric_key like 'funnel.%' and metric_version='v1' and dimensions='{}'::jsonb;

  select count(*)::integer into v_cron_before
  from cron.job
  where lower(coalesce(jobname,'')) like '%funnel%'
     or lower(coalesce(command,'')) like '%run_analytics_a09_funnel_catch_up_v1%';

  if v_a11_before<>1 or v_funnel_before<>0 or v_cron_before<>0 then
    raise exception 'VALIDATION_055_PRECONDITION_INVALID a11=% funnel=% cron=%',v_a11_before,v_funnel_before,v_cron_before;
  end if;

  v_auth_digest:=pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_command,'UTF8'),'sha256'),'hex'
  );

  v_approval:=pg_catalog.jsonb_build_object(
    'schemaId','ana-a09-funnel-publication-policy-activation-approval-evidence-v1',
    'approvalId','ana-a09-funnel-publication-approval-r1-'||pg_catalog.substr(v_auth_digest,1,12),
    'approvalChannel','chat_explicit_authorization',
    'approvalActorRole','project_owner',
    'authorizationDigestSha256',v_auth_digest,
    'approvedAt','2098-12-31T23:55:00Z',
    'environment','staging',
    'repositoryHead','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'matrixVersion','1.3.132',
    'domain','ANA-001',
    'orchestrationContractId','ana-a09-funnel-snapshot-publication-orchestration-candidate-v1',
    'policySetId','ana-a07-a09-funnel-v1-r1',
    'revision',1,
    'metricVersion','v1',
    'metricCount',8,
    'approvedParameters',pg_catalog.jsonb_build_object(
      'windowStepSeconds',300,
      'projectionDelaySloSeconds',60,
      'derivedMaxLagSeconds',360,
      'windowAnchor','1970-01-01T00:00:00Z',
      'maxCatchUpWindowsPerInvocation',3,
      'missedWindowOrder','oldest_first',
      'schedulerMechanism','supabase_pg_cron_database_local',
      'effectiveFrom','2099-01-01T00:00:00Z',
      'effectiveUntil',null
    ),
    'policies',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-budget-quote-start-v1-r1','metricKey','funnel.budget_cta_to_quote_started','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-click-detail-v1-r1','metricKey','funnel.click_to_detail','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-detail-budget-v1-r1','metricKey','funnel.detail_to_budget_cta','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-impression-click-v1-r1','metricKey','funnel.impression_to_click','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-quote-complete-submit-v1-r1','metricKey','funnel.quote_completed_to_submitted','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-quote-start-complete-v1-r1','metricKey','funnel.quote_started_to_completed','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-submit-order-v1-r1','metricKey','funnel.quote_submitted_to_order_requested','metricVersion','v1'),
      pg_catalog.jsonb_build_object('policyId','ana-a07-a09-funnel-search-ctr-v1-r1','metricKey','funnel.search_ctr','metricVersion','v1')
    ),
    'boundaries',pg_catalog.jsonb_build_object(
      'policyInsertAuthorized',true,
      'activationInvocationLimit',1,
      'snapshotMutationAuthorized',false,
      'runtimeSnapshotAuthorityAuthorized',false,
      'snapshotPublicationAuthorityAuthorized',false,
      'schedulerActivationAuthorized',false,
      'productionAuthorized',false,
      'pullRequestMergeAuthorized',false,
      'readyForReviewAuthorized',false
    )
  );
  v_evidence_digest:=pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(private.canonicalize_analytics_json_v1(v_approval),'UTF8'),
      'sha256'
    ),
    'hex'
  );
  v_approval:=pg_catalog.jsonb_set(
    v_approval,'{evidenceDigestSha256}',pg_catalog.to_jsonb(v_evidence_digest),true
  );

  v_result:=private.validate_analytics_a09_funnel_publication_policy_approval_v1(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '1.3.132',
    v_command,
    'ana-a07-a09-funnel-v1-r1',
    v_approval,
    '1970-01-01T00:00:00Z'::timestamptz,
    '2099-01-01T00:00:00Z'::timestamptz,
    null
  );
  if (v_result->>'valid') is distinct from 'true'
     or (v_result->>'metricCount') is distinct from '8'
     or (v_result->>'policyInsertApproved') is distinct from 'true'
     or (v_result->>'activationInvocationLimit') is distinct from '1'
     or (v_result->>'snapshotPublicationAuthority') is distinct from 'false'
     or (v_result->>'schedulerAuthority') is distinct from 'false' then
    raise exception 'VALIDATION_055_APPROVAL_RESULT_INVALID result=%',v_result;
  end if;

  begin
    perform private.validate_analytics_a09_funnel_publication_policy_approval_v1(
      repeat('f',40),'1.3.132',v_command,'ana-a07-a09-funnel-v1-r1',
      v_approval,'1970-01-01T00:00:00Z'::timestamptz,'2099-01-01T00:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_055_EXPECTED_HEAD_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_055_EXPECTED_HEAD_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_BINDING_MISMATCH%' then raise; end if;
  end;

  begin
    perform private.validate_analytics_a09_funnel_publication_policy_approval_v1(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','1.3.132',v_command,'ana-a07-a09-funnel-v1-r1',
      pg_catalog.jsonb_set(v_approval,'{boundaries,schedulerActivationAuthorized}','true'::jsonb),
      '1970-01-01T00:00:00Z'::timestamptz,'2099-01-01T00:00:00Z'::timestamptz,null
    );
    raise exception 'VALIDATION_055_EXPECTED_BOUNDARY_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_055_EXPECTED_BOUNDARY_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_BOUNDARY_INVALID%' then raise; end if;
  end;

  v_result:=private.activate_analytics_a09_funnel_publication_policy_approved_v1(
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '1.3.132',
    v_command,
    v_approval,
    '1970-01-01T00:00:00Z'::timestamptz,
    '2099-01-01T00:00:00Z'::timestamptz,
    null
  );
  if (v_result->>'rowsInserted') is distinct from '8'
     or (v_result->>'approvalValidated') is distinct from 'true'
     or (v_result->>'snapshotMutationPerformed') is distinct from 'false'
     or (v_result->>'schedulerCreated') is distinct from 'false' then
    raise exception 'VALIDATION_055_ACTIVATION_RESULT_INVALID result=%',v_result;
  end if;

  select count(*)::integer into v_funnel_transient
  from private.analytics_metric_publication_policies_v1
  where metric_key like 'funnel.%';
  if v_funnel_transient<>8 then
    raise exception 'VALIDATION_055_TRANSIENT_POLICY_CARDINALITY_INVALID count=%',v_funnel_transient;
  end if;

  v_current:=private.current_analytics_a09_funnel_publication_policy_set_v1(
    'ana-a07-a09-funnel-v1-r1','2099-01-01T00:00:01Z'::timestamptz
  );
  if (v_current->>'metricCount') is distinct from '8'
     or (v_current->>'windowStepSeconds') is distinct from '300'
     or (v_current->>'projectionDelaySloSeconds') is distinct from '60'
     or (v_current->>'derivedMaxLagSeconds') is distinct from '360'
     or (v_current->>'maxCatchUpWindowsPerInvocation') is distinct from '3' then
    raise exception 'VALIDATION_055_RUNTIME_SELECTOR_INVALID result=%',v_current;
  end if;

  begin
    perform private.activate_analytics_a09_funnel_publication_policy_approved_v1(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','1.3.132',v_command,v_approval,
      '1970-01-01T00:00:00Z'::timestamptz,'2099-01-01T00:00:00Z'::timestamptz,null
    );
  exception when others then
    if sqlerrm='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_OVERLAP' then
      v_replay_rejected:=true;
    else
      raise;
    end if;
  end;
  if not v_replay_rejected then
    raise exception 'VALIDATION_055_REPLAY_NOT_REJECTED';
  end if;

  select count(*)::integer into v_a11_after
  from private.analytics_metric_publication_policies_v1
  where policy_id='ana-a11-liquidity-v1-r1';
  select count(*)::integer into v_snapshots_after
  from private.analytics_metric_snapshots_v1
  where metric_key like 'funnel.%' and metric_version='v1' and dimensions='{}'::jsonb;
  select count(*)::integer into v_cron_after
  from cron.job
  where lower(coalesce(jobname,'')) like '%funnel%'
     or lower(coalesce(command,'')) like '%run_analytics_a09_funnel_catch_up_v1%';

  if v_a11_after<>v_a11_before
     or v_snapshots_after<>v_snapshots_before
     or v_cron_after<>v_cron_before then
    raise exception 'VALIDATION_055_SIDE_EFFECT_BOUNDARY_INVALID a11=%/% snapshots=%/% cron=%/%',
      v_a11_before,v_a11_after,v_snapshots_before,v_snapshots_after,v_cron_before,v_cron_after;
  end if;
end;
$validation$;

rollback;
