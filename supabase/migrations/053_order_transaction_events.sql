-- Doke: transactional order domain events and synchronous projections.
-- Every accepted order status transition now produces one canonical event and
-- projects history, conversation metadata, notifications and metrics inside
-- the same database transaction.

create table if not exists private.order_domain_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  sequence_no bigint not null check (sequence_no > 0),
  event_type text not null check (event_type in (
    'order.requested',
    'order.accepted',
    'order.quoted',
    'order.scheduled',
    'order.started',
    'order.completed',
    'order.cancelled',
    'order.disputed'
  )),
  previous_status text,
  next_status text not null,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null,
  action text not null,
  note text,
  payload jsonb not null default '{}'::jsonb,
  cache_tags text[] not null default '{}'::text[],
  delivery_status text not null default 'ready' check (delivery_status in ('ready', 'processing', 'completed', 'failed')),
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  available_at timestamptz not null default now(),
  claimed_at timestamptz,
  delivered_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default now(),
  unique (order_id, sequence_no)
);

create index if not exists idx_order_domain_events_delivery
  on private.order_domain_events(delivery_status, available_at, created_at)
  where delivery_status in ('ready', 'failed');

create index if not exists idx_order_domain_events_order_created
  on private.order_domain_events(order_id, created_at desc);

create table if not exists private.order_metric_events (
  id uuid primary key default gen_random_uuid(),
  order_event_id uuid not null unique references private.order_domain_events(id) on delete cascade,
  event_key text not null unique,
  order_id uuid not null references public.orders(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid not null references public.users(id) on delete cascade,
  professional_id uuid references public.users(id) on delete set null,
  event_type text not null,
  occurred_at timestamptz not null,
  dimensions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_metric_events_professional_created
  on private.order_metric_events(professional_id, created_at desc)
  where professional_id is not null;

create index if not exists idx_order_metric_events_service_created
  on private.order_metric_events(service_id, created_at desc)
  where service_id is not null;

revoke all on private.order_domain_events from public, anon, authenticated;
revoke all on private.order_metric_events from public, anon, authenticated;
grant select, update on private.order_domain_events to service_role;
grant select on private.order_metric_events to service_role;

alter table public.order_status_history
  add column if not exists event_id uuid references private.order_domain_events(id) on delete cascade,
  add column if not exists event_key text,
  add column if not exists sequence_no bigint,
  add column if not exists action text;

create unique index if not exists order_status_history_event_key_unique
  on public.order_status_history(event_key)
  where event_key is not null and event_key <> '';

create index if not exists idx_order_status_history_order_created
  on public.order_status_history(order_id, created_at desc);

alter table public.order_status_history enable row level security;

drop policy if exists order_status_history_participants_select on public.order_status_history;
create policy order_status_history_participants_select
  on public.order_status_history
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_status_history.order_id
        and ((select auth.uid()) = o.client_id or (select auth.uid()) = o.professional_id)
    )
  );

grant select on public.order_status_history to authenticated;
revoke insert, update, delete on public.order_status_history from anon, authenticated;

create unique index if not exists conversations_order_unique
  on public.conversations(order_id)
  where order_id is not null;

create or replace function public.transition_order_status(
  p_order_id uuid,
  p_expected_status text,
  p_next_status text,
  p_action text default 'updateStatus',
  p_note text default null
)
returns public.orders
language plpgsql
security invoker
set search_path = public, private, auth, pg_temp
as $$
declare
  v_order public.orders;
begin
  if p_order_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_ID_REQUIRED';
  end if;

  perform set_config('doke.order_transition_action', left(trim(coalesce(p_action, 'updateStatus')), 80), true);
  perform set_config('doke.order_transition_note', left(trim(coalesce(p_note, '')), 800), true);

  update public.orders
     set status = lower(trim(coalesce(p_next_status, ''))),
         updated_at = now()
   where id = p_order_id
     and status = lower(trim(coalesce(p_expected_status, '')))
  returning * into v_order;

  if v_order.id is null then
    raise exception using
      errcode = '40001',
      message = 'DOKE_ORDER_CONFLICT',
      detail = 'The order was not visible or its status changed before the transition was committed.';
  end if;

  return v_order;
end;
$$;

revoke all on function public.transition_order_status(uuid, text, text, text, text) from public, anon;
grant execute on function public.transition_order_status(uuid, text, text, text, text) to authenticated, service_role;

create or replace function private.project_order_domain_event()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth, pg_temp
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_jwt_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_action text := nullif(trim(current_setting('doke.order_transition_action', true)), '');
  v_note text := nullif(trim(current_setting('doke.order_transition_note', true)), '');
  v_previous_status text;
  v_sequence bigint;
  v_event_id uuid;
  v_event_key text;
  v_event_type text;
  v_conversation_id uuid;
  v_recipient_id uuid;
  v_notification_key text;
  v_title text;
  v_body text;
  v_cache_tags text[];
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  if v_jwt_role = 'service_role' or session_user in ('postgres', 'supabase_admin', 'service_role') then
    v_actor_role := 'service_role';
    if v_jwt_role = 'service_role' then
      v_actor_id := auth.uid();
    else
      v_actor_id := null;
    end if;
  elsif v_actor_id is not null then
    select lower(u.role) into v_actor_role
    from public.users u
    where u.id = v_actor_id;
  end if;

  if v_actor_role is null then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_EVENT_ACTOR_UNRESOLVED';
  end if;

  v_previous_status := case when tg_op = 'INSERT' then null else old.status end;
  v_action := coalesce(v_action, case when tg_op = 'INSERT' then 'create' else 'updateStatus' end);
  v_note := coalesce(v_note, case new.status
    when 'requested' then 'Pedido criado ou solicitado pelo cliente.'
    when 'accepted' then 'Pedido aceito pelo profissional.'
    when 'quoted' then 'Orçamento enviado ou atualizado pelo profissional.'
    when 'scheduled' then 'Atendimento agendado.'
    when 'in_progress' then 'Atendimento iniciado.'
    when 'completed' then 'Atendimento concluído.'
    when 'cancelled' then 'Pedido cancelado.'
    when 'disputed' then 'Disputa aberta para o pedido.'
    else 'Status do pedido atualizado.'
  end);

  v_event_type := case new.status
    when 'requested' then 'order.requested'
    when 'accepted' then 'order.accepted'
    when 'quoted' then 'order.quoted'
    when 'scheduled' then 'order.scheduled'
    when 'in_progress' then 'order.started'
    when 'completed' then 'order.completed'
    when 'cancelled' then 'order.cancelled'
    when 'disputed' then 'order.disputed'
    else null
  end;

  if v_event_type is null then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_EVENT_TYPE_INVALID';
  end if;

  select coalesce(max(e.sequence_no), 0) + 1
    into v_sequence
    from private.order_domain_events e
   where e.order_id = new.id;

  v_event_key := 'order:' || new.id::text || ':v' || v_sequence::text;
  v_cache_tags := array_remove(array[
    'order:' || new.id::text,
    'orders:client:' || new.client_id::text,
    case when new.professional_id is not null then 'orders:professional:' || new.professional_id::text end,
    case when new.professional_id is not null then 'conversation:order:' || new.id::text end
  ], null);

  insert into private.order_domain_events (
    event_key,
    order_id,
    sequence_no,
    event_type,
    previous_status,
    next_status,
    actor_id,
    actor_role,
    action,
    note,
    payload,
    cache_tags,
    created_at
  ) values (
    v_event_key,
    new.id,
    v_sequence,
    v_event_type,
    v_previous_status,
    new.status,
    v_actor_id,
    v_actor_role,
    v_action,
    v_note,
    jsonb_build_object(
      'orderId', new.id,
      'serviceId', new.service_id,
      'clientId', new.client_id,
      'professionalId', new.professional_id,
      'previousStatus', v_previous_status,
      'nextStatus', new.status,
      'actorId', v_actor_id,
      'actorRole', v_actor_role,
      'action', v_action,
      'occurredAt', coalesce(new.updated_at, now())
    ),
    v_cache_tags,
    coalesce(new.updated_at, now())
  )
  returning id into v_event_id;

  insert into public.order_status_history (
    order_id,
    old_status,
    new_status,
    actor_id,
    note,
    event_id,
    event_key,
    sequence_no,
    action,
    created_at
  ) values (
    new.id,
    v_previous_status,
    new.status,
    v_actor_id,
    v_note,
    v_event_id,
    v_event_key,
    v_sequence,
    v_action,
    coalesce(new.updated_at, now())
  )
  on conflict (event_key) where event_key is not null and event_key <> '' do nothing;

  update public.conversations
     set metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
           'orderStatus', new.status,
           'orderEventKey', v_event_key,
           'orderEventSequence', v_sequence,
           'cacheVersion', v_sequence
         ),
         updated_at = coalesce(new.updated_at, now())
   where order_id = new.id
  returning id into v_conversation_id;

  insert into private.order_metric_events (
    order_event_id,
    event_key,
    order_id,
    service_id,
    client_id,
    professional_id,
    event_type,
    occurred_at,
    dimensions
  ) values (
    v_event_id,
    v_event_key,
    new.id,
    new.service_id,
    new.client_id,
    new.professional_id,
    v_event_type,
    coalesce(new.updated_at, now()),
    jsonb_build_object(
      'previousStatus', v_previous_status,
      'nextStatus', new.status,
      'actorRole', v_actor_role,
      'action', v_action,
      'sequence', v_sequence
    )
  )
  on conflict (order_event_id) do nothing;

  v_title := case new.status
    when 'requested' then 'Novo pedido recebido'
    when 'accepted' then 'Pedido aceito'
    when 'quoted' then 'Novo orçamento recebido'
    when 'scheduled' then 'Serviço agendado'
    when 'in_progress' then 'Serviço iniciado'
    when 'completed' then 'Serviço concluído'
    when 'cancelled' then 'Pedido cancelado'
    when 'disputed' then 'Disputa aberta'
    else 'Pedido atualizado'
  end;

  v_body := case new.status
    when 'requested' then 'Um cliente enviou uma nova solicitação de serviço.'
    when 'accepted' then 'O profissional aceitou a solicitação de serviço.'
    when 'quoted' then 'O profissional enviou ou atualizou o orçamento do pedido.'
    when 'scheduled' then 'O pedido recebeu uma data de atendimento.'
    when 'in_progress' then 'O atendimento deste pedido foi iniciado.'
    when 'completed' then 'O atendimento deste pedido foi marcado como concluído.'
    when 'cancelled' then 'Este pedido foi cancelado.'
    when 'disputed' then 'Uma disputa foi aberta para este pedido.'
    else 'O status deste pedido foi atualizado.'
  end;

  for v_recipient_id in
    select participant_id
    from unnest(array[new.client_id, new.professional_id]) as participants(participant_id)
    where participant_id is not null
      and (v_actor_id is null or participant_id <> v_actor_id)
  loop
    v_notification_key := v_event_key || ':recipient:' || v_recipient_id::text;

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
      'notif_' || replace(v_notification_key, ':', '_'),
      v_recipient_id,
      v_actor_id,
      replace(v_event_type, '.', '_'),
      'orders',
      v_notification_key,
      v_title,
      v_body,
      'pedidos.html?order=' || new.id::text,
      'Ver pedido',
      new.id,
      v_conversation_id,
      new.service_id,
      jsonb_build_object(
        'eventKey', v_event_key,
        'eventType', v_event_type,
        'orderId', new.id,
        'conversationId', v_conversation_id,
        'previousStatus', v_previous_status,
        'nextStatus', new.status,
        'sequence', v_sequence
      ),
      coalesce(new.updated_at, now()),
      coalesce(new.updated_at, now())
    )
    on conflict (user_id, event_key) where event_key is not null and event_key <> '' do update
      set actor_id = excluded.actor_id,
          type = excluded.type,
          category = excluded.category,
          title = excluded.title,
          body = excluded.body,
          target_url = excluded.target_url,
          action_label = excluded.action_label,
          order_id = excluded.order_id,
          conversation_id = excluded.conversation_id,
          service_id = excluded.service_id,
          data = excluded.data,
          updated_at = excluded.updated_at;
  end loop;

  return new;
end;
$$;

revoke all on function private.project_order_domain_event() from public, anon, authenticated;

drop trigger if exists trg_orders_domain_events on public.orders;
create trigger trg_orders_domain_events
after insert or update of status on public.orders
for each row
execute function private.project_order_domain_event();

create or replace function public.claim_order_domain_events(p_limit integer default 50)
returns table (
  event_id uuid,
  event_key text,
  order_id uuid,
  sequence_no bigint,
  event_type text,
  payload jsonb,
  cache_tags text[],
  delivery_attempts integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  return query
  with candidates as (
    select e.id
    from private.order_domain_events e
    where e.delivery_status in ('ready', 'failed')
      and e.available_at <= now()
    order by e.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 50), 100))
  ), claimed as (
    update private.order_domain_events e
       set delivery_status = 'processing',
           delivery_attempts = e.delivery_attempts + 1,
           claimed_at = now(),
           last_error_code = null
      from candidates c
     where e.id = c.id
    returning e.*
  )
  select c.id, c.event_key, c.order_id, c.sequence_no, c.event_type,
         c.payload, c.cache_tags, c.delivery_attempts, c.created_at
  from claimed c
  order by c.created_at;
end;
$$;

create or replace function public.complete_order_domain_event(p_event_key text)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  update private.order_domain_events
     set delivery_status = 'completed',
         delivered_at = now(),
         last_error_code = null
   where event_key = p_event_key
     and delivery_status = 'processing';
  return found;
end;
$$;

create or replace function public.fail_order_domain_event(
  p_event_key text,
  p_error_code text,
  p_retry_after_seconds integer default 60
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  update private.order_domain_events
     set delivery_status = 'failed',
         available_at = now() + make_interval(secs => greatest(1, least(coalesce(p_retry_after_seconds, 60), 86400))),
         last_error_code = left(trim(coalesce(p_error_code, 'DOKE_ORDER_EVENT_DELIVERY_FAILED')), 120)
   where event_key = p_event_key
     and delivery_status = 'processing';
  return found;
end;
$$;

revoke all on function public.claim_order_domain_events(integer) from public, anon, authenticated;
revoke all on function public.complete_order_domain_event(text) from public, anon, authenticated;
revoke all on function public.fail_order_domain_event(text, text, integer) from public, anon, authenticated;
grant execute on function public.claim_order_domain_events(integer) to service_role;
grant execute on function public.complete_order_domain_event(text) to service_role;
grant execute on function public.fail_order_domain_event(text, text, integer) to service_role;

comment on table private.order_domain_events is
  'Canonical transactional order event log and future external-delivery outbox.';
comment on table private.order_metric_events is
  'Idempotent analytics projection derived from canonical order domain events.';
comment on function public.transition_order_status(uuid, text, text, text, text) is
  'Optimistic order transition RPC; the state-machine trigger validates permissions and the event trigger projects side effects atomically.';
comment on function private.project_order_domain_event() is
  'Projects one canonical order event into history, conversation metadata, notifications and metrics in the same transaction.';
