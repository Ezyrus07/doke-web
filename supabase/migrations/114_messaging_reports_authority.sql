-- Doke — message attachment metadata and user report authority.

begin;

alter table public.message_attachments enable row level security;
drop policy if exists message_attachments_participant_select on public.message_attachments;
drop policy if exists message_attachments_sender_insert on public.message_attachments;
drop policy if exists message_attachments_sender_delete on public.message_attachments;

create policy message_attachments_participant_select
  on public.message_attachments
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
       where m.id = message_attachments.message_id
         and (c.client_id = (select auth.uid()) or c.professional_id = (select auth.uid()))
    )
  );

create policy message_attachments_sender_insert
  on public.message_attachments
  for insert
  to authenticated
  with check (
    exists (
      select 1
        from public.messages m
        join public.conversations c on c.id = m.conversation_id
       where m.id = message_attachments.message_id
         and m.sender_id = (select auth.uid())
         and (c.client_id = (select auth.uid()) or c.professional_id = (select auth.uid()))
    )
  );

create policy message_attachments_sender_delete
  on public.message_attachments
  for delete
  to authenticated
  using (
    exists (
      select 1
        from public.messages m
       where m.id = message_attachments.message_id
         and m.sender_id = (select auth.uid())
    )
  );

revoke all privileges on table public.message_attachments from public, anon, authenticated, service_role;
grant select, insert, delete on table public.message_attachments to authenticated;
grant select, insert, update, delete on table public.message_attachments to service_role;
create index if not exists idx_message_attachments_message
  on public.message_attachments(message_id);

alter table public.reports enable row level security;
drop policy if exists reports_reporter_or_operator_select on public.reports;
drop policy if exists reports_reporter_insert on public.reports;
drop policy if exists reports_operator_update on public.reports;

create policy reports_reporter_or_operator_select
  on public.reports
  for select
  to authenticated
  using (
    reporter_id = (select auth.uid())
    or public.current_user_role() in ('moderator', 'support', 'admin')
  );

create policy reports_reporter_insert
  on public.reports
  for insert
  to authenticated
  with check (
    reporter_id = (select auth.uid())
    and public.current_user_role() <> 'guest'
  );

create policy reports_operator_update
  on public.reports
  for update
  to authenticated
  using (public.current_user_role() in ('moderator', 'support', 'admin'))
  with check (public.current_user_role() in ('moderator', 'support', 'admin'));

revoke all privileges on table public.reports from public, anon, authenticated, service_role;
grant select, insert on table public.reports to authenticated;
grant update (status) on table public.reports to authenticated;
grant select, insert, update, delete on table public.reports to service_role;
create index if not exists idx_reports_reporter_created
  on public.reports(reporter_id, created_at desc)
  where reporter_id is not null;

notify pgrst, 'reload schema';

commit;
