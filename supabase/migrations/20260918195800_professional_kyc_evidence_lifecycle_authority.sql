-- PROF-001 / PROF-B05 G4
-- Immutable KYC evidence lifecycle authority.

do $preflight$
begin
  if pg_catalog.to_regclass('private.professional_kyc_upload_intents') is null
     or pg_catalog.to_regclass('public.professional_identity_verifications') is null
     or pg_catalog.to_regclass('storage.objects') is null then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_PREREQUISITE_MISSING';
  end if;
  if pg_catalog.to_regclass('private.professional_kyc_evidence_sets') is not null
     or pg_catalog.to_regclass('private.professional_kyc_evidence_objects') is not null
     or pg_catalog.to_regclass('private.professional_kyc_evidence_events') is not null
     or pg_catalog.to_regclass('private.professional_kyc_current_evidence') is not null then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_SCHEMA_ALREADY_PRESENT';
  end if;
end
$preflight$;

create table private.professional_kyc_evidence_sets (
  id uuid primary key default gen_random_uuid(),
  verification_id uuid not null,
  user_id uuid not null,
  upload_intent_id uuid,
  verification_type text not null check (verification_type in ('individual','business')),
  provenance_kind text not null check (provenance_kind in ('signed_intent','signed_intent_reconciled','legacy_current_snapshot')),
  submitted_at timestamptz not null,
  manifest_sha256 text not null check (manifest_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default now(),
  unique (verification_id,id)
);

create unique index professional_kyc_evidence_sets_upload_intent_uidx
  on private.professional_kyc_evidence_sets(upload_intent_id)
  where upload_intent_id is not null;
create index professional_kyc_evidence_sets_user_idx
  on private.professional_kyc_evidence_sets(user_id,submitted_at desc);
create index professional_kyc_evidence_sets_verification_idx
  on private.professional_kyc_evidence_sets(verification_id,submitted_at desc);

create table private.professional_kyc_evidence_objects (
  id uuid primary key default gen_random_uuid(),
  evidence_set_id uuid not null references private.professional_kyc_evidence_sets(id),
  document_field text not null check (document_field in ('documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument')),
  bucket_id text not null check (bucket_id='professional-verification-media'),
  object_path text not null,
  storage_object_id uuid not null,
  storage_object_version text not null,
  mime_type text not null,
  byte_size bigint not null check (byte_size between 1 and 10485760),
  recorded_at timestamptz not null default now(),
  check (
    (document_field='selfieDocument' and mime_type in ('image/jpeg','image/png'))
    or
    (document_field<>'selfieDocument' and mime_type in ('image/jpeg','image/png','application/pdf'))
  ),
  unique (evidence_set_id,document_field),
  unique (bucket_id,object_path),
  unique (storage_object_id,storage_object_version)
);
create index professional_kyc_evidence_objects_set_idx
  on private.professional_kyc_evidence_objects(evidence_set_id);

create table private.professional_kyc_evidence_events (
  id uuid primary key default gen_random_uuid(),
  evidence_set_id uuid not null references private.professional_kyc_evidence_sets(id),
  event_kind text not null check (event_kind in ('submitted','review_started','rejected','verified','reopened','snapshot_imported')),
  source_kind text not null check (source_kind in ('authoritative_transition','legacy_observation')),
  actor_id uuid,
  source_event_key text not null unique,
  occurred_at timestamptz not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  recorded_at timestamptz not null default now(),
  check (
    (event_kind='snapshot_imported' and source_kind='legacy_observation')
    or
    (event_kind<>'snapshot_imported' and source_kind='authoritative_transition')
  ),
  unique (evidence_set_id,event_kind)
);
create unique index professional_kyc_evidence_events_terminal_uidx
  on private.professional_kyc_evidence_events(evidence_set_id)
  where event_kind in ('rejected','verified');
create index professional_kyc_evidence_events_order_idx
  on private.professional_kyc_evidence_events(evidence_set_id,occurred_at,recorded_at);

create table private.professional_kyc_current_evidence (
  verification_id uuid primary key references public.professional_identity_verifications(id) on delete cascade,
  evidence_set_id uuid not null unique,
  linked_at timestamptz not null default now(),
  foreign key (verification_id,evidence_set_id)
    references private.professional_kyc_evidence_sets(verification_id,id)
);

alter table private.professional_kyc_evidence_sets enable row level security;
alter table private.professional_kyc_evidence_objects enable row level security;
alter table private.professional_kyc_evidence_events enable row level security;
alter table private.professional_kyc_current_evidence enable row level security;

revoke all privileges on table private.professional_kyc_evidence_sets from public,anon,authenticated,service_role;
revoke all privileges on table private.professional_kyc_evidence_objects from public,anon,authenticated,service_role;
revoke all privileges on table private.professional_kyc_evidence_events from public,anon,authenticated,service_role;
revoke all privileges on table private.professional_kyc_current_evidence from public,anon,authenticated,service_role;

create or replace function private.reject_professional_kyc_evidence_mutation()
returns trigger
language plpgsql
security definer
set search_path=pg_catalog
as $function$
begin
  raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_IMMUTABLE';
end;
$function$;
revoke all on function private.reject_professional_kyc_evidence_mutation() from public,anon,authenticated,service_role;

create trigger professional_kyc_evidence_sets_immutable_row before update or delete
on private.professional_kyc_evidence_sets for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_sets_immutable_truncate before truncate
on private.professional_kyc_evidence_sets for each statement execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_objects_immutable_row before update or delete
on private.professional_kyc_evidence_objects for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_objects_immutable_truncate before truncate
on private.professional_kyc_evidence_objects for each statement execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_events_immutable_row before update or delete
on private.professional_kyc_evidence_events for each row execute function private.reject_professional_kyc_evidence_mutation();
create trigger professional_kyc_evidence_events_immutable_truncate before truncate
on private.professional_kyc_evidence_events for each statement execute function private.reject_professional_kyc_evidence_mutation();

create or replace function private.append_professional_kyc_evidence_event(
  p_evidence_set_id uuid,
  p_event_kind text,
  p_source_kind text,
  p_actor_id uuid,
  p_occurred_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path=pg_catalog
as $function$
declare v_event_id uuid;
begin
  if p_evidence_set_id is null
     or p_event_kind not in ('submitted','review_started','rejected','verified','reopened','snapshot_imported')
     or p_source_kind not in ('authoritative_transition','legacy_observation')
     or ((p_event_kind='snapshot_imported') <> (p_source_kind='legacy_observation'))
     or p_occurred_at is null
     or jsonb_typeof(coalesce(p_metadata,'null'::jsonb))<>'object' then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_EVENT_INVALID';
  end if;

  insert into private.professional_kyc_evidence_events(
    evidence_set_id,event_kind,source_kind,actor_id,source_event_key,occurred_at,metadata
  ) values (
    p_evidence_set_id,p_event_kind,p_source_kind,p_actor_id,
    p_evidence_set_id::text||':'||p_event_kind,p_occurred_at,coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict (evidence_set_id,event_kind) do nothing
  returning id into v_event_id;

  if v_event_id is null then
    select id into v_event_id
      from private.professional_kyc_evidence_events
     where evidence_set_id=p_evidence_set_id and event_kind=p_event_kind;
  end if;
  return v_event_id;
end;
$function$;
revoke all on function private.append_professional_kyc_evidence_event(uuid,text,text,uuid,timestamptz,jsonb)
  from public,anon,authenticated,service_role;

create or replace function private.create_professional_kyc_evidence_set(
  p_verification_id uuid,
  p_user_id uuid,
  p_upload_intent_id uuid,
  p_verification_type text,
  p_documents jsonb,
  p_submitted_at timestamptz,
  p_provenance_kind text,
  p_event_kind text,
  p_source_kind text,
  p_actor_id uuid,
  p_event_at timestamptz,
  p_metadata jsonb default '{}'::jsonb
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
  v_doc_count integer;
  v_object_count integer;
  v_doc record;
  v_object storage.objects%rowtype;
  v_intent private.professional_kyc_upload_intents%rowtype;
begin
  if p_verification_id is null or p_user_id is null
     or p_verification_type not in ('individual','business')
     or p_submitted_at is null
     or p_provenance_kind not in ('signed_intent','signed_intent_reconciled','legacy_current_snapshot')
     or jsonb_typeof(coalesce(p_documents,'null'::jsonb))<>'object'
     or not exists (select 1 from jsonb_each(p_documents)) then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_SET_INVALID';
  end if;

  if exists (
    select 1 from jsonb_each(p_documents) d
     where d.key not in ('documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument')
        or d.value->>'bucket'<>'professional-verification-media'
        or nullif(d.value->>'path','') is null
  ) then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_DOCUMENT_INVALID';
  end if;

  if p_provenance_kind in ('signed_intent','signed_intent_reconciled') then
    if p_upload_intent_id is null then
      raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_INTENT_REQUIRED';
    end if;
    select * into v_intent
      from private.professional_kyc_upload_intents
     where id=p_upload_intent_id;
    if not found or v_intent.user_id<>p_user_id
       or v_intent.verification_type<>p_verification_type
       or v_intent.status<>'consumed' or v_intent.consumed_at is null then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_INTENT_INVALID';
    end if;
    if exists (
      select 1
        from jsonb_each(v_intent.files) i
        full join jsonb_each(p_documents) d on d.key=i.key
       where i.key is null or d.key is null
          or (i.value->>'bucket') is distinct from (d.value->>'bucket')
          or (i.value->>'path') is distinct from (d.value->>'path')
          or lower(i.value->>'type') is distinct from lower(d.value->>'type')
          or (i.value->>'size') is distinct from (d.value->>'size')
    ) then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_INTENT_MANIFEST_MISMATCH';
    end if;
  elsif p_upload_intent_id is not null then
    raise exception using errcode='22023', message='DOKE_KYC_EVIDENCE_LEGACY_INTENT_FORBIDDEN';
  end if;

  select count(*) into v_doc_count from jsonb_each(p_documents);

  select count(*),
         jsonb_agg(jsonb_build_object(
           'field',d.key,'bucket',o.bucket_id,'path',o.name,
           'objectId',o.id,'version',o.version,
           'type',lower(coalesce(o.metadata->>'mimetype','')),
           'size',greatest(0,coalesce((o.metadata->>'size')::bigint,0))
         ) order by d.key)
    into v_object_count,v_manifest
    from jsonb_each(p_documents) d
    join storage.objects o
      on o.bucket_id=d.value->>'bucket' and o.name=d.value->>'path'
   where o.id is not null and nullif(o.version,'') is not null;

  if v_object_count<>v_doc_count then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_STORAGE_IDENTITY_MISSING';
  end if;

  if exists (
    select 1
      from jsonb_each(p_documents) d
      join storage.objects o
        on o.bucket_id=d.value->>'bucket' and o.name=d.value->>'path'
     where lower(coalesce(o.metadata->>'mimetype','')) is distinct from lower(d.value->>'type')
        or greatest(0,coalesce((o.metadata->>'size')::bigint,0)) is distinct from (d.value->>'size')::bigint
  ) then
    raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_STORAGE_MANIFEST_MISMATCH';
  end if;

  v_manifest_sha:=encode(extensions.digest(convert_to(v_manifest::text,'UTF8'),'sha256'),'hex');

  insert into private.professional_kyc_evidence_sets(
    id,verification_id,user_id,upload_intent_id,verification_type,
    provenance_kind,submitted_at,manifest_sha256
  ) values (
    v_set_id,p_verification_id,p_user_id,p_upload_intent_id,p_verification_type,
    p_provenance_kind,p_submitted_at,v_manifest_sha
  );

  for v_doc in
    select d.key as field,d.value as payload from jsonb_each(p_documents) d order by d.key
  loop
    select * into strict v_object
      from storage.objects o
     where o.bucket_id=v_doc.payload->>'bucket' and o.name=v_doc.payload->>'path';

    insert into private.professional_kyc_evidence_objects(
      evidence_set_id,document_field,bucket_id,object_path,
      storage_object_id,storage_object_version,mime_type,byte_size
    ) values (
      v_set_id,v_doc.field,v_object.bucket_id,v_object.name,
      v_object.id,v_object.version,lower(v_object.metadata->>'mimetype'),
      (v_object.metadata->>'size')::bigint
    );
  end loop;

  perform private.append_professional_kyc_evidence_event(
    v_set_id,p_event_kind,p_source_kind,p_actor_id,p_event_at,p_metadata
  );
  return v_set_id;
end;
$function$;
revoke all on function private.create_professional_kyc_evidence_set(uuid,uuid,uuid,text,jsonb,timestamptz,text,text,text,uuid,timestamptz,jsonb)
  from public,anon,authenticated,service_role;

do $backfill$
declare
  v_row public.professional_identity_verifications%rowtype;
  v_doc_count integer;
  v_locked_count integer;
  v_distinct_intents integer;
  v_intent_text text;
  v_intent_id uuid;
  v_set_id uuid;
  v_provenance text;
begin
  for v_row in select * from public.professional_identity_verifications order by id
  loop
    if v_row.documents='{}'::jsonb then
      if v_row.status<>'not_started' then
        raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_EMPTY_ACTIVE';
      end if;
      continue;
    end if;

    if v_row.status='not_started' or v_row.submitted_at is null then
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_TEMPORAL_AMBIGUITY';
    end if;

    select count(*),count(*) filter(where split_part(d.value->>'path','/',1)='locked')
      into v_doc_count,v_locked_count
      from jsonb_each(v_row.documents) d;

    if v_locked_count=0 then
      v_provenance:='legacy_current_snapshot';
      v_intent_id:=null;
    elsif v_locked_count=v_doc_count then
      select min(split_part(d.value->>'path','/',3)),
             count(distinct split_part(d.value->>'path','/',3))
        into v_intent_text,v_distinct_intents
        from jsonb_each(v_row.documents) d;
      if v_distinct_intents<>1 then
        raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_INTENT_AMBIGUOUS';
      end if;
      begin
        v_intent_id:=v_intent_text::uuid;
      exception when invalid_text_representation then
        raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_INTENT_AMBIGUOUS';
      end;
      if not exists (
        select 1 from private.professional_kyc_upload_intents i
         where i.id=v_intent_id and i.user_id=v_row.user_id
           and i.status='consumed' and i.consumed_at is not null
      ) then
        raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_INTENT_AMBIGUOUS';
      end if;
      v_provenance:='signed_intent_reconciled';
    else
      raise exception using errcode='55000', message='DOKE_KYC_EVIDENCE_BACKFILL_MIXED_PROVENANCE';
    end if;

    v_set_id:=private.create_professional_kyc_evidence_set(
      p_verification_id:=v_row.id,
      p_user_id:=v_row.user_id,
      p_upload_intent_id:=v_intent_id,
      p_verification_type:=v_row.verification_type,
      p_documents:=v_row.documents,
      p_submitted_at:=v_row.submitted_at,
      p_provenance_kind:=v_provenance,
      p_event_kind:='snapshot_imported',
      p_source_kind:='legacy_observation',
      p_actor_id:=null,
      p_event_at:=now(),
      p_metadata:=jsonb_strip_nulls(jsonb_build_object(
        'observedStatus',v_row.status,
        'sourceSubmittedAt',v_row.submitted_at,
        'sourceDecidedAt',v_row.decided_at
      ))
    );

    insert into private.professional_kyc_current_evidence(verification_id,evidence_set_id,linked_at)
    values(v_row.id,v_set_id,now());
  end loop;
end
$backfill$;


create or replace function public.submit_professional_identity_verification_internal(
  p_actor_id uuid,
  p_upload_intent_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_id uuid;
  v_now timestamptz:=now();
  v_type text;
  v_tax text;
  v_legal_name text;
  v_birth_date date;
  v_representative text;
  v_postal_code text;
  v_street text;
  v_number text;
  v_city text;
  v_state text;
  v_documents jsonb;
  v_payload jsonb;
  v_evidence_set_id uuid;
begin
  if p_actor_id is null then
    raise exception using errcode='28000', message='DOKE_KYC_APPLICANT_AUTH_REQUIRED';
  end if;
  if not exists(
    select 1 from public.users u
    join public.professional_profiles p on p.user_id=u.id
    where u.id=p_actor_id and u.status='active' and u.role='client'
      and p.setup_status='pending_verification'
      and p.verification_status in('not_started','rejected')
  ) then
    raise exception using errcode='42501', message='DOKE_KYC_APPLICANT_REQUIRED';
  end if;
  if jsonb_typeof(coalesce(p_payload,'null'::jsonb))<>'object' then
    raise exception using errcode='22023', message='DOKE_KYC_PAYLOAD_INVALID';
  end if;

  v_type:=case when p_payload->>'verificationType'='business' then 'business' else 'individual' end;
  v_tax:=regexp_replace(coalesce(p_payload->>'taxId',''),'\D','','g');
  v_legal_name:=regexp_replace(trim(coalesce(p_payload->>'legalName','')),'\s+',' ','g');
  v_representative:=regexp_replace(trim(coalesce(p_payload->>'representativeName','')),'\s+',' ','g');
  v_postal_code:=regexp_replace(coalesce(p_payload->>'postalCode',''),'\D','','g');
  v_street:=regexp_replace(trim(coalesce(p_payload->>'street','')),'\s+',' ','g');
  v_number:=trim(coalesce(p_payload->>'number',''));
  v_city:=regexp_replace(trim(coalesce(p_payload->>'city','')),'\s+',' ','g');
  v_state:=upper(trim(coalesce(p_payload->>'state','')));
  begin v_birth_date:=nullif(p_payload->>'birthDate','')::date;
  exception when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode='22023', message='DOKE_KYC_BIRTH_DATE_INVALID'; end;

  if char_length(v_legal_name)<3 or char_length(v_legal_name)>180 then
    raise exception using errcode='22023', message='DOKE_KYC_LEGAL_NAME_INVALID'; end if;
  if (v_type='individual' and char_length(v_tax)<>11)
     or (v_type='business' and char_length(v_tax)<>14) then
    raise exception using errcode='22023', message='DOKE_KYC_TAX_ID_INVALID'; end if;
  if v_type='individual' and (v_birth_date is null or v_birth_date>=current_date) then
    raise exception using errcode='22023', message='DOKE_KYC_BIRTH_DATE_INVALID'; end if;
  if v_type='business' and char_length(v_representative)<3 then
    raise exception using errcode='22023', message='DOKE_KYC_REPRESENTATIVE_INVALID'; end if;
  if char_length(v_postal_code)<>8 or char_length(v_street)<3 or char_length(v_number)<1
     or char_length(v_city)<2 or v_state!~'^[A-Z]{2}$' then
    raise exception using errcode='22023', message='DOKE_KYC_ADDRESS_INVALID'; end if;
  if coalesce((p_payload->>'truthConfirmed')::boolean,false) is not true
     or coalesce((p_payload->>'consentAccepted')::boolean,false) is not true then
    raise exception using errcode='22023', message='DOKE_KYC_CONSENT_REQUIRED'; end if;

  v_documents:=private.consume_professional_kyc_upload_intent(p_actor_id,p_upload_intent_id,v_type);
  v_payload:=jsonb_strip_nulls(jsonb_build_object(
    'verificationType',v_type,'legalName',v_legal_name,
    'birthDate',case when v_type='individual' then v_birth_date else null end,
    'representativeName',case when v_type='business' then v_representative else null end,
    'postalCode',v_postal_code,'street',v_street,'number',left(v_number,30),
    'complement',left(regexp_replace(trim(coalesce(p_payload->>'complement','')),'\s+',' ','g'),120),
    'district',left(regexp_replace(trim(coalesce(p_payload->>'district','')),'\s+',' ','g'),100),
    'city',left(v_city,100),'state',v_state,
    'documentType',left(trim(coalesce(p_payload->>'documentType','')),40),
    'truthConfirmed',true,'consentAccepted',true));

  insert into public.professional_identity_verifications(
    user_id,professional_profile_user_id,status,verification_type,legal_name,
    tax_id_last4,tax_id_digest,tax_id_digest_version,birth_date,representative_name,
    address,documents,current_step,payload,submitted_at,reviewer_id,rejection_reason,
    review_started_at,decided_at,decision_version,created_at,updated_at)
  values(
    p_actor_id,p_actor_id,'submitted',v_type,v_legal_name,right(v_tax,4),
    private.kyc_tax_digest(v_tax),'hmac-sha256-v1',
    case when v_type='individual' then v_birth_date else null end,
    case when v_type='business' then v_representative else null end,
    jsonb_build_object('postalCode',v_postal_code,'street',v_street,'number',left(v_number,30),
      'complement',v_payload->>'complement','district',v_payload->>'district','city',v_payload->>'city','state',v_state),
    v_documents,3,v_payload,v_now,null,null,null,null,0,v_now,v_now)
  on conflict(user_id) do update set
    status='submitted',verification_type=excluded.verification_type,legal_name=excluded.legal_name,
    tax_id_last4=excluded.tax_id_last4,tax_id_digest=excluded.tax_id_digest,
    tax_id_digest_version=excluded.tax_id_digest_version,birth_date=excluded.birth_date,
    representative_name=excluded.representative_name,address=excluded.address,
    documents=excluded.documents,current_step=3,payload=excluded.payload,submitted_at=v_now,
    reviewer_id=null,rejection_reason=null,review_started_at=null,decided_at=null,
    decision_version=public.professional_identity_verifications.decision_version+1,updated_at=v_now
  where public.professional_identity_verifications.status='not_started'
  returning id into v_id;

  if v_id is null then
    raise exception using errcode='55000', message='DOKE_KYC_SUBMISSION_LOCKED'; end if;

  v_evidence_set_id := private.create_professional_kyc_evidence_set(
    p_verification_id := v_id,
    p_user_id := p_actor_id,
    p_upload_intent_id := p_upload_intent_id,
    p_verification_type := v_type,
    p_documents := v_documents,
    p_submitted_at := v_now,
    p_provenance_kind := 'signed_intent',
    p_event_kind := 'submitted',
    p_source_kind := 'authoritative_transition',
    p_actor_id := p_actor_id,
    p_event_at := v_now,
    p_metadata := '{}'::jsonb
  );

  insert into private.professional_kyc_current_evidence (
    verification_id, evidence_set_id, linked_at
  ) values (
    v_id, v_evidence_set_id, v_now
  );

  update public.professional_profiles
  set document_status='pending',verification_status='submitted',updated_at=v_now
  where user_id=p_actor_id;
  insert into public.verification_events(user_id,type,status,created_at)
  values(p_actor_id,'professional_document','pending',v_now);

  return jsonb_build_object('id',v_id,'userId',p_actor_id,
    'professionalProfileId','professional_profile_'||p_actor_id::text,
    'status','submitted','currentStep',3,
    'payload',v_payload||v_documents||jsonb_build_object('taxIdLast4',right(v_tax,4)),
    'submittedAt',v_now,'updatedAt',v_now);
end;
$$;

create or replace function public.start_professional_identity_review_internal(
  p_actor_id uuid,
  p_verification_id text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_id uuid;
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := now();
  v_evidence_set_id uuid;
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);
  v_id := private.resolve_professional_kyc_verification_id(p_verification_id);

  select * into v_row
  from public.professional_identity_verifications v
  where v.id = v_id
  for update;

  select ce.evidence_set_id
    into v_evidence_set_id
    from private.professional_kyc_current_evidence ce
   where ce.verification_id = v_row.id;

  if v_evidence_set_id is null then
    raise exception using errcode = '55000', message = 'DOKE_KYC_EVIDENCE_SET_REQUIRED';
  end if;

  if v_row.status = 'under_review' then
    if v_row.reviewer_id = p_actor_id or v_role = 'admin' then
      return jsonb_build_object(
        'id', v_row.id,
        'status', v_row.status,
        'reviewerId', v_row.reviewer_id,
        'updatedAt', v_row.updated_at
      );
    end if;
    raise exception using errcode = '55000', message = 'DOKE_KYC_ALREADY_CLAIMED';
  end if;

  if v_row.status <> 'submitted' then
    raise exception using errcode = '55000', message = 'DOKE_KYC_REVIEW_START_NOT_ALLOWED';
  end if;

  update public.professional_identity_verifications
     set status = 'under_review',
         reviewer_id = p_actor_id,
         review_started_at = coalesce(review_started_at, v_now),
         updated_at = v_now
   where id = v_row.id
   returning * into v_row;

  perform private.append_professional_kyc_evidence_event(
    v_evidence_set_id,
    'review_started',
    'authoritative_transition',
    p_actor_id,
    v_now,
    '{}'::jsonb
  );

  update public.professional_profiles
     set verification_status = 'under_review',
         updated_at = v_now
   where user_id = v_row.user_id;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    p_actor_id,
    'professional_verification_review_started',
    'professional_identity_verification',
    v_row.id,
    jsonb_build_object('user_id', v_row.user_id, 'actor_role', v_role),
    v_now
  );

  return jsonb_build_object(
    'id', v_row.id,
    'status', 'under_review',
    'reviewerId', p_actor_id,
    'updatedAt', v_now
  );
end;
$$;

create or replace function public.decide_professional_identity_verification_internal(
  p_actor_id uuid,
  p_verification_id text,
  p_decision text,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
  v_id uuid;
  v_verification public.professional_identity_verifications%rowtype;
  v_decision text := lower(trim(coalesce(p_decision, '')));
  v_reason text := nullif(regexp_replace(trim(coalesce(p_rejection_reason, '')), '\s+', ' ', 'g'), '');
  v_status text;
  v_now timestamptz := now();
  v_title text;
  v_body text;
  v_target_url text;
  v_action_label text;
  v_event_key text;
  v_external_id text;
  v_evidence_set_id uuid;
begin
  v_role := private.assert_professional_kyc_reviewer(p_actor_id);
  v_id := private.resolve_professional_kyc_verification_id(p_verification_id);

  if v_decision not in ('approve', 'reject') then
    raise exception using errcode = '22023', message = 'DOKE_KYC_DECISION_INVALID';
  end if;
  if v_decision = 'reject' and (v_reason is null or char_length(v_reason) < 10) then
    raise exception using errcode = '22023', message = 'DOKE_KYC_REJECTION_REASON_REQUIRED';
  end if;

  select * into v_verification
  from public.professional_identity_verifications v
  where v.id = v_id
  for update;

  select ce.evidence_set_id
    into v_evidence_set_id
    from private.professional_kyc_current_evidence ce
   where ce.verification_id = v_verification.id;

  if v_evidence_set_id is null then
    raise exception using errcode = '55000', message = 'DOKE_KYC_EVIDENCE_SET_REQUIRED';
  end if;

  if (v_verification.status = 'verified' and v_decision = 'approve')
     or (v_verification.status = 'rejected' and v_decision = 'reject') then
    return jsonb_build_object(
      'verificationId', v_verification.id,
      'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
      'userId', v_verification.user_id,
      'status', v_verification.status,
      'role', case when v_verification.status = 'verified' then 'professional' else null end,
      'reviewerId', v_verification.reviewer_id,
      'decidedAt', v_verification.decided_at,
      'idempotent', true
    );
  end if;

  if v_verification.status = 'submitted' then
    update public.professional_identity_verifications
       set status = 'under_review',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           updated_at = v_now
     where id = v_verification.id
     returning * into v_verification;

    perform private.append_professional_kyc_evidence_event(
      v_evidence_set_id,
      'review_started',
      'authoritative_transition',
      p_actor_id,
      v_now,
      '{}'::jsonb
    );
  end if;

  if v_verification.status <> 'under_review' then
    raise exception using errcode = '55000', message = 'DOKE_KYC_DECISION_NOT_ALLOWED';
  end if;
  if v_verification.reviewer_id is distinct from p_actor_id and v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'DOKE_KYC_REVIEW_OWNER_REQUIRED';
  end if;

  if v_decision = 'approve' then
    v_status := 'verified';

    update public.professional_identity_verifications
       set status = 'verified',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           decided_at = v_now,
           rejection_reason = null,
           decision_version = decision_version + 1,
           updated_at = v_now
     where id = v_verification.id;

    update public.professional_profiles
       set document_status = 'verified',
           setup_status = 'active',
           verification_status = 'verified',
           updated_at = v_now
     where user_id = v_verification.user_id;

    update public.users
       set role = 'professional',
           status = 'active',
           updated_at = v_now
     where id = v_verification.user_id;

    update auth.users
       set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
             - 'role' - 'type' - 'account_role' - 'account_status',
           raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
             || jsonb_build_object('professional_verified', true),
           updated_at = v_now
     where id = v_verification.user_id;

    insert into public.verification_events (
      user_id, type, status, reviewer_id, reason, created_at
    ) values (
      v_verification.user_id, 'professional_document', 'approved', p_actor_id, null, v_now
    );

    v_title := 'Perfil profissional aprovado';
    v_body := 'Sua identidade foi verificada e seu perfil profissional já está ativo.';
    v_target_url := 'perfil-profissional.html';
    v_action_label := 'Abrir perfil profissional';
  else
    v_status := 'rejected';

    update public.professional_identity_verifications
       set status = 'rejected',
           reviewer_id = p_actor_id,
           review_started_at = coalesce(review_started_at, v_now),
           decided_at = v_now,
           rejection_reason = left(v_reason, 500),
           decision_version = decision_version + 1,
           updated_at = v_now
     where id = v_verification.id;

    update public.professional_profiles
       set document_status = 'rejected',
           setup_status = 'pending_verification',
           verification_status = 'rejected',
           updated_at = v_now
     where user_id = v_verification.user_id;

    insert into public.verification_events (
      user_id, type, status, reviewer_id, reason, created_at
    ) values (
      v_verification.user_id, 'professional_document', 'rejected', p_actor_id, left(v_reason, 500), v_now
    );

    v_title := 'Verificação profissional rejeitada';
    v_body := 'Revise os documentos e envie novamente. Motivo: ' || left(v_reason, 300);
    v_target_url := 'verificacao-profissional.html';
    v_action_label := 'Corrigir e reenviar';
  end if;

  perform private.append_professional_kyc_evidence_event(
    v_evidence_set_id,
    v_status,
    'authoritative_transition',
    p_actor_id,
    v_now,
    '{}'::jsonb
  );

  v_event_key := 'professional_verification:' || v_verification.id::text || ':' || v_status;
  v_external_id := 'notif_' || replace(v_event_key, ':', '_');

  insert into public.notifications (
    external_id, user_id, actor_id, type, category, event_key,
    title, body, target_url, action_label, data,
    read_at, dismissed_at, created_at, updated_at
  ) values (
    v_external_id,
    v_verification.user_id,
    p_actor_id,
    case when v_status = 'verified'
      then 'professional_verification_approved'
      else 'professional_verification_rejected'
    end,
    'account',
    v_event_key,
    v_title,
    v_body,
    v_target_url,
    v_action_label,
    jsonb_build_object(
      'verificationId', v_verification.id,
      'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
      'status', v_status,
      'reason', v_reason,
      'reviewerId', p_actor_id
    ),
    null, null, v_now, v_now
  )
  on conflict (user_id, event_key) where event_key is not null and event_key <> ''
  do update set
    actor_id = excluded.actor_id,
    type = excluded.type,
    category = excluded.category,
    title = excluded.title,
    body = excluded.body,
    target_url = excluded.target_url,
    action_label = excluded.action_label,
    data = excluded.data,
    read_at = null,
    dismissed_at = null,
    created_at = excluded.created_at,
    updated_at = excluded.updated_at;

  insert into public.audit_logs (
    actor_id, action, entity_type, entity_id, metadata, created_at
  ) values (
    p_actor_id,
    case when v_decision = 'approve'
      then 'professional_verification_approved'
      else 'professional_verification_rejected'
    end,
    'professional_identity_verification',
    v_verification.id,
    jsonb_build_object(
      'user_id', v_verification.user_id,
      'decision', v_decision,
      'actor_role', v_role,
      'notification_event_key', v_event_key
    ),
    v_now
  );

  return jsonb_build_object(
    'verificationId', v_verification.id,
    'publicVerificationId', 'professional_verification_' || v_verification.user_id::text,
    'userId', v_verification.user_id,
    'status', v_status,
    'role', case when v_status = 'verified' then 'professional' else null end,
    'reviewerId', p_actor_id,
    'notificationEventKey', v_event_key,
    'decidedAt', v_now,
    'idempotent', false
  );
end;
$$;

create or replace function public.reopen_own_professional_identity_verification()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_uid uuid := auth.uid();
  v_row public.professional_identity_verifications%rowtype;
  v_now timestamptz := pg_catalog.now();
  v_evidence_set_id uuid;
begin
  if v_uid is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;

  select *
    into v_row
    from public.professional_identity_verifications
   where user_id = v_uid
   for update;

  if not found then
    raise exception 'VERIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;

  if v_row.status <> 'rejected' then
    return pg_catalog.jsonb_build_object(
      'id', v_row.id,
      'userId', v_row.user_id,
      'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
      'status', v_row.status,
      'currentStep', v_row.current_step,
      'payload', pg_catalog.coalesce(v_row.payload, '{}'::jsonb),
      'updatedAt', v_row.updated_at
    );
  end if;

  select ce.evidence_set_id
    into v_evidence_set_id
    from private.professional_kyc_current_evidence ce
   where ce.verification_id = v_row.id;

  if v_evidence_set_id is null then
    raise exception using errcode = '55000', message = 'DOKE_KYC_EVIDENCE_SET_REQUIRED';
  end if;

  perform private.append_professional_kyc_evidence_event(
    v_evidence_set_id,
    'reopened',
    'authoritative_transition',
    v_uid,
    v_now,
    '{}'::jsonb
  );

  delete from private.professional_kyc_current_evidence
   where verification_id = v_row.id;

  update public.professional_identity_verifications
     set status = 'not_started',
         current_step = 1,
         documents = '{}'::jsonb,
         reviewer_id = null,
         rejection_reason = null,
         review_started_at = null,
         decided_at = null,
         submitted_at = null,
         updated_at = v_now
   where id = v_row.id
   returning * into v_row;

  update public.professional_profiles
     set document_status = 'unverified',
         verification_status = 'not_started',
         updated_at = v_now
   where user_id = v_uid;

  insert into public.verification_events (
    user_id,
    type,
    status,
    reason,
    created_at
  ) values (
    v_uid,
    'professional_document',
    'pending',
    'Verificação reaberta pelo usuário para correção e novo envio.',
    v_now
  );

  return pg_catalog.jsonb_build_object(
    'id', v_row.id,
    'userId', v_row.user_id,
    'professionalProfileId', 'professional_profile_' || v_row.user_id::text,
    'status', 'not_started',
    'currentStep', 1,
    'payload', pg_catalog.coalesce(v_row.payload, '{}'::jsonb),
    'updatedAt', v_now
  );
end;
$function$;

-- Preserve current service-only API boundaries.
revoke all on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb) to service_role;
revoke all on function public.start_professional_identity_review_internal(uuid,text) from public,anon,authenticated;
grant execute on function public.start_professional_identity_review_internal(uuid,text) to service_role;
revoke all on function public.decide_professional_identity_verification_internal(uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.decide_professional_identity_verification_internal(uuid,text,text,text) to service_role;
revoke all on function public.reopen_own_professional_identity_verification() from public,anon,authenticated,service_role;
grant execute on function public.reopen_own_professional_identity_verification() to service_role;

comment on table private.professional_kyc_evidence_sets is
  'Immutable per-submission KYC evidence-set identity. Historical rows intentionally do not cascade from user or verification deletion.';
comment on table private.professional_kyc_evidence_objects is
  'Immutable physical Storage identity snapshot for each KYC evidence object.';
comment on table private.professional_kyc_evidence_events is
  'Append-only lifecycle for immutable KYC evidence sets.';
comment on table private.professional_kyc_current_evidence is
  'Private mutable pointer from the compatibility KYC row to its active immutable evidence set.';

notify pgrst,'reload schema';
