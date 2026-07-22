-- Doke SEC-001: client profile authority and public-safe projection.
-- The operational client row is owner/operator-readable and server-writable only.
-- Public surfaces consume a separate minimal summary table.

alter table public.client_profiles
  add column if not exists reviews_count integer not null default 0
    check (reviews_count >= 0);

alter table public.client_profiles enable row level security;

drop policy if exists client_profiles_owner_or_operator_read on public.client_profiles;
create policy client_profiles_owner_or_operator_read
on public.client_profiles
for select
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.users actor
    where actor.id = (select auth.uid())
      and actor.status = 'active'
      and actor.role in ('support', 'moderator', 'admin')
  )
);

revoke all privileges on table public.client_profiles from public, anon, authenticated;
grant select on table public.client_profiles to authenticated;
grant select, insert, update, delete on table public.client_profiles to service_role;

create table if not exists public.client_profile_public_summaries (
  user_id uuid primary key references public.users(id) on delete cascade,
  completed_orders_count integer not null default 0 check (completed_orders_count >= 0),
  average_rating numeric(3,2) not null default 0 check (average_rating between 0 and 5),
  reviews_count integer not null default 0 check (reviews_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.client_profile_public_summaries enable row level security;

drop policy if exists client_profile_public_summaries_read on public.client_profile_public_summaries;
create policy client_profile_public_summaries_read
on public.client_profile_public_summaries
for select
to anon, authenticated
using (true);

revoke all privileges on table public.client_profile_public_summaries from public, anon, authenticated;
grant select on table public.client_profile_public_summaries to anon, authenticated;
grant select, insert, update, delete on table public.client_profile_public_summaries to service_role;

create or replace function private.refresh_client_profile_public_summary(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if p_user_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.users u
    where u.id = p_user_id
      and u.status = 'active'
      and u.role in ('client', 'professional')
  ) then
    insert into public.client_profile_public_summaries (
      user_id,
      completed_orders_count,
      average_rating,
      reviews_count,
      updated_at
    )
    select
      cp.user_id,
      cp.orders_count,
      cp.average_rating,
      cp.reviews_count,
      cp.updated_at
    from public.client_profiles cp
    where cp.user_id = p_user_id
    on conflict (user_id) do update
      set completed_orders_count = excluded.completed_orders_count,
          average_rating = excluded.average_rating,
          reviews_count = excluded.reviews_count,
          updated_at = excluded.updated_at;
  else
    delete from public.client_profile_public_summaries
    where user_id = p_user_id;
  end if;
end;
$$;

create or replace function private.handle_client_profile_public_summary()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_client_profile_public_summary(old.user_id);
    return old;
  end if;
  perform private.refresh_client_profile_public_summary(new.user_id);
  return new;
end;
$$;

create or replace function private.handle_user_client_summary_eligibility()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.refresh_client_profile_public_summary(new.id);
  return new;
end;
$$;

drop trigger if exists trg_client_profile_public_summary on public.client_profiles;
create trigger trg_client_profile_public_summary
after insert or update or delete on public.client_profiles
for each row execute function private.handle_client_profile_public_summary();

drop trigger if exists trg_user_client_summary_eligibility on public.users;
create trigger trg_user_client_summary_eligibility
after update of role, status on public.users
for each row execute function private.handle_user_client_summary_eligibility();

do $$
declare
  item record;
begin
  for item in select user_id from public.client_profiles loop
    perform private.refresh_client_profile_public_summary(item.user_id);
  end loop;
end;
$$;

revoke all on function private.refresh_client_profile_public_summary(uuid) from public, anon, authenticated;
revoke all on function private.handle_client_profile_public_summary() from public, anon, authenticated;
revoke all on function private.handle_user_client_summary_eligibility() from public, anon, authenticated;
