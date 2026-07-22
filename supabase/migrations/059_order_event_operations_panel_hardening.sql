-- Remote history parity: explicit least-privilege hardening for all operations-panel surfaces.
revoke all on table private.order_event_operator_actions from public, anon, authenticated;
revoke all on function private.assert_order_event_operator(uuid) from public, anon, authenticated;
revoke all on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.requeue_order_domain_event_internal(uuid, text, text) from public, anon, authenticated;
revoke all on function public.run_order_event_worker_now_internal(uuid, text) from public, anon, authenticated;

grant select on table private.order_event_operator_actions to service_role;
grant execute on function private.assert_order_event_operator(uuid) to service_role;
grant execute on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) to service_role;
grant execute on function public.requeue_order_domain_event_internal(uuid, text, text) to service_role;
grant execute on function public.run_order_event_worker_now_internal(uuid, text) to service_role;
