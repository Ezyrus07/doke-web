-- Doke — append-only audit log authority.

begin;

alter table public.audit_logs enable row level security;

drop policy if exists audit_logs_operator_select on public.audit_logs;
create policy audit_logs_operator_select
  on public.audit_logs
  for select
  to authenticated
  using (public.current_user_role() in ('moderator', 'support', 'admin'));

revoke all privileges on table public.audit_logs from public, anon, authenticated, service_role;
grant select on table public.audit_logs to authenticated;
grant select, insert on table public.audit_logs to service_role;

create index if not exists idx_audit_logs_actor_created
  on public.audit_logs(actor_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_audit_logs_created
  on public.audit_logs(created_at desc);

notify pgrst, 'reload schema';

commit;
