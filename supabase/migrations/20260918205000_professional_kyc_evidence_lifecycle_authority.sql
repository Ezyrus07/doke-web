-- PROF-001 / PROF-B05 G4
-- Immutable professional KYC evidence lifecycle authority.
-- This migration is intentionally fail-closed. It does not delete Storage objects.

do $preflight$
begin
  if to_regclass('private.professional_kyc_evidence_sets') is not null
     or to_regclass('private.professional_kyc_evidence_objects') is not null
     or to_regclass('private.professional_kyc_evidence_events') is not null
     or to_regclass('private.professional_kyc_current_evidence') is not null then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_SCHEMA_ALREADY_EXISTS';
  end if;
  if to_regclass('public.professional_identity_verifications') is null
     or to_regclass('private.professional_kyc_upload_intents') is null
     or to_regclass('storage.objects') is null then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_DEPENDENCY_MISSING';
  end if;
end
$preflight$;

create table private.professional_kyc_evidence_sets (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null,
  user_id uuid not null,
  upload_intent_id uuid,
  verification_type text not null check (verification_type in ('individual','business')),
  provenance_kind text not null check (
    provenance_kind in ('signed_intent','signed_intent_reconciled','legacy_current_snapshot')
  ),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  submitted_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  unique (verification_id, id)
);

create unique index professional_kyc_evidence_sets_upload_intent_uidx
  on private.professional_kyc_evidence_sets(upload_intent_id)
  where upload_intent_id is not null;

create index professional_kyc_evidence_sets_user_idx
  on private.professional_kyc_evidence_sets(user_id, submitted_at desc);

create index professional_kyc_evidence_sets_verification_idx
  on private.professional_kyc_evidence_sets(verification_id, submitted_at desc);

create table private.professional_kyc_evidence_objects (
  id uuid primary key default gen_random_uuid(),
  evidence_set_id uuid not null
    references private.professional_kyc_evidence_sets(id) on delete restrict,
  document_field text not null check (
    document_field in ('documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument')
  ),
  bucket_id text not null check (bucket_id='professional-verification-media'),
  object_path text not null check (char_length(object_path)>0),
  storage_object_id uuid not null,
  storage_object_version text not null check (char_length(storage_object_version)>0),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','application/pdf')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  recorded_at timestamptz not null default now(),
  unique (evidence_set_id, document_field),
  unique (bucket_id, object_path),
  unique (storage_object_id, storage_object_version),
  check (document_field <> 'selfieDocument' or mime_type in ('image/jpeg','image/png'))
);

create index professional_kyc_evidence_objects_set_idx
  on private.professional_kyc_evidence_objects(evidence_set_id);

create index professional_kyc_evidence_objects_path_idx
  on private.professional_kyc_evidence_objects(bucket_id, object_path);

create table private.professional_kyc_evidence_events (
  id uuid primary key default gen_random_uuid(),
  evidence_set_id uuid not null
    references private.professional_kyc_evidence_sets(id) on delete restrict,
  event_kind text not null check (
    event_kind in ('submitted','review_started','rejected','verified','reopened','snapshot_imported')
  ),
  source_kind text not null check (
    source_kind in ('authoritative_transition','legacy_observation')
  ),
  actor_id uuid,
  source_event_key text not null unique,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  recorded_at timestamptz not null default now(),
  check (
    (event_kind='snapshot_imported' and source_kind='legacy_observation')
    or
    (event_kind<>'snapshot_imported' and source_kind='authoritative_transition')
  )
);

create index professional_kyc_evidence_events_set_time_idx
  on private.professional_kyc_evidence_events(evidence_set_id, occurred_at, id);

create table private.professional_kyc_current_evidence (
  verification_id uuid primary key
    references public.professional_identity_verifications(id) on delete cascade,
  evidence_set_id uuid not null unique,
  linked_at timestamptz not null default now(),
  foreign key (verification_id, evidence_set_id)
    references private.professional_kyc_evidence_sets(verification_id, id)
    on delete restrict
);

revoke all privileges on table private.professional_kyc_evidence_sets
  from public, anon, authenticated, service_role;
revoke all privileges on table private.professional_kyc_evidence_objects
  from public, anon, authenticated, service_role;
revoke all privileges on table private.professional_kyc_evidence_events
  from public, anon, authenticated, service_role;
revoke all privileges on table private.professional_kyc_current_evidence
  from public, anon, authenticated, service_role;

create or replace function private.reject_professional_kyc_evidence_mutation()
returns trigger
language plpgsql
set search_path=pg_catalog
as $function$
begin
  raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_IMMUTABLE';
end;
$function$;
revoke all on function private.reject_professional_kyc_evidence_mutation()
  from public, anon, authenticated, service_role;

create trigger professional_kyc_evidence_sets_immutable_row
before update or delete on private.professional_kyc_evidence_sets
for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_sets_immutable_truncate
before truncate on private.professional_kyc_evidence_sets
for each statement execute function private.reject_professional_kyc_evidence_mutation();

create trigger professional_kyc_evidence_objects_immutable_row
before update or delete on private.professional_kyc_evidence_objects
for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_objects_immutable_truncate
before truncate on private.professional_kyc_evidence_objects
for each statement execute function private.reject_professional_kyc_evidence_mutation();

create trigger professional_kyc_evidence_events_immutable_row
before update or delete on private.professional_kyc_evidence_events
for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_events_immutable_truncate
before truncate on private.professional_kyc_evidence_events
for each statement execute function private.reject_professional_kyc_evidence_mutation();

create or replace function private.professional_kyc_append_evidence_event(
  p_evidence_set_id uuid,
  p_event_kind text,
  p_actor_id uuid,
  p_occurred_at timestamptz,
  p_source_event_key text,
  p_source_kind text default 'authoritative_transition',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_id uuid;
begin
  if p_evidence_set_id is null
     or nullif(trim(coalesce(p_event_kind,'')),'') is null
     or nullif(trim(coalesce(p_source_event_key,'')),'') is null
     or p_occurred_at is null then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_EVENT_INVALID';
  end if;

  insert into private.professional_kyc_evidence_events(
    evidence_set_id,event_kind,source_kind,actor_id,source_event_key,occurred_at,metadata
  )
  values(
    p_evidence_set_id,
    p_event_kind,
    coalesce(nullif(trim(p_source_kind),''),'authoritative_transition'),
    p_actor_id,
    p_source_event_key,
    p_occurred_at,
    coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(source_event_key) do nothing
  returning id into v_id;

  if v_id is null then
    select e.id into v_id
    from private.professional_kyc_evidence_events e
    where e.source_event_key=p_source_event_key
      and e.evidence_set_id=p_evidence_set_id
      and e.event_kind=p_event_kind
      and e.source_kind=coalesce(nullif(trim(p_source_kind),''),'authoritative_transition');

    if v_id is null then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_EVENT_CONFLICT';
    end if;
  end if;

  return v_id;
end;
$function$;
revoke all on function private.professional_kyc_append_evidence_event(uuid,text,uuid,timestamptz,text,text,jsonb)
  from public, anon, authenticated, service_role;

create or replace function private.professional_kyc_current_evidence_set(
  p_verification_id uuid
)
returns uuid
language sql
stable
security definer
set search_path=pg_catalog
as $function$
  select c.evidence_set_id
  from private.professional_kyc_current_evidence c
  where c.verification_id=p_verification_id
$function$;
revoke all on function private.professional_kyc_current_evidence_set(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.professional_kyc_record_evidence_set(
  p_verification_id uuid,
  p_user_id uuid,
  p_upload_intent_id uuid,
  p_verification_type text,
  p_documents jsonb,
  p_provenance_kind text,
  p_submitted_at timestamptz,
  p_create_submitted_event boolean default true
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_set_id uuid:=gen_random_uuid();
  v_manifest jsonb;
  v_manifest_sha text;
  v_doc record;
  v_object_id uuid;
  v_object_version text;
  v_mime text;
  v_size bigint;
  v_doc_count integer:=0;
begin
  if p_verification_id is null or p_user_id is null or p_submitted_at is null then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_SET_INVALID';
  end if;
  if p_verification_type not in ('individual','business') then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_TYPE_INVALID';
  end if;
  if p_provenance_kind not in ('signed_intent','signed_intent_reconciled','legacy_current_snapshot') then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_PROVENANCE_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_documents,'null'::jsonb))<>'object'
     or p_documents='{}'::jsonb then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_DOCUMENTS_REQUIRED';
  end if;
  if exists(
    select 1
    from private.professional_kyc_current_evidence
    where verification_id=p_verification_id
  ) then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_CURRENT_ALREADY_LINKED';
  end if;

  create temporary table if not exists pg_temp.doke_kyc_evidence_manifest(
    document_field text,
    bucket_id text,
    object_path text,
    storage_object_id uuid,
    storage_object_version text,
    mime_type text,
    byte_size bigint
  ) on commit drop;
  truncate pg_temp.doke_kyc_evidence_manifest;

  for v_doc in
    select key as field, value as payload
    from jsonb_each(p_documents)
    order by key
  loop
    if v_doc.field not in ('documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument') then
      raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_DOCUMENT_FIELD_INVALID';
    end if;
    if v_doc.payload->>'bucket'<>'professional-verification-media'
       or nullif(v_doc.payload->>'path','') is null then
      raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_DOCUMENT_REFERENCE_INVALID';
    end if;

    select o.id,
           nullif(o.version,''),
           lower(coalesce(o.metadata->>'mimetype','')),
           greatest(0,coalesce((o.metadata->>'size')::bigint,0))
      into v_object_id,v_object_version,v_mime,v_size
    from storage.objects o
    where o.bucket_id='professional-verification-media'
      and o.name=v_doc.payload->>'path'
    order by o.id
    limit 1;

    if v_object_id is null or v_object_version is null then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_OBJECT_IDENTITY_MISSING';
    end if;
    if v_mime<>lower(coalesce(v_doc.payload->>'type',''))
       or v_size<>coalesce(nullif(v_doc.payload->>'size','')::bigint,-1) then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_OBJECT_SNAPSHOT_MISMATCH';
    end if;

    insert into pg_temp.doke_kyc_evidence_manifest
      (document_field,bucket_id,object_path,storage_object_id,storage_object_version,mime_type,byte_size)
    values
      (v_doc.field,'professional-verification-media',v_doc.payload->>'path',v_object_id,v_object_version,v_mime,v_size);
    v_doc_count:=v_doc_count+1;
  end loop;

  if v_doc_count<>jsonb_object_length(p_documents) then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_MANIFEST_COUNT_MISMATCH';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'field',document_field,
      'bucket',bucket_id,
      'path',object_path,
      'objectId',storage_object_id,
      'version',storage_object_version,
      'type',mime_type,
      'size',byte_size
    )
    order by document_field
  )
  into v_manifest
  from pg_temp.doke_kyc_evidence_manifest;

  v_manifest_sha:=encode(
    extensions.digest(convert_to(coalesce(v_manifest,'[]'::jsonb)::text,'UTF8'),'sha256'),
    'hex'
  );

  insert into private.professional_kyc_evidence_sets(
    id,verification_id,user_id,upload_intent_id,verification_type,provenance_kind,
    manifest_sha256,submitted_at
  )
  values(
    v_set_id,p_verification_id,p_user_id,p_upload_intent_id,p_verification_type,
    p_provenance_kind,v_manifest_sha,p_submitted_at
  );

  insert into private.professional_kyc_evidence_objects(
    evidence_set_id,document_field,bucket_id,object_path,storage_object_id,
    storage_object_version,mime_type,byte_size
  )
  select
    v_set_id,document_field,bucket_id,object_path,storage_object_id,
    storage_object_version,mime_type,byte_size
  from pg_temp.doke_kyc_evidence_manifest;

  insert into private.professional_kyc_current_evidence(
    verification_id,evidence_set_id,linked_at
  )
  values(p_verification_id,v_set_id,now());

  if p_create_submitted_event then
    perform private.professional_kyc_append_evidence_event(
      v_set_id,'submitted',p_user_id,p_submitted_at,
      'submitted:'||v_set_id::text
    );
  end if;

  return v_set_id;
end;
$function$;
revoke all on function private.professional_kyc_record_evidence_set(uuid,uuid,uuid,text,jsonb,text,timestamptz,boolean)
  from public, anon, authenticated, service_role;

-- Fail-closed reconciliation of current KYC snapshots.
do $backfill$
declare
  v public.professional_identity_verifications%rowtype;
  v_locked integer;
  v_nonlocked integer;
  v_intent_id uuid;
  v_intent_count integer;
  v_set_id uuid;
begin
  for v in
    select *
    from public.professional_identity_verifications
    order by id
  loop
    if v.documents='{}'::jsonb then
      if v.status<>'not_started' then
        raise exception using errcode='55000', message='DOKE_KYC_BACKFILL_NONSTARTED_WITHOUT_DOCUMENTS';
      end if;
      continue;
    end if;

    select
      count(*) filter(where split_part(d.value->>'path','/',1)='locked'),
      count(*) filter(where split_part(d.value->>'path','/',1)<>'locked')
      into v_locked,v_nonlocked
    from jsonb_each(v.documents) d;

    if v_locked>0 and v_nonlocked>0 then
      raise exception using errcode='55000', message='DOKE_KYC_BACKFILL_MIXED_PATH_PROVENANCE';
    end if;

    v_intent_id:=null;
    if v_locked>0 then
      select count(distinct nullif(split_part(d.value->>'path','/',3),'')),
             min(nullif(split_part(d.value->>'path','/',3),'')::uuid)
        into v_intent_count,v_intent_id
      from jsonb_each(v.documents) d;

      if v_intent_count<>1
         or not exists(
           select 1
           from private.professional_kyc_upload_intents i
           where i.id=v_intent_id
             and i.user_id=v.user_id
             and i.verification_type=v.verification_type
             and i.status='consumed'
             and i.consumed_at is not null
         ) then
        raise exception using errcode='55000', message='DOKE_KYC_BACKFILL_LOCKED_INTENT_AMBIGUOUS';
      end if;

      v_set_id:=private.professional_kyc_record_evidence_set(
        v.id,v.user_id,v_intent_id,v.verification_type,v.documents,
        'signed_intent_reconciled',coalesce(v.submitted_at,v.updated_at,v.created_at),false
      );
    else
      v_set_id:=private.professional_kyc_record_evidence_set(
        v.id,v.user_id,null,v.verification_type,v.documents,
        'legacy_current_snapshot',coalesce(v.submitted_at,v.updated_at,v.created_at),false
      );
    end if;

    perform private.professional_kyc_append_evidence_event(
      v_set_id,
      'snapshot_imported',
      null,
      now(),
      'snapshot_imported:'||v_set_id::text,
      'legacy_observation',
      jsonb_strip_nulls(jsonb_build_object(
        'observedStatus',v.status,
        'sourceSubmittedAt',v.submitted_at,
        'sourceDecidedAt',v.decided_at
      ))
    );
  end loop;
end
$backfill$;

-- Submission: preserve external signature and add immutable evidence capture.
create or replace function public.submit_professional_identity_verification_internal(
  p_actor_id uuid,
  p_upload_intent_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
 v_id uuid; v_now timestamptz:=now(); v_type text; v_tax text; v_legal_name text; v_birth_date date; v_representative text; v_postal_code text; v_street text; v_number text; v_city text; v_state text; v_documents jsonb; v_payload jsonb; v_set_id uuid;
begin
 if p_actor_id is null then raise exception using errcode='28000',message='DOKE_KYC_APPLICANT_AUTH_REQUIRED'; end if;
 if not exists(select 1 from public.users u join public.professional_profiles p on p.user_id=u.id where u.id=p_actor_id and u.status='active' and u.role='client' and p.setup_status='pending_verification' and p.verification_status in('not_started','rejected')) then raise exception using errcode='42501',message='DOKE_KYC_APPLICANT_REQUIRED'; end if;
 if jsonb_typeof(coalesce(p_payload,'null'::jsonb))<>'object' then raise exception using errcode='22023',message='DOKE_KYC_PAYLOAD_INVALID'; end if;
 v_type:=case when p_payload->>'verificationType'='business' then 'business' else 'individual' end;
 v_tax:=regexp_replace(coalesce(p_payload->>'taxId',''),'\D','','g'); v_legal_name:=regexp_replace(trim(coalesce(p_payload->>'legalName','')),'\s+',' ','g'); v_representative:=regexp_replace(trim(coalesce(p_payload->>'representativeName','')),'\s+',' ','g'); v_postal_code:=regexp_replace(coalesce(p_payload->>'postalCode',''),'\D','','g'); v_street:=regexp_replace(trim(coalesce(p_payload->>'street','')),'\s+',' ','g'); v_number:=trim(coalesce(p_payload->>'number','')); v_city:=regexp_replace(trim(coalesce(p_payload->>'city','')),'\s+',' ','g'); v_state:=upper(trim(coalesce(p_payload->>'state','')));
 begin v_birth_date:=nullif(p_payload->>'birthDate','')::date; exception when invalid_datetime_format or datetime_field_overflow then raise exception using errcode='22023',message='DOKE_KYC_BIRTH_DATE_INVALID'; end;
 if char_length(v_legal_name)<3 or char_length(v_legal_name)>180 then raise exception using errcode='22023',message='DOKE_KYC_LEGAL_NAME_INVALID'; end if;
 if (v_type='individual' and char_length(v_tax)<>11) or (v_type='business' and char_length(v_tax)<>14) then raise exception using errcode='22023',message='DOKE_KYC_TAX_ID_INVALID'; end if;
 if v_type='individual' and (v_birth_date is null or v_birth_date>=current_date) then raise exception using errcode='22023',message='DOKE_KYC_BIRTH_DATE_INVALID'; end if;
 if v_type='business' and char_length(v_representative)<3 then raise exception using errcode='22023',message='DOKE_KYC_REPRESENTATIVE_INVALID'; end if;
 if char_length(v_postal_code)<>8 or char_length(v_street)<3 or char_length(v_number)<1 or char_length(v_city)<2 or v_state!~'^[A-Z]{2}$' then raise exception using errcode='22023',message='DOKE_KYC_ADDRESS_INVALID'; end if;
 if coalesce((p_payload->>'truthConfirmed')::boolean,false) is not true or coalesce((p_payload->>'consentAccepted')::boolean,false) is not true then raise exception using errcode='22023',message='DOKE_KYC_CONSENT_REQUIRED'; end if;

 v_documents:=private.consume_professional_kyc_upload_intent(p_actor_id,p_upload_intent_id,v_type);
 v_payload:=jsonb_strip_nulls(jsonb_build_object('verificationType',v_type,'legalName',v_legal_name,'birthDate',case when v_type='individual' then v_birth_date else null end,'representativeName',case when v_type='business' then v_representative else null end,'postalCode',v_postal_code,'street',v_street,'number',left(v_number,30),'complement',left(regexp_replace(trim(coalesce(p_payload->>'complement','')),'\s+',' ','g'),120),'district',left(regexp_replace(trim(coalesce(p_payload->>'district','')),'\s+',' ','g'),100),'city',left(v_city,100),'state',v_state,'documentType',left(trim(coalesce(p_payload->>'documentType','')),40),'truthConfirmed',true,'consentAccepted',true));

 insert into public.professional_identity_verifications(user_id,professional_profile_user_id,status,verification_type,legal_name,tax_id_last4,tax_id_digest,tax_id_digest_version,birth_date,representative_name,address,documents,current_step,payload,submitted_at,reviewer_id,rejection_reason,review_started_at,decided_at,decision_version,created_at,updated_at)
 values(p_actor_id,p_actor_id,'submitted',v_type,v_legal_name,right(v_tax,4),private.kyc_tax_digest(v_tax),'hmac-sha256-v1',case when v_type='individual' then v_birth_date else null end,case when v_type='business' then v_representative else null end,jsonb_build_object('postalCode',v_postal_code,'street',v_street,'number',left(v_number,30),'complement',v_payload->>'complement','district',v_payload->>'district','city',v_payload->>'city','state',v_state),v_documents,3,v_payload,v_now,null,null,null,null,0,v_now,v_now)
 on conflict(user_id) do update set status='submitted',verification_type=excluded.verification_type,legal_name=excluded.legal_name,tax_id_last4=excluded.tax_id_last4,tax_id_digest=excluded.tax_id_digest,tax_id_digest_version=excluded.tax_id_digest_version,birth_date=excluded.birth_date,representative_name=excluded.representative_name,address=excluded.address,documents=excluded.documents,current_step=3,payload=excluded.payload,submitted_at=v_now,reviewer_id=null,rejection_reason=null,review_started_at=null,decided_at=null,decision_version=public.professional_identity_verifications.decision_version+1,updated_at=v_now
 where public.professional_identity_verifications.status='not_started' returning id into v_id;
 if v_id is null then raise exception using errcode='55000',message='DOKE_KYC_SUBMISSION_LOCKED'; end if;

 v_set_id:=private.professional_kyc_record_evidence_set(
   v_id,p_actor_id,p_upload_intent_id,v_type,v_documents,'signed_intent',v_now,true
 );

 update public.professional_profiles set document_status='pending',verification_status='submitted',updated_at=v_now where user_id=p_actor_id;
 insert into public.verification_events(user_id,type,status,created_at) values(p_actor_id,'professional_document','pending',v_now);

 return jsonb_build_object('id',v_id,'userId',p_actor_id,'professionalProfileId','professional_profile_'||p_actor_id::text,'status','submitted','currentStep',3,'payload',v_payload||v_documents||jsonb_build_object('taxIdLast4',right(v_tax,4)),'submittedAt',v_now,'updatedAt',v_now);
end;
$function$;

-- Reviewer start: current set required; event is append-only and idempotent by source key.
create or replace function public.start_professional_identity_review_internal(
  p_actor_id uuid,
  p_verification_id text
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare v_role text; v_id uuid; v_row public.professional_identity_verifications%rowtype; v_now timestamptz:=now(); v_set_id uuid;
begin
 v_role:=private.assert_professional_kyc_reviewer(p_actor_id); v_id:=private.resolve_professional_kyc_verification_id(p_verification_id);
 select * into v_row from public.professional_identity_verifications where id=v_id for update;
 if v_row.status='under_review' then
  if v_row.reviewer_id=p_actor_id or v_role='admin' then return jsonb_build_object('id',v_row.id,'status',v_row.status,'reviewerId',v_row.reviewer_id,'updatedAt',v_row.updated_at); end if;
  raise exception using errcode='55000',message='DOKE_KYC_ALREADY_CLAIMED';
 end if;
 if v_row.status<>'submitted' then raise exception using errcode='55000',message='DOKE_KYC_REVIEW_START_NOT_ALLOWED'; end if;

 v_set_id:=private.professional_kyc_current_evidence_set(v_row.id);
 if v_set_id is null then raise exception using errcode='55000',message='DOKE_KYC_EVIDENCE_SET_REQUIRED'; end if;

 update public.professional_identity_verifications set status='under_review',reviewer_id=p_actor_id,review_started_at=coalesce(review_started_at,v_now),updated_at=v_now where id=v_row.id returning * into v_row;
 update public.professional_profiles set verification_status='under_review',updated_at=v_now where user_id=v_row.user_id;
 perform private.professional_kyc_append_evidence_event(v_set_id,'review_started',p_actor_id,v_now,'review_started:'||v_set_id::text);
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata,created_at) values(p_actor_id,'professional_verification_review_started','professional_identity_verification',v_row.id,jsonb_build_object('user_id',v_row.user_id,'actor_role',v_role),v_now);
 return jsonb_build_object('id',v_row.id,'status','under_review','reviewerId',p_actor_id,'updatedAt',v_now);
end;
$function$;

create or replace function public.decide_professional_identity_verification_internal(
  p_actor_id uuid,
  p_verification_id text,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
 v_role text; v_id uuid; v public.professional_identity_verifications%rowtype; v_decision text:=lower(trim(coalesce(p_decision,''))); v_reason text:=nullif(regexp_replace(trim(coalesce(p_rejection_reason,'')),'\s+',' ','g'),''); v_status text; v_now timestamptz:=now(); v_title text; v_body text; v_target text; v_label text; v_event_key text; v_external_id text; v_set_id uuid;
begin
 v_role:=private.assert_professional_kyc_reviewer(p_actor_id); v_id:=private.resolve_professional_kyc_verification_id(p_verification_id);
 if v_decision not in('approve','reject') then raise exception using errcode='22023',message='DOKE_KYC_DECISION_INVALID'; end if;
 if v_decision='reject' and(v_reason is null or char_length(v_reason)<10) then raise exception using errcode='22023',message='DOKE_KYC_REJECTION_REASON_REQUIRED'; end if;
 select * into v from public.professional_identity_verifications where id=v_id for update;
 if(v.status='verified' and v_decision='approve') or(v.status='rejected' and v_decision='reject') then return jsonb_build_object('verificationId',v.id,'publicVerificationId','professional_verification_'||v.user_id::text,'userId',v.user_id,'status',v.status,'role',case when v.status='verified' then 'professional' else null end,'reviewerId',v.reviewer_id,'decidedAt',v.decided_at,'idempotent',true); end if;

 v_set_id:=private.professional_kyc_current_evidence_set(v.id);
 if v_set_id is null then raise exception using errcode='55000',message='DOKE_KYC_EVIDENCE_SET_REQUIRED'; end if;

 if v.status='submitted' then
  update public.professional_identity_verifications set status='under_review',reviewer_id=p_actor_id,review_started_at=coalesce(review_started_at,v_now),updated_at=v_now where id=v.id returning * into v;
  perform private.professional_kyc_append_evidence_event(v_set_id,'review_started',p_actor_id,v_now,'review_started:'||v_set_id::text);
 end if;
 if v.status<>'under_review' then raise exception using errcode='55000',message='DOKE_KYC_DECISION_NOT_ALLOWED'; end if;
 if v.reviewer_id is distinct from p_actor_id and v_role<>'admin' then raise exception using errcode='42501',message='DOKE_KYC_REVIEW_OWNER_REQUIRED'; end if;

 if v_decision='approve' then
  v_status:='verified';
  update public.professional_identity_verifications set status='verified',reviewer_id=p_actor_id,review_started_at=coalesce(review_started_at,v_now),decided_at=v_now,rejection_reason=null,decision_version=decision_version+1,updated_at=v_now where id=v.id;
  update public.professional_profiles set document_status='verified',setup_status='active',verification_status='verified',updated_at=v_now where user_id=v.user_id;
  update public.users set role='professional',status='active',updated_at=v_now where id=v.user_id;
  update auth.users set raw_user_meta_data=coalesce(raw_user_meta_data,'{}'::jsonb)-'role'-'type'-'account_role'-'account_status',raw_app_meta_data=coalesce(raw_app_meta_data,'{}'::jsonb)||jsonb_build_object('professional_verified',true),updated_at=v_now where id=v.user_id;
  insert into public.verification_events(user_id,type,status,reviewer_id,reason,created_at) values(v.user_id,'professional_document','approved',p_actor_id,null,v_now);
  perform private.professional_kyc_append_evidence_event(v_set_id,'verified',p_actor_id,v_now,'verified:'||v_set_id::text);
  v_title:='Perfil profissional aprovado'; v_body:='Sua identidade foi verificada e seu perfil profissional já está ativo.'; v_target:='perfil-profissional.html'; v_label:='Abrir perfil profissional';
 else
  v_status:='rejected';
  update public.professional_identity_verifications set status='rejected',reviewer_id=p_actor_id,review_started_at=coalesce(review_started_at,v_now),decided_at=v_now,rejection_reason=left(v_reason,500),decision_version=decision_version+1,updated_at=v_now where id=v.id;
  update public.professional_profiles set document_status='rejected',setup_status='pending_verification',verification_status='rejected',updated_at=v_now where user_id=v.user_id;
  insert into public.verification_events(user_id,type,status,reviewer_id,reason,created_at) values(v.user_id,'professional_document','rejected',p_actor_id,left(v_reason,500),v_now);
  perform private.professional_kyc_append_evidence_event(v_set_id,'rejected',p_actor_id,v_now,'rejected:'||v_set_id::text);
  v_title:='Verificação profissional rejeitada'; v_body:='Revise os documentos e envie novamente. Motivo: '||left(v_reason,300); v_target:='verificacao-profissional.html'; v_label:='Corrigir e reenviar';
 end if;

 v_event_key:='professional_verification:'||v.id::text||':'||v_status; v_external_id:='notif_'||replace(v_event_key,':','_');
 insert into public.notifications(external_id,user_id,actor_id,type,category,event_key,title,body,target_url,action_label,data,read_at,dismissed_at,created_at,updated_at)
 values(v_external_id,v.user_id,p_actor_id,case when v_status='verified' then 'professional_verification_approved' else 'professional_verification_rejected' end,'account',v_event_key,v_title,v_body,v_target,v_label,jsonb_build_object('verificationId',v.id,'publicVerificationId','professional_verification_'||v.user_id::text,'status',v_status,'reason',v_reason,'reviewerId',p_actor_id),null,null,v_now,v_now)
 on conflict(user_id,event_key) where event_key is not null and event_key<>'' do update set actor_id=excluded.actor_id,type=excluded.type,category=excluded.category,title=excluded.title,body=excluded.body,target_url=excluded.target_url,action_label=excluded.action_label,data=excluded.data,read_at=null,dismissed_at=null,created_at=excluded.created_at,updated_at=excluded.updated_at;
 insert into public.audit_logs(actor_id,action,entity_type,entity_id,metadata,created_at) values(p_actor_id,case when v_decision='approve' then 'professional_verification_approved' else 'professional_verification_rejected' end,'professional_identity_verification',v.id,jsonb_build_object('user_id',v.user_id,'decision',v_decision,'actor_role',v_role,'notification_event_key',v_event_key),v_now);
 return jsonb_build_object('verificationId',v.id,'publicVerificationId','professional_verification_'||v.user_id::text,'userId',v.user_id,'status',v_status,'role',case when v_status='verified' then 'professional' else null end,'reviewerId',p_actor_id,'notificationEventKey',v_event_key,'decidedAt',v_now,'idempotent',false);
end;
$function$;

create or replace function public.reopen_own_professional_identity_verification()
returns jsonb
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare
  v_uid uuid:=auth.uid();
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz:=now();
  v_set_id uuid;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  select * into v_row from public.professional_identity_verifications where user_id=v_uid for update;
  if not found then raise exception 'VERIFICATION_NOT_FOUND' using errcode='P0002'; end if;

  if v_row.status<>'rejected' then
    return jsonb_build_object('id',v_row.id,'userId',v_row.user_id,'professionalProfileId','professional_profile_'||v_row.user_id::text,'status',v_row.status,'currentStep',v_row.current_step,'payload',coalesce(v_row.payload,'{}'::jsonb),'updatedAt',v_row.updated_at);
  end if;

  v_set_id:=private.professional_kyc_current_evidence_set(v_row.id);
  if v_set_id is null then raise exception using errcode='55000',message='DOKE_KYC_EVIDENCE_SET_REQUIRED'; end if;

  perform private.professional_kyc_append_evidence_event(v_set_id,'reopened',v_uid,v_now,'reopened:'||v_set_id::text);
  delete from private.professional_kyc_current_evidence where verification_id=v_row.id;

  update public.professional_identity_verifications
     set status='not_started',current_step=1,documents='{}'::jsonb,reviewer_id=null,
         rejection_reason=null,review_started_at=null,decided_at=null,submitted_at=null,updated_at=v_now
   where id=v_row.id returning * into v_row;

  update public.professional_profiles
     set document_status='unverified',verification_status='not_started',updated_at=v_now
   where user_id=v_uid;

  insert into public.verification_events(user_id,type,status,reason,created_at)
  values(v_uid,'professional_document','pending','Verificação reaberta pelo usuário para correção e novo envio.',v_now);

  return jsonb_build_object('id',v_row.id,'userId',v_row.user_id,'professionalProfileId','professional_profile_'||v_row.user_id::text,'status','not_started','currentStep',1,'payload',coalesce(v_row.payload,'{}'::jsonb),'updatedAt',v_now);
end;
$function$;

revoke all on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)
  to service_role;
revoke all on function public.start_professional_identity_review_internal(uuid,text)
  from public, anon, authenticated;
grant execute on function public.start_professional_identity_review_internal(uuid,text)
  to service_role;
revoke all on function public.decide_professional_identity_verification_internal(uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function public.decide_professional_identity_verification_internal(uuid,text,text,text)
  to service_role;
revoke all on function public.reopen_own_professional_identity_verification()
  from public, anon, authenticated, service_role;
grant execute on function public.reopen_own_professional_identity_verification()
  to service_role;

comment on table private.professional_kyc_evidence_sets is
  'Immutable per-submission KYC evidence-set provenance. No browser/service_role direct DML.';
comment on table private.professional_kyc_evidence_objects is
  'Immutable physical Storage identity snapshot for each KYC evidence object.';
comment on table private.professional_kyc_evidence_events is
  'Append-only immutable KYC evidence lifecycle events.';
comment on table private.professional_kyc_current_evidence is
  'Private mutable pointer from current verification row to current immutable evidence set.';

notify pgrst, 'reload schema';
