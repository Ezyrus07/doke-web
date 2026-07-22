-- Doke SEC-001 / professional KYC final-submission authority.
-- Draft/profile/reopen RPCs keep their auth.uid() ownership checks from the existing contract.
-- Binary evidence and final submission now cross a JWT Edge Function and service-role-only RPC.

create table if not exists private.kyc_crypto_secrets (
  secret_name text primary key,
  secret_value bytea not null,
  created_at timestamptz not null default now()
);
revoke all privileges on table private.kyc_crypto_secrets from public, anon, authenticated, service_role;

insert into private.kyc_crypto_secrets (secret_name, secret_value)
values ('tax-id-hmac-v1', extensions.gen_random_bytes(32))
on conflict (secret_name) do nothing;

create or replace function private.kyc_tax_digest(p_tax_id text)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare v_secret bytea;
begin
  select secret_value into v_secret
  from private.kyc_crypto_secrets
  where secret_name = 'tax-id-hmac-v1';
  if v_secret is null then
    raise exception using errcode='55000', message='DOKE_KYC_CRYPTO_SECRET_MISSING';
  end if;
  return encode(extensions.hmac(convert_to(p_tax_id,'UTF8'),v_secret,'sha256'),'hex');
end;
$$;
revoke all on function private.kyc_tax_digest(text) from public, anon, authenticated, service_role;

create or replace function private.consume_professional_kyc_upload_intent(
  p_user_id uuid,
  p_upload_intent_id uuid,
  p_verification_type text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_intent private.professional_kyc_upload_intents%rowtype;
  v_required text[] := case when p_verification_type='business'
    then array['documentFront','documentBack','selfieDocument','proofOfAddress','businessDocument']
    else array['documentFront','documentBack','selfieDocument','proofOfAddress'] end;
  v_key text;
  v_doc jsonb;
  v_path text;
  v_expected_mime text;
  v_expected_size bigint;
  v_stored_mime text;
  v_stored_size bigint;
  v_result jsonb := '{}'::jsonb;
begin
  if p_user_id is null or p_upload_intent_id is null then
    raise exception using errcode='22023', message='DOKE_KYC_UPLOAD_INTENT_REQUIRED';
  end if;

  select * into v_intent
  from private.professional_kyc_upload_intents
  where id=p_upload_intent_id
  for update;

  if not found or v_intent.user_id<>p_user_id then
    raise exception using errcode='P0002', message='DOKE_KYC_UPLOAD_INTENT_NOT_FOUND';
  end if;
  if v_intent.status<>'prepared' then
    raise exception using errcode='55000', message='DOKE_KYC_UPLOAD_INTENT_USED';
  end if;
  if v_intent.expires_at<=now() then
    raise exception using errcode='55000', message='DOKE_KYC_UPLOAD_INTENT_EXPIRED';
  end if;
  if v_intent.verification_type<>p_verification_type then
    raise exception using errcode='22023', message='DOKE_KYC_UPLOAD_INTENT_TYPE_MISMATCH';
  end if;
  if jsonb_object_length(v_intent.files)<>cardinality(v_required)
     or exists(select 1 from unnest(v_required) k where not(v_intent.files?k)) then
    raise exception using errcode='22023', message='DOKE_KYC_UPLOAD_MANIFEST_INVALID';
  end if;

  foreach v_key in array v_required loop
    v_doc:=v_intent.files->v_key;
    v_path:=v_doc->>'path';
    v_expected_mime:=lower(v_doc->>'type');
    v_expected_size:=(v_doc->>'size')::bigint;
    if split_part(v_path,'/',1)<>'locked'
       or split_part(v_path,'/',2)<>p_user_id::text
       or split_part(v_path,'/',3)<>p_upload_intent_id::text then
      raise exception using errcode='22023', message='DOKE_KYC_DOCUMENT_PATH_INVALID';
    end if;

    select lower(coalesce(metadata->>'mimetype','')),
           greatest(0,coalesce((metadata->>'size')::bigint,0))
      into v_stored_mime,v_stored_size
    from storage.objects
    where bucket_id='professional-verification-media' and name=v_path
    limit 1;
    if not found then
      raise exception using errcode='P0002', message='DOKE_KYC_DOCUMENT_NOT_FOUND';
    end if;
    if v_stored_size<>v_expected_size or v_stored_size<1 or v_stored_size>10485760 then
      raise exception using errcode='22023', message='DOKE_KYC_DOCUMENT_SIZE_MISMATCH';
    end if;
    if v_stored_mime<>v_expected_mime then
      raise exception using errcode='22023', message='DOKE_KYC_DOCUMENT_TYPE_MISMATCH';
    end if;
    v_result:=v_result||jsonb_build_object(v_key,v_doc||jsonb_build_object('persisted',true));
  end loop;

  update private.professional_kyc_upload_intents
  set status='consumed',consumed_at=now(),updated_at=now()
  where id=v_intent.id;
  return v_result;
end;
$$;
revoke all on function private.consume_professional_kyc_upload_intent(uuid,uuid,text)
  from public,anon,authenticated,service_role;

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

drop function if exists public.submit_professional_identity_verification(jsonb,jsonb);

revoke all on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)
  from public,anon,authenticated;
grant execute on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)
  to service_role;

revoke all on function public.save_professional_profile_setup(jsonb,integer,boolean)
  from public,anon,authenticated;
revoke all on function public.save_professional_verification_draft(jsonb,integer)
  from public,anon,authenticated;
revoke all on function public.reopen_own_professional_identity_verification()
  from public,anon,authenticated;
grant execute on function public.save_professional_profile_setup(jsonb,integer,boolean)
  to authenticated,service_role;
grant execute on function public.save_professional_verification_draft(jsonb,integer)
  to authenticated,service_role;
grant execute on function public.reopen_own_professional_identity_verification()
  to authenticated,service_role;

comment on function public.submit_professional_identity_verification_internal(uuid,uuid,jsonb) is
  'Service-role-only KYC submission that consumes one exact signed-upload intent.';
