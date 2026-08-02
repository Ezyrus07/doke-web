-- Doke MSG-A04: participant-scoped Realtime publication contract.
-- Repository-only artifact. Do not apply without fresh explicit staging authorization.

begin;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Rebuild read policies as the authorization source used by Postgres Changes.
drop policy if exists "conversation_participants_select" on public.conversations;
create policy "conversation_participants_select"
  on public.conversations
  for select
  to authenticated
  using (
    (select auth.uid()) = client_id
    or (select auth.uid()) = professional_id
  );

drop policy if exists "message_participants_select" on public.messages;
create policy "message_participants_select"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and (
           (select auth.uid()) = c.client_id
           or (select auth.uid()) = c.professional_id
         )
    )
  );

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;

-- Support participant filters and inexpensive RLS checks.
create index if not exists idx_conversations_client_updated_realtime
  on public.conversations (client_id, updated_at desc);

create index if not exists idx_conversations_professional_updated_realtime
  on public.conversations (professional_id, updated_at desc);

create index if not exists idx_messages_conversation_created_realtime
  on public.messages (conversation_id, created_at);

-- Publish only after the migration is explicitly applied.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- DELETE is deliberately not consumed by the browser subscription contract.
-- Supabase Postgres Changes cannot filter DELETE events and table RLS is not
-- applied to deleted rows. Removal is reconciled through a fresh authoritative
-- read after the server-owned command completes.

commit;
