-- ANA-A11 structural validation for approval-envelope runtime enforcement.
-- Run only after separate explicit staging authorization applies the candidate migration.
begin;

do $$
declare
  v_canonicalizer regprocedure;
  v_validator regprocedure;
  v_approved_activation regprocedure;
  v_legacy_activation regprocedure;
  v_canonicalizer_def text;
  v_validator_def text;
  v_approved_def text;
  v_legacy_def text;
  v_pub_before bigint;
  v_fresh_before bigint;
  v_legacy_failed boolean := false;
  v_invalid_envelope_failed boolean := false;
begin
  v_canonicalizer := to_regprocedure(
    'private.canonicalize_analytics_json_v1(jsonb)'
  );
  v_validator := to_regprocedure(
    'private.validate_analytics_cat_liquidity_policy_approval_envelope_v1(text,text,text,text,integer,integer,timestamp with time zone,integer,jsonb,timestamp with time zone,timestamp with time zone)'
  );
  v_approved_activation := to_regprocedure(
    'private.activate_analytics_cat_liquidity_policy_approved_v1(text,text,text,text,integer,integer,timestamp with time zone,integer,jsonb,timestamp with time zone,timestamp with time zone)'
  );
  v_legacy_activation := to_regprocedure(
    'private.activate_analytics_cat_liquidity_policy_v1(text,integer,integer,timestamp with time zone,integer,jsonb,timestamp with time zone,timestamp with time zone)'
  );

  if v_canonicalizer is null
     or v_validator is null
     or v_approved_activation is null
     or v_legacy_activation is null then
    raise exception 'ANA-A11 approval-envelope runtime enforcement function missing';
  end if;

  select pg_get_functiondef(v_canonicalizer::oid) into v_canonicalizer_def;
  select pg_get_functiondef(v_validator::oid) into v_validator_def;
  select pg_get_functiondef(v_approved_activation::oid) into v_approved_def;
  select pg_get_functiondef(v_legacy_activation::oid) into v_legacy_def;

  if position('jsonb_each' in v_canonicalizer_def) = 0
     or position('jsonb_array_elements' in v_canonicalizer_def) = 0
     or position('order by e.key' in lower(v_canonicalizer_def)) = 0 then
    raise exception 'ANA-A11 canonical JSON digest encoder is incomplete';
  end if;

  if position('ana-a11-liquidity-policy-approval-evidence-v1' in v_validator_def) = 0
     or position('authorizationDigestSha256' in v_validator_def) = 0
     or position('evidenceDigestSha256' in v_validator_def) = 0
     or position('extensions.digest' in v_validator_def) = 0
     or position('p_expected_repository_head' in v_validator_def) = 0
     or position('p_expected_matrix_version' in v_validator_def) = 0
     or position('DOKE_ANALYTICS_POLICY_APPROVAL_BINDING_MISMATCH' in v_validator_def) = 0
     or position('DOKE_ANALYTICS_POLICY_APPROVAL_AUTHORIZATION_MISMATCH' in v_validator_def) = 0
     or position('DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH' in v_validator_def) = 0
     or position('DOKE_ANALYTICS_POLICY_APPROVAL_DIGEST_MISMATCH' in v_validator_def) = 0
     or position('activationInvocationLimit' in v_validator_def) = 0
     or position('schedulerActivationAuthorized' in v_validator_def) = 0
     or position('productionAuthorized' in v_validator_def) = 0 then
    raise exception 'ANA-A11 approval-envelope validator does not preserve canonical bindings';
  end if;

  if position('validate_analytics_cat_liquidity_policy_approval_envelope_v1' in v_approved_def) = 0
     or position('analytics_metric_publication_policies_v1' in v_approved_def) = 0
     or position('analytics_metric_freshness_policies_v1' in v_approved_def) = 0
     or position('DOKE_ANALYTICS_PUBLICATION_POLICY_OVERLAP' in v_approved_def) = 0
     or position('DOKE_ANALYTICS_FRESHNESS_POLICY_OVERLAP' in v_approved_def) = 0
     or position('cron.schedule' in lower(v_approved_def)) > 0
     or position('run_analytics_cat_liquidity_catch_up_v1' in v_approved_def) > 0 then
    raise exception 'ANA-A11 approved activation bypasses envelope validation or introduces scheduler authority';
  end if;

  if position('DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED' in v_legacy_def) = 0
     or position('analytics_metric_publication_policies_v1' in v_legacy_def) > 0
     or position('analytics_metric_freshness_policies_v1' in v_legacy_def) > 0 then
    raise exception 'ANA-A11 legacy activation path was not tombstoned';
  end if;

  if has_function_privilege('anon',v_canonicalizer,'EXECUTE')
     or has_function_privilege('authenticated',v_canonicalizer,'EXECUTE')
     or has_function_privilege('service_role',v_canonicalizer,'EXECUTE')
     or has_function_privilege('anon',v_validator,'EXECUTE')
     or has_function_privilege('authenticated',v_validator,'EXECUTE')
     or has_function_privilege('service_role',v_validator,'EXECUTE')
     or has_function_privilege('anon',v_approved_activation,'EXECUTE')
     or has_function_privilege('authenticated',v_approved_activation,'EXECUTE')
     or has_function_privilege('service_role',v_approved_activation,'EXECUTE')
     or has_function_privilege('anon',v_legacy_activation,'EXECUTE')
     or has_function_privilege('authenticated',v_legacy_activation,'EXECUTE')
     or has_function_privilege('service_role',v_legacy_activation,'EXECUTE') then
    raise exception 'ANA-A11 approval-envelope runtime functions escaped postgres owner boundary';
  end if;

  select count(*) into v_pub_before
  from private.analytics_metric_publication_policies_v1
  where metric_key = 'liquidity.active_service_seconds'
    and metric_version = 'v1';

  select count(*) into v_fresh_before
  from private.analytics_metric_freshness_policies_v1
  where metric_key = 'liquidity.active_service_seconds'
    and metric_version = 'v1';

  begin
    perform private.activate_analytics_cat_liquidity_policy_v1(
      'ana-a11-liquidity-v1-r1',
      41,
      7,
      '2026-09-23T14:00:00Z'::timestamptz,
      2,
      '{}'::jsonb,
      '2026-09-23T14:00:41Z'::timestamptz,
      null
    );
  exception when sqlstate '55000' then
    if sqlerrm = 'DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED' then
      v_legacy_failed := true;
    else
      raise;
    end if;
  end;

  begin
    perform private.activate_analytics_cat_liquidity_policy_approved_v1(
      repeat('a',40),
      '1.3.132',
      'synthetic-invalid-envelope-command',
      'ana-a11-liquidity-v1-r1',
      41,
      7,
      '2026-09-23T14:00:00Z'::timestamptz,
      2,
      '{}'::jsonb,
      '2026-09-23T14:00:41Z'::timestamptz,
      null
    );
  exception when sqlstate '22023' then
    if sqlerrm = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID' then
      v_invalid_envelope_failed := true;
    else
      raise;
    end if;
  end;

  if not v_legacy_failed or not v_invalid_envelope_failed then
    raise exception 'ANA-A11 approval-envelope fail-closed canaries did not reject unsafe activation';
  end if;

  if v_pub_before <> (
       select count(*)
       from private.analytics_metric_publication_policies_v1
       where metric_key = 'liquidity.active_service_seconds'
         and metric_version = 'v1'
     )
     or v_fresh_before <> (
       select count(*)
       from private.analytics_metric_freshness_policies_v1
       where metric_key = 'liquidity.active_service_seconds'
         and metric_version = 'v1'
     ) then
    raise exception 'ANA-A11 approval-envelope validation changed persistent policy rows';
  end if;
end;
$$;

rollback;
