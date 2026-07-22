-- Doke: covering indexes for post-incident workflow foreign keys.
create index if not exists idx_order_operational_incident_cycles_first_owner
  on private.order_operational_incident_cycles(first_owner_id)
  where first_owner_id is not null;

create index if not exists idx_order_operational_reviews_created_by
  on private.order_operational_post_incident_reviews(created_by)
  where created_by is not null;

create index if not exists idx_order_operational_prevention_created_by
  on private.order_operational_prevention_actions(created_by);

create index if not exists idx_order_operational_prevention_updated_by
  on private.order_operational_prevention_actions(updated_by);
