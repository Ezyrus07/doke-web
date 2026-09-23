-- ANA-A07 behavior + ORD watermark compatibility migration.
-- Forward-only correction for staging validation failure in migration 20260923230106.
-- The original migration remains immutable. This migration only redefines the shared helper.

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
  v_active_predecessor timestamptz;
  v_data_through timestamptz;
begin
  perform pg_catalog.pg_stat_clear_snapshot();
  v_observed_at := pg_catalog.clock_timestamp();

  -- Preserve the certified active-before-prepared sampling order.
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

  if v_earliest_active_xact_start is null then
    v_data_through := v_observed_at;
  else
    v_active_predecessor := v_earliest_active_xact_start - interval '1 microsecond';

    -- LEAST is a PostgreSQL conditional expression, not a pg_catalog function.
    -- Use an explicit CASE so the helper has no pseudo-function qualification risk.
    v_data_through := case
      when v_observed_at <= v_active_predecessor then v_observed_at
      else v_active_predecessor
    end;
  end if;

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

comment on function private.analytics_transaction_floor_watermark_v1() is
  'ANA-A07 conservative current-database materialization floor. Forward-only compatibility definition removes invalid pg_catalog.least qualification while preserving active-before-prepared fail-closed semantics.';
