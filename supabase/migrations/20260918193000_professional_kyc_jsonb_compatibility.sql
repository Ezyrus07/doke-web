-- PROF-001 / PROF-B05 G2 compatibility
-- PostgreSQL in staging does not expose jsonb_object_length(jsonb).
-- Replace only the signed-intent consume helper with an equivalent jsonb_each count.

do $preflight$
declare
  v_hash text;
begin
  if to_regprocedure('private.consume_professional_kyc_upload_intent(uuid,uuid,text)') is null then
    raise exception using errcode='55000', message='DOKE_KYC_CONSUME_INTENT_HELPER_MISSING';
  end if;

  select md5(pg_get_functiondef(
    'private.consume_professional_kyc_upload_intent(uuid,uuid,text)'::regprocedure
  )) into v_hash;

  if v_hash not in (
    'c5fdf19a990b14a5498c20c50e0e2854',
    '6804d0e2e1440963c589b86ab245b99a',
    'f9832e090a997528b30cb8287e4340de'
  ) then
    raise exception using errcode='55000',
      message='DOKE_KYC_CONSUME_INTENT_HELPER_DRIFT:'||coalesce(v_hash,'missing');
  end if;

  if to_regprocedure('pg_catalog.jsonb_each(jsonb)') is null then
    raise exception using errcode='55000', message='DOKE_KYC_JSONB_EACH_MISSING';
  end if;
end
$preflight$;

create or replace function private.consume_professional_kyc_upload_intent(
  p_user_id uuid,
  p_upload_intent_id uuid,
  p_verification_type text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
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

  select *
    into v_intent
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

  if (select count(*) from jsonb_each(v_intent.files))<>cardinality(v_required)
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
     where bucket_id='professional-verification-media'
       and name=v_path
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
$function$;

revoke all on function private.consume_professional_kyc_upload_intent(uuid,uuid,text)
  from public,anon,authenticated,service_role;

comment on function private.consume_professional_kyc_upload_intent(uuid,uuid,text) is
  'Private signed-intent consumer using jsonb_each count for staging PostgreSQL compatibility.';
