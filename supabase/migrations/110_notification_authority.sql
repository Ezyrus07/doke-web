-- Doke — notification authority and least-privilege grants.
-- Browser creation remains limited to authenticated participants through the guarded RPC.

begin;

alter table public.notifications enable row level security;

drop policy if exists "users read own notifications" on public.notifications;
drop policy if exists "users update own notifications" on public.notifications;
drop policy if exists notifications_recipient_select on public.notifications;
drop policy if exists notifications_recipient_update on public.notifications;

create policy notifications_recipient_select
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy notifications_recipient_update
  on public.notifications
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all privileges on table public.notifications from public, anon, authenticated, service_role;
grant select on table public.notifications to authenticated;
grant update (read_at, dismissed_at, updated_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notifications to service_role;

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
set search_path = pg_catalog
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_status text;
  v_order_id uuid;
  v_order_client_id uuid;
  v_order_professional_id uuid;
  v_conversation_id uuid;
  v_conversation_client_id uuid;
  v_conversation_professional_id uuid;
  v_service_id uuid;
  v_external_id text := nullif(pg_catalog.btrim(coalesce(p_external_id, '')), '');
  v_event_key text := nullif(pg_catalog.btrim(coalesce(p_event_key, '')), '');
  v_existing public.notifications%rowtype;
  v_notification public.notifications;
begin
  if v_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_NOTIFICATION_AUTH_REQUIRED';
  end if;

  select pg_catalog.lower(u.status)
    into v_actor_status
    from public.users u
   where u.id = v_actor_id;

  if v_actor_status is distinct from 'active' then
    raise exception using errcode = '42501', message = 'DOKE_NOTIFICATION_ACTOR_INACTIVE';
  end if;

  if p_recipient_id is null then
    raise exception using errcode = '22023', message = 'DOKE_NOTIFICATION_RECIPIENT_REQUIRED';
  end if;

  if pg_catalog.jsonb_typeof(coalesce(p_data, '{}'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_NOTIFICATION_DATA_INVALID';
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_order_external_id, '')), '') is not null then
    select o.id, o.client_id, o.professional_id
      into v_order_id, v_order_client_id, v_order_professional_id
      from public.orders o
     where o.external_id = p_order_external_id
        or o.id::text = p_order_external_id
     limit 1;

    if v_order_id is null then
      raise exception using errcode = '23503', message = 'DOKE_NOTIFICATION_ORDER_NOT_FOUND';
    end if;

    if v_actor_id not in (v_order_client_id, v_order_professional_id)
       or p_recipient_id not in (v_order_client_id, v_order_professional_id) then
      raise exception using errcode = '42501', message = 'DOKE_NOTIFICATION_ORDER_PARTICIPANT_REQUIRED';
    end if;
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_conversation_external_id, '')), '') is not null then
    select c.id, c.client_id, c.professional_id
      into v_conversation_id, v_conversation_client_id, v_conversation_professional_id
      from public.conversations c
     where c.external_id = p_conversation_external_id
        or c.id::text = p_conversation_external_id
     limit 1;

    if v_conversation_id is null then
      raise exception using errcode = '23503', message = 'DOKE_NOTIFICATION_CONVERSATION_NOT_FOUND';
    end if;

    if v_actor_id not in (v_conversation_client_id, v_conversation_professional_id)
       or p_recipient_id not in (v_conversation_client_id, v_conversation_professional_id) then
      raise exception using errcode = '42501', message = 'DOKE_NOTIFICATION_CONVERSATION_PARTICIPANT_REQUIRED';
    end if;

    if v_order_id is not null and exists (
      select 1
        from public.conversations c
       where c.id = v_conversation_id
         and c.order_id is distinct from v_order_id
    ) then
      raise exception using errcode = '23514', message = 'DOKE_NOTIFICATION_CONTEXT_MISMATCH';
    end if;
  end if;

  if nullif(pg_catalog.btrim(coalesce(p_service_external_id, '')), '') is not null then
    select s.id
      into v_service_id
      from public.services s
     where s.external_id = p_service_external_id
        or s.id::text = p_service_external_id
     limit 1;

    if v_service_id is null then
      raise exception using errcode = '23503', message = 'DOKE_NOTIFICATION_SERVICE_NOT_FOUND';
    end if;
  end if;

  if v_order_id is null and v_conversation_id is null and p_recipient_id <> v_actor_id then
    raise exception using errcode = '42501', message = 'DOKE_NOTIFICATION_TRANSACTION_CONTEXT_REQUIRED';
  end if;

  if v_event_key is not null or v_external_id is not null then
    select n.*
      into v_existing
      from public.notifications n
     where (v_event_key is not null and n.user_id = p_recipient_id and n.event_key = v_event_key)
        or (v_external_id is not null and n.external_id = v_external_id)
     order by case when n.user_id = p_recipient_id and n.event_key = v_event_key then 0 else 1 end
     limit 1
     for update;
  end if;

  if v_existing.id is not null then
    if v_existing.user_id is distinct from p_recipient_id
       or v_existing.event_key is distinct from v_event_key
       or v_existing.order_id is distinct from v_order_id
       or v_existing.conversation_id is distinct from v_conversation_id
       or v_existing.service_id is distinct from v_service_id then
      raise exception using errcode = '23505', message = 'DOKE_NOTIFICATION_IDEMPOTENCY_CONFLICT';
    end if;

    update public.notifications
       set actor_id = v_actor_id,
           type = coalesce(nullif(pg_catalog.btrim(p_type), ''), type),
           category = coalesce(nullif(pg_catalog.btrim(p_category), ''), category),
           title = coalesce(nullif(pg_catalog.btrim(p_title), ''), title),
           body = coalesce(p_body, body),
           target_url = coalesce(p_target_url, target_url),
           action_label = coalesce(p_action_label, action_label),
           data = coalesce(p_data, '{}'::jsonb),
           updated_at = pg_catalog.now()
     where id = v_existing.id
     returning * into v_notification;
  else
    insert into public.notifications (
      external_id, user_id, actor_id, type, category, event_key, title, body,
      target_url, action_label, order_id, conversation_id, service_id, data,
      created_at, updated_at
    ) values (
      coalesce(v_external_id, 'notif_' || pg_catalog.replace(gen_random_uuid()::text, '-', '')),
      p_recipient_id,
      v_actor_id,
      coalesce(nullif(pg_catalog.btrim(p_type), ''), 'system'),
      coalesce(nullif(pg_catalog.btrim(p_category), ''), 'social'),
      v_event_key,
      coalesce(nullif(pg_catalog.btrim(p_title), ''), 'Nova notificação'),
      coalesce(p_body, ''),
      p_target_url,
      p_action_label,
      v_order_id,
      v_conversation_id,
      v_service_id,
      coalesce(p_data, '{}'::jsonb),
      pg_catalog.now(),
      pg_catalog.now()
    )
    returning * into v_notification;
  end if;

  return v_notification;
end;
$$;

create or replace function public.update_own_notification_state(
  p_notification_ref text,
  p_mark_read boolean default null,
  p_dismiss boolean default null
)
returns public.notifications
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text := nullif(pg_catalog.btrim(coalesce(p_notification_ref, '')), '');
  v_row public.notifications;
  v_now timestamptz := pg_catalog.now();
begin
  if v_uid is null then
    raise exception using errcode = '28000', message = 'DOKE_NOTIFICATION_AUTH_REQUIRED';
  end if;

  if v_ref is null then
    raise exception using errcode = '22023', message = 'DOKE_NOTIFICATION_REFERENCE_REQUIRED';
  end if;

  update public.notifications n
     set read_at = case
          when p_dismiss is true then coalesce(n.read_at, v_now)
          when p_mark_read is true then coalesce(n.read_at, v_now)
          when p_mark_read is false then null
          else n.read_at
        end,
         dismissed_at = case
          when p_dismiss is true then coalesce(n.dismissed_at, v_now)
          when p_dismiss is false then null
          else n.dismissed_at
        end,
         updated_at = v_now
   where n.user_id = v_uid
     and (n.external_id = v_ref or n.id::text = v_ref)
  returning n.* into v_row;

  if v_row.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_NOTIFICATION_NOT_FOUND';
  end if;

  return v_row;
end;
$$;

revoke all privileges on function public.create_transaction_notification(
  text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb
) from public, anon, authenticated, service_role;
grant execute on function public.create_transaction_notification(
  text, uuid, text, text, text, text, text, text, text, text, text, text, jsonb
) to authenticated;

revoke all privileges on function public.update_own_notification_state(text, boolean, boolean)
  from public, anon, authenticated, service_role;
grant execute on function public.update_own_notification_state(text, boolean, boolean)
  to authenticated;

notify pgrst, 'reload schema';

commit;
