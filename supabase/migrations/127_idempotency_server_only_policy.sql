begin;

drop policy if exists api_idempotency_keys_service_role_all on public.api_idempotency_keys;
create policy api_idempotency_keys_service_role_all
  on public.api_idempotency_keys
  for all
  to service_role
  using (true)
  with check (true);

notify pgrst, 'reload schema';
commit;
