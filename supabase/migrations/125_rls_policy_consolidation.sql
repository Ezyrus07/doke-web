begin;

drop policy if exists service_moderation_events_admin_read on public.service_moderation_events;
drop policy if exists service_moderation_events_owner_read on public.service_moderation_events;
create policy service_moderation_events_authorized_read
  on public.service_moderation_events for select to authenticated
  using (
    professional_id = (select auth.uid())
    or public.is_active_admin_or_moderator()
  );

drop policy if exists service_versions_admin_read on public.service_versions;
drop policy if exists service_versions_owner_read on public.service_versions;
create policy service_versions_authorized_read
  on public.service_versions for select to authenticated
  using (
    professional_id = (select auth.uid())
    or public.is_active_admin_or_moderator()
  );

drop policy if exists service_quote_templates_owner_write on public.service_quote_templates;
create policy service_quote_templates_owner_insert
  on public.service_quote_templates for insert to authenticated
  with check (professional_id = (select auth.uid()));
create policy service_quote_templates_owner_update
  on public.service_quote_templates for update to authenticated
  using (professional_id = (select auth.uid()))
  with check (professional_id = (select auth.uid()));
create policy service_quote_templates_owner_delete
  on public.service_quote_templates for delete to authenticated
  using (professional_id = (select auth.uid()));

drop policy if exists service_quote_questions_owner_write on public.service_quote_questions;
create policy service_quote_questions_owner_insert
  on public.service_quote_questions for insert to authenticated
  with check (
    exists (
      select 1
      from public.service_quote_templates template
      where template.id = service_quote_questions.template_id
        and template.professional_id = (select auth.uid())
    )
  );
create policy service_quote_questions_owner_update
  on public.service_quote_questions for update to authenticated
  using (
    exists (
      select 1
      from public.service_quote_templates template
      where template.id = service_quote_questions.template_id
        and template.professional_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.service_quote_templates template
      where template.id = service_quote_questions.template_id
        and template.professional_id = (select auth.uid())
    )
  );
create policy service_quote_questions_owner_delete
  on public.service_quote_questions for delete to authenticated
  using (
    exists (
      select 1
      from public.service_quote_templates template
      where template.id = service_quote_questions.template_id
        and template.professional_id = (select auth.uid())
    )
  );

commit;
