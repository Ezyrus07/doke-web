-- Remote history parity: idempotent coverage indexes for the operations panel.
create index if not exists idx_order_domain_events_last_requeued_by
  on private.order_domain_events(last_requeued_by)
  where last_requeued_by is not null;

create index if not exists idx_order_event_operator_actions_event
  on private.order_event_operator_actions(order_event_id, created_at desc)
  where order_event_id is not null;

create index if not exists idx_order_event_operator_actions_actor
  on private.order_event_operator_actions(actor_id, created_at desc);
