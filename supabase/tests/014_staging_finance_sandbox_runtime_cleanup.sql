-- Emergency cleanup for disposable hosted runtime canaries only.
-- Scope is restricted to the dedicated finance_runtime_* namespace.
-- This is not a generic ledger deletion routine.

begin;

create temp table doke_runtime_order_ids on commit drop as
select id, client_id, professional_id
from public.orders
where external_id like 'finance_runtime_order_%';

create temp table doke_runtime_payment_ids on commit drop as
select p.id
from public.payments p
join doke_runtime_order_ids o on o.id=p.order_id;

create temp table doke_runtime_transaction_ids on commit drop as
select t.id
from public.transactions t
join doke_runtime_order_ids o on o.id=t.order_id;

create temp table doke_runtime_user_ids on commit drop as
select id from public.users where email like 'doke.finance.runtime.%@example.com';

delete from public.dispute_events
where dispute_id in (
  select d.id from public.payment_disputes d
  where d.order_id in (select id from doke_runtime_order_ids)
     or d.payment_id in (select id from doke_runtime_payment_ids)
     or d.transaction_id in (select id from doke_runtime_transaction_ids)
);

delete from public.payment_disputes
where order_id in (select id from doke_runtime_order_ids)
   or payment_id in (select id from doke_runtime_payment_ids)
   or transaction_id in (select id from doke_runtime_transaction_ids);

delete from public.receipts
where order_id in (select id from doke_runtime_order_ids)
   or transaction_id in (select id from doke_runtime_transaction_ids)
   or user_id in (select id from doke_runtime_user_ids);

delete from public.withdrawals
where transaction_id in (select id from doke_runtime_transaction_ids)
   or requested_by in (select id from doke_runtime_user_ids);

delete from public.wallet_receivables
where transaction_id in (select id from doke_runtime_transaction_ids)
   or payment_id in (select id from doke_runtime_payment_ids)
   or order_id in (select id from doke_runtime_order_ids)
   or professional_id in (select id from doke_runtime_user_ids)
   or client_id in (select id from doke_runtime_user_ids);

delete from public.transactions where id in (select id from doke_runtime_transaction_ids);
delete from public.payments where id in (select id from doke_runtime_payment_ids);

delete from public.notifications
where order_id in (select id from doke_runtime_order_ids)
   or user_id in (select id from doke_runtime_user_ids)
   or actor_id in (select id from doke_runtime_user_ids)
   or (event_key like 'sandbox_%' and data->>'sandbox'='true');

delete from public.messages
where conversation_id in (
  select id from public.conversations
  where order_id in (select id from doke_runtime_order_ids)
     or external_id like 'finance_runtime_conversation_%'
)
or external_id like 'finance_runtime_charge_%';

delete from public.conversations
where order_id in (select id from doke_runtime_order_ids)
   or external_id like 'finance_runtime_conversation_%';

delete from public.order_status_history where order_id in (select id from doke_runtime_order_ids);
delete from private.order_metric_events where order_id in (select id from doke_runtime_order_ids);
delete from private.order_domain_events where order_id in (select id from doke_runtime_order_ids);
delete from public.orders where id in (select id from doke_runtime_order_ids);
delete from public.wallet_bank_accounts where user_id in (select id from doke_runtime_user_ids);
delete from public.wallets where user_id in (select id from doke_runtime_user_ids);

delete from auth.users
where id in (select id from doke_runtime_user_ids)
   or email like 'doke.finance.runtime.%@example.com';

commit;
