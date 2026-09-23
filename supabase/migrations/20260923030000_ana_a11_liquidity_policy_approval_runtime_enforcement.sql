-- ANA-A11: repository-only candidate for runtime enforcement of the policy approval envelope.
--
-- This migration is additive and must not be applied without separate staging authorization.
-- It does not choose policy values, insert policy rows, create cron jobs or activate a scheduler.
-- When later applied, it tombstones the legacy object-only activation path and introduces one
-- owner-only activation path that validates the canonical approval envelope before any insert.

create or replace function private.canonicalize_analytics_json_v1(
  p_value jsonb
)
returns text
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_type text := pg_catalog.jsonb_typeof(p_value);
  v_result text;
begin
  if v_type = 'object' then
    select
      '{' ||
      coalesce(
        pg_catalog.string_agg(
          pg_catalog.to_jsonb(e.key)::text || ':' ||
          private.canonicalize_analytics_json_v1(e.value),
          ',' order by e.key
        ),
        ''
      ) ||
      '}'
    into v_result
    from pg_catalog.jsonb_each(p_value) as e(key,value);

    return v_result;
  end if;

  if v_type = 'array' then
    select
      '[' ||
      coalesce(
        pg_catalog.string_agg(
          private.canonicalize_analytics_json_v1(a.value),
          ',' order by a.ordinality
        ),
        ''
      ) ||
      ']'
    into v_result
    from pg_catalog.jsonb_array_elements(p_value) with ordinality as a(value,ordinality);

    return v_result;
  end if;

  return p_value::text;
end;
$$;

create or replace function private.validate_analytics_cat_liquidity_policy_approval_envelope_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_policy_id text,
  p_window_step_seconds integer,
  p_projection_delay_slo_seconds integer,
  p_window_anchor timestamptz,
  p_max_catch_up_windows_per_invocation integer,
  p_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_lifecycle jsonb;
  v_policy_identity jsonb;
  v_parameters jsonb;
  v_boundaries jsonb;
  v_authorization_digest text;
  v_evidence_digest text;
  v_computed_evidence_digest text;
  v_approved_at timestamptz;
  v_evidence_anchor timestamptz;
  v_evidence_effective_from timestamptz;
  v_derived_max_lag bigint;
  v_grid_delta_microseconds bigint;
begin
  if p_expected_repository_head is null
     or p_expected_repository_head !~ '^[0-9a-f]{40}$'
     or p_expected_matrix_version is null
     or p_expected_matrix_version !~ '^[0-9]+\.[0-9]+\.[0-9]+$'
     or p_authorization_command is null
     or pg_catalog.btrim(p_authorization_command) = ''
     or p_approval_evidence is null
     or pg_catalog.jsonb_typeof(p_approval_evidence) is distinct from 'object'
     or (
       select pg_catalog.count(*)
       from pg_catalog.jsonb_object_keys(p_approval_evidence)
     ) <> 20
     or not (
       p_approval_evidence ?& array[
         'schemaId','approvalId','approvalChannel','approvalActorRole',
         'authorizationDigestSha256','approvedAt','environment','repositoryHead',
         'matrixVersion','domain','metricKey','metricVersion','derivationContractId',
         'seriesContractId','schedulerMechanism','lifecycle','policyIdentity',
         'approvedParameters','boundaries','evidenceDigestSha256'
       ]::text[]
     ) then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (p_approval_evidence ->> 'schemaId') is distinct from 'ana-a11-liquidity-policy-approval-evidence-v1'
     or (p_approval_evidence ->> 'approvalChannel') is distinct from 'chat_explicit_authorization'
     or (p_approval_evidence ->> 'approvalActorRole') is distinct from 'project_owner'
     or (p_approval_evidence ->> 'environment') is distinct from 'staging'
     or (p_approval_evidence ->> 'domain') is distinct from 'ANA-001'
     or (p_approval_evidence ->> 'metricKey') is distinct from 'liquidity.active_service_seconds'
     or (p_approval_evidence ->> 'metricVersion') is distinct from 'v1'
     or (p_approval_evidence ->> 'derivationContractId') is distinct from 'ana-a11-liquidity-freshness-policy-derivation-v1'
     or (p_approval_evidence ->> 'seriesContractId') is distinct from 'ana-a11-liquidity-series-orchestration-v1'
     or (p_approval_evidence ->> 'schedulerMechanism') is distinct from 'supabase_pg_cron_database_local' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID';
  end if;

  if (p_approval_evidence ->> 'repositoryHead') is distinct from p_expected_repository_head
     or (p_approval_evidence ->> 'matrixVersion') is distinct from p_expected_matrix_version then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_BINDING_MISMATCH';
  end if;

  v_authorization_digest := p_approval_evidence ->> 'authorizationDigestSha256';

  if v_authorization_digest is null
     or v_authorization_digest !~ '^[0-9a-f]{64}$'
     or v_authorization_digest is distinct from
       pg_catalog.encode(extensions.digest(p_authorization_command,'sha256'),'hex')
     or (p_approval_evidence ->> 'approvalId') is distinct from
       ('ana-a11-liquidity-approval-r1-' || pg_catalog.substr(v_authorization_digest,1,12)) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_AUTHORIZATION_MISMATCH';
  end if;

  if (p_approval_evidence ->> 'approvedAt') is null
     or (p_approval_evidence ->> 'approvedAt') !~
       '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'
     or (p_approval_evidence ->> 'repositoryHead') !~ '^[0-9a-f]{40}$'
     or (p_approval_evidence ->> 'matrixVersion') !~ '^[0-9]+\.[0-9]+\.[0-9]+$' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID';
  end if;

  begin
    v_approved_at := (p_approval_evidence ->> 'approvedAt')::timestamptz;
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID';
  end;

  v_lifecycle := p_approval_evidence -> 'lifecycle';
  v_policy_identity := p_approval_evidence -> 'policyIdentity';
  v_parameters := p_approval_evidence -> 'approvedParameters';
  v_boundaries := p_approval_evidence -> 'boundaries';

  if v_lifecycle is null
     or pg_catalog.jsonb_typeof(v_lifecycle) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_lifecycle)) <> 1
     or not (v_lifecycle ?& array['mode']::text[])
     or (v_lifecycle ->> 'mode') is distinct from 'initial' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_EVIDENCE_INVALID';
  end if;

  if v_policy_identity is null
     or pg_catalog.jsonb_typeof(v_policy_identity) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_policy_identity)) <> 2
     or not (v_policy_identity ?& array['revision','policyId']::text[])
     or pg_catalog.jsonb_typeof(v_policy_identity -> 'revision') is distinct from 'number'
     or (v_policy_identity ->> 'revision') is distinct from '1'
     or (v_policy_identity ->> 'policyId') is distinct from 'ana-a11-liquidity-v1-r1'
     or p_policy_id is distinct from 'ana-a11-liquidity-v1-r1'
     or (v_policy_identity ->> 'policyId') is distinct from p_policy_id then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_BINDING_MISMATCH';
  end if;

  if v_parameters is null
     or pg_catalog.jsonb_typeof(v_parameters) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_parameters)) <> 7
     or not (
       v_parameters ?& array[
         'windowStepSeconds','projectionDelaySloSeconds','windowAnchor',
         'maxCatchUpWindowsPerInvocation','derivedMaxLagSeconds',
         'effectiveFrom','effectiveUntil'
       ]::text[]
     )
     or pg_catalog.jsonb_typeof(v_parameters -> 'windowStepSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'projectionDelaySloSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'maxCatchUpWindowsPerInvocation') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'derivedMaxLagSeconds') is distinct from 'number'
     or pg_catalog.jsonb_typeof(v_parameters -> 'windowAnchor') is distinct from 'string'
     or pg_catalog.jsonb_typeof(v_parameters -> 'effectiveFrom') is distinct from 'string'
     or pg_catalog.jsonb_typeof(v_parameters -> 'effectiveUntil') is distinct from 'null'
     or (v_parameters ->> 'windowStepSeconds') !~ '^[0-9]+$'
     or (v_parameters ->> 'projectionDelaySloSeconds') !~ '^[0-9]+$'
     or (v_parameters ->> 'maxCatchUpWindowsPerInvocation') !~ '^[0-9]+$'
     or (v_parameters ->> 'derivedMaxLagSeconds') !~ '^[0-9]+$'
     or (v_parameters ->> 'windowAnchor') !~
       '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'
     or (v_parameters ->> 'effectiveFrom') !~
       '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'
     or p_effective_until is not null then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH';
  end if;

  if p_window_step_seconds is null
     or p_window_step_seconds <= 0
     or p_projection_delay_slo_seconds is null
     or p_projection_delay_slo_seconds < 0
     or p_window_anchor is null
     or p_max_catch_up_windows_per_invocation is null
     or p_max_catch_up_windows_per_invocation <= 0
     or p_effective_from is null
     or (v_parameters ->> 'windowStepSeconds')::bigint <> p_window_step_seconds::bigint
     or (v_parameters ->> 'projectionDelaySloSeconds')::bigint <> p_projection_delay_slo_seconds::bigint
     or (v_parameters ->> 'maxCatchUpWindowsPerInvocation')::bigint <>
       p_max_catch_up_windows_per_invocation::bigint then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH';
  end if;

  v_derived_max_lag :=
    p_window_step_seconds::bigint + p_projection_delay_slo_seconds::bigint;

  if v_derived_max_lag not between 1 and 2147483647
     or (v_parameters ->> 'derivedMaxLagSeconds')::bigint <> v_derived_max_lag then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH';
  end if;

  begin
    v_evidence_anchor := (v_parameters ->> 'windowAnchor')::timestamptz;
    v_evidence_effective_from := (v_parameters ->> 'effectiveFrom')::timestamptz;
  exception when others then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH';
  end;

  v_grid_delta_microseconds :=
    (
      extract(epoch from (v_evidence_effective_from - v_evidence_anchor))
      * 1000000
    )::bigint;

  if v_evidence_anchor is distinct from p_window_anchor
     or v_evidence_effective_from is distinct from p_effective_from
     or v_evidence_anchor > v_evidence_effective_from
     or v_evidence_effective_from < v_approved_at
     or pg_catalog.mod(
       v_grid_delta_microseconds,
       p_window_step_seconds::bigint * 1000000
     ) <> 0 then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_VALUE_MISMATCH';
  end if;

  if v_boundaries is null
     or pg_catalog.jsonb_typeof(v_boundaries) is distinct from 'object'
     or (select pg_catalog.count(*) from pg_catalog.jsonb_object_keys(v_boundaries)) <> 7
     or not (
       v_boundaries ?& array[
         'policyInsertAuthorized','activationInvocationLimit',
         'schedulerActivationAuthorized','productionAuthorized',
         'browserAnalyticsActivationAuthorized','anonymousIdentityStitchingAuthorized',
         'pullRequestMergeAuthorized'
       ]::text[]
     )
     or (v_boundaries -> 'policyInsertAuthorized') is distinct from 'true'::jsonb
     or pg_catalog.jsonb_typeof(v_boundaries -> 'activationInvocationLimit') is distinct from 'number'
     or (v_boundaries ->> 'activationInvocationLimit') is distinct from '1'
     or (v_boundaries -> 'schedulerActivationAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'productionAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'browserAnalyticsActivationAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'anonymousIdentityStitchingAuthorized') is distinct from 'false'::jsonb
     or (v_boundaries -> 'pullRequestMergeAuthorized') is distinct from 'false'::jsonb then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_BOUNDARY_INVALID';
  end if;

  v_evidence_digest := p_approval_evidence ->> 'evidenceDigestSha256';

  if v_evidence_digest is null
     or v_evidence_digest !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_DIGEST_MISMATCH';
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
      errcode = '55000',
      message = 'DOKE_ANALYTICS_POLICY_APPROVAL_DIGEST_MISMATCH';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a11-liquidity-policy-approval-runtime-enforcement-v1',
    'valid',true,
    'policyId',p_policy_id,
    'repositoryHead',p_expected_repository_head,
    'matrixVersion',p_expected_matrix_version,
    'authorizationDigestSha256',v_authorization_digest,
    'evidenceDigestSha256',v_evidence_digest,
    'derivedMaxLagSeconds',v_derived_max_lag,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until
  );
end;
$$;

create or replace function private.activate_analytics_cat_liquidity_policy_approved_v1(
  p_expected_repository_head text,
  p_expected_matrix_version text,
  p_authorization_command text,
  p_policy_id text,
  p_window_step_seconds integer,
  p_projection_delay_slo_seconds integer,
  p_window_anchor timestamptz,
  p_max_catch_up_windows_per_invocation integer,
  p_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_validation jsonb;
  v_max_lag_seconds bigint;
begin
  v_validation :=
    private.validate_analytics_cat_liquidity_policy_approval_envelope_v1(
      p_expected_repository_head,
      p_expected_matrix_version,
      p_authorization_command,
      p_policy_id,
      p_window_step_seconds,
      p_projection_delay_slo_seconds,
      p_window_anchor,
      p_max_catch_up_windows_per_invocation,
      p_approval_evidence,
      p_effective_from,
      p_effective_until
    );

  v_max_lag_seconds :=
    p_window_step_seconds::bigint + p_projection_delay_slo_seconds::bigint;

  if exists (
    select 1
    from private.analytics_metric_publication_policies_v1 p
    where p.policy_id = p_policy_id
       or (
         p.metric_key = 'liquidity.active_service_seconds'
         and p.metric_version = 'v1'
         and p.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
         and p_effective_until is distinct from p_effective_from
         and p_effective_from < coalesce(p.effective_until,'infinity'::timestamptz)
       )
  ) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_PUBLICATION_POLICY_OVERLAP';
  end if;

  if exists (
    select 1
    from private.analytics_metric_freshness_policies_v1 f
    where f.policy_id = p_policy_id
       or (
         f.metric_key = 'liquidity.active_service_seconds'
         and f.metric_version = 'v1'
         and f.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
         and p_effective_from < coalesce(f.effective_until,'infinity'::timestamptz)
       )
  ) then
    raise exception using
      errcode = '55000',
      message = 'DOKE_ANALYTICS_FRESHNESS_POLICY_OVERLAP';
  end if;

  insert into private.analytics_metric_publication_policies_v1 (
    policy_id,
    metric_key,
    metric_version,
    window_step_seconds,
    projection_delay_slo_seconds,
    window_anchor,
    max_catch_up_windows_per_invocation,
    missed_window_order,
    scheduler_mechanism,
    derivation_contract_id,
    series_contract_id,
    approval_evidence,
    effective_from,
    effective_until
  ) values (
    p_policy_id,
    'liquidity.active_service_seconds',
    'v1',
    p_window_step_seconds,
    p_projection_delay_slo_seconds,
    p_window_anchor,
    p_max_catch_up_windows_per_invocation,
    'oldest_first',
    'supabase_pg_cron_database_local',
    'ana-a11-liquidity-freshness-policy-derivation-v1',
    'ana-a11-liquidity-series-orchestration-v1',
    p_approval_evidence,
    p_effective_from,
    p_effective_until
  );

  insert into private.analytics_metric_freshness_policies_v1 (
    policy_id,
    metric_key,
    metric_version,
    max_lag_seconds,
    effective_from,
    effective_until
  ) values (
    p_policy_id,
    'liquidity.active_service_seconds',
    'v1',
    v_max_lag_seconds::integer,
    p_effective_from,
    p_effective_until
  );

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a11-liquidity-policy-approved-activation-v1',
    'policyId',p_policy_id,
    'approvalEnvelopeValidated',true,
    'approvalValidation',v_validation,
    'derivedMaxLagSeconds',v_max_lag_seconds,
    'publicationPolicyInserted',true,
    'freshnessPolicyInserted',true,
    'schedulerActivated',false
  );
end;
$$;

-- Tombstone the legacy object-only path. The historical migration remains immutable;
-- this additive migration replaces only the current function definition.
create or replace function private.activate_analytics_cat_liquidity_policy_v1(
  p_policy_id text,
  p_window_step_seconds integer,
  p_projection_delay_slo_seconds integer,
  p_window_anchor timestamptz,
  p_max_catch_up_windows_per_invocation integer,
  p_approval_evidence jsonb,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'DOKE_ANALYTICS_POLICY_APPROVAL_ENVELOPE_REQUIRED';
end;
$$;

revoke all privileges on function private.canonicalize_analytics_json_v1(jsonb)
from public, anon, authenticated, service_role;

revoke all privileges on function private.validate_analytics_cat_liquidity_policy_approval_envelope_v1(
  text,text,text,text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) from public, anon, authenticated, service_role;

revoke all privileges on function private.activate_analytics_cat_liquidity_policy_approved_v1(
  text,text,text,text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) from public, anon, authenticated, service_role;

revoke all privileges on function private.activate_analytics_cat_liquidity_policy_v1(
  text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) from public, anon, authenticated, service_role;

comment on function private.canonicalize_analytics_json_v1(jsonb) is
  'ANA-A11 canonical JSON encoder used only for approval-envelope SHA-256 verification. Objects are key-sorted recursively and arrays preserve order.';

comment on function private.validate_analytics_cat_liquidity_policy_approval_envelope_v1(
  text,text,text,text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) is
  'ANA-A11 owner-only runtime approval-envelope validator. Binds exact repository/matrix expectations, raw explicit authorization digest, policy identity, scalar values, effective window, boundaries and canonical evidence digest.';

comment on function private.activate_analytics_cat_liquidity_policy_approved_v1(
  text,text,text,text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) is
  'ANA-A11 owner-only approved activation boundary. Validates the canonical approval envelope before atomically inserting publication + freshness policy rows. Creates no cron and activates no scheduler.';

comment on function private.activate_analytics_cat_liquidity_policy_v1(
  text,integer,integer,timestamptz,integer,jsonb,timestamptz,timestamptz
) is
  'ANA-A11 legacy activation tombstone. Runtime policy insertion requires the approved envelope-aware activation function.';
