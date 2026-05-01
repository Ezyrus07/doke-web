-- Doke Stage 21: identity, profiles, trust, audit base.
-- Intended for Supabase/PostgreSQL. Review before production execution.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  phone text,
  role text not null default 'client' check (role in ('client', 'professional', 'moderator', 'admin')),
  status text not null default 'active' check (status in ('active', 'pending', 'suspended', 'banned', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  display_name text not null,
  username text unique,
  avatar_url text,
  city text,
  state text,
  country text not null default 'BR',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.professional_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  headline text,
  document_status text not null default 'unverified' check (document_status in ('unverified', 'pending', 'verified', 'rejected')),
  service_radius_km int not null default 15 check (service_radius_km between 1 and 200),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  reviews_count int not null default 0 check (reviews_count >= 0),
  completed_orders_count int not null default 0 check (completed_orders_count >= 0),
  response_time_minutes int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  orders_count int not null default 0 check (orders_count >= 0),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('identity', 'phone', 'email', 'address', 'professional_document')),
  status text not null check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id uuid references public.users(id),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_users_role_status on public.users(role, status);
create index if not exists idx_user_profiles_city_state on public.user_profiles(city, state);
create index if not exists idx_verification_events_user_type on public.verification_events(user_id, type);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);
