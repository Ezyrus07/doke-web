-- Doke SEC-001: client metrics are derived from completed orders and published reviews.
-- Browser sessions cannot mutate counters or ratings directly.

create or replace function private.refresh_client_profile_metrics(p_user_id uuid)
returns public.client_profiles
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_orders_count integer := 0;
  v_reviews_count integer := 0;
  v_average_rating numeric(3,2) := 0;
  v_row public.client_profiles%rowtype;
begin
  if p_user_id is null or not exists (select 1 from public.users where id = p_user_id) then
    raise exception using errcode = '22023', message = 'DOKE_CLIENT_PROFILE_USER_INVALID';
  end if;

  select count(*)::integer
    into v_orders_count
  from public.orders o
  where o.client_id = p_user_id
    and o.status = 'completed';

  select
    count(*)::integer,
    coalesce(round(avg(r.rating)::numeric, 2), 0)::numeric(3,2)
  into v_reviews_count, v_average_rating
  from public.reviews r
  join public.orders o on o.id = r.order_id
  where r.reviewed_user_id = p_user_id
    and o.client_id = p_user_id
    and o.status = 'completed'
    and r.status = 'published';

  insert into public.client_profiles (
    user_id,
    orders_count,
    average_rating,
    reviews_count,
    created_at,
    updated_at
  ) values (
    p_user_id,
    v_orders_count,
    v_average_rating,
    v_reviews_count,
    now(),
    now()
  )
  on conflict (user_id) do update
    set orders_count = excluded.orders_count,
        average_rating = excluded.average_rating,
        reviews_count = excluded.reviews_count,
        updated_at = excluded.updated_at
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function private.refresh_client_profile_after_order_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_client_profile_metrics(old.client_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.client_id is distinct from new.client_id then
    perform private.refresh_client_profile_metrics(old.client_id);
  end if;
  perform private.refresh_client_profile_metrics(new.client_id);
  return new;
end;
$$;

create or replace function private.refresh_client_profile_after_review_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if tg_op = 'DELETE' then
    perform private.refresh_client_profile_metrics(old.reviewed_user_id);
    return old;
  end if;

  if tg_op = 'UPDATE' and old.reviewed_user_id is distinct from new.reviewed_user_id then
    perform private.refresh_client_profile_metrics(old.reviewed_user_id);
  end if;
  perform private.refresh_client_profile_metrics(new.reviewed_user_id);
  return new;
end;
$$;

drop trigger if exists trg_client_profile_order_metrics_insert_delete on public.orders;
create trigger trg_client_profile_order_metrics_insert_delete
after insert or delete on public.orders
for each row execute function private.refresh_client_profile_after_order_change();

drop trigger if exists trg_client_profile_order_metrics_update on public.orders;
create trigger trg_client_profile_order_metrics_update
after update of client_id, status on public.orders
for each row execute function private.refresh_client_profile_after_order_change();

drop trigger if exists trg_client_profile_review_metrics_insert_delete on public.reviews;
create trigger trg_client_profile_review_metrics_insert_delete
after insert or delete on public.reviews
for each row execute function private.refresh_client_profile_after_review_change();

drop trigger if exists trg_client_profile_review_metrics_update on public.reviews;
create trigger trg_client_profile_review_metrics_update
after update of order_id, reviewed_user_id, rating, status on public.reviews
for each row execute function private.refresh_client_profile_after_review_change();

create or replace function public.refresh_client_profile_metrics_internal(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_row public.client_profiles%rowtype;
begin
  v_row := private.refresh_client_profile_metrics(p_user_id);
  return jsonb_build_object(
    'userId', v_row.user_id,
    'completedOrdersCount', v_row.orders_count,
    'averageRating', v_row.average_rating,
    'reviewsCount', v_row.reviews_count,
    'updatedAt', v_row.updated_at
  );
end;
$$;

do $$
declare
  item record;
begin
  for item in select id from public.users loop
    perform private.refresh_client_profile_metrics(item.id);
  end loop;
end;
$$;

revoke all on function private.refresh_client_profile_metrics(uuid) from public, anon, authenticated;
revoke all on function private.refresh_client_profile_after_order_change() from public, anon, authenticated;
revoke all on function private.refresh_client_profile_after_review_change() from public, anon, authenticated;
revoke all on function public.refresh_client_profile_metrics_internal(uuid) from public, anon, authenticated;
grant execute on function public.refresh_client_profile_metrics_internal(uuid) to service_role;
