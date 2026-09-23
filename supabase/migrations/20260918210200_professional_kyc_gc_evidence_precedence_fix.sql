-- PROF-001 / PROF-B05 G5 forward fix
-- Historical evidence identity must take precedence over legacy/non-locked path classification.

create or replace function private.classify_professional_kyc_gc_object(
  p_reference_count integer,
  p_identity_complete boolean,
  p_is_locked_path boolean,
  p_evidence_identity_count integer,
  p_intent_match_count integer,
  p_path_manifest_match boolean,
  p_intent_status text,
  p_expires_at timestamptz,
  p_consumed_at timestamptz,
  p_evaluation_time timestamptz
)
returns table(
  technical_action text,
  reason_code text,
  execution_gate text
)
language sql
immutable
set search_path=pg_catalog
as $function$
  select
    case
      when coalesce(p_reference_count,0)>0 then 'KEEP_REFERENCE'
      when not coalesce(p_identity_complete,false) then 'HOLD_INVESTIGATE'
      when coalesce(p_evidence_identity_count,0)>0 then 'HOLD_INVESTIGATE'
      when not coalesce(p_is_locked_path,false) then 'HOLD_INVESTIGATE'
      when coalesce(p_intent_match_count,0)<>1 then 'HOLD_INVESTIGATE'
      when not coalesce(p_path_manifest_match,false) then 'HOLD_INVESTIGATE'
      when p_consumed_at is not null or coalesce(p_intent_status,'')='consumed' then 'HOLD_INVESTIGATE'
      when coalesce(p_intent_status,'')='prepared'
        and p_expires_at is not null
        and p_expires_at>p_evaluation_time then 'KEEP_ACTIVE_INTENT'
      when coalesce(p_intent_status,'') in ('prepared','expired')
        and p_expires_at is not null
        and p_expires_at<=p_evaluation_time then 'GC_TECHNICALLY_ELIGIBLE'
      when coalesce(p_intent_status,'')='cancelled' then 'HOLD_INVESTIGATE'
      else 'HOLD_INVESTIGATE'
    end,
    case
      when coalesce(p_reference_count,0)>0 then 'CURRENT_KYC_REFERENCE'
      when not coalesce(p_identity_complete,false) then 'OBJECT_IDENTITY_MISSING'
      when coalesce(p_evidence_identity_count,0)>0 then 'HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED'
      when not coalesce(p_is_locked_path,false) then 'LEGACY_OR_UNKNOWN_PROVENANCE'
      when coalesce(p_intent_match_count,0)<>1 then 'INTENT_PROVENANCE_AMBIGUOUS'
      when not coalesce(p_path_manifest_match,false) then 'INTENT_OR_MANIFEST_MISMATCH'
      when p_consumed_at is not null or coalesce(p_intent_status,'')='consumed' then 'CONSUMED_PROVENANCE'
      when coalesce(p_intent_status,'')='prepared'
        and p_expires_at is not null
        and p_expires_at>p_evaluation_time then 'ACTIVE_PREPARED_INTENT'
      when coalesce(p_intent_status,'') in ('prepared','expired')
        and p_expires_at is not null
        and p_expires_at<=p_evaluation_time then 'EXPIRED_NEVER_CONSUMED'
      when coalesce(p_intent_status,'')='cancelled' then 'CANCELLATION_ANCHOR_MISSING'
      else 'UNKNOWN'
    end,
    case
      when coalesce(p_reference_count,0)=0
       and coalesce(p_identity_complete,false)
       and coalesce(p_evidence_identity_count,0)=0
       and coalesce(p_is_locked_path,false)
       and coalesce(p_intent_match_count,0)=1
       and coalesce(p_path_manifest_match,false)
       and p_consumed_at is null
       and coalesce(p_intent_status,'') in ('prepared','expired')
       and p_expires_at is not null
       and p_expires_at<=p_evaluation_time
      then 'PROF_B04_RETENTION'
      else null
    end
$function$;

revoke all on function private.classify_professional_kyc_gc_object(
  integer,boolean,boolean,integer,integer,boolean,text,timestamptz,timestamptz,timestamptz
) from public, anon, authenticated, service_role;
