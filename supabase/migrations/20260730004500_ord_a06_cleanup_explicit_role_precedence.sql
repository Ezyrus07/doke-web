begin;

create or replace function public.cleanup_order_canary_run(p_run_id text)
returns jsonb
language plpgsql
security definer
set search_path = public, private, auth, pg_temp
as $$
declare
  v_run_id text := lower(trim(coalesce(p_run_id, '')));
  v_jwt_role text := lower(coalesce(nullif(trim(current_setting('request.jwt.claim.role', true)), ''), ''));
  v_candidate_count integer := 0;
  v_target_count integer := 0;
  v_order public.orders;
  v_forbidden jsonb := '{}'::jsonb;
  v_budget_count integer := 0;
  v_history_count integer := 0;
  v_notification_count integer := 0;
  v_event_count integer := 0;
  v_metric_count integer := 0;
  v_attempt_count integer := 0;
  v_idempotency_count integer := 0;
  v_deleted_order_count integer := 0;
begin
  -- Explicit JWT identity always wins. The administrative session fallback is
  -- available only when no request role was supplied.
  if v_jwt_role <> '' then
    if v_jwt_role <> 'service_role' then
      raise exception using
        errcode = '42501',
        message = 'DOKE_ORDER_CANARY_CLEANUP_SERVICE_ROLE_REQUIRED';
    end if;
  elsif session_user not in ('postgres', 'supabase_admin', 'service_role') then
    raise exception using
      errcode = '42501',
      message = 'DOKE_ORDER_CANARY_CLEANUP_SERVICE_ROLE_REQUIRED';
  end if;

  if v_run_id !~ '^ord-a06-[a-z0-9][a-z0-9-]{5,80}$' then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_CANARY_RUN_ID_INVALID';
  end if;

  select count(*) into v_candidate_count
  from public.orders o
  where coalesce(o.metadata ->> 'canaryRunId', '') = v_run_id
     or coalesce(o.external_id, '') like v_run_id || ':%';

  select count(*) into v_target_count
  from public.orders o
  where o.metadata ->> 'canaryRunId' = v_run_id
    and o.metadata ->> 'canaryDomain' = 'ORD-001'
    and o.metadata ->> 'canarySublot' = 'ORD-A06'
    and o.metadata ->> 'canaryScope' = 'visual-settlement'
    and coalesce(o.external_id, '') like v_run_id || ':%';

  if v_candidate_count <> v_target_count then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_CANARY_MARKER_MISMATCH',
      detail = jsonb_build_object('runId', v_run_id, 'candidateCount', v_candidate_count, 'strictTargetCount', v_target_count)::text;
  end if;

  if v_target_count > 1 then
    raise exception using
      errcode = '21000',
      message = 'DOKE_ORDER_CANARY_SCOPE_AMBIGUOUS',
      detail = jsonb_build_object('runId', v_run_id, 'targetCount', v_target_count)::text;
  end if;

  if exists (
    select 1 from public.api_idempotency_keys k
    where k.idempotency_key like v_run_id || ':%'
      and k.entity_type <> 'order'
  ) then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_CANARY_IDEMPOTENCY_SCOPE_CONFLICT';
  end if;

  if v_target_count = 0 then
    delete from public.api_idempotency_keys k
    where k.entity_type = 'order'
      and k.idempotency_key like v_run_id || ':%';
    get diagnostics v_idempotency_count = row_count;
    return jsonb_build_object(
      'status', 'already_clean',
      'runId', v_run_id,
      'orderId', null,
      'deleted', jsonb_build_object(
        'orders', 0,
        'budgets', 0,
        'history', 0,
        'notifications', 0,
        'events', 0,
        'metrics', 0,
        'deliveryAttempts', 0,
        'idempotencyKeys', v_idempotency_count
      )
    );
  end if;

  select * into strict v_order
  from public.orders o
  where o.metadata ->> 'canaryRunId' = v_run_id
    and o.metadata ->> 'canaryDomain' = 'ORD-001'
    and o.metadata ->> 'canarySublot' = 'ORD-A06'
    and o.metadata ->> 'canaryScope' = 'visual-settlement'
    and coalesce(o.external_id, '') like v_run_id || ':%'
  for update;

  if lower(coalesce(v_order.status, '')) not in ('requested', 'accepted', 'quoted') then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_CANARY_STATE_OUT_OF_SCOPE',
      detail = jsonb_build_object('runId', v_run_id, 'orderId', v_order.id, 'status', v_order.status)::text;
  end if;

  if exists (
    select 1 from public.api_idempotency_keys k
    where k.entity_type = 'order'
      and k.entity_id = v_order.id
      and k.idempotency_key not like v_run_id || ':%'
  ) then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_CANARY_UNSCOPED_IDEMPOTENCY_FOUND';
  end if;

  if exists (
    select 1 from public.api_idempotency_keys k
    where k.idempotency_key like v_run_id || ':%'
      and k.entity_id is not null
      and k.entity_id <> v_order.id
  ) then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_CANARY_IDEMPOTENCY_ENTITY_CONFLICT';
  end if;

  select jsonb_build_object(
    'conversations', (select count(*) from public.conversations x where x.order_id = v_order.id),
    'payments', (select count(*) from public.payments x where x.order_id = v_order.id),
    'paymentDisputes', (select count(*) from public.payment_disputes x where x.order_id = v_order.id),
    'transactions', (select count(*) from public.transactions x where x.order_id = v_order.id),
    'receipts', (select count(*) from public.receipts x where x.order_id = v_order.id),
    'walletReceivables', (select count(*) from public.wallet_receivables x where x.order_id = v_order.id),
    'reviews', (select count(*) from public.reviews x where x.order_id = v_order.id),
    'quoteFunnelEvents', (select count(*) from public.quote_template_funnel_events x where x.order_id = v_order.id),
    'quoteFunnelSessions', (select count(*) from public.quote_template_funnel_sessions x where x.order_id = v_order.id),
    'operatorActions', (
      select count(*)
      from private.order_event_operator_actions x
      join private.order_domain_events e on e.id = x.order_event_id
      where e.order_id = v_order.id
    )
  ) into v_forbidden;

  if exists (select 1 from jsonb_each_text(v_forbidden) item where item.value::integer > 0) then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_CANARY_OUT_OF_SCOPE_DEPENDENCY',
      detail = jsonb_build_object('runId', v_run_id, 'orderId', v_order.id, 'dependencies', v_forbidden)::text;
  end if;

  select count(*) into v_budget_count from public.budgets x where x.order_id = v_order.id;
  select count(*) into v_history_count from public.order_status_history x where x.order_id = v_order.id;
  select count(*) into v_notification_count from public.notifications x where x.order_id = v_order.id;
  select count(*) into v_event_count from private.order_domain_events x where x.order_id = v_order.id;
  select count(*) into v_metric_count from private.order_metric_events x where x.order_id = v_order.id;
  select count(*) into v_attempt_count
  from private.order_event_delivery_attempts x
  join private.order_domain_events e on e.id = x.order_event_id
  where e.order_id = v_order.id;
  select count(*) into v_idempotency_count
  from public.api_idempotency_keys x
  where x.entity_type = 'order'
    and x.idempotency_key like v_run_id || ':%';

  delete from private.order_event_delivery_attempts x
  using private.order_domain_events e
  where x.order_event_id = e.id
    and e.order_id = v_order.id;
  delete from private.order_metric_events x
  where x.order_id = v_order.id
     or x.order_event_id in (select e.id from private.order_domain_events e where e.order_id = v_order.id);
  delete from private.order_domain_events x where x.order_id = v_order.id;
  delete from public.budgets x where x.order_id = v_order.id;
  delete from public.order_status_history x where x.order_id = v_order.id;
  delete from public.notifications x where x.order_id = v_order.id;
  delete from public.api_idempotency_keys x
  where x.entity_type = 'order'
    and x.idempotency_key like v_run_id || ':%';

  delete from public.orders x where x.id = v_order.id;
  get diagnostics v_deleted_order_count = row_count;
  if v_deleted_order_count <> 1 then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_CANARY_DELETE_FAILED';
  end if;

  if exists (select 1 from public.orders x where x.id = v_order.id)
     or exists (select 1 from public.budgets x where x.order_id = v_order.id)
     or exists (select 1 from public.order_status_history x where x.order_id = v_order.id)
     or exists (select 1 from public.notifications x where x.order_id = v_order.id)
     or exists (select 1 from private.order_domain_events x where x.order_id = v_order.id)
     or exists (select 1 from private.order_metric_events x where x.order_id = v_order.id)
     or exists (select 1 from public.api_idempotency_keys x where x.entity_type = 'order' and x.idempotency_key like v_run_id || ':%') then
    raise exception using errcode = '23514', message = 'DOKE_ORDER_CANARY_CLEANUP_RESIDUE';
  end if;

  return jsonb_build_object(
    'status', 'cleaned',
    'runId', v_run_id,
    'orderId', v_order.id,
    'deleted', jsonb_build_object(
      'orders', v_deleted_order_count,
      'budgets', v_budget_count,
      'history', v_history_count,
      'notifications', v_notification_count,
      'events', v_event_count,
      'metrics', v_metric_count,
      'deliveryAttempts', v_attempt_count,
      'idempotencyKeys', v_idempotency_count
    ),
    'outOfScopeDependencies', v_forbidden
  );
end;
$$;

revoke all on function public.cleanup_order_canary_run(text) from public, anon, authenticated;
grant execute on function public.cleanup_order_canary_run(text) to service_role;

comment on function public.cleanup_order_canary_run(text) is
  'ORD-A06 service-role-only cleanup boundary with explicit JWT role precedence for one doubly marked visual-settlement canary order.';

commit;
