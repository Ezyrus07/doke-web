-- Doke account/profile base contract.
-- Adds the persisted fields required by onboarding and account settings.

alter table public.users
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists settings jsonb not null default '{}'::jsonb;

alter table public.users
  drop constraint if exists users_onboarding_status_check;

alter table public.users
  add constraint users_onboarding_status_check
  check (onboarding_status in ('not_started', 'in_progress', 'completed'));

alter table public.user_profiles
  add column if not exists interests jsonb not null default '[]'::jsonb;
