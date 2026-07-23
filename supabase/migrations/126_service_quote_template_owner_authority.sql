begin;

drop policy if exists service_quote_templates_owner_insert on public.service_quote_templates;
drop policy if exists service_quote_templates_owner_update on public.service_quote_templates;
drop policy if exists service_quote_templates_owner_delete on public.service_quote_templates;

create policy service_quote_templates_owner_insert
  on public.service_quote_templates
  for insert
  to authenticated
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and exists (
      select 1
      from public.services service
      where service.id = service_quote_templates.service_id
        and service.professional_id = (select auth.uid())
    )
  );

create policy service_quote_templates_owner_update
  on public.service_quote_templates
  for update
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and exists (
      select 1
      from public.services service
      where service.id = service_quote_templates.service_id
        and service.professional_id = (select auth.uid())
    )
  )
  with check (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and exists (
      select 1
      from public.services service
      where service.id = service_quote_templates.service_id
        and service.professional_id = (select auth.uid())
    )
  );

create policy service_quote_templates_owner_delete
  on public.service_quote_templates
  for delete
  to authenticated
  using (
    professional_id = (select auth.uid())
    and public.current_user_role() = 'professional'
    and exists (
      select 1
      from public.services service
      where service.id = service_quote_templates.service_id
        and service.professional_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
commit;
