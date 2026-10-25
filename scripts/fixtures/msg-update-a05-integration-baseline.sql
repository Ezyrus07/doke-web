\set ON_ERROR_STOP on
-- Extends the existing synthetic messaging fixture with the production-like
-- contracts consumed by MSG-A05. No real data or remote endpoints.
alter table public.users add column status text not null default 'active';
alter table public.conversations add column external_id text unique;
alter table public.conversations add column status text not null default 'active';
update public.conversations
   set external_id='synthetic-conversation'
 where id='44444444-4444-4444-8444-444444444444';
create table public.orders (
  id uuid primary key,
  external_id text not null unique,
  client_id uuid not null references public.users(id),
  professional_id uuid not null references public.users(id),
  status text not null default 'active'
);
insert into public.orders values
 ('33333333-3333-4333-8333-333333333333',
  'synthetic-order',
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'active');
create schema storage;
grant usage on schema storage to authenticated,service_role;
create table storage.objects(
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner_id text,
  unique(bucket_id,name)
);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated,service_role;
create policy transaction_attachments_participant_select on storage.objects
  for select to authenticated using(bucket_id='transaction-attachments');
create policy transaction_attachments_participant_insert on storage.objects
  for insert to authenticated with check(bucket_id='transaction-attachments');
create policy transaction_attachments_owner_update on storage.objects
  for update to authenticated using(bucket_id='transaction-attachments')
  with check(bucket_id='transaction-attachments');
create policy transaction_attachments_owner_delete on storage.objects
  for delete to authenticated using(bucket_id='transaction-attachments');
select 'MSG_A05_MESSAGE_SCHEMA_COMPOSITE_SYNTHETIC_BASELINE_PASS';
