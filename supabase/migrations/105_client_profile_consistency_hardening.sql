-- Doke SEC-001: close residual client profile authority and consistency gaps.
-- Direct authenticated access is owner-only; operational access remains server-controlled.

alter table public.client_profiles enable row level security;

drop policy if exists client_profiles_owner_or_operator_read on public.client_profiles;
drop policy if exists client_profiles_owner_read on public.client_profiles;
create policy client_profiles_owner_read
on public.client_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

revoke all privileges on table public.client_profiles from public, anon, authenticated, service_role;
grant select on table public.client_profiles to authenticated;
grant select, insert, update, delete on table public.client_profiles to service_role;

revoke all privileges on table public.client_profile_public_summaries from public, anon, authenticated, service_role;
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
    join public.client_profiles cp on cp.user_id = u.id
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

revoke all on function private.refresh_client_profile_public_summary(uuid) from public, anon, authenticated, service_role;
revoke all on function private.handle_client_profile_public_summary() from public, anon, authenticated, service_role;
revoke all on function private.handle_user_client_summary_eligibility() from public, anon, authenticated, service_role;
revoke all on function private.refresh_client_profile_metrics(uuid) from public, anon, authenticated, service_role;
revoke all on function private.refresh_client_profile_after_order_change() from public, anon, authenticated, service_role;
revoke all on function private.refresh_client_profile_after_review_change() from public, anon, authenticated, service_role;

revoke all on function public.refresh_client_profile_metrics_internal(uuid) from public, anon, authenticated;
grant execute on function public.refresh_client_profile_metrics_internal(uuid) to service_role;

comment on table public.client_profiles is
  'Private server-owned client metrics. Authenticated users may read only their own row; direct browser mutations and cross-account operator reads are prohibited.';
comment on table public.client_profile_public_summaries is
  'Public-safe aggregate client reputation projection. Contains no contact, identity, KYC, risk or administrative fields.';
