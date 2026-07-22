-- Remote history parity: operational ownership documentation.
comment on table private.order_event_operator_actions is
  'Audit trail for support/admin requeues and manual worker wake-ups.';
comment on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) is
  'Service-role-only operational projection for an independently authenticated support/admin actor.';
comment on function public.requeue_order_domain_event_internal(uuid, text, text) is
  'Service-role-only controlled requeue with actor validation, audit and immediate best-effort worker wake-up.';
comment on function public.run_order_event_worker_now_internal(uuid, text) is
  'Service-role-only best-effort worker wake-up for an active support/admin actor.';
