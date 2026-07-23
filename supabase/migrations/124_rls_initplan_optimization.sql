begin;

alter policy conversation_participants_insert on public.conversations
  with check (((select auth.uid()) = client_id) or ((select auth.uid()) = professional_id));
alter policy conversation_participants_select on public.conversations
  using (((select auth.uid()) = client_id) or ((select auth.uid()) = professional_id));
alter policy conversation_participants_update on public.conversations
  using (((select auth.uid()) = client_id) or ((select auth.uid()) = professional_id))
  with check (((select auth.uid()) = client_id) or ((select auth.uid()) = professional_id));

alter policy message_participants_select on public.messages
  using (exists (
    select 1 from public.conversations conversation
    where conversation.id = messages.conversation_id
      and ((select auth.uid()) = conversation.client_id or (select auth.uid()) = conversation.professional_id)
  ));
alter policy message_participants_update on public.messages
  using (exists (
    select 1 from public.conversations conversation
    where conversation.id = messages.conversation_id
      and ((select auth.uid()) = conversation.client_id or (select auth.uid()) = conversation.professional_id)
  ))
  with check (exists (
    select 1 from public.conversations conversation
    where conversation.id = messages.conversation_id
      and ((select auth.uid()) = conversation.client_id or (select auth.uid()) = conversation.professional_id)
  ));
alter policy message_sender_insert on public.messages
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations conversation
      where conversation.id = messages.conversation_id
        and ((select auth.uid()) = conversation.client_id or (select auth.uid()) = conversation.professional_id)
    )
  );

alter policy orders_client_delete_draft on public.orders
  using ((select auth.uid()) = client_id and status = 'draft');
alter policy orders_client_insert on public.orders
  with check ((select auth.uid()) = client_id and client_id <> professional_id and professional_id is not null);
alter policy orders_participants_select on public.orders
  using ((select auth.uid()) = client_id or (select auth.uid()) = professional_id);
alter policy orders_participants_update on public.orders
  using ((select auth.uid()) = client_id or (select auth.uid()) = professional_id)
  with check ((select auth.uid()) = client_id or (select auth.uid()) = professional_id);

alter policy service_media_owner_delete on public.service_media
  using (exists (
    select 1 from public.services service
    where service.id = service_media.service_id
      and service.professional_id = (select auth.uid())
  ));
alter policy service_media_owner_insert on public.service_media
  with check (exists (
    select 1 from public.services service
    where service.id = service_media.service_id
      and service.professional_id = (select auth.uid())
  ));
alter policy service_media_owner_update on public.service_media
  using (exists (
    select 1 from public.services service
    where service.id = service_media.service_id
      and service.professional_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.services service
    where service.id = service_media.service_id
      and service.professional_id = (select auth.uid())
  ));
alter policy service_media_public_read on public.service_media
  using (exists (
    select 1 from public.services service
    where service.id = service_media.service_id
      and (service.status = 'published' or service.professional_id = (select auth.uid()))
  ));

alter policy service_metric_events_owner_read on public.service_metric_events
  using (exists (
    select 1 from public.services service
    where service.id = service_metric_events.service_id
      and service.professional_id = (select auth.uid())
  ));
alter policy service_metric_events_record on public.service_metric_events
  with check (
    exists (
      select 1 from public.services service
      where service.id = service_metric_events.service_id
        and service.status = 'published'
        and service.professional_id is distinct from (select auth.uid())
    )
    and (actor_id is null or actor_id = (select auth.uid()))
    and (
      event_type = 'view'
      or (
        event_type in ('budget', 'message')
        and (select auth.uid()) is not null
        and actor_id = (select auth.uid())
      )
    )
  );

alter policy service_quote_questions_owner_write on public.service_quote_questions
  using (exists (
    select 1 from public.service_quote_templates template
    where template.id = service_quote_questions.template_id
      and template.professional_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.service_quote_templates template
    where template.id = service_quote_questions.template_id
      and template.professional_id = (select auth.uid())
  ));
alter policy service_quote_questions_public_read on public.service_quote_questions
  using (exists (
    select 1
    from public.service_quote_templates template
    join public.services service on service.id = template.service_id
    where template.id = service_quote_questions.template_id
      and (service.status = 'published' or service.professional_id = (select auth.uid()))
  ));

alter policy service_quote_templates_owner_write on public.service_quote_templates
  using (professional_id = (select auth.uid()))
  with check (professional_id = (select auth.uid()));
alter policy service_quote_templates_public_read on public.service_quote_templates
  using (exists (
    select 1 from public.services service
    where service.id = service_quote_templates.service_id
      and (service.status = 'published' or service.professional_id = (select auth.uid()))
  ));

alter policy services_owner_delete on public.services
  using (professional_id = (select auth.uid()));
alter policy services_owner_insert on public.services
  with check (professional_id = (select auth.uid()));
alter policy services_owner_update on public.services
  using (professional_id = (select auth.uid()))
  with check (professional_id = (select auth.uid()));
alter policy services_public_read_published on public.services
  using (status = 'published' or professional_id = (select auth.uid()));

commit;
