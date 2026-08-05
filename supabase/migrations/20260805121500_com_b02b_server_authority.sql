begin;

create schema if not exists com_private;
revoke all on schema com_private from public, anon, authenticated;

create table if not exists com_private.community_state (
  community_id uuid primary key,
  revision bigint not null default 0 check (revision >= 0),
  visibility text not null check (visibility in ('public','private','invite_only')),
  join_policy text not null check (join_policy in ('open','request','invite_only')),
  projection jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists com_private.community_event (
  community_id uuid not null,
  revision bigint not null check (revision > 0),
  actor_id uuid not null,
  event_type text not null,
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  primary key (community_id, revision),
  unique (event_hash)
);

create table if not exists com_private.command_idempotency (
  actor_id uuid not null,
  client_request_id uuid not null,
  idempotency_key text not null check (idempotency_key ~ '^[a-f0-9]{64}$'),
  intent_fingerprint text not null check (intent_fingerprint ~ '^[a-f0-9]{64}$'),
  claimed_at timestamptz not null default now(),
  primary key (actor_id, client_request_id),
  unique (actor_id, idempotency_key)
);

alter table com_private.community_state enable row level security;
alter table com_private.community_event enable row level security;
alter table com_private.command_idempotency enable row level security;
revoke all on all tables in schema com_private from public, anon, authenticated;

create or replace function public.com_load_canonical_state_v1(p_community_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, com_private
as $$
  select jsonb_build_object(
    'communityId', community_id,
    'revision', revision,
    'visibility', visibility,
    'joinPolicy', join_policy,
    'projection', projection
  )
  from com_private.community_state
  where community_id = p_community_id;
$$;

create or replace function public.com_claim_idempotency_key_v1(
  p_actor_id uuid,
  p_client_request_id uuid,
  p_idempotency_key text,
  p_intent_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, com_private
as $$
declare
  existing com_private.command_idempotency;
begin
  insert into com_private.command_idempotency(actor_id, client_request_id, idempotency_key, intent_fingerprint)
  values (p_actor_id, p_client_request_id, p_idempotency_key, p_intent_fingerprint)
  on conflict (actor_id, client_request_id) do nothing;
  select * into existing from com_private.command_idempotency
  where actor_id = p_actor_id and client_request_id = p_client_request_id;
  if existing.intent_fingerprint <> p_intent_fingerprint then
    raise exception 'IDEMPOTENCY_INTENT_MISMATCH';
  end if;
  return jsonb_build_object('claimed', true, 'intentFingerprint', existing.intent_fingerprint);
end;
$$;

create or replace function public.com_commit_event_projection_v1(
  p_community_id uuid,
  p_actor_id uuid,
  p_expected_revision bigint,
  p_event_type text,
  p_event_hash text,
  p_payload jsonb,
  p_projection jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, com_private
as $$
declare
  current_revision bigint;
begin
  select revision into current_revision
  from com_private.community_state
  where community_id = p_community_id
  for update;
  if current_revision is null then raise exception 'COMMUNITY_NOT_FOUND'; end if;
  if current_revision <> p_expected_revision then raise exception 'REVISION_CONFLICT'; end if;
  insert into com_private.community_event(community_id, revision, actor_id, event_type, event_hash, payload)
  values (p_community_id, current_revision + 1, p_actor_id, p_event_type, p_event_hash, coalesce(p_payload, '{}'::jsonb));
  update com_private.community_state
  set revision = current_revision + 1,
      projection = coalesce(p_projection, '{}'::jsonb),
      updated_at = now()
  where community_id = p_community_id and revision = current_revision;
  return jsonb_build_object('revision', current_revision + 1, 'eventHash', p_event_hash);
end;
$$;

revoke all on function public.com_load_canonical_state_v1(uuid) from public, anon, authenticated;
revoke all on function public.com_claim_idempotency_key_v1(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.com_commit_event_projection_v1(uuid,uuid,bigint,text,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.com_load_canonical_state_v1(uuid) to service_role;
grant execute on function public.com_claim_idempotency_key_v1(uuid,uuid,text,text) to service_role;
grant execute on function public.com_commit_event_projection_v1(uuid,uuid,bigint,text,text,jsonb,jsonb) to service_role;

commit;
