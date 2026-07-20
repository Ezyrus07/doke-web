-- Doke: authoritative professional application and identity verification runtime.
-- Persists professional setup and verification submission in Supabase.

alter table public.professional_profiles
  add column if not exists setup_status text not null default 'draft',
  add column if not exists setup_payload jsonb not null default '{}'::jsonb,
  add column if not exists setup_current_step integer not null default 1,
  add column if not exists setup_completed_at timestamptz,
  add column if not exists verification_status text not null default 'not_started';

alter table public.professional_profiles drop constraint if exists professional_profiles_setup_status_check;
alter table public.professional_profiles add constraint professional_profiles_setup_status_check
  check (setup_status in ('draft','pending_verification','active','suspended'));
alter table public.professional_profiles drop constraint if exists professional_profiles_verification_status_check;
alter table public.professional_profiles add constraint professional_profiles_verification_status_check
  check (verification_status in ('not_started','submitted','under_review','verified','rejected'));

alter table public.professional_identity_verifications
  add column if not exists current_step integer not null default 1,
  add column if not exists payload jsonb not null default '{}'::jsonb;

alter table public.professional_profiles enable row level security;
drop policy if exists professional_profiles_owner_read on public.professional_profiles;
create policy professional_profiles_owner_read on public.professional_profiles
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists professional_profiles_owner_insert on public.professional_profiles;
create policy professional_profiles_owner_insert on public.professional_profiles
  for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists professional_profiles_owner_update on public.professional_profiles;
create policy professional_profiles_owner_update on public.professional_profiles
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists professional_profiles_admin_read on public.professional_profiles;
create policy professional_profiles_admin_read on public.professional_profiles
  for select to authenticated using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','moderator') and u.status = 'active')
  );

drop policy if exists professional_identity_verifications_admin_read on public.professional_identity_verifications;
create policy professional_identity_verifications_admin_read on public.professional_identity_verifications
  for select to authenticated using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role in ('admin','moderator') and u.status = 'active')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'professional-verification-media',
  'professional-verification-media',
  false,
  10485760,
  array['image/jpeg','image/png','application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.save_professional_profile_setup(
  p_payload jsonb,
  p_current_step integer default 1,
  p_complete boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
  v_status text := case when p_complete then 'pending_verification' else 'draft' end;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if not exists (select 1 from public.users where id=v_uid and status='active' and role='client') then
    raise exception 'CLIENT_ACCOUNT_REQUIRED' using errcode='42501';
  end if;
  insert into public.professional_profiles (
    user_id, headline, document_status, setup_status, setup_payload, setup_current_step,
    setup_completed_at, verification_status, created_at, updated_at
  ) values (
    v_uid, nullif(trim(coalesce(p_payload->>'shortBio','')), ''), 'unverified', v_status,
    coalesce(p_payload,'{}'::jsonb), greatest(1,least(2,coalesce(p_current_step,1))),
    case when p_complete then v_now else null end, 'not_started', v_now, v_now
  ) on conflict (user_id) do update set
    headline=excluded.headline,
    setup_status=case when public.professional_profiles.setup_status='active' then 'active' else excluded.setup_status end,
    setup_payload=excluded.setup_payload,
    setup_current_step=excluded.setup_current_step,
    setup_completed_at=case when p_complete then coalesce(public.professional_profiles.setup_completed_at,v_now) else public.professional_profiles.setup_completed_at end,
    updated_at=v_now;
  return jsonb_build_object(
    'id','professional_profile_'||v_uid::text,'userId',v_uid,'status',v_status,
    'currentStep',greatest(1,least(2,coalesce(p_current_step,1))),
    'payload',coalesce(p_payload,'{}'::jsonb),'verificationStatus','not_started',
    'updatedAt',v_now,'completedAt',case when p_complete then v_now else null end
  );
end;
$$;

create or replace function public.save_professional_verification_draft(
  p_payload jsonb,
  p_current_step integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_uid uuid:=auth.uid(); v_id uuid; v_now timestamptz:=now();
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if not exists(select 1 from public.professional_profiles where user_id=v_uid and setup_status='pending_verification') then
    raise exception 'PROFESSIONAL_PROFILE_REQUIRED' using errcode='P0002';
  end if;
  insert into public.professional_identity_verifications(
    user_id,professional_profile_user_id,status,verification_type,current_step,payload,created_at,updated_at
  ) values (
    v_uid,v_uid,'not_started',case when p_payload->>'verificationType'='business' then 'business' else 'individual' end,
    greatest(1,least(3,coalesce(p_current_step,1))),coalesce(p_payload,'{}'::jsonb) - 'taxId' - 'documentFront' - 'documentBack' - 'selfieDocument' - 'proofOfAddress' - 'businessDocument',v_now,v_now
  ) on conflict(user_id) do update set
    current_step=excluded.current_step,payload=excluded.payload,verification_type=excluded.verification_type,updated_at=v_now
  where public.professional_identity_verifications.status in ('not_started','rejected')
  returning id into v_id;
  if v_id is null then select id into v_id from public.professional_identity_verifications where user_id=v_uid; end if;
  return jsonb_build_object('id',v_id,'userId',v_uid,'professionalProfileId','professional_profile_'||v_uid::text,
    'status','not_started','currentStep',greatest(1,least(3,coalesce(p_current_step,1))),
    'payload',coalesce(p_payload,'{}'::jsonb) - 'taxId' - 'documentFront' - 'documentBack' - 'selfieDocument' - 'proofOfAddress' - 'businessDocument','updatedAt',v_now);
end;
$$;

create or replace function public.submit_professional_identity_verification(
  p_payload jsonb,
  p_documents jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid:=auth.uid(); v_id uuid; v_now timestamptz:=now(); v_tax text:=regexp_replace(coalesce(p_payload->>'taxId',''),'\D','','g');
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode='28000'; end if;
  if not exists(select 1 from public.professional_profiles where user_id=v_uid and setup_status='pending_verification') then
    raise exception 'PROFESSIONAL_PROFILE_REQUIRED' using errcode='P0002';
  end if;
  if jsonb_typeof(coalesce(p_documents,'{}'::jsonb)) <> 'object' or jsonb_object_length(coalesce(p_documents,'{}'::jsonb)) < 4 then
    raise exception 'DOCUMENTS_REQUIRED' using errcode='22023';
  end if;
  insert into public.professional_identity_verifications(
    user_id,professional_profile_user_id,status,verification_type,legal_name,tax_id_last4,tax_id_digest,
    birth_date,representative_name,address,documents,current_step,payload,submitted_at,created_at,updated_at
  ) values (
    v_uid,v_uid,'submitted',case when p_payload->>'verificationType'='business' then 'business' else 'individual' end,
    nullif(trim(p_payload->>'legalName'),''),right(v_tax,4),encode(digest(v_tax,'sha256'),'hex'),
    nullif(p_payload->>'birthDate','')::date,nullif(trim(p_payload->>'representativeName'),''),
    jsonb_build_object('postalCode',p_payload->>'postalCode','street',p_payload->>'street','number',p_payload->>'number',
      'complement',p_payload->>'complement','district',p_payload->>'district','city',p_payload->>'city','state',p_payload->>'state'),
    coalesce(p_documents,'{}'::jsonb),3,
    coalesce(p_payload,'{}'::jsonb) - 'taxId' - 'documentFront' - 'documentBack' - 'selfieDocument' - 'proofOfAddress' - 'businessDocument',
    v_now,v_now,v_now
  ) on conflict(user_id) do update set
    status='submitted',verification_type=excluded.verification_type,legal_name=excluded.legal_name,
    tax_id_last4=excluded.tax_id_last4,tax_id_digest=excluded.tax_id_digest,birth_date=excluded.birth_date,
    representative_name=excluded.representative_name,address=excluded.address,documents=excluded.documents,
    current_step=3,payload=excluded.payload,rejection_reason=null,reviewer_id=null,submitted_at=v_now,
    review_started_at=null,decided_at=null,updated_at=v_now
  where public.professional_identity_verifications.status in ('not_started','rejected')
  returning id into v_id;
  if v_id is null then raise exception 'SUBMISSION_LOCKED' using errcode='23505'; end if;
  update public.professional_profiles set document_status='pending',verification_status='submitted',updated_at=v_now where user_id=v_uid;
  insert into public.verification_events(user_id,type,status,created_at) values(v_uid,'professional_document','pending',v_now);
  return jsonb_build_object('id',v_id,'userId',v_uid,'professionalProfileId','professional_profile_'||v_uid::text,
    'status','submitted','currentStep',3,'payload',(coalesce(p_payload,'{}'::jsonb)-'taxId')||coalesce(p_documents,'{}'::jsonb),
    'submittedAt',v_now,'updatedAt',v_now);
end;
$$;

create or replace function public.start_professional_identity_review(p_verification_id text)
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_admin uuid:=auth.uid(); v_id uuid; v_now timestamptz:=now();
begin
  if not exists(select 1 from public.users where id=v_admin and role in('admin','moderator') and status='active') then
    raise exception 'ADMIN_REQUIRED' using errcode='42501'; end if;
  begin v_id:=p_verification_id::uuid; exception when invalid_text_representation then
    v_id:=null; end;
  if v_id is null and p_verification_id like 'professional_verification_%' then
    select id into v_id from public.professional_identity_verifications where user_id=replace(p_verification_id,'professional_verification_','')::uuid;
  end if;
  if v_id is null then select id into v_id from public.professional_identity_verifications where user_id=p_verification_id::uuid; end if;
  update public.professional_identity_verifications set status='under_review',reviewer_id=v_admin,
    review_started_at=coalesce(review_started_at,v_now),updated_at=v_now where id=v_id and status='submitted';
  update public.professional_profiles p set verification_status='under_review',updated_at=v_now
    from public.professional_identity_verifications v where v.id=v_id and p.user_id=v.user_id;
  return jsonb_build_object('id',v_id,'status','under_review','updatedAt',v_now);
end; $$;

revoke all on function public.save_professional_profile_setup(jsonb,integer,boolean) from public;
revoke all on function public.save_professional_verification_draft(jsonb,integer) from public;
revoke all on function public.submit_professional_identity_verification(jsonb,jsonb) from public;
revoke all on function public.start_professional_identity_review(text) from public;
grant execute on function public.save_professional_profile_setup(jsonb,integer,boolean) to authenticated;
grant execute on function public.save_professional_verification_draft(jsonb,integer) to authenticated;
grant execute on function public.submit_professional_identity_verification(jsonb,jsonb) to authenticated;
grant execute on function public.start_professional_identity_review(text) to authenticated;
