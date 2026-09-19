-- PROF-001 / PROF-B04 retention policy validation
-- Transaction-scoped only. No Storage object mutation and no physical GC authority.

begin;

do $structural$
declare
  v_def text;
begin
  if to_regclass('private.professional_kyc_retention_policies') is null then
    raise exception 'PROF_B04_RETENTION_POLICY_TABLE_MISSING';
  end if;

  if has_table_privilege(
       'authenticated',
       'private.professional_kyc_retention_policies',
       'SELECT,INSERT,UPDATE,DELETE'
     )
     or has_table_privilege(
       'service_role',
       'private.professional_kyc_retention_policies',
       'SELECT,INSERT,UPDATE,DELETE'
     ) then
    raise exception 'PROF_B04_RETENTION_DIRECT_GRANT_PRESENT';
  end if;

  if has_function_privilege(
       'authenticated',
       'private.evaluate_professional_kyc_retention_policy(text,integer,text,timestamptz,timestamptz,boolean)',
       'EXECUTE'
     )
     or has_function_privilege(
       'service_role',
       'private.evaluate_professional_kyc_retention_policy(text,integer,text,timestamptz,timestamptz,boolean)',
       'EXECUTE'
     ) then
    raise exception 'PROF_B04_RETENTION_EVALUATOR_DIRECT_EXECUTE_PRESENT';
  end if;

  select pg_get_functiondef(
    'private.evaluate_professional_kyc_retention_policy(text,integer,text,timestamptz,timestamptz,boolean)'::regprocedure
  ) into v_def;

  if lower(v_def) like '%delete from storage.objects%'
     or lower(v_def) like '%storage.from(%'
     or lower(v_def) like '%claim_token%'
     or lower(v_def) like '%lease_expires_at%' then
    raise exception 'PROF_B04_PHYSICAL_GC_AUTHORITY_DETECTED';
  end if;

  if exists(
    select 1
    from private.professional_kyc_retention_policies
    where policy_state='approved'
  ) then
    raise exception 'PROF_B04_APPROVED_POLICY_SEEDED_UNEXPECTEDLY';
  end if;
end;
$structural$;

do $policy_matrix$
declare
  v_now timestamptz:=now();
  v_policy_id uuid;
  v_action text;
  v_reason text;
  v_eligible timestamptz;
  v_gate text;
begin
  select retention_action,reason_code,eligible_at,execution_gate
    into v_action,v_reason,v_eligible,v_gate
  from private.evaluate_professional_kyc_retention_policy(
    'missing-policy',1,'intent_expires_at',v_now-interval '10 days',v_now,false
  );

  if v_action<>'HOLD' or v_reason<>'POLICY_MISSING' or v_gate is not null then
    raise exception 'PROF_B04_MISSING_POLICY_NOT_HELD';
  end if;

  insert into private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,retention_mode,anchor_kind,
    retention_interval,effective_from,approval_reference,legal_basis_reference
  ) values(
    'draft-policy',1,'draft','elapsed_interval','intent_expires_at',
    interval '30 days',v_now-interval '1 day',null,null
  );

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'draft-policy',1,'intent_expires_at',v_now-interval '60 days',v_now,false
  );
  if v_action<>'HOLD' or v_reason<>'POLICY_NOT_APPROVED' then
    raise exception 'PROF_B04_DRAFT_POLICY_NOT_HELD';
  end if;

  begin
    insert into private.professional_kyc_retention_policies(
      policy_key,policy_version,policy_state,retention_mode,anchor_kind,
      retention_interval,effective_from,approved_at,approval_reference,legal_basis_reference
    ) values(
      'invalid-approved',1,'approved','elapsed_interval','decision_at',
      null,v_now-interval '1 day',v_now,'LEGAL-TEST','LGPD-TEST'
    );
    raise exception 'PROF_B04_APPROVED_POLICY_WITHOUT_INTERVAL_ALLOWED';
  exception
    when check_violation then null;
  end;

  insert into private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,retention_mode,anchor_kind,
    retention_interval,effective_from,approved_at,approval_reference,legal_basis_reference
  ) values(
    'future-policy',1,'approved','elapsed_interval','decision_at',
    interval '30 days',v_now+interval '1 day',v_now,'LEGAL-TEST','LGPD-TEST'
  );

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'future-policy',1,'decision_at',v_now-interval '60 days',v_now,false
  );
  if v_action<>'HOLD' or v_reason<>'POLICY_NOT_EFFECTIVE' then
    raise exception 'PROF_B04_FUTURE_POLICY_NOT_HELD';
  end if;

  insert into private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,retention_mode,anchor_kind,
    retention_interval,effective_from,approved_at,approval_reference,legal_basis_reference
  ) values(
    'hold-policy',1,'approved','hold_only','decision_at',
    null,v_now-interval '1 day',v_now,'LEGAL-TEST','LGPD-TEST'
  );

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'hold-policy',1,'decision_at',v_now-interval '60 days',v_now,false
  );
  if v_action<>'HOLD' or v_reason<>'POLICY_HOLD_ONLY' then
    raise exception 'PROF_B04_HOLD_ONLY_POLICY_NOT_HELD';
  end if;

  insert into private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,retention_mode,anchor_kind,
    retention_interval,effective_from,approved_at,approval_reference,legal_basis_reference
  ) values(
    'elapsed-policy',1,'approved','elapsed_interval','decision_at',
    interval '30 days',v_now-interval '1 day',v_now,'LEGAL-TEST','LGPD-TEST'
  ) returning id into v_policy_id;

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'elapsed-policy',1,'submitted_at',v_now-interval '60 days',v_now,false
  );
  if v_action<>'HOLD' or v_reason<>'ANCHOR_KIND_MISMATCH' then
    raise exception 'PROF_B04_ANCHOR_KIND_MISMATCH_NOT_HELD';
  end if;

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'elapsed-policy',1,'decision_at',null,v_now,false
  );
  if v_action<>'HOLD' or v_reason<>'ANCHOR_MISSING' then
    raise exception 'PROF_B04_MISSING_ANCHOR_NOT_HELD';
  end if;

  select retention_action,reason_code
    into v_action,v_reason
  from private.evaluate_professional_kyc_retention_policy(
    'elapsed-policy',1,'decision_at',v_now-interval '60 days',v_now,true
  );
  if v_action<>'HOLD' or v_reason<>'LEGAL_HOLD' then
    raise exception 'PROF_B04_LEGAL_HOLD_NOT_HELD';
  end if;

  select retention_action,reason_code,eligible_at,execution_gate
    into v_action,v_reason,v_eligible,v_gate
  from private.evaluate_professional_kyc_retention_policy(
    'elapsed-policy',1,'decision_at',v_now-interval '10 days',v_now,false
  );
  if v_action<>'HOLD'
     or v_reason<>'RETENTION_NOT_ELAPSED'
     or v_eligible is null
     or v_gate is not null then
    raise exception 'PROF_B04_NOT_ELAPSED_POLICY_INVALID';
  end if;

  select retention_action,reason_code,eligible_at,execution_gate
    into v_action,v_reason,v_eligible,v_gate
  from private.evaluate_professional_kyc_retention_policy(
    'elapsed-policy',1,'decision_at',v_now-interval '60 days',v_now,false
  );
  if v_action<>'POLICY_ELAPSED_TECHNICAL_ALLOW'
     or v_reason<>'RETENTION_ELAPSED'
     or v_eligible is null
     or v_gate<>'PROF_B05_G7_PHYSICAL_GC' then
    raise exception 'PROF_B04_ELAPSED_POLICY_GATE_INVALID';
  end if;

  begin
    update private.professional_kyc_retention_policies
       set approval_reference='CHANGED'
     where id=v_policy_id;
    raise exception 'PROF_B04_APPROVED_POLICY_UPDATE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_RETENTION_POLICY_APPROVED_IMMUTABLE' then raise; end if;
  end;

  begin
    delete from private.professional_kyc_retention_policies
     where id=v_policy_id;
    raise exception 'PROF_B04_APPROVED_POLICY_DELETE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_RETENTION_POLICY_APPROVED_IMMUTABLE' then raise; end if;
  end;

  begin
    truncate table private.professional_kyc_retention_policies;
    raise exception 'PROF_B04_RETENTION_POLICY_TRUNCATE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_RETENTION_POLICY_AUDIT_IMMUTABLE' then raise; end if;
  end;
end;
$policy_matrix$;


do $bridge$
declare
  v_now timestamptz:=now();
  v_action text;
  v_reason text;
  v_gate text;
begin
  select final_action,reason_code,execution_gate
    into v_action,v_reason,v_gate
  from private.evaluate_professional_kyc_gc_retention_gate(
    'HOLD_INVESTIGATE',
    null,
    'missing-policy',
    1,
    'decision_at',
    v_now-interval '1 day',
    v_now,
    false
  );

  if v_action<>'HOLD'
     or v_reason<>'TECHNICAL_ELIGIBILITY_REQUIRED'
     or v_gate is not null then
    raise exception 'PROF_B04_TECHNICAL_GATE_BYPASS_ALLOWED';
  end if;

  select final_action,reason_code,execution_gate
    into v_action,v_reason,v_gate
  from private.evaluate_professional_kyc_gc_retention_gate(
    'GC_TECHNICALLY_ELIGIBLE',
    'PROF_B04_RETENTION',
    'missing-policy',
    1,
    'decision_at',
    v_now-interval '1 day',
    v_now,
    false
  );

  if v_action<>'HOLD'
     or v_reason<>'POLICY_MISSING'
     or v_gate is not null then
    raise exception 'PROF_B04_MISSING_POLICY_BRIDGE_NOT_HELD';
  end if;
end;
$bridge$;


do $governance$
declare
  v_now timestamptz:=now();
  v_retention_id uuid;
  v_governance_id uuid;
  v_ready boolean;
  v_reason text;
  v_gate text;
begin
  select governance_ready,reason_code,execution_gate
    into v_ready,v_reason,v_gate
  from private.evaluate_professional_kyc_governance(
    'missing-governance',1,v_now
  );

  if v_ready or v_reason<>'GOVERNANCE_MISSING' or v_gate is not null then
    raise exception 'PROF_B04_GOVERNANCE_MISSING_NOT_HELD';
  end if;

  insert into private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,retention_mode,anchor_kind,
    retention_interval,effective_from,approved_at,approval_reference,legal_basis_reference
  ) values(
    'governance-retention',1,'approved','elapsed_interval','decision_at',
    interval '30 days',v_now-interval '1 day',v_now,'LEGAL-TEST','LGPD-TEST'
  ) returning id into v_retention_id;

  insert into private.professional_kyc_governance_versions(
    governance_key,governance_version,governance_state,retention_policy_id,
    verification_provider_mode,provider_reference,biometric_processing_mode,
    rejection_policy_reference,appeal_policy_reference,privacy_notice_reference,
    processing_record_reference,risk_assessment_reference
  ) values(
    'draft-governance',1,'draft',v_retention_id,
    'internal_manual_review','internal-manual-test','human_visual_review',
    null,null,null,null,null
  );

  select governance_ready,reason_code
    into v_ready,v_reason
  from private.evaluate_professional_kyc_governance(
    'draft-governance',1,v_now
  );
  if v_ready or v_reason<>'GOVERNANCE_NOT_APPROVED' then
    raise exception 'PROF_B04_DRAFT_GOVERNANCE_NOT_HELD';
  end if;

  begin
    insert into private.professional_kyc_governance_versions(
      governance_key,governance_version,governance_state,retention_policy_id,
      verification_provider_mode,provider_reference,biometric_processing_mode,
      rejection_policy_reference,appeal_policy_reference,privacy_notice_reference,
      processing_record_reference,risk_assessment_reference,
      effective_from,approved_at,approval_reference
    ) values(
      'invalid-biometric-governance',1,'approved',v_retention_id,
      'external_verification_provider','provider-test','automated_biometric_verification',
      'reject-test','appeal-test','privacy-test','ropa-test',null,
      v_now-interval '1 day',v_now,'GOV-TEST'
    );
    raise exception 'PROF_B04_BIOMETRIC_APPROVAL_WITHOUT_RISK_ASSESSMENT_ALLOWED';
  exception
    when check_violation then null;
  end;

  insert into private.professional_kyc_governance_versions(
    governance_key,governance_version,governance_state,retention_policy_id,
    verification_provider_mode,provider_reference,biometric_processing_mode,
    rejection_policy_reference,appeal_policy_reference,privacy_notice_reference,
    processing_record_reference,risk_assessment_reference,
    effective_from,approved_at,approval_reference
  ) values(
    'approved-governance',1,'approved',v_retention_id,
    'internal_manual_review','internal-manual-test','human_visual_review',
    'reject-test','appeal-test','privacy-test','ropa-test',null,
    v_now-interval '1 day',v_now,'GOV-TEST'
  ) returning id into v_governance_id;

  select governance_ready,reason_code,execution_gate
    into v_ready,v_reason,v_gate
  from private.evaluate_professional_kyc_governance(
    'approved-governance',1,v_now
  );

  if not v_ready
     or v_reason<>'GOVERNANCE_APPROVED'
     or v_gate<>'PROF_B05_G7_PHYSICAL_GC' then
    raise exception 'PROF_B04_APPROVED_GOVERNANCE_GATE_INVALID';
  end if;

  begin
    update private.professional_kyc_governance_versions
       set provider_reference='changed'
     where id=v_governance_id;
    raise exception 'PROF_B04_APPROVED_GOVERNANCE_UPDATE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_GOVERNANCE_APPROVED_IMMUTABLE' then raise; end if;
  end;

  begin
    delete from private.professional_kyc_governance_versions
     where id=v_governance_id;
    raise exception 'PROF_B04_APPROVED_GOVERNANCE_DELETE_ALLOWED';
  exception
    when sqlstate '55000' then
      if sqlerrm<>'DOKE_KYC_GOVERNANCE_APPROVED_IMMUTABLE' then raise; end if;
  end;
end;
$governance$;

rollback;
