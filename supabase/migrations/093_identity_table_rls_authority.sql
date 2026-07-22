-- Doke SEC-001 / identity batch 1.
-- Establishes explicit row and grant authority for account and public profile tables.

alter table public.users enable row level security;
alter table public.user_profiles enable row level security;

revoke all privileges on table public.users from anon, authenticated;
revoke all privileges on table public.user_profiles from anon, authenticated;

grant select on table public.users to authenticated;
grant select on table public.user_profiles to anon, authenticated;
grant all privileges on table public.users to service_role;
grant all privileges on table public.user_profiles to service_role;

drop policy if exists users_select_own_account on public.users;
create policy users_select_own_account
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists user_profiles_public_read on public.user_profiles;
create policy user_profiles_public_read
  on public.user_profiles
  for select
  to anon, authenticated
  using (true);

comment on policy users_select_own_account on public.users is
  'Authenticated users can read only their own account authority row; all writes use controlled server/RPC paths.';
comment on policy user_profiles_public_read on public.user_profiles is
  'Public profile fields are intentionally readable; sensitive account fields remain isolated in public.users.';
