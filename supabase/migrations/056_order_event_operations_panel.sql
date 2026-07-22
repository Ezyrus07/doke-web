-- Doke: internal operational dashboard for the order event worker.
-- The browser never reads private worker tables directly. A user-authenticated
-- Edge Function calls these service-role-only RPCs after independently checking
-- that the caller is an active support or admin account.

alter table private.order_domain_events
  add column if not exists manual_requeue_count integer not null default 0
    check (manual_requeue_count between 0 and 1000),
  add column if not exists last_requeued_at timestamptz,
  add column if not exists last_requeued_by uuid references public.users(id) on delete set null;

create index if not exists idx_order_domain_events_last_requeued_by
  on private.order_domain_events(last_requeued_by)
  where last_requeued_by is not null;

create table if not exists private.order_event_operator_actions (
  id uuid primary key default gen_random_uuid(),
  order_event_id uuid references private.order_domain_events(id) on delete set null,
  event_key text,
  actor_id uuid not null references public.users(id) on delete restrict,
  actor_role text not null check (actor_role in ('support', 'admin')),
  action text not null check (action in ('requeue', 'run_now')),
  previous_status text,
  previous_error_code text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_event_operator_actions_created
  on private.order_event_operator_actions(created_at desc);

create index if not exists idx_order_event_operator_actions_event
  on private.order_event_operator_actions(order_event_id, created_at desc)
  where order_event_id is not null;

create index if not exists idx_order_event_operator_actions_actor
  on private.order_event_operator_actions(actor_id, created_at desc);

revoke all on private.order_event_operator_actions from public, anon, authenticated;
grant select on private.order_event_operator_actions to service_role;

create or replace function private.assert_order_event_operator(p_actor_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_ORDER_OPS_AUTH_REQUIRED';
  end if;

  select lower(u.role)
    into v_role
    from public.users u
   where u.id = p_actor_id
     and lower(u.status) = 'active';

  if v_role not in ('support', 'admin') then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_OPS_ROLE_REQUIRED';
  end if;

  return v_role;
end;
$$;

create or replace function public.get_order_event_operations_dashboard_internal(
  p_actor_id uuid,
  p_event_limit integer default 50,
  p_run_limit integer default 20
)
returns jsonb
language plpgsql
stable
security definer
set search_path = private, public, cron, pg_temp
as $$
declare
  v_actor_role text;
  v_event_limit integer := greatest(10, least(coalesce(p_event_limit, 50), 100));
  v_run_limit integer := greatest(5, least(coalesce(p_run_limit, 20), 50));
  v_cron_active boolean := false;
  v_cron_last_status text;
  v_cron_last_run_at timestamptz;
  v_total bigint := 0;
  v_ready bigint := 0;
  v_failed bigint := 0;
  v_processing bigint := 0;
  v_completed bigint := 0;
  v_dead_letter bigint := 0;
  v_deliverable bigint := 0;
  v_stale_processing bigint := 0;
  v_created_24h bigint := 0;
  v_completed_24h bigint := 0;
  v_failed_24h bigint := 0;
  v_dead_letter_24h bigint := 0;
  v_claimed_24h bigint := 0;
  v_run_completed_24h bigint := 0;
  v_average_latency_ms numeric;
  v_success_rate_24h numeric;
  v_last_run jsonb := '{}'::jsonb;
  v_health_status text := 'idle';
  v_health_message text := 'Nenhum evento transacional foi registrado ainda.';
  v_events jsonb := '[]'::jsonb;
  v_recent_completed jsonb := '[]'::jsonb;
  v_runs jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_cache_tags jsonb := '[]'::jsonb;
  v_actions jsonb := '[]'::jsonb;
begin
  v_actor_role := private.assert_order_event_operator(p_actor_id);

  select
    count(*),
    count(*) filter (where e.delivery_status = 'ready'),
    count(*) filter (where e.delivery_status = 'failed'),
    count(*) filter (where e.delivery_status = 'processing'),
    count(*) filter (where e.delivery_status = 'completed'),
    count(*) filter (where e.delivery_status = 'dead_letter'),
    count(*) filter (
      where e.delivery_status in ('ready', 'failed')
        and e.available_at <= now()
        and e.delivery_attempts < e.max_delivery_attempts
    ),
    count(*) filter (
      where e.delivery_status = 'processing'
        and e.claimed_at < now() - interval '5 minutes'
    ),
    count(*) filter (where e.created_at >= now() - interval '24 hours'),
    count(*) filter (where e.delivered_at >= now() - interval '24 hours'),
    count(*) filter (
      where e.delivery_status = 'failed'
        and e.available_at >= now() - interval '24 hours'
    ),
    count(*) filter (where e.dead_lettered_at >= now() - interval '24 hours'),
    round(avg(extract(epoch from (e.delivered_at - e.created_at)) * 1000)
      filter (where e.delivered_at >= now() - interval '24 hours'))
  into
    v_total,
    v_ready,
    v_failed,
    v_processing,
    v_completed,
    v_dead_letter,
    v_deliverable,
    v_stale_processing,
    v_created_24h,
    v_completed_24h,
    v_failed_24h,
    v_dead_letter_24h,
    v_average_latency_ms
  from private.order_domain_events e;

  select
    coalesce(sum(r.claimed_count), 0),
    coalesce(sum(r.completed_count), 0)
  into v_claimed_24h, v_run_completed_24h
  from private.order_event_worker_runs r
  where r.started_at >= now() - interval '24 hours';

  v_success_rate_24h := case
    when v_claimed_24h = 0 then null
    else round((v_run_completed_24h::numeric / v_claimed_24h::numeric) * 100, 1)
  end;

  select jsonb_build_object(
    'id', r.id,
    'source', r.source,
    'status', r.status,
    'claimedCount', r.claimed_count,
    'completedCount', r.completed_count,
    'failedCount', r.failed_count,
    'deadLetterCount', r.dead_letter_count,
    'durationMs', nullif(r.metadata ->> 'durationMs', '')::numeric,
    'startedAt', r.started_at,
    'completedAt', r.completed_at
  )
  into v_last_run
  from private.order_event_worker_runs r
  order by r.started_at desc
  limit 1;

  v_last_run := coalesce(v_last_run, '{}'::jsonb);

  begin
    select exists (
      select 1
      from cron.job j
      where j.jobname = 'doke-order-event-worker'
        and j.active
    ) into v_cron_active;

    select d.status, d.start_time
      into v_cron_last_status, v_cron_last_run_at
      from cron.job_run_details d
      join cron.job j on j.jobid = d.jobid
     where j.jobname = 'doke-order-event-worker'
     order by d.start_time desc
     limit 1;
  exception when undefined_table or invalid_schema_name or insufficient_privilege then
    v_cron_active := false;
    v_cron_last_status := null;
    v_cron_last_run_at := null;
  end;

  if v_dead_letter > 0 or v_stale_processing > 0 then
    v_health_status := 'critical';
    v_health_message := case
      when v_dead_letter > 0 and v_stale_processing > 0 then
        'Há eventos em dead-letter e claims de processamento possivelmente travados.'
      when v_dead_letter > 0 then
        'Há eventos em dead-letter aguardando análise operacional.'
      else
        'Há eventos em processamento há mais de cinco minutos.'
    end;
  elsif v_failed > 0 or coalesce(v_last_run ->> 'status', '') in ('partial', 'failed') then
    v_health_status := 'degraded';
    v_health_message := 'O worker está ativo, mas existem eventos aguardando nova tentativa ou uma execução recente incompleta.';
  elsif not v_cron_active then
    v_health_status := 'critical';
    v_health_message := 'O agendamento automático do worker não está ativo.';
  elsif v_total = 0 then
    v_health_status := 'idle';
    v_health_message := 'O worker está preparado e a fila ainda não recebeu eventos.';
  elsif v_deliverable > 0 or v_processing > 0 then
    v_health_status := 'working';
    v_health_message := 'O worker está processando ou possui eventos prontos para entrega.';
  else
    v_health_status := 'healthy';
    v_health_message := 'Fila saudável, sem retries vencidos ou dead-letters.';
  end if;

  select coalesce(jsonb_agg(item order by item ->> 'sortKey'), '[]'::jsonb)
  into v_events
  from (
    select jsonb_build_object(
      'sortKey', lpad(case e.delivery_status
        when 'dead_letter' then '1'
        when 'failed' then '2'
        when 'processing' then '3'
        else '4'
      end, 2, '0') || ':' || to_char(e.created_at, 'YYYYMMDDHH24MISSUS'),
      'eventKey', e.event_key,
      'eventType', e.event_type,
      'orderId', e.order_id,
      'orderExternalId', o.external_id,
      'orderStatus', o.status,
      'deliveryStatus', e.delivery_status,
      'deliveryAttempts', e.delivery_attempts,
      'maxDeliveryAttempts', e.max_delivery_attempts,
      'lastErrorCode', e.last_error_code,
      'availableAt', e.available_at,
      'claimedAt', e.claimed_at,
      'deadLetteredAt', e.dead_lettered_at,
      'createdAt', e.created_at,
      'manualRequeueCount', e.manual_requeue_count,
      'lastRequeuedAt', e.last_requeued_at,
      'cacheTagCount', coalesce(array_length(e.cache_tags, 1), 0)
    ) as item
    from private.order_domain_events e
    join public.orders o on o.id = e.order_id
    where e.delivery_status in ('ready', 'failed', 'processing', 'dead_letter')
    order by case e.delivery_status
      when 'dead_letter' then 1
      when 'failed' then 2
      when 'processing' then 3
      else 4
    end, e.created_at asc
    limit v_event_limit
  ) queue_rows;

  select coalesce(jsonb_agg(item order by item ->> 'deliveredAt' desc), '[]'::jsonb)
  into v_recent_completed
  from (
    select jsonb_build_object(
      'eventKey', e.event_key,
      'eventType', e.event_type,
      'orderExternalId', o.external_id,
      'deliveryAttempts', e.delivery_attempts,
      'createdAt', e.created_at,
      'deliveredAt', e.delivered_at,
      'latencyMs', round(extract(epoch from (e.delivered_at - e.created_at)) * 1000)
    ) as item
    from private.order_domain_events e
    join public.orders o on o.id = e.order_id
    where e.delivery_status = 'completed'
    order by e.delivered_at desc nulls last
    limit 12
  ) completed_rows;

  select coalesce(jsonb_agg(item order by item ->> 'startedAt' desc), '[]'::jsonb)
  into v_runs
  from (
    select jsonb_build_object(
      'id', r.id,
      'source', r.source,
      'status', r.status,
      'claimedCount', r.claimed_count,
      'completedCount', r.completed_count,
      'failedCount', r.failed_count,
      'deadLetterCount', r.dead_letter_count,
      'durationMs', nullif(r.metadata ->> 'durationMs', '')::numeric,
      'startedAt', r.started_at,
      'completedAt', r.completed_at
    ) as item
    from private.order_event_worker_runs r
    order by r.started_at desc
    limit v_run_limit
  ) run_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'code', grouped.error_code,
    'count', grouped.total,
    'lastSeenAt', grouped.last_seen_at
  ) order by grouped.total desc, grouped.last_seen_at desc), '[]'::jsonb)
  into v_errors
  from (
    select coalesce(e.last_error_code, 'DOKE_ORDER_EVENT_UNKNOWN') as error_code,
           count(*) as total,
           max(coalesce(e.dead_lettered_at, e.available_at, e.created_at)) as last_seen_at
    from private.order_domain_events e
    where e.delivery_status in ('failed', 'dead_letter')
    group by coalesce(e.last_error_code, 'DOKE_ORDER_EVENT_UNKNOWN')
    limit 12
  ) grouped;

  select coalesce(jsonb_agg(jsonb_build_object(
    'cacheTag', c.cache_tag,
    'version', c.version,
    'lastEventKey', c.last_event_key,
    'updatedAt', c.updated_at
  ) order by c.updated_at desc), '[]'::jsonb)
  into v_cache_tags
  from (
    select *
    from private.cache_tag_versions
    order by updated_at desc
    limit 12
  ) c;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'eventKey', a.event_key,
    'action', a.action,
    'actorRole', a.actor_role,
    'previousStatus', a.previous_status,
    'previousErrorCode', a.previous_error_code,
    'note', a.note,
    'createdAt', a.created_at
  ) order by a.created_at desc), '[]'::jsonb)
  into v_actions
  from (
    select *
    from private.order_event_operator_actions
    order by created_at desc
    limit 15
  ) a;

  return jsonb_build_object(
    'generatedAt', now(),
    'actorRole', v_actor_role,
    'health', jsonb_build_object(
      'status', v_health_status,
      'message', v_health_message,
      'cronActive', v_cron_active,
      'cronLastStatus', v_cron_last_status,
      'cronLastRunAt', v_cron_last_run_at,
      'lastRun', v_last_run
    ),
    'summary', jsonb_build_object(
      'total', v_total,
      'ready', v_ready,
      'failed', v_failed,
      'processing', v_processing,
      'completed', v_completed,
      'deadLetter', v_dead_letter,
      'deliverable', v_deliverable,
      'staleProcessing', v_stale_processing,
      'created24h', v_created_24h,
      'completed24h', v_completed_24h,
      'failed24h', v_failed_24h,
      'deadLetter24h', v_dead_letter_24h,
      'successRate24h', v_success_rate_24h,
      'averageLatencyMs24h', v_average_latency_ms
    ),
    'events', v_events,
    'recentCompleted', v_recent_completed,
    'runs', v_runs,
    'errors', v_errors,
    'cacheTags', v_cache_tags,
    'operatorActions', v_actions
  );
end;
$$;

create or replace function public.requeue_order_domain_event_internal(
  p_actor_id uuid,
  p_event_key text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor_role text;
  v_event private.order_domain_events;
  v_note text := nullif(left(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), 500), '');
  v_request_id bigint;
  v_next_max_attempts integer;
begin
  v_actor_role := private.assert_order_event_operator(p_actor_id);

  if nullif(trim(coalesce(p_event_key, '')), '') is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_EVENT_KEY_REQUIRED';
  end if;

  if v_note is null or length(v_note) < 10 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_EVENT_REQUEUE_NOTE_REQUIRED';
  end if;

  select * into v_event
  from private.order_domain_events
  where event_key = trim(p_event_key)
  for update;

  if v_event.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_EVENT_NOT_FOUND';
  end if;

  if v_event.delivery_status not in ('failed', 'dead_letter') then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED';
  end if;

  if v_event.delivery_attempts >= 20 then
    raise exception using errcode = '54000', message = 'DOKE_ORDER_EVENT_ATTEMPT_LIMIT_REACHED';
  end if;

  v_next_max_attempts := case
    when v_event.delivery_attempts >= v_event.max_delivery_attempts
      then least(20, v_event.delivery_attempts + 1)
    else v_event.max_delivery_attempts
  end;

  update private.order_domain_events
     set delivery_status = 'ready',
         available_at = now(),
         claimed_at = null,
         dead_lettered_at = null,
         last_error_code = null,
         max_delivery_attempts = v_next_max_attempts,
         manual_requeue_count = manual_requeue_count + 1,
         last_requeued_at = now(),
         last_requeued_by = p_actor_id,
         delivery_result = delivery_result || jsonb_build_object(
           'manualRequeue', jsonb_build_object(
             'actorId', p_actor_id,
             'actorRole', v_actor_role,
             'note', v_note,
             'requeuedAt', now()
           )
         )
   where id = v_event.id;

  insert into private.order_event_operator_actions(
    order_event_id,
    event_key,
    actor_id,
    actor_role,
    action,
    previous_status,
    previous_error_code,
    note,
    metadata
  ) values (
    v_event.id,
    v_event.event_key,
    p_actor_id,
    v_actor_role,
    'requeue',
    v_event.delivery_status,
    v_event.last_error_code,
    v_note,
    jsonb_build_object(
      'deliveryAttempts', v_event.delivery_attempts,
      'previousMaxDeliveryAttempts', v_event.max_delivery_attempts,
      'nextMaxDeliveryAttempts', v_next_max_attempts
    )
  );

  begin
    v_request_id := private.invoke_order_event_worker_if_needed();
  exception when others then
    v_request_id := null;
  end;

  return jsonb_build_object(
    'eventKey', v_event.event_key,
    'deliveryStatus', 'ready',
    'manualRequeueCount', v_event.manual_requeue_count + 1,
    'maxDeliveryAttempts', v_next_max_attempts,
    'workerRequested', v_request_id is not null,
    'requestId', v_request_id
  );
end;
$$;

create or replace function public.run_order_event_worker_now_internal(
  p_actor_id uuid,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_actor_role text;
  v_request_id bigint;
  v_note text := nullif(left(regexp_replace(trim(coalesce(p_note, '')), '\s+', ' ', 'g'), 500), '');
begin
  v_actor_role := private.assert_order_event_operator(p_actor_id);
  v_request_id := private.invoke_order_event_worker_if_needed();

  insert into private.order_event_operator_actions(
    actor_id,
    actor_role,
    action,
    note,
    metadata
  ) values (
    p_actor_id,
    v_actor_role,
    'run_now',
    v_note,
    jsonb_build_object('requestId', v_request_id)
  );

  return jsonb_build_object(
    'requested', v_request_id is not null,
    'requestId', v_request_id
  );
end;
$$;

revoke all on function private.assert_order_event_operator(uuid) from public, anon, authenticated;
grant execute on function private.assert_order_event_operator(uuid) to service_role;
revoke all on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.requeue_order_domain_event_internal(uuid, text, text) from public, anon, authenticated;
revoke all on function public.run_order_event_worker_now_internal(uuid, text) from public, anon, authenticated;

grant execute on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) to service_role;
grant execute on function public.requeue_order_domain_event_internal(uuid, text, text) to service_role;
grant execute on function public.run_order_event_worker_now_internal(uuid, text) to service_role;

comment on table private.order_event_operator_actions is
  'Audit trail for support/admin requeues and manual worker wake-ups.';
comment on function public.get_order_event_operations_dashboard_internal(uuid, integer, integer) is
  'Service-role-only operational projection for an independently authenticated support/admin actor.';
comment on function public.requeue_order_domain_event_internal(uuid, text, text) is
  'Service-role-only controlled requeue with actor validation, audit and immediate best-effort worker wake-up.';
comment on function public.run_order_event_worker_now_internal(uuid, text) is
  'Service-role-only best-effort worker wake-up for an active support/admin actor.';
