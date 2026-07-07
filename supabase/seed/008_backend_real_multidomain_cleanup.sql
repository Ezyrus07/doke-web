-- Exact-scope cleanup for records created by scripts/execute-backend-real-multidomain-staging.js.
-- Transaction ownership belongs to scripts/execute-backend-real-multidomain-cleanup.js.

create temporary table doke_backend_real_multidomain_cleanup_keys (
  idempotency_key text primary key
) on commit drop;

insert into doke_backend_real_multidomain_cleanup_keys (idempotency_key) values
  ('staging-order-create-001'),
  ('staging-order-accept-001'),
  ('staging-order-charge-001'),
  ('staging-order-complete-001'),
  ('staging-conversation-create-001'),
  ('staging-message-create-001'),
  ('staging-conversation-read-001'),
  ('staging-notification-create-001'),
  ('staging-notification-read-001'),
  ('staging-withdrawal-create-001');

create temporary table doke_backend_real_multidomain_target_orders (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_orders (id)
select distinct coalesce(
  nullif(key_row.response_body #>> '{order,id}', '')::uuid,
  nullif(key_row.response_body #>> '{charge,orderId}', '')::uuid,
  key_row.entity_id
)
from public.api_idempotency_keys key_row
join doke_backend_real_multidomain_cleanup_keys cleanup_key using (idempotency_key)
where key_row.action in ('orders.create', 'orders.accept', 'orders.charge', 'orders.complete')
  and coalesce(key_row.response_body #>> '{order,id}', key_row.response_body #>> '{charge,orderId}', key_row.entity_id::text, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_conversations (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_conversations (id)
select distinct coalesce(
  nullif(key_row.response_body #>> '{conversation,id}', '')::uuid,
  key_row.entity_id
)
from public.api_idempotency_keys key_row
join doke_backend_real_multidomain_cleanup_keys cleanup_key using (idempotency_key)
where key_row.action in ('conversations.createForOrder', 'messages.send', 'messages.markRead')
  and coalesce(key_row.response_body #>> '{conversation,id}', key_row.entity_id::text, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

insert into doke_backend_real_multidomain_target_conversations (id)
select conversation_row.id
from public.conversations conversation_row
join doke_backend_real_multidomain_target_orders target_order on target_order.id = conversation_row.order_id
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_messages (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_messages (id)
select distinct nullif(key_row.response_body #>> '{message,id}', '')::uuid
from public.api_idempotency_keys key_row
join doke_backend_real_multidomain_cleanup_keys cleanup_key using (idempotency_key)
where key_row.action = 'messages.send'
  and coalesce(key_row.response_body #>> '{message,id}', '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

insert into doke_backend_real_multidomain_target_messages (id)
select message_row.id
from public.messages message_row
join doke_backend_real_multidomain_target_conversations target_conversation
  on target_conversation.id = message_row.conversation_id
where message_row.body = 'Staging smoke message'
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_notifications (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_notifications (id)
select distinct coalesce(
  nullif(key_row.response_body #>> '{notification,id}', '')::uuid,
  key_row.entity_id
)
from public.api_idempotency_keys key_row
join doke_backend_real_multidomain_cleanup_keys cleanup_key using (idempotency_key)
where key_row.action in ('notifications.create', 'notifications.read')
  and coalesce(key_row.response_body #>> '{notification,id}', key_row.entity_id::text, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

insert into doke_backend_real_multidomain_target_notifications (id)
select notification_row.id
from public.notifications notification_row
where notification_row.title = 'Staging smoke notification'
  and notification_row.type = 'system'
  and notification_row.user_id = '826dde36-c959-4ab6-a26f-586bf82cdb7a'
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_withdrawals (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_withdrawals (id)
select distinct coalesce(
  nullif(key_row.response_body #>> '{withdrawal,id}', '')::uuid,
  key_row.entity_id
)
from public.api_idempotency_keys key_row
join doke_backend_real_multidomain_cleanup_keys cleanup_key using (idempotency_key)
where key_row.action = 'withdrawals.request'
  and coalesce(key_row.response_body #>> '{withdrawal,id}', key_row.entity_id::text, '') ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
on conflict do nothing;

insert into doke_backend_real_multidomain_target_withdrawals (id)
select withdrawal_row.id
from public.withdrawals withdrawal_row
where withdrawal_row.idempotency_key = 'staging-withdrawal-create-001'
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_transactions (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_transactions (id)
select transaction_row.id
from public.transactions transaction_row
join doke_backend_real_multidomain_target_orders target_order on target_order.id = transaction_row.order_id
on conflict do nothing;

create temporary table doke_backend_real_multidomain_target_receipts (
  id uuid primary key
) on commit drop;

insert into doke_backend_real_multidomain_target_receipts (id)
select receipt_row.id
from public.receipts receipt_row
left join doke_backend_real_multidomain_target_orders target_order on target_order.id = receipt_row.order_id
left join doke_backend_real_multidomain_target_transactions target_transaction on target_transaction.id = receipt_row.transaction_id
left join public.withdrawals withdrawal_row on withdrawal_row.receipt_id = receipt_row.id
left join doke_backend_real_multidomain_target_withdrawals target_withdrawal on target_withdrawal.id = withdrawal_row.id
where target_order.id is not null
   or target_transaction.id is not null
   or target_withdrawal.id is not null
on conflict do nothing;

do $$
begin
  if exists (
    select 1
    from doke_backend_real_multidomain_target_orders target
    join public.orders order_row on order_row.id = target.id
    where order_row.title <> 'Backend real multidomain staging smoke'
       or order_row.client_id <> '826dde36-c959-4ab6-a26f-586bf82cdb7a'
       or order_row.professional_id is distinct from '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4'
  ) then raise exception 'Cleanup blocked: target order is outside the exact multidomain marker.'; end if;

  if exists (
    select 1
    from doke_backend_real_multidomain_target_withdrawals target
    join public.withdrawals withdrawal_row on withdrawal_row.id = target.id
    where withdrawal_row.idempotency_key <> 'staging-withdrawal-create-001'
       or withdrawal_row.wallet_user_id <> '3fd0113d-dc9b-4cc3-b67e-e7f611f352c4'
       or withdrawal_row.amount_cents <> 1000
  ) then raise exception 'Cleanup blocked: target withdrawal is outside the exact multidomain marker.'; end if;

  if exists (
    select 1
    from doke_backend_real_multidomain_target_notifications target
    join public.notifications notification_row on notification_row.id = target.id
    where notification_row.title <> 'Staging smoke notification'
       or notification_row.user_id <> '826dde36-c959-4ab6-a26f-586bf82cdb7a'
  ) then raise exception 'Cleanup blocked: target notification is outside the exact multidomain marker.'; end if;
end
$$;

create temporary table doke_backend_real_multidomain_cleanup_counts (
  table_name text primary key,
  deleted_count bigint not null
) on commit drop;

with deleted as (
  delete from public.receipts row_value
  using doke_backend_real_multidomain_target_receipts target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('receipts', (select count(*) from deleted));

with deleted as (
  delete from public.transactions row_value
  using doke_backend_real_multidomain_target_transactions target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('transactions', (select count(*) from deleted));

with deleted as (
  delete from public.withdrawals row_value
  using doke_backend_real_multidomain_target_withdrawals target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('withdrawals', (select count(*) from deleted));

with deleted as (
  delete from public.notifications row_value
  using doke_backend_real_multidomain_target_notifications target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('notifications', (select count(*) from deleted));

with deleted as (
  delete from public.messages row_value
  using doke_backend_real_multidomain_target_messages target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('messages', (select count(*) from deleted));

with deleted as (
  delete from public.conversations row_value
  using doke_backend_real_multidomain_target_conversations target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('conversations', (select count(*) from deleted));

with deleted as (
  delete from public.budgets row_value
  using doke_backend_real_multidomain_target_orders target
  where row_value.order_id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('budgets', (select count(*) from deleted));

with deleted as (
  delete from public.order_status_history row_value
  using doke_backend_real_multidomain_target_orders target
  where row_value.order_id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('order_status_history', (select count(*) from deleted));

with deleted as (
  delete from public.admin_audit_events audit_row
  using doke_backend_real_multidomain_cleanup_keys cleanup_key
  where audit_row.idempotency_key = cleanup_key.idempotency_key
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('admin_audit_events', (select count(*) from deleted));

with deleted as (
  delete from public.api_idempotency_keys key_row
  using doke_backend_real_multidomain_cleanup_keys cleanup_key
  where key_row.idempotency_key = cleanup_key.idempotency_key
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('api_idempotency_keys', (select count(*) from deleted));

with deleted as (
  delete from public.orders row_value
  using doke_backend_real_multidomain_target_orders target
  where row_value.id = target.id
  returning 1
)
insert into doke_backend_real_multidomain_cleanup_counts values ('orders', (select count(*) from deleted));
