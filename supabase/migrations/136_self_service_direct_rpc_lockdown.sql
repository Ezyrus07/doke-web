-- Lock the fourteen privileged self-service implementations behind the
-- JWT-verified self-service-operations Edge Function.

revoke execute on function public.complete_account_onboarding(text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.create_transaction_notification(text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.get_account_onboarding_state() from public, anon, authenticated;
revoke execute on function public.list_service_moderation_history(uuid, text) from public, anon, authenticated;
revoke execute on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.reopen_own_professional_identity_verification() from public, anon, authenticated;
revoke execute on function public.request_wallet_withdrawal(text, text, integer, jsonb) from public, anon, authenticated;
revoke execute on function public.respond_wallet_dispute(text, text) from public, anon, authenticated;
revoke execute on function public.save_professional_profile_setup(jsonb, integer, boolean) from public, anon, authenticated;
revoke execute on function public.save_professional_verification_draft(jsonb, integer) from public, anon, authenticated;
revoke execute on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.submit_service_for_review(text, jsonb, text) from public, anon, authenticated;
revoke execute on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.update_own_notification_state(text, boolean, boolean) from public, anon, authenticated;

-- Explicit server compatibility. The Edge dispatcher executes as postgres, but
-- keeping service_role access allows controlled server-side rollback tooling.
grant execute on function public.complete_account_onboarding(text, text, text, text, jsonb) to service_role;
grant execute on function public.create_transaction_notification(text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.get_account_onboarding_state() to service_role;
grant execute on function public.list_service_moderation_history(uuid, text) to service_role;
grant execute on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.reopen_own_professional_identity_verification() to service_role;
grant execute on function public.request_wallet_withdrawal(text, text, integer, jsonb) to service_role;
grant execute on function public.respond_wallet_dispute(text, text) to service_role;
grant execute on function public.save_professional_profile_setup(jsonb, integer, boolean) to service_role;
grant execute on function public.save_professional_verification_draft(jsonb, integer) to service_role;
grant execute on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.submit_service_for_review(text, jsonb, text) to service_role;
grant execute on function public.update_account_profile(text, text, text, text, text, jsonb, text, text) to service_role;
grant execute on function public.update_own_notification_state(text, boolean, boolean) to service_role;
