\set ON_ERROR_STOP on
-- Minimal synthetic stand-in for Supabase schemas. NOT a clone of staging.
do $role$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $role$;
create schema private;
create schema auth;
create schema storage;
grant usage on schema auth to authenticated, service_role;
grant usage on schema storage to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant execute on function auth.uid() to authenticated;
create table public.users(id uuid primary key, status text not null);
create table public.orders(
  id uuid primary key, external_id text unique,
  client_id uuid not null references public.users(id),
  professional_id uuid not null references public.users(id),
  status text default 'active'
);
create table public.conversations(
  id uuid primary key, external_id text unique,
  client_id uuid not null references public.users(id),
  professional_id uuid not null references public.users(id),
  status text default 'active'
);
create table public.messages(
  id uuid primary key, conversation_id uuid not null references public.conversations(id),
  sender_id uuid not null references public.users(id), status text not null default 'sent'
);
create table storage.objects(
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  owner_id text,
  unique(bucket_id,name)
);
alter table storage.objects enable row level security;
grant select,insert,update,delete on storage.objects to authenticated;
grant select,insert,update,delete on storage.objects to service_role;
-- Deliberately permissive OLD policies model policy replacement, not real policy SQL.
create policy transaction_attachments_participant_select on storage.objects
  for select to authenticated using (bucket_id='transaction-attachments');
create policy transaction_attachments_participant_insert on storage.objects
  for insert to authenticated with check (bucket_id='transaction-attachments');
create policy transaction_attachments_owner_update on storage.objects
  for update to authenticated using (bucket_id='transaction-attachments') with check (bucket_id='transaction-attachments');
create policy transaction_attachments_owner_delete on storage.objects
  for delete to authenticated using (bucket_id='transaction-attachments');
insert into public.users(id,status) values
('11111111-1111-4111-8111-111111111111','active'),
('22222222-2222-4222-8222-222222222222','active'),
('99999999-9999-4999-8999-999999999999','inactive');
insert into public.orders(id,external_id,client_id,professional_id) values
('33333333-3333-4333-8333-333333333333','synthetic-order','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into public.conversations(id,external_id,client_id,professional_id) values
('44444444-4444-4444-8444-444444444444','synthetic-conversation','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222');
insert into public.messages(id,conversation_id,sender_id,status) values
('55555555-5555-4555-8555-555555555555','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','sent');
select 'SYNTHETIC_BASELINE_READY' as status;
