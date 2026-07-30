-- Doke ORD-A07C: issue freshness headers for internal order-event worker invocations.
-- Repository-only migration. It must not be applied before ORD-A07B nonce ledger authorization.

create or replace function private.invoke_order_event_worker_if_needed()
returns bigint
language plpgsql
security definer
set search_path = private, public, vault, net, extensions, pg_temp
as $$
declare
  v_request_id bigint;
  v_project_url text;
  v_worker_token text;
  v_issued_at_ms text;
  v_nonce text;
begin
  perform private.recover_stale_order_event_claims(300);

  if not exists (
    select 1
    from private.order_domain_events e
    where e.delivery_status in ('ready', 'failed')
      and e.available_at <= now()
      and e.delivery_attempts < e.max_delivery_attempts
  ) then
    return null;
  end if;

  select decrypted_secret into v_project_url
  from vault.decrypted_secrets
  where name = 'doke_project_url'
  limit 1;

  select decrypted_secret into v_worker_token
  from vault.decrypted_secrets
  where name = 'doke_order_event_worker_token'
  limit 1;

  if nullif(v_project_url, '') is null or nullif(v_worker_token, '') is null then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_EVENT_WORKER_SECRET_MISSING';
  end if;

  v_issued_at_ms := floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text;
  v_nonce := translate(
    replace(encode(extensions.gen_random_bytes(24), 'base64'), '=', ''),
    '+/',
    '-_'
  );

  if v_issued_at_ms !~ '^\d{13}$' or v_nonce !~ '^[A-Za-z0-9_-]{32}$' then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_EVENT_WORKER_FRESHNESS_HEADER_GENERATION_FAILED';
  end if;

  select net.http_post(
    url := v_project_url || '/functions/v1/order-event-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-doke-worker-token', v_worker_token,
      'x-doke-worker-source', 'cron',
      'x-doke-worker-issued-at', v_issued_at_ms,
      'x-doke-worker-nonce', v_nonce
    ),
    body := jsonb_build_object('source', 'cron', 'limit', 25),
    timeout_milliseconds := 30000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function private.invoke_order_event_worker_if_needed()
  from public, anon, authenticated;

comment on function private.invoke_order_event_worker_if_needed() is
  'Cron entrypoint that emits token, source, issued-at and single-use nonce headers when deliverable order events exist.';
