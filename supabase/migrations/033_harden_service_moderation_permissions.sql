revoke all on table public.service_versions from anon;
revoke insert, update, delete, truncate, references, trigger on table public.service_versions from authenticated;
grant select on table public.service_versions to authenticated;

revoke execute on function public.submit_service_for_review(text, jsonb, text) from public, anon;
grant execute on function public.submit_service_for_review(text, jsonb, text) to authenticated;

revoke execute on function public.list_service_review_queue() from public, anon;
grant execute on function public.list_service_review_queue() to authenticated;

revoke execute on function public.approve_service_version(uuid) from public, anon;
grant execute on function public.approve_service_version(uuid) to authenticated;

revoke execute on function public.request_service_version_changes(uuid, text) from public, anon;
grant execute on function public.request_service_version_changes(uuid, text) to authenticated;

revoke execute on function public.reject_service_version(uuid, text) from public, anon;
grant execute on function public.reject_service_version(uuid, text) to authenticated;

revoke execute on function public.apply_service_version_snapshot(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.validate_service_review_snapshot(jsonb) from public, anon, authenticated;
revoke execute on function public.service_snapshot_text(jsonb, text, text) from public, anon, authenticated;
revoke execute on function public.doke_price_cents_from_snapshot(jsonb) from public, anon, authenticated;
revoke execute on function public.protect_service_moderation_state() from public, anon, authenticated;
