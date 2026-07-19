-- Doke: shared order conversations and messages runtime.
alter table public.conversations
  add column if not exists external_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamptz not null default now();

alter table public.messages
  add column if not exists external_id text,
  add column if not exists message_type text not null default 'text',
  add column if not exists attachments jsonb not null default '[]'::jsonb,
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists read_at timestamptz;

create unique index if not exists idx_conversations_external_id_unique on public.conversations(external_id) where external_id is not null;
create unique index if not exists idx_messages_external_id_unique on public.messages(external_id) where external_id is not null;
create index if not exists idx_conversations_updated on public.conversations(updated_at desc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "conversation_participants_select" on public.conversations;
drop policy if exists "conversation_participants_insert" on public.conversations;
drop policy if exists "conversation_participants_update" on public.conversations;
drop policy if exists "message_participants_select" on public.messages;
drop policy if exists "message_sender_insert" on public.messages;
drop policy if exists "message_participants_update" on public.messages;

create policy "conversation_participants_select" on public.conversations for select to authenticated
using (auth.uid() = client_id or auth.uid() = professional_id);
create policy "conversation_participants_insert" on public.conversations for insert to authenticated
with check (auth.uid() = client_id or auth.uid() = professional_id);
create policy "conversation_participants_update" on public.conversations for update to authenticated
using (auth.uid() = client_id or auth.uid() = professional_id)
with check (auth.uid() = client_id or auth.uid() = professional_id);

create policy "message_participants_select" on public.messages for select to authenticated
using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and (auth.uid() = c.client_id or auth.uid() = c.professional_id)));
create policy "message_sender_insert" on public.messages for insert to authenticated
with check (auth.uid() = sender_id and exists (select 1 from public.conversations c where c.id = messages.conversation_id and (auth.uid() = c.client_id or auth.uid() = c.professional_id)));
create policy "message_participants_update" on public.messages for update to authenticated
using (exists (select 1 from public.conversations c where c.id = messages.conversation_id and (auth.uid() = c.client_id or auth.uid() = c.professional_id)))
with check (exists (select 1 from public.conversations c where c.id = messages.conversation_id and (auth.uid() = c.client_id or auth.uid() = c.professional_id)));
