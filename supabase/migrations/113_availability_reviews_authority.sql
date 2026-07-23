-- Doke — professional availability and verified review authority.

begin;

alter table public.availability_slots enable row level security;
drop policy if exists availability_slots_visible_select on public.availability_slots;
drop policy if exists availability_slots_owner_insert on public.availability_slots;
drop policy if exists availability_slots_owner_update on public.availability_slots;
drop policy if exists availability_slots_owner_delete on public.availability_slots;

create policy availability_slots_visible_select
  on public.availability_slots
  for select
  to anon, authenticated
  using (
    (status = 'available' and ends_at > pg_catalog.now())
    or professional_id = (select auth.uid())
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

create policy availability_slots_owner_insert
  on public.availability_slots
  for insert
  to authenticated
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and ends_at > starts_at
  );

create policy availability_slots_owner_update
  on public.availability_slots
  for update
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
  )
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and ends_at > starts_at
  );

create policy availability_slots_owner_delete
  on public.availability_slots
  for delete
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status <> 'booked'
  );

revoke all privileges on table public.availability_slots from public, anon, authenticated, service_role;
grant select on table public.availability_slots to anon, authenticated;
grant insert, update, delete on table public.availability_slots to authenticated;
grant select, insert, update, delete on table public.availability_slots to service_role;
create index if not exists idx_availability_slots_professional_start
  on public.availability_slots(professional_id, starts_at);

alter table public.reviews enable row level security;
drop policy if exists reviews_visible_select on public.reviews;
drop policy if exists reviews_completed_order_insert on public.reviews;

create policy reviews_visible_select
  on public.reviews
  for select
  to anon, authenticated
  using (
    status = 'published'
    or reviewer_id = (select auth.uid())
    or reviewed_user_id = (select auth.uid())
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

create policy reviews_completed_order_insert
  on public.reviews
  for insert
  to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and reviewer_id <> reviewed_user_id
    and public.current_user_role() in ('client', 'professional')
    and status = 'published'
    and exists (
      select 1
        from public.orders o
       where o.id = reviews.order_id
         and o.status = 'completed'
         and (
           (o.client_id = (select auth.uid()) and o.professional_id = reviews.reviewed_user_id)
           or
           (o.professional_id = (select auth.uid()) and o.client_id = reviews.reviewed_user_id)
         )
    )
  );

revoke all privileges on table public.reviews from public, anon, authenticated, service_role;
grant select on table public.reviews to anon, authenticated;
grant insert on table public.reviews to authenticated;
grant select, insert, update, delete on table public.reviews to service_role;
create index if not exists idx_reviews_reviewer
  on public.reviews(reviewer_id, created_at desc);

notify pgrst, 'reload schema';

commit;
