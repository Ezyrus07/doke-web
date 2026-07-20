-- Cover foreign keys used by template analytics cleanup and reconciliation.
create index if not exists idx_quote_template_applications_personal_template
  on public.quote_template_application_events(personal_template_id)
  where personal_template_id is not null;

create index if not exists idx_quote_template_funnel_actor
  on public.quote_template_funnel_events(actor_id)
  where actor_id is not null;

create index if not exists idx_quote_template_funnel_order
  on public.quote_template_funnel_events(order_id)
  where order_id is not null;
