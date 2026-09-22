-- Doke SCHED-A03B: explicit fail-closed browser policy guard for server-only scheduling tables.
-- Additive hardening only. Does not grant browser access or change service-role authority.

begin;
set local search_path = pg_catalog, public;

alter table public.schedule_availability_rules enable row level security;
alter table public.schedule_reservations enable row level security;

revoke all privileges on table public.schedule_availability_rules
  from public, anon, authenticated;
revoke all privileges on table public.schedule_reservations
  from public, anon, authenticated;

drop policy if exists schedule_availability_rules_browser_deny_all
  on public.schedule_availability_rules;
create policy schedule_availability_rules_browser_deny_all
  on public.schedule_availability_rules
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists schedule_reservations_browser_deny_all
  on public.schedule_reservations;
create policy schedule_reservations_browser_deny_all
  on public.schedule_reservations
  as restrictive
  for all
  to anon, authenticated
  using (false)
  with check (false);

comment on policy schedule_availability_rules_browser_deny_all
  on public.schedule_availability_rules is
  'SCHED-A03B fail-closed browser guard. Canonical scheduling mutations remain server-only.';
comment on policy schedule_reservations_browser_deny_all
  on public.schedule_reservations is
  'SCHED-A03B fail-closed browser guard. Canonical occupancy mutations remain server-only.';

notify pgrst, 'reload schema';
commit;
