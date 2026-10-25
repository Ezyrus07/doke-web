\set ON_ERROR_STOP on
-- Synthetic schema only. No live Supabase data.
do $role$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $role$;
create schema auth;
create schema private;
grant usage on schema auth to authenticated, service_role;
grant usage on schema private to authenticated, service_role;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant execute on function auth.uid() to authenticated;
create table public.users(id uuid primary key);
create table public.conversations(
 id uuid primary key, client_id uuid not null references public.users(id),
 professional_id uuid not null references public.users(id));
create table public.messages(
 id uuid primary key,
 conversation_id uuid not null references public.conversations(id),
 sender_id uuid not null references public.users(id),
 body text default '',
 status text not null default 'sent' check(status in ('sent','delivered','read','removed')),
 created_at timestamptz not null default now(),
 external_id text, message_type text not null default 'text',
 attachments jsonb not null default '[]', metadata jsonb not null default '{}',
 read_at timestamptz
);
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
grant select on public.users to authenticated, service_role;
grant select on public.conversations to authenticated, service_role;
grant select,insert,update on public.messages to authenticated, service_role;
create policy conversation_participants_select on public.conversations for select to authenticated
 using ((select auth.uid()) = client_id or (select auth.uid()) = professional_id);
create policy message_participants_select on public.messages for select to authenticated
 using (exists(select 1 from public.conversations c where c.id = messages.conversation_id
 and ((select auth.uid()) = c.client_id or (select auth.uid()) = c.professional_id)));
create policy message_participants_update on public.messages for update to authenticated
 using (exists(select 1 from public.conversations c where c.id = messages.conversation_id
 and ((select auth.uid()) = c.client_id or (select auth.uid()) = c.professional_id)))
 with check (exists(select 1 from public.conversations c where c.id = messages.conversation_id
 and ((select auth.uid()) = c.client_id or (select auth.uid()) = c.professional_id)));
insert into public.users(id) values
('11111111-1111-4111-8111-111111111111'),
('22222222-2222-4222-8222-222222222222'),
('99999999-9999-4999-8999-999999999999');
insert into public.conversations values
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'),
('55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222');
insert into public.messages(id,conversation_id,sender_id,body,status) values
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','a-sent','sent'),
('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','b-sent','sent'),
('cccccccc-cccc-4ccc-8ccc-cccccccccccc','55555555-5555-4555-8555-555555555555','99999999-9999-4999-8999-999999999999','c-sent','delivered'),
('dddddddd-dddd-4ddd-8ddd-dddddddddddd','44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','','removed');
select 'SYNTHETIC_MESSAGE_BASELINE_READY';
