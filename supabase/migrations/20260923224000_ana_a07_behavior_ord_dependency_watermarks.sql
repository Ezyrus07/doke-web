-- ANA-A07 behavior + ORD dependency watermarks.
-- Repository candidate only. Applying this migration requires separate staging authorization.
-- This migration creates functions/grants only; it does not mutate source facts, snapshots, policies or schedulers.

create or replace function private.analytics_transaction_floor_watermark_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_observed_at timestamptz;
  v_earliest_active_xact_start timestamptz;
  v_active_transaction_count bigint := 0;
  v_prepared_transaction_count bigint := 0;
  v_data_through timestamptz;
begin
  perform pg_catalog.pg_stat_clear_snapshot();
  v_observed_at := pg_catalog.clock_timestamp();

  -- Active transactions are sampled before prepared transactions.
  -- A transaction moving to PREPARED during sampling is therefore protected
  -- either by this active floor or by the prepared-xact fail-closed check below.
  select count(*)::bigint, min(a.xact_start)
    into v_active_transaction_count, v_earliest_active_xact_start
  from pg_catalog.pg_stat_activity a
  where a.datname = pg_catalog.current_database()
    and a.pid <> pg_catalog.pg_backend_pid()
    and a.xact_start is not null;

  select count(*)::bigint
    into v_prepared_transaction_count
  from pg_catalog.pg_prepared_xacts p
  where p.database = pg_catalog.current_database();

  if v_prepared_transaction_count > 0 then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a07-transaction-floor-watermark-v1',
      'basis','active_transaction_floor_v1',
      'freshnessState','unavailable',
      'reason','PREPARED_TRANSACTION_PRESENT',
      'dataThrough',null,
      'observedAt',v_observed_at,
      'activeTransactionCount',v_active_transaction_count,
      'earliestActiveXactStart',v_earliest_active_xact_start,
      'preparedTransactionCount',v_prepared_transaction_count
    );
  end if;

  v_data_through := case
    when v_earliest_active_xact_start is null then v_observed_at
    else pg_catalog.least(
      v_observed_at,
      v_earliest_active_xact_start - interval '1 microsecond'
    )
  end;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-transaction-floor-watermark-v1',
    'basis','active_transaction_floor_v1',
    'freshnessState','fresh',
    'reason',case when v_earliest_active_xact_start is null
      then 'NO_ACTIVE_TRANSACTION' else 'ACTIVE_TRANSACTION_FLOOR' end,
    'dataThrough',v_data_through,
    'observedAt',v_observed_at,
    'activeTransactionCount',v_active_transaction_count,
    'earliestActiveXactStart',v_earliest_active_xact_start,
    'preparedTransactionCount',v_prepared_transaction_count
  );
end;
$function$;

alter function private.analytics_transaction_floor_watermark_v1() owner to postgres;
revoke all on function private.analytics_transaction_floor_watermark_v1()
  from public, anon, authenticated, service_role;

create or replace function private.analytics_behavior_watermark_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_floor jsonb;
begin
  if pg_catalog.to_regclass('private.analytics_behavior_events_v1') is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a07-behavior-watermark-v1',
      'sourceDomain','ANA-001',
      'sourceRelation','private.analytics_behavior_events_v1',
      'materializationTime','received_at',
      'eventTime','occurred_at',
      'basis','active_transaction_floor_v1',
      'freshnessState','unavailable',
      'reason','SOURCE_RELATION_MISSING',
      'dataThrough',null
    );
  end if;

  v_floor := private.analytics_transaction_floor_watermark_v1();

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-behavior-watermark-v1',
    'sourceDomain','ANA-001',
    'sourceRelation','private.analytics_behavior_events_v1',
    'materializationTime','received_at',
    'eventTime','occurred_at',
    'basis','active_transaction_floor_v1',
    'freshnessState',v_floor ->> 'freshnessState',
    'reason',v_floor ->> 'reason',
    'dataThrough',v_floor -> 'dataThrough',
    'observedAt',v_floor -> 'observedAt',
    'activeTransactionCount',v_floor -> 'activeTransactionCount',
    'earliestActiveXactStart',v_floor -> 'earliestActiveXactStart',
    'preparedTransactionCount',v_floor -> 'preparedTransactionCount'
  );
end;
$function$;

alter function private.analytics_behavior_watermark_v1() owner to postgres;
revoke all on function private.analytics_behavior_watermark_v1()
  from public, anon, authenticated, service_role;
grant execute on function private.analytics_behavior_watermark_v1() to service_role;

create or replace function private.order_metric_watermark_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_floor jsonb;
begin
  if pg_catalog.to_regclass('private.order_metric_events') is null then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a07-order-metric-watermark-v1',
      'sourceDomain','ORD-001',
      'sourceRelation','private.order_metric_events',
      'materializationTime','created_at',
      'eventTime','occurred_at',
      'basis','active_transaction_floor_v1',
      'freshnessState','unavailable',
      'reason','SOURCE_RELATION_MISSING',
      'dataThrough',null
    );
  end if;

  v_floor := private.analytics_transaction_floor_watermark_v1();

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-order-metric-watermark-v1',
    'sourceDomain','ORD-001',
    'sourceRelation','private.order_metric_events',
    'materializationTime','created_at',
    'eventTime','occurred_at',
    'basis','active_transaction_floor_v1',
    'freshnessState',v_floor ->> 'freshnessState',
    'reason',v_floor ->> 'reason',
    'dataThrough',v_floor -> 'dataThrough',
    'observedAt',v_floor -> 'observedAt',
    'activeTransactionCount',v_floor -> 'activeTransactionCount',
    'earliestActiveXactStart',v_floor -> 'earliestActiveXactStart',
    'preparedTransactionCount',v_floor -> 'preparedTransactionCount'
  );
end;
$function$;

alter function private.order_metric_watermark_v1() owner to postgres;
revoke all on function private.order_metric_watermark_v1()
  from public, anon, authenticated, service_role;
grant execute on function private.order_metric_watermark_v1() to service_role;

comment on function private.analytics_transaction_floor_watermark_v1() is
  'ANA-A07 conservative current-database materialization floor; prepared transactions fail closed.';
comment on function private.analytics_behavior_watermark_v1() is
  'ANA-A07 behavior watermark: received_at materialization time; occurred_at canonical event time.';
comment on function private.order_metric_watermark_v1() is
  'ANA-A07 ORD metric watermark: created_at materialization time; occurred_at canonical event time.';
