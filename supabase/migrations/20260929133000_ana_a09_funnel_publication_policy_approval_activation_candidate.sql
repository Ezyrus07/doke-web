-- ANA-A09 funnel publication-policy approval/activation candidate.
-- REPOSITORY-ONLY CANDIDATE. Applying this migration requires a separate exact-head staging authorization.
--
-- The candidate creates no publication-policy row, writes no metric snapshot and creates no cron job.
-- It defines an owner-only approval validator and an approval-aware eight-row activation boundary.
-- Actual windowAnchor/effectiveFrom values remain unselected and must be explicitly authorized later.

create or replace function private.validate_analytics_a09_funnel_publication_policy_approval_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_policy_set_id text,
  p_approval_evidence jsonb,
  p_window_anchor timestamptz,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_authorization_digest text;
  v_evidence_digest text;
  v_computed_evidence_digest text;
  v_approved_at timestamptz;
  v_parameters jsonb;
  v_boundaries jsonb;
  v_policies jsonb;
  v_grid_delta_microseconds bigint;
  v_expected_match_count integer;
  v_freshness_match_count integer;
begin
  if p_expected_repository_head is null
     or p_expected_repository_head !~ '^[0-9a-f]{40}$'
     or p_expected_matrix_version is null
     or p_expected_matrix_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
     or p_authorization_command is null
     or pg_catalog.btrim(p_authorization_command)=''
     or p_policy_set_id is distinct from 'ana-a07-a09-funnel-v1-r1'
     or p_approval_evidence is null
     or pg_catalog.jsonb_typeof(p_approval_evidence) is distinct from 'object'
     or p_window_anchor is null
     or p_effective_from is null
     or p_effective_until is not null then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_INVALID';
  end if;

  if (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(p_approval_evidence))<>19
     or not (p_approval_evidence ?& array[
       'schemaId','approvalId','approvalChannel','approvalActorRole',
       'authorizationDigestSha256','approvedAt','environment','repositoryHead',
       'matrixVersion','domain','orchestrationContractId','policySetId','revision',
       'metricVersion','metricCount','approvedParameters','policies','boundaries',
       'evidenceDigestSha256'
     ]::text[]) then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_INVALID';
  end if;

  if p_approval_evidence->>'schemaId' is distinct from 'ana-a09-funnel-publication-policy-activation-approval-evidence-v1'
     or p_approval_evidence->>'approvalChannel' is distinct from 'chat_explicit_authorization'
     or p_approval_evidence->>'approvalActorRole' is distinct from 'project_owner'
     or p_approval_evidence->>'environment' is distinct from 'staging'
     or p_approval_evidence->>'domain' is distinct from 'ANA-001'
     or p_approval_evidence->>'orchestrationContractId' is distinct from 'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'
     or p_approval_evidence->>'policySetId' is distinct from p_policy_set_id
     or p_approval_evidence->>'revision' is distinct from '1'
     or p_approval_evidence->>'metricVersion' is distinct from 'v1'
     or p_approval_evidence->>'metricCount' is distinct from '8'
     or p_approval_evidence->>'repositoryHead' is distinct from p_expected_repository_head
     or p_approval_evidence->>'matrixVersion' is distinct from p_expected_matrix_version then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_BINDING_MISMATCH';
  end if;

  v_authorization_digest:=p_approval_evidence->>'authorizationDigestSha256';
  if v_authorization_digest is null
     or v_authorization_digest !~ '^[0-9a-f]{64}$'
     or v_authorization_digest is distinct from
        pg_catalog.encode(extensions.digest(pg_catalog.convert_to(p_authorization_command,'UTF8'),'sha256'),'hex')
     or p_approval_evidence->>'approvalId' is distinct from
        ('ana-a09-funnel-publication-approval-r1-'||pg_catalog.substr(v_authorization_digest,1,12)) then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_AUTHORIZATION_MISMATCH';
  end if;

  begin
    v_approved_at:=(p_approval_evidence->>'approvedAt')::timestamptz;
  exception when others then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_INVALID';
  end;

  if p_approval_evidence->>'approvedAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_INVALID';
  end if;

  v_parameters:=p_approval_evidence->'approvedParameters';
  if v_parameters is null
     or pg_catalog.jsonb_typeof(v_parameters) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_parameters))<>9
     or not (v_parameters ?& array[
       'windowStepSeconds','projectionDelaySloSeconds','derivedMaxLagSeconds',
       'windowAnchor','maxCatchUpWindowsPerInvocation','missedWindowOrder',
       'schedulerMechanism','effectiveFrom','effectiveUntil'
     ]::text[])
     or v_parameters->>'windowStepSeconds' is distinct from '300'
     or v_parameters->>'projectionDelaySloSeconds' is distinct from '60'
     or v_parameters->>'derivedMaxLagSeconds' is distinct from '360'
     or v_parameters->>'maxCatchUpWindowsPerInvocation' is distinct from '3'
     or v_parameters->>'missedWindowOrder' is distinct from 'oldest_first'
     or v_parameters->>'schedulerMechanism' is distinct from 'supabase_pg_cron_database_local'
     or pg_catalog.jsonb_typeof(v_parameters->'effectiveUntil') is distinct from 'null' then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_VALUE_MISMATCH';
  end if;

  begin
    if (v_parameters->>'windowAnchor')::timestamptz is distinct from p_window_anchor
       or (v_parameters->>'effectiveFrom')::timestamptz is distinct from p_effective_from then
      raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_VALUE_MISMATCH';
    end if;
  exception when invalid_datetime_format then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_VALUE_MISMATCH';
  end;

  if p_window_anchor>p_effective_from
     or p_effective_from<v_approved_at then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_VALUE_MISMATCH';
  end if;

  v_grid_delta_microseconds:=(
    extract(epoch from (p_effective_from-p_window_anchor))*1000000
  )::bigint;
  if pg_catalog.mod(v_grid_delta_microseconds,300000000)<>0 then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_GRID_MISMATCH';
  end if;

  v_policies:=p_approval_evidence->'policies';
  if v_policies is null
     or pg_catalog.jsonb_typeof(v_policies) is distinct from 'array'
     or pg_catalog.jsonb_array_length(v_policies)<>8 then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_POLICY_SET_INVALID';
  end if;

  with expected(policy_id,metric_key) as (
    values
      ('ana-a07-a09-funnel-budget-quote-start-v1-r1'::text,'funnel.budget_cta_to_quote_started'::text),
      ('ana-a07-a09-funnel-click-detail-v1-r1'::text,'funnel.click_to_detail'::text),
      ('ana-a07-a09-funnel-detail-budget-v1-r1'::text,'funnel.detail_to_budget_cta'::text),
      ('ana-a07-a09-funnel-impression-click-v1-r1'::text,'funnel.impression_to_click'::text),
      ('ana-a07-a09-funnel-quote-complete-submit-v1-r1'::text,'funnel.quote_completed_to_submitted'::text),
      ('ana-a07-a09-funnel-quote-start-complete-v1-r1'::text,'funnel.quote_started_to_completed'::text),
      ('ana-a07-a09-funnel-submit-order-v1-r1'::text,'funnel.quote_submitted_to_order_requested'::text),
      ('ana-a07-a09-funnel-search-ctr-v1-r1'::text,'funnel.search_ctr'::text)
  ),
  supplied as (
    select
      value->>'policyId' as policy_id,
      value->>'metricKey' as metric_key,
      value->>'metricVersion' as metric_version,
      (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(value)) as key_count
    from pg_catalog.jsonb_array_elements(v_policies)
  )
  select count(*)::integer
  into v_expected_match_count
  from expected e
  join supplied s
    on s.policy_id=e.policy_id
   and s.metric_key=e.metric_key
   and s.metric_version='v1'
   and s.key_count=3;

  if v_expected_match_count<>8
     or (select count(distinct value->>'policyId') from pg_catalog.jsonb_array_elements(v_policies))<>8
     or (select count(distinct value->>'metricKey') from pg_catalog.jsonb_array_elements(v_policies))<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_POLICY_SET_INVALID';
  end if;

  v_boundaries:=p_approval_evidence->'boundaries';
  if v_boundaries is null
     or pg_catalog.jsonb_typeof(v_boundaries) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_boundaries))<>9
     or not (v_boundaries ?& array[
       'policyInsertAuthorized','activationInvocationLimit','snapshotMutationAuthorized',
       'runtimeSnapshotAuthorityAuthorized','snapshotPublicationAuthorityAuthorized',
       'schedulerActivationAuthorized','productionAuthorized',
       'pullRequestMergeAuthorized','readyForReviewAuthorized'
     ]::text[])
     or v_boundaries->'policyInsertAuthorized' is distinct from 'true'::jsonb
     or v_boundaries->>'activationInvocationLimit' is distinct from '1'
     or v_boundaries->'snapshotMutationAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'runtimeSnapshotAuthorityAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'snapshotPublicationAuthorityAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'schedulerActivationAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'productionAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'pullRequestMergeAuthorized' is distinct from 'false'::jsonb
     or v_boundaries->'readyForReviewAuthorized' is distinct from 'false'::jsonb then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_BOUNDARY_INVALID';
  end if;

  v_evidence_digest:=p_approval_evidence->>'evidenceDigestSha256';
  v_computed_evidence_digest:=pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(
        private.canonicalize_analytics_json_v1(p_approval_evidence-'evidenceDigestSha256'),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  if v_evidence_digest is null
     or v_evidence_digest !~ '^[0-9a-f]{64}$'
     or v_evidence_digest is distinct from v_computed_evidence_digest then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_DIGEST_MISMATCH';
  end if;

  with expected(policy_id,metric_key) as (
    values
      ('ana-a07-a09-funnel-budget-quote-start-v1-r1'::text,'funnel.budget_cta_to_quote_started'::text),
      ('ana-a07-a09-funnel-click-detail-v1-r1'::text,'funnel.click_to_detail'::text),
      ('ana-a07-a09-funnel-detail-budget-v1-r1'::text,'funnel.detail_to_budget_cta'::text),
      ('ana-a07-a09-funnel-impression-click-v1-r1'::text,'funnel.impression_to_click'::text),
      ('ana-a07-a09-funnel-quote-complete-submit-v1-r1'::text,'funnel.quote_completed_to_submitted'::text),
      ('ana-a07-a09-funnel-quote-start-complete-v1-r1'::text,'funnel.quote_started_to_completed'::text),
      ('ana-a07-a09-funnel-submit-order-v1-r1'::text,'funnel.quote_submitted_to_order_requested'::text),
      ('ana-a07-a09-funnel-search-ctr-v1-r1'::text,'funnel.search_ctr'::text)
  )
  select count(*)::integer
  into v_freshness_match_count
  from expected e
  join private.analytics_metric_freshness_policies_v1 f
    on f.policy_id=e.policy_id
   and f.metric_key=e.metric_key
   and f.metric_version='v1'
   and f.max_lag_seconds=360
   and f.effective_from<=p_effective_from
   and (f.effective_until is null or f.effective_until>p_effective_from);

  if v_freshness_match_count<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_FRESHNESS_AUTHORITY_REQUIRED';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-publication-policy-approval-validator-v1',
    'valid',true,
    'policySetId',p_policy_set_id,
    'metricCount',8,
    'windowStepSeconds',300,
    'projectionDelaySloSeconds',60,
    'derivedMaxLagSeconds',360,
    'windowAnchor',p_window_anchor,
    'maxCatchUpWindowsPerInvocation',3,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'authorizationDigestSha256',v_authorization_digest,
    'evidenceDigestSha256',v_evidence_digest,
    'policyInsertApproved',true,
    'activationInvocationLimit',1,
    'snapshotPublicationAuthority',false,
    'schedulerAuthority',false
  );
end;
$function$;

alter function private.validate_analytics_a09_funnel_publication_policy_approval_v1(
  text,text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.validate_analytics_a09_funnel_publication_policy_approval_v1(
  text,text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) from public,anon,authenticated,service_role;

create or replace function private.activate_analytics_a09_funnel_publication_policy_approved_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_approval_evidence jsonb,
  p_window_anchor timestamptz,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_validation jsonb;
  v_rows integer;
begin
  v_validation:=private.validate_analytics_a09_funnel_publication_policy_approval_v1(
    p_expected_repository_head,
    p_expected_matrix_version,
    p_authorization_command,
    'ana-a07-a09-funnel-v1-r1',
    p_approval_evidence,
    p_window_anchor,
    p_effective_from,
    p_effective_until
  );

  if coalesce((v_validation->>'valid')::boolean,false) is not true
     or coalesce((v_validation->>'policyInsertApproved')::boolean,false) is not true
     or coalesce((v_validation->>'activationInvocationLimit')::integer,0)<>1 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPROVAL_REQUIRED';
  end if;

  if exists (
    with expected(policy_id,metric_key) as (
      values
      ('ana-a07-a09-funnel-budget-quote-start-v1-r1'::text,'funnel.budget_cta_to_quote_started'::text),
      ('ana-a07-a09-funnel-click-detail-v1-r1'::text,'funnel.click_to_detail'::text),
      ('ana-a07-a09-funnel-detail-budget-v1-r1'::text,'funnel.detail_to_budget_cta'::text),
      ('ana-a07-a09-funnel-impression-click-v1-r1'::text,'funnel.impression_to_click'::text),
      ('ana-a07-a09-funnel-quote-complete-submit-v1-r1'::text,'funnel.quote_completed_to_submitted'::text),
      ('ana-a07-a09-funnel-quote-start-complete-v1-r1'::text,'funnel.quote_started_to_completed'::text),
      ('ana-a07-a09-funnel-submit-order-v1-r1'::text,'funnel.quote_submitted_to_order_requested'::text),
      ('ana-a07-a09-funnel-search-ctr-v1-r1'::text,'funnel.search_ctr'::text)
    )
    select 1
    from expected e
    left join private.analytics_metric_publication_policies_v1 p
      on p.policy_id=e.policy_id
      or (
        p.metric_key=e.metric_key
        and p.metric_version='v1'
        and p.effective_from<coalesce(p_effective_until,'infinity'::timestamptz)
        and p_effective_from<coalesce(p.effective_until,'infinity'::timestamptz)
      )
    where p.policy_id is not null
  ) then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_OVERLAP';
  end if;

  insert into private.analytics_metric_publication_policies_v1 (
    policy_id,metric_key,metric_version,
    window_step_seconds,projection_delay_slo_seconds,window_anchor,
    max_catch_up_windows_per_invocation,missed_window_order,scheduler_mechanism,
    derivation_contract_id,series_contract_id,approval_evidence,
    effective_from,effective_until
  )
  select
    e.policy_id,e.metric_key,'v1',
    300,60,p_window_anchor,
    3,'oldest_first','supabase_pg_cron_database_local',
    'ana-a07-a09-funnel-freshness-policy-candidate-v1',
    'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1',
    p_approval_evidence,
    p_effective_from,p_effective_until
  from (
    values
      ('ana-a07-a09-funnel-budget-quote-start-v1-r1'::text,'funnel.budget_cta_to_quote_started'::text),
      ('ana-a07-a09-funnel-click-detail-v1-r1'::text,'funnel.click_to_detail'::text),
      ('ana-a07-a09-funnel-detail-budget-v1-r1'::text,'funnel.detail_to_budget_cta'::text),
      ('ana-a07-a09-funnel-impression-click-v1-r1'::text,'funnel.impression_to_click'::text),
      ('ana-a07-a09-funnel-quote-complete-submit-v1-r1'::text,'funnel.quote_completed_to_submitted'::text),
      ('ana-a07-a09-funnel-quote-start-complete-v1-r1'::text,'funnel.quote_started_to_completed'::text),
      ('ana-a07-a09-funnel-submit-order-v1-r1'::text,'funnel.quote_submitted_to_order_requested'::text),
      ('ana-a07-a09-funnel-search-ctr-v1-r1'::text,'funnel.search_ctr'::text)
  ) as e(policy_id,metric_key)
  order by e.metric_key;

  get diagnostics v_rows=row_count;
  if v_rows<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_CARDINALITY_INVALID';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-publication-policy-approved-activation-v1',
    'policySetId','ana-a07-a09-funnel-v1-r1',
    'rowsInserted',v_rows,
    'metricCount',8,
    'windowStepSeconds',300,
    'projectionDelaySloSeconds',60,
    'derivedMaxLagSeconds',360,
    'windowAnchor',p_window_anchor,
    'maxCatchUpWindowsPerInvocation',3,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'approvalValidated',true,
    'snapshotMutationPerformed',false,
    'schedulerCreated',false
  );
end;
$function$;

alter function private.activate_analytics_a09_funnel_publication_policy_approved_v1(
  text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) owner to postgres;
revoke all privileges on function private.activate_analytics_a09_funnel_publication_policy_approved_v1(
  text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) from public,anon,authenticated,service_role;

comment on function private.validate_analytics_a09_funnel_publication_policy_approval_v1(
  text,text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) is 'ANA-A09 owner-only fail-closed approval validator for the exact eight-row funnel publication-policy set. It validates repository/matrix/auth digests, explicit grid timing, the existing eight freshness authorities and closed publication/scheduler boundaries.';

comment on function private.activate_analytics_a09_funnel_publication_policy_approved_v1(
  text,text,text,jsonb,timestamptz,timestamptz,timestamptz
) is 'ANA-A09 owner-only approval-aware activation boundary. It inserts exactly eight publication-policy rows only after approval validation. It writes no metric snapshot and creates no scheduler.';
