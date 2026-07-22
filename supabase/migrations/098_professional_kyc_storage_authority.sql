-- Doke SEC-001 / professional KYC upload authority.
-- Storage policy DDL is managed by Supabase's storage owner role in this project.
-- Applicants therefore receive short-lived signed upload tokens for database-generated,
-- immutable `locked/<user>/<intent>/...` object paths. No browser write grant is needed.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-verification-media',
  'professional-verification-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table if not exists private.professional_kyc_upload_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  verification_type text not null check (verification_type in ('individual', 'business')),
  files jsonb not null check (jsonb_typeof(files) = 'object'),
  status text not null default 'prepared' check (status in ('prepared', 'consumed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > created_at),
  check ((status = 'consumed') = (consumed_at is not null))
);

create index if not exists idx_professional_kyc_upload_intents_user_status
  on private.professional_kyc_upload_intents(user_id, status, created_at desc);
create index if not exists idx_professional_kyc_upload_intents_expiry
  on private.professional_kyc_upload_intents(expires_at)
  where status = 'prepared';

revoke all privileges on table private.professional_kyc_upload_intents
  from public, anon, authenticated, service_role;

create or replace function public.create_professional_kyc_upload_intent_internal(
  p_actor_id uuid,
  p_verification_type text,
  p_files jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_type text := case when lower(trim(coalesce(p_verification_type, ''))) = 'business' then 'business' else 'individual' end;
  v_required text[];
  v_intent_id uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_file jsonb;
  v_field text;
  v_file_name text;
  v_mime text;
  v_size bigint;
  v_extension text;
  v_path text;
  v_manifest jsonb := '{}'::jsonb;
  v_uploads jsonb := '[]'::jsonb;
  v_required_count integer;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_KYC_APPLICANT_AUTH_REQUIRED';
  end if;

  if not exists (
    select 1
    from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = p_actor_id
      and u.status = 'active'
      and u.role = 'client'
      and p.setup_status = 'pending_verification'
      and p.verification_status in ('not_started', 'rejected')
  ) then
    raise exception using errcode = '42501', message = 'DOKE_KYC_APPLICANT_REQUIRED';
  end if;

  if exists (
    select 1 from public.professional_identity_verifications v
    where v.user_id = p_actor_id
      and v.status in ('submitted', 'under_review', 'verified')
  ) then
    raise exception using errcode = '55000', message = 'DOKE_KYC_SUBMISSION_LOCKED';
  end if;

  if jsonb_typeof(coalesce(p_files, 'null'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FILES_INVALID';
  end if;

  v_required := case when v_type = 'business'
    then array['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress', 'businessDocument']
    else array['documentFront', 'documentBack', 'selfieDocument', 'proofOfAddress'] end;
  v_required_count := cardinality(v_required);

  if jsonb_array_length(p_files) <> v_required_count then
    raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FILES_REQUIRED';
  end if;

  if (
    select count(distinct trim(item ->> 'field'))
    from jsonb_array_elements(p_files) item
  ) <> v_required_count then
    raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FIELD_DUPLICATE';
  end if;

  for v_file in select value from jsonb_array_elements(p_files)
  loop
    if jsonb_typeof(v_file) <> 'object' then
      raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FILE_INVALID';
    end if;

    v_field := trim(coalesce(v_file ->> 'field', ''));
    v_file_name := regexp_replace(trim(coalesce(v_file ->> 'fileName', '')), '[[:cntrl:]/\\]+', '-', 'g');
    v_mime := lower(trim(coalesce(v_file ->> 'type', '')));
    begin
      v_size := (v_file ->> 'size')::bigint;
    exception when invalid_text_representation or numeric_value_out_of_range then
      raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_SIZE_INVALID';
    end;

    if not (v_field = any(v_required)) then
      raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FIELD_INVALID';
    end if;
    if char_length(v_file_name) < 1 or char_length(v_file_name) > 180 then
      raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_FILENAME_INVALID';
    end if;
    if v_size < 1 or v_size > 10485760 then
      raise exception using errcode = '22023', message = 'DOKE_KYC_UPLOAD_SIZE_INVALID';
    end if;
    if v_field = 'selfieDocument' and v_mime not in ('image/jpeg', 'image/png') then
      raise exception using errcode = '22023', message = 'DOKE_KYC_SELFIE_TYPE_INVALID';
    elsif v_field <> 'selfieDocument' and v_mime not in ('image/jpeg', 'image/png', 'application/pdf') then
      raise exception using errcode = '22023', message = 'DOKE_KYC_DOCUMENT_TYPE_INVALID';
    end if;

    v_extension := case v_mime
      when 'image/jpeg' then '.jpg'
      when 'image/png' then '.png'
      when 'application/pdf' then '.pdf'
      else '' end;
    v_path := format(
      'locked/%s/%s/%s-%s%s',
      p_actor_id,
      v_intent_id,
      v_field,
      gen_random_uuid(),
      v_extension
    );

    v_manifest := v_manifest || jsonb_build_object(
      v_field,
      jsonb_build_object(
        'bucket', 'professional-verification-media',
        'path', v_path,
        'fileName', v_file_name,
        'size', v_size,
        'type', v_mime
      )
    );
    v_uploads := v_uploads || jsonb_build_array(jsonb_build_object(
      'field', v_field,
      'bucket', 'professional-verification-media',
      'path', v_path,
      'fileName', v_file_name,
      'size', v_size,
      'type', v_mime
    ));
  end loop;

  update private.professional_kyc_upload_intents
     set status = 'expired', updated_at = now()
   where user_id = p_actor_id
     and status = 'prepared'
     and expires_at <= now();

  insert into private.professional_kyc_upload_intents (
    id, user_id, verification_type, files, status, expires_at
  ) values (
    v_intent_id, p_actor_id, v_type, v_manifest, 'prepared', v_expires_at
  );

  return jsonb_build_object(
    'intentId', v_intent_id,
    'verificationType', v_type,
    'expiresAt', v_expires_at,
    'uploads', v_uploads
  );
end;
$$;

revoke all on function public.create_professional_kyc_upload_intent_internal(uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_professional_kyc_upload_intent_internal(uuid, text, jsonb)
  to service_role;

comment on table private.professional_kyc_upload_intents is
  'Short-lived server-generated manifests for signed KYC uploads. Paths are locked and cannot be chosen by browsers.';
comment on function public.create_professional_kyc_upload_intent_internal(uuid, text, jsonb) is
  'Service-role-only preparation of exact KYC object paths; the Edge Function creates one-time signed upload tokens for them.';
