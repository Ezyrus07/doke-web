-- MSG-A06 repository-only contract.
-- This migration is intentionally not applied by the repository workflow.

create or replace function public.can_access_message_ephemeral_topic(p_topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_conversation_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  if coalesce(p_topic, '') !~ '^doke:conversation:[0-9a-fA-F-]{36}:ephemeral$' then
    return false;
  end if;

  v_conversation_id := split_part(p_topic, ':', 3)::uuid;

  return exists (
    select 1
    from public.conversations c
    where c.id = v_conversation_id
      and (c.client_id = auth.uid() or c.professional_id = auth.uid())
  );
exception
  when others then
    return false;
end;
$$;

revoke all on function public.can_access_message_ephemeral_topic(text) from public;
grant execute on function public.can_access_message_ephemeral_topic(text) to authenticated;

alter table realtime.messages enable row level security;

drop policy if exists msg_a06_receive_private_presence_typing on realtime.messages;
create policy msg_a06_receive_private_presence_typing
on realtime.messages
for select
to authenticated
using (
  extension in ('presence', 'broadcast')
  and public.can_access_message_ephemeral_topic(realtime.topic())
);

drop policy if exists msg_a06_send_private_presence_typing on realtime.messages;
create policy msg_a06_send_private_presence_typing
on realtime.messages
for insert
to authenticated
with check (
  extension in ('presence', 'broadcast')
  and public.can_access_message_ephemeral_topic(realtime.topic())
);

comment on function public.can_access_message_ephemeral_topic(text) is
  'MSG-A06 participant proof for private conversation-scoped Presence and Broadcast topics.';
