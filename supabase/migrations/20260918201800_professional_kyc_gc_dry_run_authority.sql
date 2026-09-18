-- PROF-001 / PROF-B05 G5
-- Dry-run-only KYC object classification authority.

do $preflight$
begin
  if to_regclass('private.professional_kyc_evidence_sets') is null
     or to_regclass('private.professional_kyc_evidence_objects') is null then
    raise exception using errcode='55000', message='DOKE_KYC_GC_EVIDENCE_AUTHORITY_MISSING';
  end if;
  if to_regclass('private.professional_kyc_gc_runs') is not null
     or to_regclass('private.professional_kyc_gc_attempts') is not null then
    raise exception using errcode='55000', message='DOKE_KYC_GC_SCHEMA_ALREADY_PRESENT';
  end if;
end
$preflight$;

create table private.professional_kyc_gc_runs (
  id uuid primary key default gen_random_uuid(),
  invocation_key text not null unique,
  mode text not null default 'dry_run' check (mode='dry_run'),
  status text not null default 'running' check (status in ('running','completed')),
  evaluation_time timestamptz not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  total_objects integer not null default 0 check (total_objects>=0),
  keep_objects integer not null default 0 check (keep_objects>=0),
  technical_candidates integer not null default 0 check (technical_candidates>=0),
  hold_objects integer not null default 0 check (hold_objects>=0),
  check ((status='completed')=(completed_at is not null))
);

create table private.professional_kyc_gc_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references private.professional_kyc_gc_runs(id),
  bucket_id text not null check (bucket_id='professional-verification-media'),
  object_path text not null,
  object_id uuid not null,
  object_version text,
  upload_intent_id uuid,
  evidence_set_id uuid,
  reference_count integer not null check (reference_count>=0),
  evidence_identity_count integer not null check (evidence_identity_count>=0),
  intent_match_count integer not null check (intent_match_count>=0),
  technical_action text not null check (
    technical_action in ('KEEP_REFERENCE','KEEP_ACTIVE_INTENT','GC_TECHNICALLY_ELIGIBLE','HOLD_INVESTIGATE')
  ),
  reason_code text not null,
  execution_gate text,
  evaluation_time timestamptz not null,
  created_at timestamptz not null default now(),
  unique (run_id,bucket_id,object_path),
  check (
    (technical_action='GC_TECHNICALLY_ELIGIBLE' and execution_gate='PROF_B04_RETENTION')
    or
    (technical_action<>'GC_TECHNICALLY_ELIGIBLE' and execution_gate is null)
  )
);

create index professional_kyc_gc_attempts_run_action_idx
  on private.professional_kyc_gc_attempts(run_id,technical_action,reason_code);
create index professional_kyc_gc_attempts_object_idx
  on private.professional_kyc_gc_attempts(bucket_id,object_path);

alter table private.professional_kyc_gc_runs enable row level security;
alter table private.professional_kyc_gc_attempts enable row level security;
revoke all privileges on table private.professional_kyc_gc_runs from public,anon,authenticated,service_role;
revoke all privileges on table private.professional_kyc_gc_attempts from public,anon,authenticated,service_role;

create or replace function private.classify_professional_kyc_gc_object(
  p_reference_count integer,
  p_identity_complete boolean,
  p_is_locked_path boolean,
  p_evidence_identity_count integer,
  p_intent_match_count integer,
  p_path_manifest_match boolean,
  p_intent_status text,
  p_intent_expires_at timestamptz,
  p_intent_consumed_at timestamptz,
  p_evaluation_time timestamptz
)
returns table(technical_action text, reason_code text, execution_gate text)
language sql
immutable
security definer
set search_path=pg_catalog
as $function$
  select
    case
      when coalesce(p_reference_count,0)>0 then 'KEEP_REFERENCE'
      when not coalesce(p_identity_complete,false) then 'HOLD_INVESTIGATE'
      when not coalesce(p_is_locked_path,false) then 'HOLD_INVESTIGATE'
      when coalesce(p_evidence_identity_count,0)>0 then 'HOLD_INVESTIGATE'
      when coalesce(p_intent_match_count,0)<>1 then 'HOLD_INVESTIGATE'
      when not coalesce(p_path_manifest_match,false) then 'HOLD_INVESTIGATE'
      when p_intent_consumed_at is not null or p_intent_status='consumed' then 'HOLD_INVESTIGATE'
      when p_intent_status='prepared' and p_intent_expires_at is not null and p_intent_expires_at>p_evaluation_time then 'KEEP_ACTIVE_INTENT'
      when p_intent_status in ('prepared','expired') and p_intent_expires_at is not null and p_intent_expires_at<=p_evaluation_time then 'GC_TECHNICALLY_ELIGIBLE'
      else 'HOLD_INVESTIGATE'
    end,
    case
      when coalesce(p_reference_count,0)>0 then 'CURRENT_KYC_REFERENCE'
      when not coalesce(p_identity_complete,false) then 'OBJECT_IDENTITY_MISSING'
      when not coalesce(p_is_locked_path,false) then 'LEGACY_OR_UNKNOWN_PROVENANCE'
      when coalesce(p_evidence_identity_count,0)>0 then 'HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED'
      when coalesce(p_intent_match_count,0)<>1 then 'INTENT_PROVENANCE_AMBIGUOUS'
      when not coalesce(p_path_manifest_match,false) then 'INTENT_OR_MANIFEST_MISMATCH'
      when p_intent_consumed_at is not null or p_intent_status='consumed' then 'CONSUMED_PROVENANCE'
      when p_intent_status='prepared' and p_intent_expires_at is not null and p_intent_expires_at>p_evaluation_time then 'ACTIVE_PREPARED_INTENT'
      when p_intent_status in ('prepared','expired') and p_intent_expires_at is not null and p_intent_expires_at<=p_evaluation_time then 'EXPIRED_NEVER_CONSUMED'
      when p_intent_status='cancelled' then 'CANCELLATION_ANCHOR_MISSING'
      else 'UNKNOWN'
    end,
    case
      when coalesce(p_reference_count,0)=0
       and coalesce(p_identity_complete,false)
       and coalesce(p_is_locked_path,false)
       and coalesce(p_evidence_identity_count,0)=0
       and coalesce(p_intent_match_count,0)=1
       and coalesce(p_path_manifest_match,false)
       and p_intent_consumed_at is null
       and p_intent_status in ('prepared','expired')
       and p_intent_expires_at is not null
       and p_intent_expires_at<=p_evaluation_time
      then 'PROF_B04_RETENTION'
      else null
    end;
$function$;

revoke all on function private.classify_professional_kyc_gc_object(
  integer,boolean,boolean,integer,integer,boolean,text,timestamptz,timestamptz,timestamptz
) from public,anon,authenticated,service_role;

create or replace function public.run_professional_kyc_gc_dry_run_internal(
  p_invocation_key text,
  p_evaluation_time timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_run_id uuid;
  v_object record;
  v_reference_count integer;
  v_evidence_count integer;
  v_evidence_set_id uuid;
  v_intent_count integer;
  v_intent_id uuid;
  v_intent_user_id uuid;
  v_intent_status text;
  v_intent_expires_at timestamptz;
  v_intent_consumed_at timestamptz;
  v_manifest_entry jsonb;
  v_path_manifest_match boolean;
  v_action text;
  v_reason text;
  v_gate text;
  v_total integer:=0;
  v_keep integer:=0;
  v_candidates integer:=0;
  v_hold integer:=0;
begin
  if nullif(btrim(coalesce(p_invocation_key,'')),'') is null
     or char_length(p_invocation_key)>200
     or p_evaluation_time is null then
    raise exception using errcode='22023', message='DOKE_KYC_GC_DRY_RUN_REQUEST_INVALID';
  end if;

  insert into private.professional_kyc_gc_runs(invocation_key,mode,status,evaluation_time)
  values(btrim(p_invocation_key),'dry_run','running',p_evaluation_time)
  returning id into v_run_id;

  for v_object in
    select o.id,o.version,o.bucket_id,o.name,o.metadata
      from storage.objects o
     where o.bucket_id='professional-verification-media'
     order by o.name
  loop
    v_total:=v_total+1;

    select count(*) into v_reference_count
      from public.professional_identity_verifications piv
      cross join lateral jsonb_each(coalesce(piv.documents,'{}'::jsonb)) d
     where d.value->>'bucket'=v_object.bucket_id
       and d.value->>'path'=v_object.name;

    select count(*)
      into v_evidence_count
      from private.professional_kyc_evidence_objects eo
     where eo.bucket_id=v_object.bucket_id
       and eo.object_path=v_object.name
       and eo.storage_object_id=v_object.id
       and eo.storage_object_version is not distinct from v_object.version;

    v_evidence_set_id:=null;
    if v_evidence_count=1 then
      select eo.evidence_set_id
        into v_evidence_set_id
        from private.professional_kyc_evidence_objects eo
       where eo.bucket_id=v_object.bucket_id
         and eo.object_path=v_object.name
         and eo.storage_object_id=v_object.id
         and eo.storage_object_version is not distinct from v_object.version
       limit 1;
    end if;

    select count(*) into v_intent_count
      from private.professional_kyc_upload_intents i
      cross join lateral jsonb_each(i.files) d
     where d.value->>'bucket'=v_object.bucket_id
       and d.value->>'path'=v_object.name;

    v_intent_id:=null;
    v_intent_user_id:=null;
    v_intent_status:=null;
    v_intent_expires_at:=null;
    v_intent_consumed_at:=null;
    v_manifest_entry:=null;
    v_path_manifest_match:=false;

    if v_intent_count=1 then
      select i.id,i.user_id,i.status,i.expires_at,i.consumed_at,d.value
        into v_intent_id,v_intent_user_id,v_intent_status,
             v_intent_expires_at,v_intent_consumed_at,v_manifest_entry
        from private.professional_kyc_upload_intents i
        cross join lateral jsonb_each(i.files) d
       where d.value->>'bucket'=v_object.bucket_id
         and d.value->>'path'=v_object.name
       limit 1;

      v_path_manifest_match:=
        split_part(v_object.name,'/',1)='locked'
        and split_part(v_object.name,'/',2)=v_intent_user_id::text
        and split_part(v_object.name,'/',3)=v_intent_id::text
        and lower(coalesce(v_manifest_entry->>'type',''))=lower(coalesce(v_object.metadata->>'mimetype',''))
        and coalesce(v_manifest_entry->>'size','')=greatest(0,coalesce((v_object.metadata->>'size')::bigint,0))::text;
    end if;

    select c.technical_action,c.reason_code,c.execution_gate
      into v_action,v_reason,v_gate
      from private.classify_professional_kyc_gc_object(
        v_reference_count,
        v_object.id is not null and nullif(v_object.version,'') is not null,
        split_part(v_object.name,'/',1)='locked',
        v_evidence_count,
        v_intent_count,
        v_path_manifest_match,
        v_intent_status,
        v_intent_expires_at,
        v_intent_consumed_at,
        p_evaluation_time
      ) c;

    insert into private.professional_kyc_gc_attempts(
      run_id,bucket_id,object_path,object_id,object_version,
      upload_intent_id,evidence_set_id,reference_count,evidence_identity_count,
      intent_match_count,technical_action,reason_code,execution_gate,evaluation_time
    ) values (
      v_run_id,v_object.bucket_id,v_object.name,v_object.id,v_object.version,
      case when v_intent_count=1 then v_intent_id else null end,
      case when v_evidence_count=1 then v_evidence_set_id else null end,
      v_reference_count,v_evidence_count,v_intent_count,
      v_action,v_reason,v_gate,p_evaluation_time
    );

    if v_action in ('KEEP_REFERENCE','KEEP_ACTIVE_INTENT') then
      v_keep:=v_keep+1;
    elsif v_action='GC_TECHNICALLY_ELIGIBLE' then
      v_candidates:=v_candidates+1;
    else
      v_hold:=v_hold+1;
    end if;
  end loop;

  update private.professional_kyc_gc_runs
     set status='completed',completed_at=now(),total_objects=v_total,
         keep_objects=v_keep,technical_candidates=v_candidates,hold_objects=v_hold
   where id=v_run_id;

  return jsonb_build_object(
    'runId',v_run_id,'mode','dry_run','evaluationTime',p_evaluation_time,
    'totalObjects',v_total,'keepObjects',v_keep,
    'technicalCandidates',v_candidates,'holdObjects',v_hold
  );
end;
$function$;

revoke all on function public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)
  from public,anon,authenticated;
grant execute on function public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)
  to service_role;

comment on table private.professional_kyc_gc_runs is 'Dry-run-only KYC object classification runs.';
comment on table private.professional_kyc_gc_attempts is 'Per-object KYC dry-run classification snapshots.';
notify pgrst,'reload schema';
