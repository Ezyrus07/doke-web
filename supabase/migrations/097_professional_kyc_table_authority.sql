-- Doke SEC-001 / professional KYC batch.
-- Closes direct browser writes and makes KYC rows readable only by the owner or an active reviewer.

alter table public.professional_identity_verifications
  add column if not exists tax_id_digest_version text,
  add column if not exists decision_version integer not null default 0;

update public.professional_identity_verifications
set tax_id_digest_version = 'legacy-sha256'
where tax_id_digest is not null
  and tax_id_digest_version is null;

alter table public.professional_identity_verifications
  drop constraint if exists professional_identity_verifications_tax_digest_version_check;
alter table public.professional_identity_verifications
  add constraint professional_identity_verifications_tax_digest_version_check
  check (tax_id_digest_version is null or tax_id_digest_version in ('legacy-sha256', 'hmac-sha256-v1'));

alter table public.professional_profiles enable row level security;
alter table public.professional_identity_verifications enable row level security;
alter table public.verification_events enable row level security;

-- Replace all legacy policies on the three KYC authority tables.
do $$
declare
  v_policy record;
begin
  for v_policy in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'professional_profiles',
        'professional_identity_verifications',
        'verification_events'
      )
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      v_policy.policyname,
      v_policy.schemaname,
      v_policy.tablename
    );
  end loop;
end;
$$;

create policy professional_profiles_owner_or_reviewer_read
on public.professional_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'moderator')
  )
);

create policy professional_identity_verifications_owner_or_reviewer_read
on public.professional_identity_verifications
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'moderator')
  )
);

create policy verification_events_owner_or_reviewer_read
on public.verification_events
for select
to authenticated
using (
  (select auth.uid()) = user_id
  or exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.status = 'active'
      and u.role in ('admin', 'moderator')
  )
);

revoke all privileges on table public.professional_profiles from public, anon, authenticated;
revoke all privileges on table public.professional_identity_verifications from public, anon, authenticated;
revoke all privileges on table public.verification_events from public, anon, authenticated;

grant select on table public.professional_profiles to authenticated;
grant select on table public.professional_identity_verifications to authenticated;
grant select on table public.verification_events to authenticated;

grant all privileges on table public.professional_profiles to service_role;
grant all privileges on table public.professional_identity_verifications to service_role;
grant all privileges on table public.verification_events to service_role;

create index if not exists idx_professional_identity_verifications_reviewer
  on public.professional_identity_verifications(reviewer_id)
  where reviewer_id is not null;

create index if not exists idx_verification_events_reviewer
  on public.verification_events(reviewer_id)
  where reviewer_id is not null;

create index if not exists idx_verification_events_created
  on public.verification_events(created_at desc);

comment on table public.professional_profiles is
  'Server-authoritative professional onboarding and activation state. Browser writes are prohibited.';
comment on table public.professional_identity_verifications is
  'Private KYC application state. Owners and active reviewers can read; all writes use controlled RPCs.';
comment on table public.verification_events is
  'Append-only KYC lifecycle events written by controlled functions.';
