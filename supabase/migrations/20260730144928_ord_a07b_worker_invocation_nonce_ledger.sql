-- Doke ORD-A07B: single-use freshness nonces for internal order-event worker invocations.
-- Generated through Supabase CLI. Repository-only migration; not applied by this workflow.

create table if not exists private.order_event_worker_invocation_nonces (
  nonce_hash bytea primary key,
  issued_at timestamptz not null,
  source text not null default 'manual'
    check (source in ('cron', 'manual', 'test', 'recovery')),
  consumed_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  constraint order_event_worker_invocation_nonce_expiry_check
    check (expires_at > issued_at)
);

alter table private.order_event_worker_invocation_nonces enable row level security;

create index if not exists idx_order_event_worker_invocation_nonces_expires_at
  on private.order_event_worker_invocation_nonces(expires_at);

revoke all on private.order_event_worker_invocation_nonces from public, anon, authenticated;
grant usage on schema private to service_role;
grant usage on schema extensions to service_role;
grant select, insert, delete on private.order_event_worker_invocation_nonces to service_role;

create or replace function public.consume_order_event_worker_invocation_nonce(
  p_nonce text,
  p_issued_at timestamptz,
  p_source text default 'manual'
)
returns boolean
language plpgsql
security invoker
set search_path = private, public, extensions, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_source text := lower(trim(coalesce(p_source, 'manual')));
  v_inserted integer := 0;
begin
  if p_nonce is null
    or p_nonce !~ '^[A-Za-z0-9_-]{24,128}$'
    or p_issued_at is null
    or p_issued_at < v_now - interval '5 minutes'
    or p_issued_at > v_now + interval '30 seconds'
  then
    return false;
  end if;

  if v_source not in ('cron', 'manual', 'test', 'recovery') then
    v_source := 'manual';
  end if;

  delete from private.order_event_worker_invocation_nonces
   where expires_at < v_now - interval '1 hour';

  insert into private.order_event_worker_invocation_nonces(
    nonce_hash,
    issued_at,
    source,
    consumed_at,
    expires_at
  )
  values (
    extensions.digest(p_nonce, 'sha256'),
    p_issued_at,
    v_source,
    v_now,
    p_issued_at + interval '5 minutes'
  )
  on conflict (nonce_hash) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted = 1;
end;
$$;

revoke all on function public.consume_order_event_worker_invocation_nonce(text, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.consume_order_event_worker_invocation_nonce(text, timestamptz, text)
  to service_role;

comment on table private.order_event_worker_invocation_nonces is
  'Atomic single-use nonce ledger for freshness-protected internal order-event worker invocations.';
comment on function public.consume_order_event_worker_invocation_nonce(text, timestamptz, text) is
  'Consumes one URL-safe worker nonce exactly once when its timestamp is within the accepted freshness window.';
