-- Exact-scope cleanup for records created by scripts/execute-orders-write-canary-staging.js.
-- Transaction ownership belongs to scripts/execute-orders-write-canary-cleanup.js.

create temporary table doke_orders_write_cleanup_targets (
  order_id uuid primary key
) on commit drop;

insert into doke_orders_write_cleanup_targets (order_id)
select distinct (key_row.response_body #>> '{order,id}')::uuid
from public.api_idempotency_keys key_row
where key_row.idempotency_key like 'orders-write-staging-create-%'
  and key_row.action = 'orders.create'
  and key_row.actor_id = '826dde36-c959-4ab6-a26f-586bf82cdb7a'
  and key_row.status = 'succeeded'
  and coalesce(key_row.response_body #>> '{order,id}', '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';

do $$
begin
  if exists (
    select 1
    from public.orders order_row
    where order_row.client_id = '826dde36-c959-4ab6-a26f-586bf82cdb7a'
      and order_row.professional_id = '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4'
      and order_row.title = 'Canary staging order'
      and order_row.description = 'Pedido de validação controlada do canary de escrita.'
      and not exists (
        select 1
        from doke_orders_write_cleanup_targets target
        where target.order_id = order_row.id
      )
  ) then
    raise exception 'A marker-matching order exists without the expected create idempotency evidence.';
  end if;

  if exists (
    select 1
    from doke_orders_write_cleanup_targets target
    join public.orders order_row on order_row.id = target.order_id
    where order_row.client_id <> '826dde36-c959-4ab6-a26f-586bf82cdb7a'
       or order_row.professional_id is distinct from '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4'
       or order_row.service_id is not null
       or order_row.title <> 'Canary staging order'
       or order_row.description <> 'Pedido de validação controlada do canary de escrita.'
  ) then
    raise exception 'Idempotency evidence points to an order outside the exact canary marker.';
  end if;

  if exists (
    select 1 from public.reviews row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has reviews.';
  end if;

  if exists (
    select 1 from public.conversations row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has conversations.';
  end if;

  if exists (
    select 1 from public.transactions row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has transactions.';
  end if;

  if exists (
    select 1 from public.receipts row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has receipts.';
  end if;

  if exists (
    select 1 from public.wallet_receivables row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has wallet receivables.';
  end if;

  if exists (
    select 1 from public.payment_disputes row_value
    join doke_orders_write_cleanup_targets target on target.order_id = row_value.order_id
  ) then raise exception 'Cleanup blocked: canary order has payment disputes.';
  end if;

  if exists (
    select 1
    from public.notifications row_value
    join doke_orders_write_cleanup_targets target
      on row_value.data ->> 'orderId' = target.order_id::text
  ) then raise exception 'Cleanup blocked: canary order is referenced by notifications.';
  end if;
end
$$;

create temporary table doke_orders_write_cleanup_counts (
  table_name text primary key,
  deleted_count bigint not null
) on commit drop;

with deleted as (
  delete from public.budgets row_value
  using doke_orders_write_cleanup_targets target
  where row_value.order_id = target.order_id
  returning 1
)
insert into doke_orders_write_cleanup_counts values ('budgets', (select count(*) from deleted));

with deleted as (
  delete from public.order_status_history row_value
  using doke_orders_write_cleanup_targets target
  where row_value.order_id = target.order_id
  returning 1
)
insert into doke_orders_write_cleanup_counts values ('order_status_history', (select count(*) from deleted));

with deleted as (
  delete from public.admin_audit_events
  where idempotency_key like 'orders-write-staging-%'
  returning 1
)
insert into doke_orders_write_cleanup_counts values ('admin_audit_events', (select count(*) from deleted));

with deleted as (
  delete from public.api_idempotency_keys
  where idempotency_key like 'orders-write-staging-%'
  returning 1
)
insert into doke_orders_write_cleanup_counts values ('api_idempotency_keys', (select count(*) from deleted));

with deleted as (
  delete from public.orders row_value
  using doke_orders_write_cleanup_targets target
  where row_value.id = target.order_id
  returning 1
)
insert into doke_orders_write_cleanup_counts values ('orders', (select count(*) from deleted));
