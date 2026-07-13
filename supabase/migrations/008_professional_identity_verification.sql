-- Doke: professional identity verification domain.
-- Review and validate in staging before applying in production.

create table if not exists public.professional_identity_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  professional_profile_user_id uuid not null references public.professional_profiles(user_id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'submitted', 'under_review', 'verified', 'rejected')),
  verification_type text not null default 'individual' check (verification_type in ('individual', 'business')),
  legal_name text,
  tax_id_last4 text,
  tax_id_digest text,
  birth_date date,
  representative_name text,
  address jsonb not null default '{}'::jsonb,
  documents jsonb not null default '{}'::jsonb,
  rejection_reason text,
  reviewer_id uuid references public.users(id),
  submitted_at timestamptz,
  review_started_at timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_professional_identity_verifications_status
  on public.professional_identity_verifications(status, updated_at desc);

create index if not exists idx_professional_identity_verifications_profile
  on public.professional_identity_verifications(professional_profile_user_id);

alter table public.professional_identity_verifications enable row level security;

drop policy if exists professional_identity_verifications_owner_read on public.professional_identity_verifications;
create policy professional_identity_verifications_owner_read
  on public.professional_identity_verifications
  for select
  using (auth.uid() = user_id);

drop policy if exists professional_identity_verifications_owner_insert on public.professional_identity_verifications;
create policy professional_identity_verifications_owner_insert
  on public.professional_identity_verifications
  for insert
  with check (auth.uid() = user_id and status in ('not_started', 'submitted'));

drop policy if exists professional_identity_verifications_owner_update on public.professional_identity_verifications;
create policy professional_identity_verifications_owner_update
  on public.professional_identity_verifications
  for update
  using (auth.uid() = user_id and status in ('not_started', 'rejected'))
  with check (auth.uid() = user_id and status in ('not_started', 'submitted'));

-- Review transitions must be executed by a trusted backend/service role.
-- Raw CPF/CNPJ must never be stored in this table. The API should persist only
-- a one-way digest and the last four digits after validation.
