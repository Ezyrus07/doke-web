-- Doke: final permission hardening for post-incident APIs.
revoke all on function public.get_order_operational_post_incident_internal(uuid, integer) from public, anon, authenticated;
revoke all on function public.mutate_order_operational_post_incident_internal(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.mutate_order_operational_prevention_action_internal(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;
grant execute on function public.get_order_operational_post_incident_internal(uuid, integer) to service_role;
grant execute on function public.mutate_order_operational_post_incident_internal(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.mutate_order_operational_prevention_action_internal(uuid, uuid, uuid, text, jsonb) to service_role;
