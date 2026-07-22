-- Doke SEC-001: final financial permission assertions and fail-closed defaults.

-- New public functions created by postgres must be explicitly granted.
alter default privileges for role postgres in schema public revoke execute on functions from public;
alter default privileges for role postgres in schema public revoke execute on functions from anon, authenticated;

-- Self-service RPCs.
revoke all on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.request_wallet_withdrawal(text, text, integer, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.respond_wallet_dispute(text, text) from public, anon, authenticated, service_role;
grant execute on function public.save_wallet_bank_account(text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.request_wallet_withdrawal(text, text, integer, jsonb) to authenticated;
grant execute on function public.open_wallet_dispute(text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.respond_wallet_dispute(text, text) to authenticated;

-- Operator RPCs.
revoke all on function public.resolve_wallet_withdrawal_internal(uuid, text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_dispute_internal(uuid, text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.resolve_wallet_withdrawal_internal(uuid, text, text, text) to service_role;
grant execute on function public.resolve_wallet_dispute_internal(uuid, text, text, text) to service_role;

-- Legacy monetary/idempotency RPCs remain owner-only.
revoke all on function public.claim_idempotency_key(text, text, text, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.complete_idempotency_key(text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.fail_idempotency_key(text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.finance_resolve_order(text) from public, anon, authenticated, service_role;
revoke all on function public.record_order_payment(text, text, text, text, text, integer, integer, integer, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.register_order_receivable(text, text, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.release_order_receivable(text, text, text, timestamptz) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_withdrawal(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.resolve_wallet_dispute(text, text, text) from public, anon, authenticated, service_role;

notify pgrst, 'reload schema';
