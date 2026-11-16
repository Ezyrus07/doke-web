begin;

create table if not exists public.public_profile_role_projection (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null check (role in ('client', 'professional')),
  updated_at timestamptz not null default now()
);

alter table public.public_profile_role_projection enable row level security;

revoke all privileges on table public.public_profile_role_projection from public, anon, authenticated, service_role;
grant select on table public.public_profile_role_projection to anon, authenticated;

drop policy if exists public_profile_role_projection_read on public.public_profile_role_projection;
create policy public_profile_role_projection_read
  on public.public_profile_role_projection
  for select
  to anon, authenticated
  using (true);

create or replace function private.sync_public_profile_role_projection()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'active' and new.role in ('client', 'professional') then
    insert into public.public_profile_role_projection (user_id, role, updated_at)
    values (new.id, new.role, now())
    on conflict (user_id) do update
      set role = excluded.role,
          updated_at = excluded.updated_at;
  else
    delete from public.public_profile_role_projection
    where user_id = new.id;
  end if;
  return new;
end
$$;

revoke all on function private.sync_public_profile_role_projection()
  from public, anon, authenticated, service_role;

drop trigger if exists trg_sync_public_profile_role_projection on public.users;
create trigger trg_sync_public_profile_role_projection
after insert or update of role, status on public.users
for each row execute function private.sync_public_profile_role_projection();

insert into public.public_profile_role_projection (user_id, role, updated_at)
select account.id, account.role, now()
from public.users account
where account.status = 'active'
  and account.role in ('client', 'professional')
on conflict (user_id) do update
  set role = excluded.role,
      updated_at = excluded.updated_at;

comment on table public.public_profile_role_projection is
  'Browser-read-only projection of canonical public.users role for active public marketplace profiles.';
comment on column public.public_profile_role_projection.role is
  'Server-maintained projection. Never sourced from public.user_profiles or browser metadata.';

notify pgrst, 'reload schema';
commit;
