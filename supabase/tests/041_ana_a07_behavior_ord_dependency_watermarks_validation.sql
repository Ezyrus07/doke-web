-- ANA-A07 validation candidate for behavior + ORD dependency watermarks.
-- Run only after separately authorized staging migration application.
-- Read-only/rollback-only validation.
begin;

do $$
declare
  v_helper regprocedure;
  v_behavior regprocedure;
  v_order regprocedure;
  v_helper_def text;
  v_behavior_def text;
  v_order_def text;
  v_behavior_result jsonb;
  v_order_result jsonb;
begin
  v_helper := to_regprocedure('private.analytics_transaction_floor_watermark_v1()');
  v_behavior := to_regprocedure('private.analytics_behavior_watermark_v1()');
  v_order := to_regprocedure('private.order_metric_watermark_v1()');

  if v_helper is null or v_behavior is null or v_order is null then
    raise exception 'ANA-A07 watermark runtime functions missing';
  end if;

  select pg_get_functiondef(v_helper::oid) into v_helper_def;
  select pg_get_functiondef(v_behavior::oid) into v_behavior_def;
  select pg_get_functiondef(v_order::oid) into v_order_def;

  if position('pg_catalog.pg_stat_clear_snapshot()' in v_helper_def) = 0
     or position('pg_catalog.clock_timestamp()' in v_helper_def) = 0
     or position('pg_catalog.pg_stat_activity' in v_helper_def) = 0
     or position('a.datname = pg_catalog.current_database()' in v_helper_def) = 0
     or position('a.pid <> pg_catalog.pg_backend_pid()' in v_helper_def) = 0
     or position('a.xact_start is not null' in v_helper_def) = 0
     or position('pg_catalog.pg_prepared_xacts' in v_helper_def) = 0
     or position('PREPARED_TRANSACTION_PRESENT' in v_helper_def) = 0
     or position('1 microsecond' in v_helper_def) = 0 then
    raise exception 'ANA-A07 transaction-floor definition incomplete';
  end if;

  if position('pg_catalog.pg_stat_activity' in v_helper_def)
       >= position('pg_catalog.pg_prepared_xacts' in v_helper_def) then
    raise exception 'ANA-A07 race-safe active-before-prepared scan order lost';
  end if;

  if position('private.analytics_behavior_events_v1' in v_behavior_def) = 0
     or position('received_at' in v_behavior_def) = 0
     or position('occurred_at' in v_behavior_def) = 0 then
    raise exception 'ANA-A07 behavior wrapper definition incomplete';
  end if;

  if position('private.order_metric_events' in v_order_def) = 0
     or position('created_at' in v_order_def) = 0
     or position('occurred_at' in v_order_def) = 0 then
    raise exception 'ANA-A07 ORD wrapper definition incomplete';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_helper::oid)) <> 'postgres'
     or pg_get_userbyid((select proowner from pg_proc where oid=v_behavior::oid)) <> 'postgres'
     or pg_get_userbyid((select proowner from pg_proc where oid=v_order::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_helper::oid)
     or not (select prosecdef from pg_proc where oid=v_behavior::oid)
     or not (select prosecdef from pg_proc where oid=v_order::oid) then
    raise exception 'ANA-A07 owner/security-definer boundary invalid';
  end if;

  if has_function_privilege('anon',v_helper,'EXECUTE')
     or has_function_privilege('authenticated',v_helper,'EXECUTE')
     or has_function_privilege('service_role',v_helper,'EXECUTE')
     or has_function_privilege('anon',v_behavior,'EXECUTE')
     or has_function_privilege('authenticated',v_behavior,'EXECUTE')
     or not has_function_privilege('service_role',v_behavior,'EXECUTE')
     or has_function_privilege('anon',v_order,'EXECUTE')
     or has_function_privilege('authenticated',v_order,'EXECUTE')
     or not has_function_privilege('service_role',v_order,'EXECUTE') then
    raise exception 'ANA-A07 watermark grants escaped server-only boundary';
  end if;

  v_behavior_result := private.analytics_behavior_watermark_v1();
  v_order_result := private.order_metric_watermark_v1();

  if (v_behavior_result ->> 'contractId') is distinct from 'ana-a07-behavior-watermark-v1'
     or (v_behavior_result ->> 'materializationTime') is distinct from 'received_at'
     or (v_behavior_result ->> 'eventTime') is distinct from 'occurred_at'
     or (v_behavior_result ->> 'basis') is distinct from 'active_transaction_floor_v1'
     or (v_behavior_result ->> 'freshnessState') not in ('fresh','unavailable') then
    raise exception 'ANA-A07 behavior watermark result invalid';
  end if;

  if (v_order_result ->> 'contractId') is distinct from 'ana-a07-order-metric-watermark-v1'
     or (v_order_result ->> 'materializationTime') is distinct from 'created_at'
     or (v_order_result ->> 'eventTime') is distinct from 'occurred_at'
     or (v_order_result ->> 'basis') is distinct from 'active_transaction_floor_v1'
     or (v_order_result ->> 'freshnessState') not in ('fresh','unavailable') then
    raise exception 'ANA-A07 ORD watermark result invalid';
  end if;

  if (v_behavior_result ->> 'freshnessState') = 'fresh'
     and ((v_behavior_result ->> 'dataThrough') is null
       or (v_behavior_result ->> 'dataThrough')::timestamptz > clock_timestamp()) then
    raise exception 'ANA-A07 behavior watermark overclaims the observation clock';
  end if;

  if (v_order_result ->> 'freshnessState') = 'fresh'
     and ((v_order_result ->> 'dataThrough') is null
       or (v_order_result ->> 'dataThrough')::timestamptz > clock_timestamp()) then
    raise exception 'ANA-A07 ORD watermark overclaims the observation clock';
  end if;
end;
$$;

rollback;
