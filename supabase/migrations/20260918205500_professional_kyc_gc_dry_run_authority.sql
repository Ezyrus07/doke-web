-- PROF-001 / PROF-B05 G5
-- Technical KYC evidence GC classifier and dry-run observability.
-- PRE-B04: this migration has no physical deletion authority.

create table private.professional_kyc_gc_runs (
  id uuid primary key default gen_random_uuid(),
  invocation_key text not null unique check (char_length(invocation_key) between 1 and 200),
  mode text not null default 'dry_run' check (mode='dry_run'),
  status text not null default 'running' check (status in ('running','completed')),
  evaluation_time timestamptz not null,
  total_objects integer not null default 0 check (total_objects>=0),
  keep_objects integer not null default 0 check (keep_objects>=0),
  technical_candidates integer not null default 0 check (technical_candidates>=0),
  hold_objects integer not null default 0 check (hold_objects>=0),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table private.professional_kyc_gc_attempts (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null
    references private.professional_kyc_gc_runs(id) on delete cascade,
  bucket_id text not null check (bucket_id='professional-verification-media'),
  object_path text not null,
  object_id uuid not null,
  object_version text,
  reference_count integer not null check (reference_count>=0),
  evidence_identity_count integer not null check (evidence_identity_count>=0),
  intent_match_count integer not null check (intent_match_count>=0),
  intent_id uuid,
  intent_status text,
  intent_expires_at timestamptz,
  intent_consumed_at timestamptz,
  technical_action text not null check (
    technical_action in ('KEEP_REFERENCE','KEEP_ACTIVE_INTENT','GC_TECHNICALLY_ELIGIBLE','HOLD_INVESTIGATE')
  ),
  reason_code text not null,
  execution_gate text,
  created_at timestamptz not null default now(),
  unique(run_id,bucket_id,object_path),
  check (
    technical_action<>'GC_TECHNICALLY_ELIGIBLE'
    or execution_gate='PROF_B04_RETENTION'
  )
);

create index professional_kyc_gc_attempts_run_idx
  on private.professional_kyc_gc_attempts(run_id,technical_action,reason_code);

create index professional_kyc_gc_attempts_object_idx
  on private.professional_kyc_gc_attempts(bucket_id,object_path);

revoke all privileges on table private.professional_kyc_gc_runs
  from public, anon, authenticated, service_role;
revoke all privileges on table private.professional_kyc_gc_attempts
  from public, anon, authenticated, service_role;

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
      when coalesce(p_reference_count,0)>0
        then 'KEEP_REFERENCE'
      when not coalesce(p_identity_complete,false)
        then 'HOLD_INVESTIGATE'
      when not coalesce(p_is_locked_path,false)
        then 'HOLD_INVESTIGATE'
      when coalesce(p_evidence_identity_count,0)>0
        then 'HOLD_INVESTIGATE'
      when coalesce(p_intent_match_count,0)<>1
        then 'HOLD_INVESTIGATE'
      when not coalesce(p_path_manifest_match,false)
        then 'HOLD_INVESTIGATE'
      when p_consumed_at is not null or coalesce(p_intent_status,'')='consumed'
        then 'HOLD_INVESTIGATE'
      when coalesce(p_intent_status,'')='prepared'
        and p_expires_at is not null
        and p_expires_at>p_evaluation_time
        then 'KEEP_ACTIVE_INTENT'
      when coalesce(p_intent_status,'') in ('prepared','expired')
        and p_expires_at is not null
        and p_expires_at<=p_evaluation_time
        then 'GC_TECHNICALLY_ELIGIBLE'
      when coalesce(p_intent_status,'')='cancelled'
        then 'HOLD_INVESTIGATE'
      else 'HOLD_INVESTIGATE'
    end,
    case
      when coalesce(p_reference_count,0)>0
        then 'CURRENT_KYC_REFERENCE'
      when not coalesce(p_identity_complete,false)
        then 'OBJECT_IDENTITY_MISSING'
      when not coalesce(p_is_locked_path,false)
        then 'LEGACY_OR_UNKNOWN_PROVENANCE'
      when coalesce(p_evidence_identity_count,0)>0
        then 'HISTORICAL_EVIDENCE_RETENTION_UNRESOLVED'
      when coalesce(p_intent_match_count,0)<>1
        then 'INTENT_PROVENANCE_AMBIGUOUS'
      when not coalesce(p_path_manifest_match,false)
        then 'INTENT_OR_MANIFEST_MISMATCH'
      when p_consumed_at is not null or coalesce(p_intent_status,'')='consumed'
        then 'CONSUMED_PROVENANCE'
      when coalesce(p_intent_status,'')='prepared'
        and p_expires_at is not null
        and p_expires_at>p_evaluation_time
        then 'ACTIVE_PREPARED_INTENT'
      when coalesce(p_intent_status,'') in ('prepared','expired')
        and p_expires_at is not null
        and p_expires_at<=p_evaluation_time
        then 'EXPIRED_NEVER_CONSUMED'
      when coalesce(p_intent_status,'')='cancelled'
        then 'CANCELLATION_ANCHOR_MISSING'
      else 'UNKNOWN'
    end,
    case
      when coalesce(p_reference_count,0)=0
       and coalesce(p_identity_complete,false)
       and coalesce(p_is_locked_path,false)
       and coalesce(p_evidence_identity_count,0)=0
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
  v_key text:=nullif(trim(coalesce(p_invocation_key,'')),'');
  v_eval timestamptz:=coalesce(p_evaluation_time,now());
  v_run_id uuid;
  v_existing private.professional_kyc_gc_runs%rowtype;
  v_object record;
  v_reference_count integer;
  v_evidence_identity_count integer;
  v_intent_match_count integer;
  v_intent_id uuid;
  v_intent_user_id uuid;
  v_intent_status text;
  v_intent_expires_at timestamptz;
  v_intent_consumed_at timestamptz;
  v_manifest_type text;
  v_manifest_size bigint;
  v_manifest_field text;
  v_path_manifest_match boolean;
  v_class record;
  v_total integer:=0;
  v_keep integer:=0;
  v_candidates integer:=0;
  v_hold integer:=0;
begin
  if v_key is null or char_length(v_key)>200 then
    raise exception using errcode='22023', message='DOKE_KYC_GC_INVOCATION_KEY_INVALID';
  end if;

  select * into v_existing
  from private.professional_kyc_gc_runs
  where invocation_key=v_key;

  if found then
    return jsonb_build_object(
      'runId',v_existing.id,
      'mode',v_existing.mode,
      'status',v_existing.status,
      'evaluationTime',v_existing.evaluation_time,
      'totalObjects',v_existing.total_objects,
      'keepObjects',v_existing.keep_objects,
      'technicalCandidates',v_existing.technical_candidates,
      'holdObjects',v_existing.hold_objects,
      'idempotent',true
    );
  end if;

  insert into private.professional_kyc_gc_runs(invocation_key,evaluation_time)
  values(v_key,v_eval)
  returning id into v_run_id;

  for v_object in
    select
      o.id,
      o.version,
      o.bucket_id,
      o.name,
      lower(coalesce(o.metadata->>'mimetype','')) as mime_type,
      greatest(0,coalesce(nullif(o.metadata->>'size','')::bigint,0)) as byte_size
    from storage.objects o
    where o.bucket_id='professional-verification-media'
    order by o.name,o.id
  loop
    select count(*)
      into v_reference_count
    from public.professional_identity_verifications piv
    cross join lateral jsonb_each(coalesce(piv.documents,'{}'::jsonb)) d
    where d.value->>'bucket'=v_object.bucket_id
      and d.value->>'path'=v_object.name;

    select count(*)
      into v_evidence_identity_count
    from private.professional_kyc_evidence_objects eo
    where eo.bucket_id=v_object.bucket_id
      and eo.object_path=v_object.name
      and eo.storage_object_id=v_object.id
      and eo.storage_object_version is not distinct from nullif(v_object.version,'');

    v_intent_match_count:=0;
    v_intent_id:=null;
    v_intent_user_id:=null;
    v_intent_status:=null;
    v_intent_expires_at:=null;
    v_intent_consumed_at:=null;
    v_manifest_type:=null;
    v_manifest_size:=null;
    v_manifest_field:=null;

    select count(*)
      into v_intent_match_count
    from private.professional_kyc_upload_intents i
    cross join lateral jsonb_each(i.files) d
    where d.value->>'bucket'=v_object.bucket_id
      and d.value->>'path'=v_object.name;

    if v_intent_match_count=1 then
      select
        i.id,i.user_id,i.status,i.expires_at,i.consumed_at,
        lower(d.value->>'type'),
        nullif(d.value->>'size','')::bigint,
        d.key
      into
        v_intent_id,v_intent_user_id,v_intent_status,v_intent_expires_at,v_intent_consumed_at,
        v_manifest_type,v_manifest_size,v_manifest_field
      from private.professional_kyc_upload_intents i
      cross join lateral jsonb_each(i.files) d
      where d.value->>'bucket'=v_object.bucket_id
        and d.value->>'path'=v_object.name
      limit 1;
    end if;

    v_path_manifest_match:=
      v_intent_match_count=1
      and split_part(v_object.name,'/',1)='locked'
      and split_part(v_object.name,'/',2)=v_intent_user_id::text
      and split_part(v_object.name,'/',3)=v_intent_id::text
      and v_manifest_field in ('documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument')
      and v_manifest_type=v_object.mime_type
      and v_manifest_size=v_object.byte_size;

    select *
      into v_class
    from private.classify_professional_kyc_gc_object(
      v_reference_count,
      v_object.id is not null and nullif(v_object.version,'') is not null,
      split_part(v_object.name,'/',1)='locked',
      v_evidence_identity_count,
      v_intent_match_count,
      v_path_manifest_match,
      v_intent_status,
      v_intent_expires_at,
      v_intent_consumed_at,
      v_eval
    );

    insert into private.professional_kyc_gc_attempts(
      run_id,bucket_id,object_path,object_id,object_version,
      reference_count,evidence_identity_count,intent_match_count,
      intent_id,intent_status,intent_expires_at,intent_consumed_at,
      technical_action,reason_code,execution_gate
    ) values(
      v_run_id,v_object.bucket_id,v_object.name,v_object.id,nullif(v_object.version,''),
      v_reference_count,v_evidence_identity_count,v_intent_match_count,
      v_intent_id,v_intent_status,v_intent_expires_at,v_intent_consumed_at,
      v_class.technical_action,v_class.reason_code,v_class.execution_gate
    );

    v_total:=v_total+1;
    if v_class.technical_action in ('KEEP_REFERENCE','KEEP_ACTIVE_INTENT') then
      v_keep:=v_keep+1;
    elsif v_class.technical_action='GC_TECHNICALLY_ELIGIBLE' then
      v_candidates:=v_candidates+1;
    else
      v_hold:=v_hold+1;
    end if;
  end loop;

  update private.professional_kyc_gc_runs
     set status='completed',
         total_objects=v_total,
         keep_objects=v_keep,
         technical_candidates=v_candidates,
         hold_objects=v_hold,
         completed_at=now()
   where id=v_run_id;

  return jsonb_build_object(
    'runId',v_run_id,
    'mode','dry_run',
    'status','completed',
    'evaluationTime',v_eval,
    'totalObjects',v_total,
    'keepObjects',v_keep,
    'technicalCandidates',v_candidates,
    'holdObjects',v_hold,
    'idempotent',false
  );
end;
$function$;

revoke all on function public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.run_professional_kyc_gc_dry_run_internal(text,timestamptz)
  to service_role;

comment on table private.professional_kyc_gc_runs is
  'PRE-B04 KYC GC dry-run executions. Mode is constrained to dry_run; no deletion authority.';
comment on table private.professional_kyc_gc_attempts is
  'Per-object technical KYC GC classification snapshots. GC_TECHNICALLY_ELIGIBLE remains gated by PROF_B04_RETENTION.';
comment on function public.run_professional_kyc_gc_dry_run_internal(text,timestamptz) is
  'Service-role-only PRE-B04 dry-run classifier. Does not claim, lease, retry or delete Storage objects.';
