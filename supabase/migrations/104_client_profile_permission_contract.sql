-- Doke SEC-001: explicit client profile permission contract and documentation.

revoke all privileges on table public.client_profiles from public, anon, authenticated;
grant select on table public.client_profiles to authenticated;
grant select, insert, update, delete on table public.client_profiles to service_role;

revoke all privileges on table public.client_profile_public_summaries from public, anon, authenticated;
grant select on table public.client_profile_public_summaries to anon, authenticated;
grant select, insert, update, delete on table public.client_profile_public_summaries to service_role;

revoke all on function public.refresh_client_profile_metrics_internal(uuid) from public, anon, authenticated;
grant execute on function public.refresh_client_profile_metrics_internal(uuid) to service_role;

comment on table public.client_profiles is
  'Private operational client metrics. Owner/operator read through RLS; mutations are server-derived only.';
comment on table public.client_profile_public_summaries is
  'Public-safe client reputation summary containing only aggregate service history metrics.';
comment on function public.refresh_client_profile_metrics_internal(uuid) is
  'Service-role-only reconciliation of client metrics from completed orders and published client reviews.';
