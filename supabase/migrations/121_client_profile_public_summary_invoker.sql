begin;

create or replace function public.get_public_client_profile_summary(p_user_id uuid)
returns jsonb
language sql
stable
security invoker
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'userId', summary.user_id,
    'completedOrdersCount', summary.completed_orders_count,
    'averageRating', summary.average_rating,
    'reviewsCount', summary.reviews_count,
    'updatedAt', summary.updated_at
  )
  from public.client_profile_public_summaries summary
  where summary.user_id = p_user_id
  limit 1
$$;

revoke all privileges on function public.get_public_client_profile_summary(uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.get_public_client_profile_summary(uuid)
  to anon, authenticated;

notify pgrst, 'reload schema';
commit;
