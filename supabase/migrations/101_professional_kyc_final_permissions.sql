-- Doke SEC-001 / professional KYC final permission boundary.
-- Reassert least privilege after all function replacements.

revoke all privileges on table public.professional_profiles from public, anon, authenticated;
revoke all privileges on table public.professional_identity_verifications from public, anon, authenticated;
revoke all privileges on table public.verification_events from public, anon, authenticated;

grant select on table public.professional_profiles to authenticated;
grant select on table public.professional_identity_verifications to authenticated;
grant select on table public.verification_events to authenticated;

grant all privileges on table public.professional_profiles to service_role;
grant all privileges on table public.professional_identity_verifications to service_role;
grant all privileges on table public.verification_events to service_role;

-- Public applicant functions only.
revoke all on function public.save_professional_profile_setup(jsonb, integer, boolean)
  from public, anon, authenticated;
revoke all on function public.save_professional_verification_draft(jsonb, integer)
  from public, anon, authenticated;
revoke all on function public.reopen_own_professional_identity_verification()
  from public, anon, authenticated;

grant execute on function public.save_professional_profile_setup(jsonb, integer, boolean)
  to authenticated, service_role;
grant execute on function public.save_professional_verification_draft(jsonb, integer)
  to authenticated, service_role;
grant execute on function public.reopen_own_professional_identity_verification()
  to authenticated, service_role;


-- Upload-intent and final submission functions are Edge/service-role-only APIs.
revoke all on function public.create_professional_kyc_upload_intent_internal(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_professional_identity_verification_internal(uuid, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_professional_kyc_upload_intent_internal(uuid, text, jsonb)
  to service_role;
grant execute on function public.submit_professional_identity_verification_internal(uuid, uuid, jsonb)
  to service_role;

-- Reviewer functions are never direct authenticated APIs.
revoke all on function public.list_professional_identity_verifications_internal(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.get_professional_identity_verification_internal(uuid, text)
  from public, anon, authenticated;
revoke all on function public.start_professional_identity_review_internal(uuid, text)
  from public, anon, authenticated;
revoke all on function public.decide_professional_identity_verification_internal(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.list_professional_identity_verifications_internal(uuid, text, integer)
  to service_role;
grant execute on function public.get_professional_identity_verification_internal(uuid, text)
  to service_role;
grant execute on function public.start_professional_identity_review_internal(uuid, text)
  to service_role;
grant execute on function public.decide_professional_identity_verification_internal(uuid, text, text, text)
  to service_role;

notify pgrst, 'reload schema';
