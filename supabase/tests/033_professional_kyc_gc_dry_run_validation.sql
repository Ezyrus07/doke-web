-- PROF-001 / PROF-B05 G5 validation
-- Transaction-scoped dry-run validation. No Storage object is mutated.

begin;

do $structural$
declare
  v_def text;
begin
  if to_regclass('private.professional_kyc_gc_runs') is null
     or to_regclass('private.professional_kyc_gc_attempts') is null then
    raise exception 'PROF_B05_GC_DRY_RUN_SCHEMA_MISSING';
  end if;

  if exists (
    select 1
      from information_schema.columns
     where table_schema='private'
       and table_name in ('professional_kyc_gc_runs','professional_kyc_gc_attempts')
       and column_name in ('claim_token','claimed_at','lease_expires_at','deleted_at','delete_status')
  ) then
    raise exception 'PROF_B05_GC_PRE_B04_EXECUTION_COLUMN_PRESENT';
  end if;

  if has_function_privilege(
       'authenticated',
       'public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)',
       'EXECUTE'
     ) then
    raise exception 'PROF_B05_GC_DRY_RUN_BROWSER_EXECUTE_ALLOWED';
  end if;

  if not has_function_privilege(
       'service_role',
       'public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)',
       'EXECUTE'
     ) then
    raise exception 'PROF_B05_GC_DRY_RUN_SERVICE_EXECUTE_MISSING';
  end if;

  select pg_get_functiondef(
    'public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)'::regprocedure
  ) into v_def;

  if lower(v_def) like '%delete from storage.objects%'
     or lower(v_def) like '%truncate%storage.objects%'
     or lower(v_def) like '%claim_token%'
     or lower(v_def) like '%lease_expires_at%' then
    raise exception 'PROF_B05_GC_PRE_B04_EXECUTION_AUTHORITY_DETECTED';
  end if;
end;
$structural$;

do $classifier$
declare
  v_total integer;
  v_passed integer;
begin
  with scenarios(
    name,reference_count,identity_complete,is_locked_path,evidence_identity_count,
    intent_match_count,path_manifest_match,intent_status,expires_delta,consumed,
    expected_action,expected_reason,expected_gate
  ) as (
    values
    ('referenced_legacy',1,true,false,0,0,false,null::text,null::interval,false,'KEEP_REFERENCE','CURRENT_KYC_REFERENCE',null::text),
    ('referenced_locked',1,true,true,1,1,true,'consumed',interval '-1 hour',true,'KEEP_REFERENCE','CURRENT_KYC_REFERENCE',null),
    ('missing_identity',0,false,true,0,1,true,'expired',interval '-1 hour',false,'HOLD_INVESTIGATE','OBJECT_IDENTITY_MISSING',null),
    ('legacy_orphan',0,true,false,0,0,false,null::text,null::interval,false,'HOLD_INVESTIGATE','LEGACY_OR_UNKNOWN_PROVENANCE',null),
    ('historical_evidence',0,true,true,1,1,true,'consumed',interval '-1 day',true,'HOLD_INVESTIGATE','HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED',null),
    ('historical_legacy_evidence',0,true,false,1,0,false,null::text,null::interval,false,'HOLD_INVESTIGATE','HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED',null),
    ('no_intent',0,true,true,0,0,false,null::text,null::interval,false,'HOLD_INVESTIGATE','INTENT_PROVENANCE_AMBIGUOUS',null),
    ('duplicate_intent',0,true,true,0,2,false,'expired',interval '-1 hour',false,'HOLD_INVESTIGATE','INTENT_PROVENANCE_AMBIGUOUS',null),
    ('path_mismatch',0,true,true,0,1,false,'expired',interval '-1 hour',false,'HOLD_INVESTIGATE','INTENT_OR_MANIFEST_MISMATCH',null),
    ('consumed',0,true,true,0,1,true,'consumed',interval '-1 hour',true,'HOLD_INVESTIGATE','CONSUMED_PROVENANCE',null),
    ('prepared_active',0,true,true,0,1,true,'prepared',interval '1 hour',false,'KEEP_ACTIVE_INTENT','ACTIVE_PREPARED_INTENT',null),
    ('prepared_expired',0,true,true,0,1,true,'prepared',interval '-1 hour',false,'GC_TECHNICALLY_ELIGIBLE','EXPIRED_NEVER_CONSUMED','PROF_B04_RETENTION'),
    ('expired',0,true,true,0,1,true,'expired',interval '-1 hour',false,'GC_TECHNICALLY_ELIGIBLE','EXPIRED_NEVER_CONSUMED','PROF_B04_RETENTION'),
    ('cancelled',0,true,true,0,1,true,'cancelled',interval '-1 hour',false,'HOLD_INVESTIGATE','CANCELLATION_ANCHOR_MISSING',null),
    ('expired_future',0,true,true,0,1,true,'expired',interval '1 hour',false,'HOLD_INVESTIGATE','UNKNOWN',null),
    ('unknown_status',0,true,true,0,1,true,'mystery',interval '-1 hour',false,'HOLD_INVESTIGATE','UNKNOWN',null),
    ('manifest_mismatch',0,true,true,0,1,false,'prepared',interval '1 hour',false,'HOLD_INVESTIGATE','INTENT_OR_MANIFEST_MISMATCH',null)
  ),
  evaluated as (
    select s.*,
           c.technical_action,
           c.reason_code,
           c.execution_gate
      from scenarios s
      cross join lateral private.classify_professional_kyc_gc_object(
        s.reference_count,
        s.identity_complete,
        s.is_locked_path,
        s.evidence_identity_count,
        s.intent_match_count,
        s.path_manifest_match,
        s.intent_status,
        case when s.expires_delta is null then null else now()+s.expires_delta end,
        case when s.consumed then now()-interval '1 minute' else null end,
        now()
      ) c
  )
  select count(*),
         count(*) filter (
           where technical_action=expected_action
             and reason_code=expected_reason
             and execution_gate is not distinct from expected_gate
         )
    into v_total,v_passed
    from evaluated;

  if v_total<>17 or v_passed<>17 then
    raise exception 'PROF_B05_GC_CLASSIFIER_MATRIX_FAILED:%/%',v_passed,v_total;
  end if;
end;
$classifier$;

do $integrated$
declare
  v_key text:='prof-b05-g5-'||gen_random_uuid()::text;
  v_result jsonb;
  v_run_id uuid;
  v_object_count integer;
  v_attempt_count integer;
begin
  select public.run_professional_kyc_gc_dry_run_internal(v_key,now())
    into v_result;

  if v_result->>'mode'<>'dry_run' then
    raise exception 'PROF_B05_GC_MODE_INVALID';
  end if;

  v_run_id:=(v_result->>'runId')::uuid;

  select count(*) into v_object_count
    from storage.objects
   where bucket_id='professional-verification-media';

  select count(*) into v_attempt_count
    from private.professional_kyc_gc_attempts
   where run_id=v_run_id;

  if v_attempt_count<>v_object_count then
    raise exception 'PROF_B05_GC_ATTEMPT_COVERAGE_MISMATCH:%/%',v_attempt_count,v_object_count;
  end if;

  if exists (
    select 1
      from private.professional_kyc_gc_attempts a
     where a.run_id=v_run_id
       and a.reference_count>0
       and (a.technical_action<>'KEEP_REFERENCE' or a.reason_code<>'CURRENT_KYC_REFERENCE')
  ) then
    raise exception 'PROF_B05_GC_REFERENCE_PRECEDENCE_BROKEN';
  end if;

  if exists (
    select 1
      from private.professional_kyc_gc_attempts a
     where a.run_id=v_run_id
       and a.technical_action='GC_TECHNICALLY_ELIGIBLE'
       and a.execution_gate is distinct from 'PROF_B04_RETENTION'
  ) then
    raise exception 'PROF_B05_GC_RETENTION_GATE_MISSING';
  end if;
end;
$integrated$;

rollback;
