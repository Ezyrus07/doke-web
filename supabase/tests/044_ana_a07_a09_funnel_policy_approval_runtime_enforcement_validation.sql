-- ANA-A07/A09 validation 044: approval-envelope runtime-enforcement candidate.
-- Rollback-only. Verifies structure/privileges after future staging application.
begin;

do $validation$
declare
  v_validator regprocedure;
  v_legacy regprocedure;
begin
  v_validator := pg_catalog.to_regprocedure(
    'private.validate_analytics_a09_funnel_freshness_policy_approval_envelope_v1(text,text,text,text,jsonb,timestamptz,timestamptz)'
  );
  v_legacy := pg_catalog.to_regprocedure(
    'private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz)'
  );

  if v_validator is null then
    raise exception 'VALIDATION_044_VALIDATOR_MISSING';
  end if;
  if v_legacy is null then
    raise exception 'VALIDATION_044_LEGACY_TOMBSTONE_MISSING';
  end if;

  if pg_catalog.has_function_privilege('anon',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated',v_validator,'EXECUTE')
     or pg_catalog.has_function_privilege('service_role',v_validator,'EXECUTE') then
    raise exception 'VALIDATION_044_VALIDATOR_PUBLIC_EXECUTE';
  end if;

  begin
    perform private.activate_analytics_a09_funnel_freshness_policy_v1(
      'ana-a07-a09-funnel-v1-r1',
      '2026-09-24T14:00:00Z'::timestamptz,
      null
    );
    raise exception 'VALIDATION_044_EXPECTED_LEGACY_REJECTION';
  exception when others then
    if sqlerrm='VALIDATION_044_EXPECTED_LEGACY_REJECTION'
       or sqlerrm not like '%DOKE_ANALYTICS_A09_FUNNEL_APPROVAL_ENVELOPE_REQUIRED%' then
      raise;
    end if;
  end;
end;
$validation$;

rollback;
