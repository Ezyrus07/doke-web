-- SEC-001 / SEC-B09: durable abuse guard for authenticated Edge Function operations.

create table if not exists private.edge_function_rate_limit_buckets (
  function_name text not null,
  actor_id uuid not null,
  action_name text not null,
  window_started_at timestamptz not null,
  request_count integer not null,
  updated_at timestamptz not null default now(),
  constraint edge_function_rate_limit_buckets_pkey
    primary key (function_name, actor_id, action_name, window_started_at),
  constraint edge_function_rate_limit_buckets_function_name_check
    check (length(function_name) between 1 and 80),
  constraint edge_function_rate_limit_buckets_action_name_check
    check (length(action_name) between 1 and 80),
  constraint edge_function_rate_limit_buckets_request_count_check
    check (request_count > 0)
);

create index if not exists edge_function_rate_limit_buckets_updated_at_idx
  on private.edge_function_rate_limit_buckets (updated_at);

alter table private.edge_function_rate_limit_buckets enable row level security;

revoke all on table private.edge_function_rate_limit_buckets
  from public, anon, authenticated, service_role;

create or replace function public.consume_edge_function_rate_limit_internal(
  p_function_name text,
  p_actor_id uuid,
  p_action_name text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_function_name text := left(lower(trim(coalesce(p_function_name, ''))), 80);
  v_action_name text := left(lower(trim(coalesce(p_action_name, 'default'))), 80);
  v_limit integer := least(greatest(coalesce(p_limit, 60), 1), 1000);
  v_window_seconds integer := least(greatest(coalesce(p_window_seconds, 60), 1), 86400);
  v_window_started_at timestamptz;
  v_count integer;
  v_retry_after integer;
begin
  if p_actor_id is null then
    raise exception using errcode = '22023', message = 'DOKE_RATE_LIMIT_ACTOR_REQUIRED';
  end if;
  if v_function_name = '' then
    raise exception using errcode = '22023', message = 'DOKE_RATE_LIMIT_FUNCTION_REQUIRED';
  end if;
  if v_action_name = '' then
    v_action_name := 'default';
  end if;

  v_window_started_at := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );

  insert into private.edge_function_rate_limit_buckets as bucket (
    function_name,
    actor_id,
    action_name,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    v_function_name,
    p_actor_id,
    v_action_name,
    v_window_started_at,
    1,
    v_now
  )
  on conflict (function_name, actor_id, action_name, window_started_at)
  do update
    set request_count = bucket.request_count + 1,
        updated_at = excluded.updated_at
  returning request_count into v_count;

  delete from private.edge_function_rate_limit_buckets
  where updated_at < v_now - interval '2 days';

  v_retry_after := greatest(
    1,
    ceil(extract(epoch from (
      v_window_started_at + make_interval(secs => v_window_seconds) - v_now
    )))::integer
  );

  return jsonb_build_object(
    'allowed', v_count <= v_limit,
    'limit', v_limit,
    'remaining', greatest(v_limit - v_count, 0),
    'retryAfterSeconds', v_retry_after,
    'windowStartedAt', v_window_started_at,
    'count', v_count
  );
end;
$function$;

revoke all on function public.consume_edge_function_rate_limit_internal(
  text,
  uuid,
  text,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.consume_edge_function_rate_limit_internal(
  text,
  uuid,
  text,
  integer,
  integer
) to service_role;

comment on table private.edge_function_rate_limit_buckets is
  'Server-only fixed-window counters used by authenticated Edge Functions.';

comment on function public.consume_edge_function_rate_limit_internal(
  text,
  uuid,
  text,
  integer,
  integer
) is
  'Atomically consumes an authenticated Edge Function rate-limit bucket. Executable only by service_role.';
