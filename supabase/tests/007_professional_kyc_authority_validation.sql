-- Doke SEC-001 professional KYC authority validation.
-- Execute only in local/staging. This script is read-only and transaction-scoped.

begin;

set local role anon;
do $$
begin
  if has_table_privilege('anon', 'public.professional_profiles', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: anon can access professional_profiles.';
  end if;
  if has_table_privilege('anon', 'public.professional_identity_verifications', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: anon can access professional_identity_verifications.';
  end if;
  if has_table_privilege('anon', 'public.verification_events', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: anon can access verification_events.';
  end if;
end
$$;
reset role;

-- Generic authenticated users can read only through RLS and cannot write KYC authority tables.
do $$
begin
  if has_table_privilege('authenticated', 'public.professional_profiles', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: authenticated can mutate professional_profiles directly.';
  end if;
  if has_table_privilege('authenticated', 'public.professional_identity_verifications', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: authenticated can mutate professional_identity_verifications directly.';
  end if;
  if has_table_privilege('authenticated', 'public.verification_events', 'INSERT,UPDATE,DELETE') then
    raise exception 'Grant failure: authenticated can mutate verification_events directly.';
  end if;
end
$$;

-- Reviewer RPCs are service-role-only and legacy browser RPCs are gone.
do $$
begin
  if to_regprocedure('public.list_professional_identity_verifications_for_admin(text)') is not null
     or to_regprocedure('public.get_professional_identity_verification_for_admin(text)') is not null
     or to_regprocedure('public.start_professional_identity_review(text)') is not null
     or to_regprocedure('public.decide_professional_identity_verification(text,text,text)') is not null then
    raise exception 'Authority failure: legacy reviewer RPC still exists.';
  end if;

  if has_function_privilege('anon', 'public.list_professional_identity_verifications_internal(uuid,text,integer)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.list_professional_identity_verifications_internal(uuid,text,integer)', 'EXECUTE')
     or has_function_privilege('anon', 'public.decide_professional_identity_verification_internal(uuid,text,text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.decide_professional_identity_verification_internal(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'Authority failure: reviewer internal RPC is browser-callable.';
  end if;

  if not has_function_privilege('service_role', 'public.list_professional_identity_verifications_internal(uuid,text,integer)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.decide_professional_identity_verification_internal(uuid,text,text,text)', 'EXECUTE') then
    raise exception 'Authority failure: service_role cannot execute reviewer RPCs.';
  end if;
end
$$;

-- The bucket is private. Applicant uploads are authorized by short-lived signed
-- upload tokens for server-generated locked paths, not browser Storage INSERT grants.
do $$
declare
  v_public boolean;
begin
  select b.public into v_public
  from storage.buckets b
  where b.id = 'professional-verification-media';
  if coalesce(v_public, true) then
    raise exception 'Storage failure: professional verification bucket is public.';
  end if;

  if has_function_privilege('anon', 'public.create_professional_kyc_upload_intent_internal(uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.create_professional_kyc_upload_intent_internal(uuid,text,jsonb)', 'EXECUTE')
     or has_function_privilege('anon', 'public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)', 'EXECUTE') then
    raise exception 'Authority failure: upload/final submission internal RPC is browser-callable.';
  end if;

  if not has_function_privilege('service_role', 'public.create_professional_kyc_upload_intent_internal(uuid,text,jsonb)', 'EXECUTE')
     or not has_function_privilege('service_role', 'public.submit_professional_identity_verification_internal(uuid,uuid,jsonb)', 'EXECUTE') then
    raise exception 'Authority failure: service_role cannot execute upload/final submission RPCs.';
  end if;

  if to_regprocedure('public.submit_professional_identity_verification(jsonb,jsonb)') is not null then
    raise exception 'Authority failure: legacy browser-callable final submit RPC still exists.';
  end if;
end
$$;

-- Authorization roles never persist in user-editable metadata after approval.
do $$
begin
  if exists (
    select 1
    from auth.users a
    join public.professional_identity_verifications v on v.user_id = a.id
    where v.status = 'verified'
      and a.raw_user_meta_data ?| array['role','type','account_role','account_status']
  ) then
    raise exception 'Metadata failure: verified professional retains authority claims in user_metadata.';
  end if;
end
$$;

rollback;
