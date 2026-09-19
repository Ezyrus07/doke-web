-- PROF-001 / PROF-B04
-- Versioned KYC evidence retention policy authority.
-- SEALED: this migration defines policy/evaluation only. It does not seed an approved
-- policy and it does not create any physical Storage deletion authority.

do $preflight$
begin
  if to_regclass('private.professional_kyc_gc_runs') is null
     or to_regclass('private.professional_kyc_gc_attempts') is null then
    raise exception using errcode='55000', message='DOKE_KYC_RETENTION_G5_REQUIRED';
  end if;
end
$preflight$;

create table private.professional_kyc_retention_policies (
  id uuid primary key default gen_random_uuid(),
  policy_key text not null check (char_length(trim(policy_key)) between 1 and 120),
  policy_version integer not null check (policy_version>0),
  policy_state text not null check (policy_state in ('draft','approved')),
  retention_mode text not null check (retention_mode in ('elapsed_interval','hold_only')),
  anchor_kind text not null check (char_length(trim(anchor_kind)) between 1 and 120),
  retention_interval interval,
  effective_from timestamptz,
  approved_at timestamptz,
  approval_reference text,
  legal_basis_reference text,
  supersedes_policy_id uuid
    references private.professional_kyc_retention_policies(id) on delete restrict,
  created_at timestamptz not null default now(),
  created_by_reference text,
  unique(policy_key,policy_version),
  check (
    retention_interval is null
    or retention_interval>interval '0 seconds'
  ),
  check (
    (retention_mode='hold_only' and retention_interval is null)
    or
    (retention_mode='elapsed_interval')
  ),
  check (
    policy_state<>'approved'
    or (
      approved_at is not null
      and effective_from is not null
      and nullif(trim(coalesce(approval_reference,'')),'') is not null
      and nullif(trim(coalesce(legal_basis_reference,'')),'') is not null
      and (
        (retention_mode='elapsed_interval' and retention_interval is not null)
        or
        (retention_mode='hold_only' and retention_interval is null)
      )
    )
  )
);

create index professional_kyc_retention_policies_lookup_idx
  on private.professional_kyc_retention_policies(
    policy_key,policy_version,policy_state,effective_from
  );

revoke all privileges on table private.professional_kyc_retention_policies
  from public,anon,authenticated,service_role;

create or replace function private.guard_professional_kyc_retention_policy_mutation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $function$
begin
  if tg_op='TRUNCATE' then
    raise exception using errcode='55000',message='DOKE_KYC_RETENTION_POLICY_AUDIT_IMMUTABLE';
  end if;

  if tg_op in ('UPDATE','DELETE') and old.policy_state='approved' then
    raise exception using errcode='55000',message='DOKE_KYC_RETENTION_POLICY_APPROVED_IMMUTABLE';
  end if;

  if tg_op='UPDATE'
     and old.policy_state='draft'
     and new.policy_version<>old.policy_version then
    raise exception using errcode='55000',message='DOKE_KYC_RETENTION_POLICY_VERSION_IMMUTABLE';
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_professional_kyc_retention_policy_mutation()
  from public,anon,authenticated,service_role;

create trigger professional_kyc_retention_policy_update_guard
before update on private.professional_kyc_retention_policies
for each row execute function private.guard_professional_kyc_retention_policy_mutation();

create trigger professional_kyc_retention_policy_delete_guard
before delete on private.professional_kyc_retention_policies
for each row execute function private.guard_professional_kyc_retention_policy_mutation();

create trigger professional_kyc_retention_policy_truncate_guard
before truncate on private.professional_kyc_retention_policies
for each statement execute function private.guard_professional_kyc_retention_policy_mutation();

create or replace function private.evaluate_professional_kyc_retention_policy(
  p_policy_key text,
  p_policy_version integer,
  p_anchor_kind text,
  p_anchor_at timestamptz,
  p_evaluation_time timestamptz default now(),
  p_legal_hold boolean default false
)
returns table(
  retention_action text,
  reason_code text,
  eligible_at timestamptz,
  execution_gate text,
  policy_id uuid,
  frozen_policy_key text,
  frozen_policy_version integer,
  frozen_anchor_kind text,
  frozen_anchor_at timestamptz
)
language plpgsql
stable
set search_path=pg_catalog
as $function$
declare
  v_policy private.professional_kyc_retention_policies%rowtype;
  v_eval timestamptz:=coalesce(p_evaluation_time,now());
  v_eligible timestamptz;
begin
  select *
    into v_policy
    from private.professional_kyc_retention_policies p
   where p.policy_key=nullif(trim(coalesce(p_policy_key,'')),'')
     and p.policy_version=p_policy_version;

  if not found then
    return query select
      'HOLD'::text,'POLICY_MISSING'::text,null::timestamptz,null::text,
      null::uuid,nullif(trim(coalesce(p_policy_key,'')),''),
      p_policy_version,nullif(trim(coalesce(p_anchor_kind,'')),''),
      p_anchor_at;
    return;
  end if;

  if coalesce(p_legal_hold,false) then
    return query select
      'HOLD'::text,'LEGAL_HOLD'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  if v_policy.policy_state<>'approved' then
    return query select
      'HOLD'::text,'POLICY_NOT_APPROVED'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  if v_policy.effective_from is null or v_policy.effective_from>v_eval then
    return query select
      'HOLD'::text,'POLICY_NOT_EFFECTIVE'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  if v_policy.retention_mode='hold_only' then
    return query select
      'HOLD'::text,'POLICY_HOLD_ONLY'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  if nullif(trim(coalesce(p_anchor_kind,'')),'') is distinct from v_policy.anchor_kind then
    return query select
      'HOLD'::text,'ANCHOR_KIND_MISMATCH'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  if p_anchor_at is null then
    return query select
      'HOLD'::text,'ANCHOR_MISSING'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,null::timestamptz;
    return;
  end if;

  if v_policy.retention_interval is null
     or v_policy.retention_interval<=interval '0 seconds' then
    return query select
      'HOLD'::text,'RETENTION_INTERVAL_MISSING'::text,null::timestamptz,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  v_eligible:=p_anchor_at+v_policy.retention_interval;

  if v_eval<v_eligible then
    return query select
      'HOLD'::text,'RETENTION_NOT_ELAPSED'::text,v_eligible,null::text,
      v_policy.id,v_policy.policy_key,v_policy.policy_version,
      v_policy.anchor_kind,p_anchor_at;
    return;
  end if;

  return query select
    'POLICY_ELAPSED_TECHNICAL_ALLOW'::text,
    'RETENTION_ELAPSED'::text,
    v_eligible,
    'PROF_B05_G7_PHYSICAL_GC'::text,
    v_policy.id,
    v_policy.policy_key,
    v_policy.policy_version,
    v_policy.anchor_kind,
    p_anchor_at;
end;
$function$;

revoke all on function private.evaluate_professional_kyc_retention_policy(
  text,integer,text,timestamptz,timestamptz,boolean
) from public,anon,authenticated,service_role;


create or replace function private.evaluate_professional_kyc_gc_retention_gate(
  p_technical_action text,
  p_technical_execution_gate text,
  p_policy_key text,
  p_policy_version integer,
  p_anchor_kind text,
  p_anchor_at timestamptz,
  p_evaluation_time timestamptz default now(),
  p_legal_hold boolean default false
)
returns table(
  final_action text,
  reason_code text,
  eligible_at timestamptz,
  execution_gate text,
  frozen_policy_id uuid,
  frozen_policy_key text,
  frozen_policy_version integer,
  frozen_anchor_kind text,
  frozen_anchor_at timestamptz
)
language plpgsql
stable
set search_path=pg_catalog
as $function$
declare
  v_eval record;
begin
  if coalesce(p_technical_action,'')<>'GC_TECHNICALLY_ELIGIBLE'
     or coalesce(p_technical_execution_gate,'')<>'PROF_B04_RETENTION' then
    return query select
      'HOLD'::text,
      'TECHNICAL_ELIGIBILITY_REQUIRED'::text,
      null::timestamptz,
      null::text,
      null::uuid,
      nullif(trim(coalesce(p_policy_key,'')),''),
      p_policy_version,
      nullif(trim(coalesce(p_anchor_kind,'')),''),
      p_anchor_at;
    return;
  end if;

  select *
    into v_eval
    from private.evaluate_professional_kyc_retention_policy(
      p_policy_key,
      p_policy_version,
      p_anchor_kind,
      p_anchor_at,
      p_evaluation_time,
      p_legal_hold
    );

  return query select
    v_eval.retention_action,
    v_eval.reason_code,
    v_eval.eligible_at,
    v_eval.execution_gate,
    v_eval.policy_id,
    v_eval.frozen_policy_key,
    v_eval.frozen_policy_version,
    v_eval.frozen_anchor_kind,
    v_eval.frozen_anchor_at;
end;
$function$;

revoke all on function private.evaluate_professional_kyc_gc_retention_gate(
  text,text,text,integer,text,timestamptz,timestamptz,boolean
) from public,anon,authenticated,service_role;

comment on function private.evaluate_professional_kyc_gc_retention_gate(
  text,text,text,integer,text,timestamptz,timestamptz,boolean
) is
  'Bridges G5 technical eligibility to versioned B04 retention evaluation. Never performs physical deletion.';


create table private.professional_kyc_governance_versions (
  id uuid primary key default gen_random_uuid(),
  governance_key text not null check (char_length(trim(governance_key)) between 1 and 120),
  governance_version integer not null check (governance_version>0),
  governance_state text not null check (governance_state in ('draft','approved')),
  retention_policy_id uuid not null
    references private.professional_kyc_retention_policies(id) on delete restrict,
  verification_provider_mode text not null check (
    verification_provider_mode in ('internal_manual_review','external_verification_provider')
  ),
  provider_reference text,
  biometric_processing_mode text not null check (
    biometric_processing_mode in ('none','human_visual_review','automated_biometric_verification')
  ),
  rejection_policy_reference text,
  appeal_policy_reference text,
  privacy_notice_reference text,
  processing_record_reference text,
  risk_assessment_reference text,
  effective_from timestamptz,
  approved_at timestamptz,
  approval_reference text,
  created_at timestamptz not null default now(),
  unique(governance_key,governance_version),
  check (
    governance_state<>'approved'
    or (
      effective_from is not null
      and approved_at is not null
      and nullif(trim(coalesce(provider_reference,'')),'') is not null
      and nullif(trim(coalesce(rejection_policy_reference,'')),'') is not null
      and nullif(trim(coalesce(appeal_policy_reference,'')),'') is not null
      and nullif(trim(coalesce(privacy_notice_reference,'')),'') is not null
      and nullif(trim(coalesce(processing_record_reference,'')),'') is not null
      and nullif(trim(coalesce(approval_reference,'')),'') is not null
      and (
        biometric_processing_mode<>'automated_biometric_verification'
        or nullif(trim(coalesce(risk_assessment_reference,'')),'') is not null
      )
    )
  )
);

create index professional_kyc_governance_versions_lookup_idx
  on private.professional_kyc_governance_versions(
    governance_key,governance_version,governance_state,effective_from
  );

revoke all privileges on table private.professional_kyc_governance_versions
  from public,anon,authenticated,service_role;

create or replace function private.guard_professional_kyc_governance_mutation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $function$
begin
  if tg_op='TRUNCATE' then
    raise exception using errcode='55000',message='DOKE_KYC_GOVERNANCE_AUDIT_IMMUTABLE';
  end if;

  if tg_op in ('UPDATE','DELETE') and old.governance_state='approved' then
    raise exception using errcode='55000',message='DOKE_KYC_GOVERNANCE_APPROVED_IMMUTABLE';
  end if;

  if tg_op='UPDATE'
     and old.governance_state='draft'
     and new.governance_version<>old.governance_version then
    raise exception using errcode='55000',message='DOKE_KYC_GOVERNANCE_VERSION_IMMUTABLE';
  end if;

  if tg_op='DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

revoke all on function private.guard_professional_kyc_governance_mutation()
  from public,anon,authenticated,service_role;

create trigger professional_kyc_governance_update_guard
before update on private.professional_kyc_governance_versions
for each row execute function private.guard_professional_kyc_governance_mutation();

create trigger professional_kyc_governance_delete_guard
before delete on private.professional_kyc_governance_versions
for each row execute function private.guard_professional_kyc_governance_mutation();

create trigger professional_kyc_governance_truncate_guard
before truncate on private.professional_kyc_governance_versions
for each statement execute function private.guard_professional_kyc_governance_mutation();

create or replace function private.evaluate_professional_kyc_governance(
  p_governance_key text,
  p_governance_version integer,
  p_evaluation_time timestamptz default now()
)
returns table(
  governance_ready boolean,
  reason_code text,
  governance_id uuid,
  retention_policy_id uuid,
  verification_provider_mode text,
  biometric_processing_mode text,
  execution_gate text
)
language plpgsql
stable
set search_path=pg_catalog
as $function$
declare
  v_governance private.professional_kyc_governance_versions%rowtype;
  v_retention private.professional_kyc_retention_policies%rowtype;
  v_eval timestamptz:=coalesce(p_evaluation_time,now());
begin
  select *
    into v_governance
    from private.professional_kyc_governance_versions g
   where g.governance_key=nullif(trim(coalesce(p_governance_key,'')),'')
     and g.governance_version=p_governance_version;

  if not found then
    return query select
      false,'GOVERNANCE_MISSING'::text,null::uuid,null::uuid,
      null::text,null::text,null::text;
    return;
  end if;

  if v_governance.governance_state<>'approved' then
    return query select
      false,'GOVERNANCE_NOT_APPROVED'::text,v_governance.id,v_governance.retention_policy_id,
      v_governance.verification_provider_mode,v_governance.biometric_processing_mode,null::text;
    return;
  end if;

  if v_governance.effective_from is null or v_governance.effective_from>v_eval then
    return query select
      false,'GOVERNANCE_NOT_EFFECTIVE'::text,v_governance.id,v_governance.retention_policy_id,
      v_governance.verification_provider_mode,v_governance.biometric_processing_mode,null::text;
    return;
  end if;

  select *
    into v_retention
    from private.professional_kyc_retention_policies p
   where p.id=v_governance.retention_policy_id;

  if not found
     or v_retention.policy_state<>'approved'
     or v_retention.effective_from is null
     or v_retention.effective_from>v_eval then
    return query select
      false,'RETENTION_POLICY_NOT_APPROVED'::text,v_governance.id,v_governance.retention_policy_id,
      v_governance.verification_provider_mode,v_governance.biometric_processing_mode,null::text;
    return;
  end if;

  return query select
    true,
    'GOVERNANCE_APPROVED'::text,
    v_governance.id,
    v_governance.retention_policy_id,
    v_governance.verification_provider_mode,
    v_governance.biometric_processing_mode,
    'PROF_B05_G7_PHYSICAL_GC'::text;
end;
$function$;

revoke all on function private.evaluate_professional_kyc_governance(
  text,integer,timestamptz
) from public,anon,authenticated,service_role;

comment on table private.professional_kyc_governance_versions is
  'Versioned KYC governance approval: provider mode, biometric mode, rejection/appeal/privacy/risk references and approved retention policy. No approved version is seeded.';
comment on function private.evaluate_professional_kyc_governance(
  text,integer,timestamptz
) is
  'Returns governance readiness only. Does not perform KYC review, retention action or physical GC.';

comment on table private.professional_kyc_retention_policies is
  'Versioned KYC evidence retention authority. No approved policy is seeded by migration.';
comment on function private.evaluate_professional_kyc_retention_policy(
  text,integer,text,timestamptz,timestamptz,boolean
) is
  'Evaluates approved retention policy only. RETENTION_ELAPSED still requires PROF_B05_G7_PHYSICAL_GC and cannot delete Storage.';
