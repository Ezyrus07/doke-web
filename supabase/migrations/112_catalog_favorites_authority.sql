-- Doke — public catalog projection and private favorites authority.

begin;

alter table public.service_categories enable row level security;
drop policy if exists service_categories_visible_select on public.service_categories;
create policy service_categories_visible_select
  on public.service_categories
  for select
  to anon, authenticated
  using (
    is_active = true
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

revoke all privileges on table public.service_categories from public, anon, authenticated, service_role;
grant select on table public.service_categories to anon, authenticated;
grant select, insert, update, delete on table public.service_categories to service_role;
create index if not exists idx_service_categories_parent
  on public.service_categories(parent_id)
  where parent_id is not null;

alter table public.favorites enable row level security;
drop policy if exists favorites_owner_select on public.favorites;
drop policy if exists favorites_owner_insert on public.favorites;
drop policy if exists favorites_owner_delete on public.favorites;

create policy favorites_owner_select
  on public.favorites
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy favorites_owner_insert
  on public.favorites
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.current_user_role() <> 'guest'
  );

create policy favorites_owner_delete
  on public.favorites
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

revoke all privileges on table public.favorites from public, anon, authenticated, service_role;
grant select, insert, delete on table public.favorites to authenticated;
grant select, insert, update, delete on table public.favorites to service_role;
create index if not exists idx_favorites_service
  on public.favorites(service_id);

notify pgrst, 'reload schema';

commit;
