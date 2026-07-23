begin;

alter function public.list_service_moderation_history(uuid, text)
  set search_path = pg_catalog;

alter function public.reopen_own_professional_identity_verification()
  set search_path = pg_catalog;

alter function public.save_professional_profile_setup(jsonb, integer, boolean)
  set search_path = pg_catalog;

alter function public.save_professional_verification_draft(jsonb, integer)
  set search_path = pg_catalog;

alter function public.submit_service_for_review(text, jsonb, text)
  set search_path = pg_catalog;

notify pgrst, 'reload schema';
commit;
