-- MSG-UPDATE-AUTHORITY-001: preserve authenticated read/own-removal while
-- preventing participants from rewriting another person's message.
-- Database-only proposal. Does not enable MSG-A05 or authorize hosted deployment.
begin;

-- Column grants are defense-in-depth: row-level SELECT/UPDATE policies alone
-- do not restrict changes to sender_id, conversation_id, id, metadata, etc.
revoke update on table public.messages from authenticated;
revoke update (id, conversation_id, sender_id, body, status, created_at,
  external_id, message_type, attachments, metadata, read_at)
  on table public.messages from authenticated;
grant update (status, body) on table public.messages to authenticated;

create or replace function private.enforce_authenticated_message_update()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $function$
declare
  actor_id uuid;
begin
  -- Internal server operations use a service-role Supabase client.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if current_user <> 'authenticated' then
    raise exception 'DOKE_MESSAGE_UPDATE_ROLE_FORBIDDEN' using errcode = '42501';
  end if;

  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'DOKE_MESSAGE_UPDATE_AUTH_REQUIRED' using errcode = '42501';
  end if;

  -- Immutable all columns except body/status, including future schema fields.
  if (to_jsonb(new) - 'body' - 'status')
       is distinct from (to_jsonb(old) - 'body' - 'status') then
    raise exception 'DOKE_MESSAGE_IDENTITY_IMMUTABLE' using errcode = '42501';
  end if;

  -- Only the sender may remove their own message. No arbitrary body edits.
  if old.sender_id = actor_id
     and old.status <> 'removed'
     and new.status = 'removed'
     and new.body = '' then
    return new;
  end if;

  -- Only the recipient may mark a non-removed message as read.
  -- Conversation participation remains controlled by the existing RLS policy.
  if old.sender_id <> actor_id
     and old.status in ('sent', 'delivered', 'read')
     and new.status = 'read'
     and new.body is not distinct from old.body then
    return new;
  end if;

  raise exception 'DOKE_MESSAGE_STATE_TRANSITION_FORBIDDEN' using errcode = '42501';
end;
$function$;

revoke all on function private.enforce_authenticated_message_update()
  from public, anon, authenticated;
grant execute on function private.enforce_authenticated_message_update()
  to service_role;

drop trigger if exists trg_messages_authenticated_update_authority on public.messages;
create trigger trg_messages_authenticated_update_authority
  before update on public.messages
  for each row
  execute function private.enforce_authenticated_message_update();

commit;
