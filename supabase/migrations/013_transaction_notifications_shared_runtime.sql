-- Doke Stage 013: shared transactional notifications runtime.
-- Apply after 009 services, 010 orders, 011 messages and 012 attachments.

alter table public.notifications
  add column if not exists external_id text,
  add column if not exists actor_id uuid references public.users(id) on delete set null,
  add column if not exists category text not null default 'social',
  add column if not exists event_key text,
  add column if not exists target_url text,
  add column if not exists action_label text,
  add column if not exists order_id uuid references public.orders(id) on delete cascade,
  add column if not exists conversation_id uuid references public.conversations(id) on delete cascade,
  add column if not exists service_id uuid references public.services(id) on delete set null,
  add column if not exists dismissed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists notifications_external_id_unique
  on public.notifications(external_id)
  where external_id is not null;

create unique index if not exists notifications_recipient_event_unique
  on public.notifications(user_id, event_key)
  where event_key is not null and event_key <> '';

create index if not exists notifications_recipient_created_idx
  on public.notifications(user_id, created_at desc);

create index if not exists notifications_order_idx
  on public.notifications(order_id, created_at desc)
  where order_id is not null;

create index if not exists notifications_conversation_idx
  on public.notifications(conversation_id, created_at desc)
  where conversation_id is not null;

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
drop policy if exists "users update own notifications" on public.notifications;
drop policy if exists notifications_recipient_select on public.notifications;
drop policy if exists notifications_recipient_update on public.notifications;

create policy notifications_recipient_select
  on public.notifications
  for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_recipient_update
  on public.notifications
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select on public.notifications to authenticated;
revoke insert, delete on public.notifications from authenticated;
revoke update on public.notifications from authenticated;
grant update (read_at, dismissed_at, updated_at) on public.notifications to authenticated;

-- Notification creation is intentionally routed through a security-definer RPC.
-- The function verifies that actor and recipient participate in the referenced
-- order/conversation. Without a transactional context, only self-notifications
-- are accepted.
create or replace function public.create_transaction_notification(
  p_external_id text,
  p_recipient_id uuid,
  p_type text,
  p_category text,
  p_title text,
  p_body text default '',
  p_event_key text default null,
  p_target_url text default null,
  p_action_label text default null,
  p_order_external_id text default null,
  p_conversation_external_id text default null,
  p_service_external_id text default null,
  p_data jsonb default '{}'::jsonb
)
returns public.notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_order_id uuid;
  v_order_client_id uuid;
  v_order_professional_id uuid;
  v_conversation_id uuid;
  v_conversation_client_id uuid;
  v_conversation_professional_id uuid;
  v_service_id uuid;
  v_existing_id uuid;
  v_notification public.notifications;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_recipient_id is null then
    raise exception 'Notification recipient is required.' using errcode = '22023';
  end if;

  if nullif(trim(coalesce(p_order_external_id, '')), '') is not null then
    select o.id, o.client_id, o.professional_id
      into v_order_id, v_order_client_id, v_order_professional_id
      from public.orders o
     where o.external_id = p_order_external_id
        or o.id::text = p_order_external_id
     limit 1;

    if v_order_id is null then
      raise exception 'Referenced order was not found.' using errcode = '23503';
    end if;

    if v_actor_id not in (v_order_client_id, v_order_professional_id)
       or p_recipient_id not in (v_order_client_id, v_order_professional_id) then
      raise exception 'Actor and recipient must participate in the order.' using errcode = '42501';
    end if;
  end if;

  if nullif(trim(coalesce(p_conversation_external_id, '')), '') is not null then
    select c.id, c.client_id, c.professional_id
      into v_conversation_id, v_conversation_client_id, v_conversation_professional_id
      from public.conversations c
     where c.external_id = p_conversation_external_id
        or c.id::text = p_conversation_external_id
     limit 1;

    if v_conversation_id is null then
      raise exception 'Referenced conversation was not found.' using errcode = '23503';
    end if;

    if v_actor_id not in (v_conversation_client_id, v_conversation_professional_id)
       or p_recipient_id not in (v_conversation_client_id, v_conversation_professional_id) then
      raise exception 'Actor and recipient must participate in the conversation.' using errcode = '42501';
    end if;

    if v_order_id is not null and exists (
      select 1 from public.conversations c
       where c.id = v_conversation_id
         and c.order_id is distinct from v_order_id
    ) then
      raise exception 'Conversation does not belong to the referenced order.' using errcode = '23514';
    end if;
  end if;

  if nullif(trim(coalesce(p_service_external_id, '')), '') is not null then
    select s.id
      into v_service_id
      from public.services s
     where s.external_id = p_service_external_id
        or s.id::text = p_service_external_id
     limit 1;
  end if;

  if v_order_id is null and v_conversation_id is null and p_recipient_id <> v_actor_id then
    raise exception 'Cross-user notifications require an order or conversation context.' using errcode = '42501';
  end if;

  if nullif(trim(coalesce(p_event_key, '')), '') is not null then
    select n.id
      into v_existing_id
      from public.notifications n
     where n.user_id = p_recipient_id
       and n.event_key = p_event_key
     limit 1;
  end if;

  if v_existing_id is not null then
    update public.notifications
       set actor_id = v_actor_id,
           type = coalesce(nullif(trim(p_type), ''), type),
           category = coalesce(nullif(trim(p_category), ''), category),
           title = coalesce(nullif(trim(p_title), ''), title),
           body = coalesce(p_body, body),
           target_url = coalesce(p_target_url, target_url),
           action_label = coalesce(p_action_label, action_label),
           order_id = coalesce(v_order_id, order_id),
           conversation_id = coalesce(v_conversation_id, conversation_id),
           service_id = coalesce(v_service_id, service_id),
           data = coalesce(p_data, '{}'::jsonb),
           updated_at = now()
     where id = v_existing_id
     returning * into v_notification;
  else
    insert into public.notifications (
      external_id,
      user_id,
      actor_id,
      type,
      category,
      event_key,
      title,
      body,
      target_url,
      action_label,
      order_id,
      conversation_id,
      service_id,
      data,
      created_at,
      updated_at
    ) values (
      coalesce(nullif(trim(p_external_id), ''), 'notif_' || replace(gen_random_uuid()::text, '-', '')),
      p_recipient_id,
      v_actor_id,
      coalesce(nullif(trim(p_type), ''), 'system'),
      coalesce(nullif(trim(p_category), ''), 'social'),
      nullif(trim(coalesce(p_event_key, '')), ''),
      coalesce(nullif(trim(p_title), ''), 'Nova notificação'),
      coalesce(p_body, ''),
      p_target_url,
      p_action_label,
      v_order_id,
      v_conversation_id,
      v_service_id,
      coalesce(p_data, '{}'::jsonb),
      now(),
      now()
    )
    returning * into v_notification;
  end if;

  return v_notification;
end;
$$;

revoke all on function public.create_transaction_notification(
  text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb
) from public;

grant execute on function public.create_transaction_notification(
  text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

-- Enable Postgres Changes for recipient-scoped realtime delivery.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;
