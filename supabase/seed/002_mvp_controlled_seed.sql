-- Doke Sprint 15: controlled MVP application data for local/staging validation.
-- Auth canaries must be provisioned through scripts/provision-staging-auth-canaries.js
-- before this SQL runs. This seed never writes Supabase GoTrue-owned tables.

create temporary table doke_seed_auth_users (
  seed_role text primary key,
  user_id uuid not null unique
);

insert into doke_seed_auth_users (seed_role, user_id)
select expected.seed_role, auth_user.id
from (values
  ('client', 'cliente@doke.local'),
  ('professional', 'profissional@doke.local'),
  ('support', 'suporte@doke.local'),
  ('admin', 'admin@doke.local')
) as expected(seed_role, email)
join auth.users auth_user on lower(auth_user.email) = expected.email;

do $$
begin
  if (select count(*) from doke_seed_auth_users) <> 4 then
    raise exception 'Missing Doke Auth canaries. Run scripts/provision-staging-auth-canaries.js before applying seed 002.';
  end if;
end
$$;

insert into public.users (id, email, role, status) values
  ((select user_id from doke_seed_auth_users where seed_role = 'client'), 'cliente@doke.local', 'client', 'active'),
  ((select user_id from doke_seed_auth_users where seed_role = 'professional'), 'profissional@doke.local', 'professional', 'active'),
  ((select user_id from doke_seed_auth_users where seed_role = 'support'), 'suporte@doke.local', 'support', 'active'),
  ((select user_id from doke_seed_auth_users where seed_role = 'admin'), 'admin@doke.local', 'admin', 'active')
on conflict (id) do update set
  email = excluded.email,
  role = excluded.role,
  status = excluded.status,
  updated_at = now();

insert into public.user_profiles (user_id, display_name, username, avatar_url, city, state, country, bio) values
  ((select user_id from doke_seed_auth_users where seed_role = 'client'), 'Cliente Doke', 'cliente-doke', null, 'Salvador', 'BA', 'BR', 'Conta cliente para validação do fluxo controlado.'),
  ((select user_id from doke_seed_auth_users where seed_role = 'professional'), 'Profissional Doke', 'profissional-doke', null, 'Salvador', 'BA', 'BR', 'Profissional demo para pedidos, conversa, carteira e saque.'),
  ((select user_id from doke_seed_auth_users where seed_role = 'support'), 'Suporte Doke', 'suporte-doke', null, 'Salvador', 'BA', 'BR', 'Conta de suporte para decisões administrativas mock/API.'),
  ((select user_id from doke_seed_auth_users where seed_role = 'admin'), 'Admin Doke', 'admin-doke', null, 'Salvador', 'BA', 'BR', 'Conta admin para validação de policies e auditoria.')
on conflict (user_id) do update set
  display_name = excluded.display_name,
  username = excluded.username,
  city = excluded.city,
  state = excluded.state,
  bio = excluded.bio,
  updated_at = now();

insert into public.client_profiles (user_id, orders_count, average_rating) values
  ((select user_id from doke_seed_auth_users where seed_role = 'client'), 1, 5)
on conflict (user_id) do update set orders_count = excluded.orders_count, average_rating = excluded.average_rating, updated_at = now();

insert into public.professional_profiles (user_id, headline, document_status, service_radius_km, average_rating, reviews_count, completed_orders_count) values
  ((select user_id from doke_seed_auth_users where seed_role = 'professional'), 'Pintura residencial e pequenos reparos', 'verified', 25, 4.9, 18, 42)
on conflict (user_id) do update set
  headline = excluded.headline,
  document_status = excluded.document_status,
  service_radius_km = excluded.service_radius_km,
  average_rating = excluded.average_rating,
  reviews_count = excluded.reviews_count,
  completed_orders_count = excluded.completed_orders_count,
  updated_at = now();

insert into public.service_categories (name, slug, description, sort_order) values
  ('Pintura', 'pintura', 'Serviços de pintura residencial e comercial.', 10)
on conflict (slug) do update set name = excluded.name, description = excluded.description, sort_order = excluded.sort_order;

insert into public.services (id, professional_id, category_id, title, slug, description, price_mode, price_cents, currency, status, city, state) values
  ('55555555-5555-4555-8555-555555555555', (select user_id from doke_seed_auth_users where seed_role = 'professional'), (select id from public.service_categories where slug = 'pintura'), 'Pintura de apartamento', 'pintura-apartamento-demo', 'Serviço demo para fluxo completo de pedido e pagamento.', 'quote', null, 'BRL', 'published', 'Salvador', 'BA')
on conflict (professional_id, slug) do update set
  category_id = excluded.category_id,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  updated_at = now();

insert into public.orders (id, client_id, professional_id, service_id, title, description, status, city, state) values
  ('66666666-6666-4666-8666-666666666666', (select user_id from doke_seed_auth_users where seed_role = 'client'), (select user_id from doke_seed_auth_users where seed_role = 'professional'), '55555555-5555-4555-8555-555555555555', 'Pintura da sala', 'Pedido demo para validar orçamento, chat, pagamento, contestação, repasse e saque.', 'in_progress', 'Salvador', 'BA')
on conflict (id) do update set
  status = excluded.status,
  title = excluded.title,
  description = excluded.description,
  updated_at = now();

insert into public.budgets (id, order_id, professional_id, amount_cents, currency, description, status) values
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '66666666-6666-4666-8666-666666666666', (select user_id from doke_seed_auth_users where seed_role = 'professional'), 45000, 'BRL', 'Orçamento demo aprovado.', 'accepted')
on conflict (id) do update set status = excluded.status, amount_cents = excluded.amount_cents, updated_at = now();

insert into public.conversations (id, order_id, client_id, professional_id, status, last_message_at) values
  ('77777777-7777-4777-8777-777777777777', '66666666-6666-4666-8666-666666666666', (select user_id from doke_seed_auth_users where seed_role = 'client'), (select user_id from doke_seed_auth_users where seed_role = 'professional'), 'active', now())
on conflict (id) do update set status = excluded.status, last_message_at = excluded.last_message_at;

insert into public.messages (id, conversation_id, sender_id, body, status) values
  ('cccccccc-cccc-4ccc-8ccc-cccccccccccc', '77777777-7777-4777-8777-777777777777', (select user_id from doke_seed_auth_users where seed_role = 'client'), 'Mensagem demo do cliente para iniciar o fluxo.', 'sent'),
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '77777777-7777-4777-8777-777777777777', (select user_id from doke_seed_auth_users where seed_role = 'professional'), 'Resposta demo do profissional.', 'sent')
on conflict (id) do update set body = excluded.body, status = excluded.status;

insert into public.wallets (user_id, balance_cents, pending_cents, currency) values
  ((select user_id from doke_seed_auth_users where seed_role = 'professional'), 35000, 45000, 'BRL'),
  ((select user_id from doke_seed_auth_users where seed_role = 'client'), 0, 0, 'BRL')
on conflict (user_id) do update set balance_cents = excluded.balance_cents, pending_cents = excluded.pending_cents, updated_at = now();

insert into public.transactions (id, wallet_user_id, order_id, type, amount_cents, currency, status, provider, provider_reference) values
  ('88888888-8888-4888-8888-888888888888', (select user_id from doke_seed_auth_users where seed_role = 'professional'), '66666666-6666-4666-8666-666666666666', 'payment', 45000, 'BRL', 'succeeded', 'mock', 'pay_demo_001')
on conflict (id) do update set status = excluded.status, amount_cents = excluded.amount_cents;

insert into public.wallet_receivables (id, professional_id, order_id, transaction_id, amount_cents, currency, status, release_at, blocked_reason) values
  ('99999999-9999-4999-8999-999999999999', (select user_id from doke_seed_auth_users where seed_role = 'professional'), '66666666-6666-4666-8666-666666666666', '88888888-8888-4888-8888-888888888888', 45000, 'BRL', 'blocked', now() + interval '2 days', 'dispute_open')
on conflict (id) do update set status = excluded.status, blocked_reason = excluded.blocked_reason, updated_at = now();

insert into public.payment_disputes (id, order_id, transaction_id, client_id, professional_id, opened_by, reason, description, status) values
  ('abababab-abab-4aba-8bab-abababababab', '66666666-6666-4666-8666-666666666666', '88888888-8888-4888-8888-888888888888', (select user_id from doke_seed_auth_users where seed_role = 'client'), (select user_id from doke_seed_auth_users where seed_role = 'professional'), (select user_id from doke_seed_auth_users where seed_role = 'client'), 'service_quality', 'Contestação demo para validar suporte, repasse e reembolso.', 'under_review')
on conflict (id) do update set status = excluded.status, description = excluded.description, updated_at = now();

insert into public.withdrawals (id, wallet_user_id, amount_cents, currency, status, requested_by, bank_account_snapshot) values
  ('cdcdcdcd-cdcd-4cdc-8dcd-cdcdcdcdcdcd', (select user_id from doke_seed_auth_users where seed_role = 'professional'), 25000, 'BRL', 'requested', (select user_id from doke_seed_auth_users where seed_role = 'professional'), '{"bank":"Doke Bank","agency":"0001","account":"12345-6"}'::jsonb)
on conflict (id) do update set status = excluded.status, updated_at = now();

insert into public.receipts (id, transaction_id, order_id, user_id, receipt_type, code, gross_amount_cents, fee_amount_cents, net_amount_cents, currency, status) values
  ('efefefef-efef-4efe-8fef-efefefefefef', '88888888-8888-4888-8888-888888888888', '66666666-6666-4666-8666-666666666666', (select user_id from doke_seed_auth_users where seed_role = 'professional'), 'payment', 'DOKE-DEMO-RECEIPT-001', 45000, 4500, 40500, 'BRL', 'issued')
on conflict (code) do update set
  transaction_id = excluded.transaction_id,
  order_id = excluded.order_id,
  user_id = excluded.user_id,
  receipt_type = excluded.receipt_type,
  gross_amount_cents = excluded.gross_amount_cents,
  fee_amount_cents = excluded.fee_amount_cents,
  net_amount_cents = excluded.net_amount_cents,
  currency = excluded.currency,
  status = excluded.status;

insert into public.notifications (id, user_id, type, title, body, data) values
  ('12121212-1212-4121-8121-121212121212', (select user_id from doke_seed_auth_users where seed_role = 'professional'), 'wallet', 'Recebível bloqueado', 'Existe um recebível em análise por contestação.', '{"orderId":"66666666-6666-4666-8666-666666666666","targetUrl":"/carteira.html"}'::jsonb),
  ('34343434-3434-4343-8343-343434343434', (select user_id from doke_seed_auth_users where seed_role = 'support'), 'support', 'Contestação em análise', 'Há uma contestação demo aguardando decisão do suporte.', '{"disputeId":"abababab-abab-4aba-8bab-abababababab","targetUrl":"/admin.html"}'::jsonb)
on conflict (id) do update set title = excluded.title, body = excluded.body, data = excluded.data;

insert into public.admin_audit_events (id, actor_id, actor_role, action, entity_type, entity_id, metadata) values
  ('56565656-5656-4565-8565-565656565656', (select user_id from doke_seed_auth_users where seed_role = 'support'), 'support', 'seed_created', 'mvp_controlled_flow', '66666666-6666-4666-8666-666666666666', '{"source":"supabase/seed/002_mvp_controlled_seed.sql"}'::jsonb)
on conflict (id) do update set
  actor_id = excluded.actor_id,
  actor_role = excluded.actor_role,
  action = excluded.action,
  entity_type = excluded.entity_type,
  entity_id = excluded.entity_id,
  metadata = excluded.metadata;

insert into public.wallet_bank_accounts (user_id, account_holder, document, bank_name, bank_code, branch, account_number, account_type, pix_key, status) values
  ((select user_id from doke_seed_auth_users where seed_role = 'professional'), 'Profissional Demo Doke', '00000000000', 'Banco Demo', '000', '0001', '12345-6', 'checking', 'profissional@doke.local', 'verified')
on conflict (user_id) do update set
  account_holder = excluded.account_holder,
  bank_name = excluded.bank_name,
  pix_key = excluded.pix_key,
  status = excluded.status,
  updated_at = now();

drop table doke_seed_auth_users;
