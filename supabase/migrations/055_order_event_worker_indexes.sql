-- Doke: covering index for the worker-run foreign key introduced by migration 054.

create index if not exists idx_order_domain_events_last_worker_run
  on private.order_domain_events(last_worker_run_id)
  where last_worker_run_id is not null;

comment on index private.idx_order_domain_events_last_worker_run is
  'Covers worker-run joins and foreign-key maintenance for order outbox observability.';
