-- Doke — order budget authority.

begin;

alter table public.budgets enable row level security;
drop policy if exists budgets_participants_select on public.budgets;
drop policy if exists budgets_professional_insert on public.budgets;

create policy budgets_participants_select
  on public.budgets
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.orders o
       where o.id = budgets.order_id
         and (
           o.client_id = (select auth.uid())
           or o.professional_id = (select auth.uid())
           or public.current_user_role() in ('moderator', 'support', 'admin')
         )
    )
  );

create policy budgets_professional_insert
  on public.budgets
  for insert
  to authenticated
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and status = 'sent'
    and exists (
      select 1
        from public.orders o
       where o.id = budgets.order_id
         and o.professional_id = (select auth.uid())
         and o.client_id <> (select auth.uid())
         and o.status in ('requested', 'quoted')
    )
  );

revoke all privileges on table public.budgets from public, anon, authenticated, service_role;
grant select, insert on table public.budgets to authenticated;
grant select, insert, update, delete on table public.budgets to service_role;
create index if not exists idx_budgets_professional_created
  on public.budgets(professional_id, created_at desc);

notify pgrst, 'reload schema';

commit;
