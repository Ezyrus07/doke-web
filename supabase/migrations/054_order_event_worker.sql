-- Doke: observable server-side consumer for transactional order events.
-- Adds worker runs, delivery attempts, cache-tag versions, dead-letter handling,
-- stale-claim recovery and a guarded cron wake-up for the Edge Function.

create extension if not exists pgcrypto
with schema extensions;

create extension if not exists pg_net
with schema extensions;

create extension if not exists pg_cron;

create table if not exists private.order_event_worker_credentials (
  singleton boolean primary key default true check (singleton),
  token_hash bytea not null,
  created_at timestamptz not null default now(),
  rotated_at timestamptz not null default now()
);

create table if not exists private.order_event_worker_runs (
  id uuid primary key default gen_random_uuid(),
  invocation_id text not null unique,
  source text not null default 'manual' check (source in ('cron', 'manual', 'test', 'recovery')),
  status text not null default 'running' check (status in ('running', 'completed', 'partial', 'failed')),
  claimed_count integer not null default 0 check (claimed_count >= 0),
  completed_count integer not null default 0 check (completed_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  dead_letter_count integer not null default 0 check (dead_letter_count >= 0),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_order_event_worker_runs_started
  on private.order_event_worker_runs(started_at desc);

create table if not exists private.order_event_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  worker_run_id uuid references private.order_event_worker_runs(id) on delete set null,
  order_event_id uuid not null references private.order_domain_events(id) on delete cascade,
  event_key text not null,
  attempt_no integer not null check (attempt_no > 0),
  status text not null default 'processing' check (status in ('processing', 'completed', 'failed', 'dead_letter')),
  error_code text,
  result jsonb not null default '{}'::jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (order_event_id, attempt_no)
);

create index if not exists idx_order_event_delivery_attempts_run
  on private.order_event_delivery_attempts(worker_run_id, started_at desc)
  where worker_run_id is not null;

create index if not exists idx_order_event_delivery_attempts_event
  on private.order_event_delivery_attempts(order_event_id, attempt_no desc);

create table if not exists private.cache_tag_versions (
  cache_tag text primary key,
  version bigint not null default 0 check (version >= 0),
  last_event_key text,
  updated_at timestamptz not null default now()
);

revoke all on private.order_event_worker_credentials from public, anon, authenticated;
revoke all on private.order_event_worker_runs from public, anon, authenticated;
revoke all on private.order_event_delivery_attempts from public, anon, authenticated;
revoke all on private.cache_tag_versions from public, anon, authenticated;

grant select on private.order_event_worker_runs to service_role;
grant select on private.order_event_delivery_attempts to service_role;
grant select on private.cache_tag_versions to service_role;

alter table private.order_domain_events
  add column if not exists max_delivery_attempts integer not null default 5
    check (max_delivery_attempts between 1 and 20),
  add column if not exists dead_lettered_at timestamptz,
  add column if not exists last_worker_run_id uuid references private.order_event_worker_runs(id) on delete set null,
  add column if not exists delivery_result jsonb not null default '{}'::jsonb;

alter table private.order_domain_events
  drop constraint if exists order_domain_events_delivery_status_check;

alter table private.order_domain_events
  add constraint order_domain_events_delivery_status_check
  check (delivery_status in ('ready', 'processing', 'completed', 'failed', 'dead_letter'));

drop index if exists private.idx_order_domain_events_delivery;
create index idx_order_domain_events_delivery
  on private.order_domain_events(delivery_status, available_at, created_at)
  where delivery_status in ('ready', 'failed');

-- Generate the worker token inside Postgres and keep the plaintext only in Vault.
do $$
declare
  v_token text;
  v_existing_secret_id uuid;
begin
  select id into v_existing_secret_id
  from vault.secrets
  where name = 'doke_order_event_worker_token'
  limit 1;

  if v_existing_secret_id is null then
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    perform vault.create_secret(
      v_token,
      'doke_order_event_worker_token',
      'Internal token used only by Supabase Cron to invoke the Doke order event worker.'
    );
  else
    select decrypted_secret into v_token
    from vault.decrypted_secrets
    where name = 'doke_order_event_worker_token'
    limit 1;
  end if;

  insert into private.order_event_worker_credentials(singleton, token_hash, rotated_at)
  values (true, extensions.digest(v_token, 'sha256'), now())
  on conflict (singleton) do update
    set token_hash = excluded.token_hash,
        rotated_at = excluded.rotated_at;

  if not exists (
    select 1 from vault.secrets where name = 'doke_project_url'
  ) then
    perform vault.create_secret(
      'https://zwkczgewzbsorbrjuzpb.supabase.co',
      'doke_project_url',
      'Supabase project URL used by internal scheduled Edge Function invocations.'
    );
  end if;
end;
$$;

create or replace function public.verify_order_event_worker_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = private, public, extensions, pg_temp
as $$
  select coalesce(
    extensions.digest(coalesce(p_token, ''), 'sha256') = (
      select c.token_hash
      from private.order_event_worker_credentials c
      where c.singleton
    ),
    false
  );
$$;

create or replace function public.begin_order_event_worker_run(
  p_invocation_id text,
  p_source text default 'manual',
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_run_id uuid;
  v_source text := lower(trim(coalesce(p_source, 'manual')));
begin
  if v_source not in ('cron', 'manual', 'test', 'recovery') then
    v_source := 'manual';
  end if;

  insert into private.order_event_worker_runs(invocation_id, source, metadata)
  values (
    left(trim(coalesce(p_invocation_id, gen_random_uuid()::text)), 180),
    v_source,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (invocation_id) do update
    set metadata = private.order_event_worker_runs.metadata || excluded.metadata
  returning id into v_run_id;

  return v_run_id;
end;
$$;

create or replace function public.finish_order_event_worker_run(
  p_run_id uuid,
  p_status text,
  p_claimed_count integer,
  p_completed_count integer,
  p_failed_count integer,
  p_dead_letter_count integer,
  p_metadata jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_status text := lower(trim(coalesce(p_status, 'failed')));
begin
  if v_status not in ('completed', 'partial', 'failed') then
    v_status := 'failed';
  end if;

  update private.order_event_worker_runs
     set status = v_status,
         claimed_count = greatest(0, coalesce(p_claimed_count, 0)),
         completed_count = greatest(0, coalesce(p_completed_count, 0)),
         failed_count = greatest(0, coalesce(p_failed_count, 0)),
         dead_letter_count = greatest(0, coalesce(p_dead_letter_count, 0)),
         metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
         completed_at = now()
   where id = p_run_id;

  return found;
end;
$$;

create or replace function private.recover_stale_order_event_claims(
  p_stale_after_seconds integer default 300
)
returns integer
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_recovered integer := 0;
begin
  with stale as (
    update private.order_domain_events e
       set delivery_status = case
             when e.delivery_attempts >= e.max_delivery_attempts then 'dead_letter'
             else 'failed'
           end,
           available_at = case
             when e.delivery_attempts >= e.max_delivery_attempts then e.available_at
             else now()
           end,
           dead_lettered_at = case
             when e.delivery_attempts >= e.max_delivery_attempts then now()
             else e.dead_lettered_at
           end,
           last_error_code = 'DOKE_ORDER_EVENT_CLAIM_EXPIRED'
     where e.delivery_status = 'processing'
       and e.claimed_at < now() - make_interval(secs => greatest(30, least(coalesce(p_stale_after_seconds, 300), 3600)))
    returning e.id, e.event_key, e.delivery_attempts, e.delivery_status
  )
  update private.order_event_delivery_attempts a
     set status = case when s.delivery_status = 'dead_letter' then 'dead_letter' else 'failed' end,
         error_code = 'DOKE_ORDER_EVENT_CLAIM_EXPIRED',
         completed_at = now()
    from stale s
   where a.order_event_id = s.id
     and a.attempt_no = s.delivery_attempts
     and a.status = 'processing';

  get diagnostics v_recovered = row_count;
  return v_recovered;
end;
$$;

create or replace function public.claim_order_domain_events_for_worker(
  p_limit integer,
  p_worker_run_id uuid
)
returns table (
  event_id uuid,
  event_key text,
  order_id uuid,
  sequence_no bigint,
  event_type text,
  payload jsonb,
  cache_tags text[],
  delivery_attempts integer,
  max_delivery_attempts integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  perform private.recover_stale_order_event_claims(300);

  update private.order_domain_events e
     set delivery_status = 'dead_letter',
         dead_lettered_at = coalesce(e.dead_lettered_at, now()),
         last_error_code = coalesce(e.last_error_code, 'DOKE_ORDER_EVENT_MAX_ATTEMPTS')
   where e.delivery_status = 'failed'
     and e.delivery_attempts >= e.max_delivery_attempts;

  return query
  with candidates as (
    select e.id
    from private.order_domain_events e
    where e.delivery_status in ('ready', 'failed')
      and e.available_at <= now()
      and e.delivery_attempts < e.max_delivery_attempts
    order by e.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  ), claimed as (
    update private.order_domain_events e
       set delivery_status = 'processing',
           delivery_attempts = e.delivery_attempts + 1,
           claimed_at = now(),
           last_error_code = null,
           last_worker_run_id = p_worker_run_id
      from candidates c
     where e.id = c.id
    returning e.*
  ), attempts as (
    insert into private.order_event_delivery_attempts(
      worker_run_id,
      order_event_id,
      event_key,
      attempt_no,
      status
    )
    select p_worker_run_id, c.id, c.event_key, c.delivery_attempts, 'processing'
    from claimed c
    on conflict (order_event_id, attempt_no) do update
      set worker_run_id = excluded.worker_run_id,
          status = 'processing',
          error_code = null,
          result = '{}'::jsonb,
          started_at = now(),
          completed_at = null
    returning order_event_id
  )
  select c.id, c.event_key, c.order_id, c.sequence_no, c.event_type,
         c.payload, c.cache_tags, c.delivery_attempts, c.max_delivery_attempts, c.created_at
  from claimed c
  join attempts a on a.order_event_id = c.id
  order by c.created_at;
end;
$$;

-- Compatibility wrapper retained for existing service-role consumers.
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
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select e.event_id, e.event_key, e.order_id, e.sequence_no, e.event_type,
         e.payload, e.cache_tags, e.delivery_attempts, e.created_at
  from public.claim_order_domain_events_for_worker(p_limit, null) e;
$$;

create or replace function public.complete_order_domain_event_delivery(
  p_event_key text,
  p_worker_run_id uuid,
  p_result jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_event private.order_domain_events;
  v_cache_tag text;
begin
  update private.order_domain_events
     set delivery_status = 'completed',
         delivered_at = now(),
         last_error_code = null,
         delivery_result = coalesce(p_result, '{}'::jsonb),
         last_worker_run_id = coalesce(p_worker_run_id, last_worker_run_id)
   where event_key = p_event_key
     and delivery_status = 'processing'
  returning * into v_event;

  if v_event.id is null then
    return false;
  end if;

  foreach v_cache_tag in array v_event.cache_tags
  loop
    if nullif(trim(v_cache_tag), '') is not null then
      insert into private.cache_tag_versions(cache_tag, version, last_event_key, updated_at)
      values (v_cache_tag, 1, v_event.event_key, now())
      on conflict (cache_tag) do update
        set version = private.cache_tag_versions.version + 1,
            last_event_key = excluded.last_event_key,
            updated_at = excluded.updated_at;
    end if;
  end loop;

  update private.order_event_delivery_attempts
     set status = 'completed',
         result = coalesce(p_result, '{}'::jsonb),
         completed_at = now()
   where order_event_id = v_event.id
     and attempt_no = v_event.delivery_attempts;

  return true;
end;
$$;

create or replace function public.complete_order_domain_event(p_event_key text)
returns boolean
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select public.complete_order_domain_event_delivery(p_event_key, null, '{}'::jsonb);
$$;

create or replace function public.fail_order_domain_event_delivery(
  p_event_key text,
  p_worker_run_id uuid,
  p_error_code text,
  p_retry_after_seconds integer default 60,
  p_result jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_event private.order_domain_events;
  v_next_status text;
begin
  select * into v_event
  from private.order_domain_events
  where event_key = p_event_key
    and delivery_status = 'processing'
  for update;

  if v_event.id is null then
    return 'not_processing';
  end if;

  v_next_status := case
    when v_event.delivery_attempts >= v_event.max_delivery_attempts then 'dead_letter'
    else 'failed'
  end;

  update private.order_domain_events
     set delivery_status = v_next_status,
         available_at = case
           when v_next_status = 'dead_letter' then available_at
           else now() + make_interval(secs => greatest(1, least(coalesce(p_retry_after_seconds, 60), 86400)))
         end,
         dead_lettered_at = case
           when v_next_status = 'dead_letter' then now()
           else dead_lettered_at
         end,
         last_error_code = left(trim(coalesce(p_error_code, 'DOKE_ORDER_EVENT_DELIVERY_FAILED')), 120),
         delivery_result = coalesce(p_result, '{}'::jsonb),
         last_worker_run_id = coalesce(p_worker_run_id, last_worker_run_id)
   where id = v_event.id;

  update private.order_event_delivery_attempts
     set status = v_next_status,
         error_code = left(trim(coalesce(p_error_code, 'DOKE_ORDER_EVENT_DELIVERY_FAILED')), 120),
         result = coalesce(p_result, '{}'::jsonb),
         completed_at = now()
   where order_event_id = v_event.id
     and attempt_no = v_event.delivery_attempts;

  return v_next_status;
end;
$$;

create or replace function public.fail_order_domain_event(
  p_event_key text,
  p_error_code text,
  p_retry_after_seconds integer default 60
)
returns boolean
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select public.fail_order_domain_event_delivery(
    p_event_key,
    null,
    p_error_code,
    p_retry_after_seconds,
    '{}'::jsonb
  ) in ('failed', 'dead_letter');
$$;

create or replace function private.invoke_order_event_worker_if_needed()
returns bigint
language plpgsql
security definer
set search_path = private, public, vault, net, pg_temp
as $$
declare
  v_request_id bigint;
  v_project_url text;
  v_worker_token text;
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

  select net.http_post(
    url := v_project_url || '/functions/v1/order-event-worker',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-doke-worker-token', v_worker_token,
      'x-doke-worker-source', 'cron'
    ),
    body := jsonb_build_object('source', 'cron', 'limit', 25),
    timeout_milliseconds := 30000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.verify_order_event_worker_token(text) from public, anon, authenticated;
revoke all on function public.begin_order_event_worker_run(text, text, jsonb) from public, anon, authenticated;
revoke all on function public.finish_order_event_worker_run(uuid, text, integer, integer, integer, integer, jsonb) from public, anon, authenticated;
revoke all on function public.claim_order_domain_events_for_worker(integer, uuid) from public, anon, authenticated;
revoke all on function public.complete_order_domain_event_delivery(text, uuid, jsonb) from public, anon, authenticated;
revoke all on function public.fail_order_domain_event_delivery(text, uuid, text, integer, jsonb) from public, anon, authenticated;
revoke all on function private.recover_stale_order_event_claims(integer) from public, anon, authenticated;
revoke all on function private.invoke_order_event_worker_if_needed() from public, anon, authenticated;

revoke all on function public.claim_order_domain_events(integer) from public, anon, authenticated;
revoke all on function public.complete_order_domain_event(text) from public, anon, authenticated;
revoke all on function public.fail_order_domain_event(text, text, integer) from public, anon, authenticated;

grant execute on function public.verify_order_event_worker_token(text) to service_role;
grant execute on function public.begin_order_event_worker_run(text, text, jsonb) to service_role;
grant execute on function public.finish_order_event_worker_run(uuid, text, integer, integer, integer, integer, jsonb) to service_role;
grant execute on function public.claim_order_domain_events_for_worker(integer, uuid) to service_role;
grant execute on function public.complete_order_domain_event_delivery(text, uuid, jsonb) to service_role;
grant execute on function public.fail_order_domain_event_delivery(text, uuid, text, integer, jsonb) to service_role;
grant execute on function public.claim_order_domain_events(integer) to service_role;
grant execute on function public.complete_order_domain_event(text) to service_role;
grant execute on function public.fail_order_domain_event(text, text, integer) to service_role;

-- Replace the scheduled job deterministically if the migration is reapplied.
do $$
declare
  v_job_id bigint;
begin
  for v_job_id in
    select jobid from cron.job where jobname = 'doke-order-event-worker'
  loop
    perform cron.unschedule(v_job_id);
  end loop;

  perform cron.schedule(
    'doke-order-event-worker',
    '* * * * *',
    'select private.invoke_order_event_worker_if_needed();'
  );
end;
$$;

comment on table private.order_event_worker_runs is
  'Observable invocation ledger for the server-side Doke order event outbox consumer.';
comment on table private.order_event_delivery_attempts is
  'Per-attempt delivery history with stable error codes and dead-letter visibility.';
comment on table private.cache_tag_versions is
  'Monotonic server-side versions for cache tags invalidated by completed order events.';
comment on function private.invoke_order_event_worker_if_needed() is
  'Cron entrypoint that invokes the Edge Function only when deliverable order events exist.';
