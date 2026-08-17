-- COM-B02I repository-only SQL definition.
-- This file is intentionally outside supabase/migrations and MUST NOT be applied by this boundary.

alter table com_private.command_idempotency
  add column if not exists outcome jsonb,
  add column if not exists completed_at timestamptz;

create or replace function public.com_claim_idempotency_key_v2(
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
  inserted_count integer := 0;
  existing com_private.command_idempotency;
  by_key com_private.command_idempotency;
begin
  insert into com_private.command_idempotency(actor_id, client_request_id, idempotency_key, intent_fingerprint)
  values (p_actor_id, p_client_request_id, p_idempotency_key, p_intent_fingerprint)
  on conflict do nothing;
  get diagnostics inserted_count = row_count;

  select * into existing
  from com_private.command_idempotency
  where actor_id = p_actor_id and client_request_id = p_client_request_id;

  if existing.actor_id is null then
    select * into by_key
    from com_private.command_idempotency
    where actor_id = p_actor_id and idempotency_key = p_idempotency_key;
    if by_key.actor_id is not null then raise exception 'IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_REQUEST'; end if;
    raise exception 'IDEMPOTENCY_CLAIM_NOT_FOUND_AFTER_INSERT';
  end if;

  if existing.idempotency_key <> p_idempotency_key then raise exception 'IDEMPOTENCY_KEY_MISMATCH'; end if;
  if existing.intent_fingerprint <> p_intent_fingerprint then raise exception 'IDEMPOTENCY_INTENT_MISMATCH'; end if;

  return jsonb_build_object(
    'claimed', true,
    'claimState', case when inserted_count = 1 then 'new' else 'existing' end,
    'intentFingerprint', existing.intent_fingerprint,
    'priorRecord', case
      when inserted_count = 0 and existing.outcome is not null then jsonb_build_object(
        'actorId', existing.actor_id,
        'clientRequestId', existing.client_request_id,
        'idempotencyKey', existing.idempotency_key,
        'intentFingerprint', existing.intent_fingerprint,
        'outcome', existing.outcome
      )
      else null
    end
  );
end;
$$;

create or replace function public.com_create_community_projection_outcome_v1(
  p_community_id uuid,
  p_actor_id uuid,
  p_client_request_id uuid,
  p_idempotency_key text,
  p_intent_fingerprint text,
  p_visibility text,
  p_join_policy text,
  p_event_type text,
  p_event_hash text,
  p_payload jsonb,
  p_projection jsonb,
  p_outcome jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, com_private
as $$
declare
  idem com_private.command_idempotency;
begin
  select * into idem
  from com_private.command_idempotency
  where actor_id = p_actor_id and client_request_id = p_client_request_id
  for update;
  if idem.actor_id is null then raise exception 'IDEMPOTENCY_CLAIM_REQUIRED'; end if;
  if idem.idempotency_key <> p_idempotency_key then raise exception 'IDEMPOTENCY_KEY_MISMATCH'; end if;
  if idem.intent_fingerprint <> p_intent_fingerprint then raise exception 'IDEMPOTENCY_INTENT_MISMATCH'; end if;
  if idem.outcome is not null then raise exception 'IDEMPOTENCY_OUTCOME_ALREADY_RECORDED'; end if;
  if p_visibility not in ('public','private','invite_only') then raise exception 'INVALID_VISIBILITY'; end if;
  if p_join_policy not in ('open','request','invite_only') then raise exception 'INVALID_JOIN_POLICY'; end if;

  insert into com_private.community_state(community_id, revision, visibility, join_policy, projection)
  values (p_community_id, 1, p_visibility, p_join_policy, coalesce(p_projection, '{}'::jsonb));
  insert into com_private.community_event(community_id, revision, actor_id, event_type, event_hash, payload)
  values (p_community_id, 1, p_actor_id, p_event_type, p_event_hash, coalesce(p_payload, '{}'::jsonb));
  update com_private.command_idempotency
  set outcome = coalesce(p_outcome, '{}'::jsonb), completed_at = now()
  where actor_id = p_actor_id and client_request_id = p_client_request_id;
  return jsonb_build_object('revision', 1, 'eventHash', p_event_hash, 'outcomeRecorded', true);
end;
$$;

create or replace function public.com_commit_event_projection_outcome_v2(
  p_community_id uuid,
  p_actor_id uuid,
  p_client_request_id uuid,
  p_idempotency_key text,
  p_intent_fingerprint text,
  p_expected_revision bigint,
  p_event_type text,
  p_event_hash text,
  p_payload jsonb,
  p_projection jsonb,
  p_outcome jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, com_private
as $$
declare
  current_revision bigint;
  idem com_private.command_idempotency;
begin
  select * into idem
  from com_private.command_idempotency
  where actor_id = p_actor_id and client_request_id = p_client_request_id
  for update;
  if idem.actor_id is null then raise exception 'IDEMPOTENCY_CLAIM_REQUIRED'; end if;
  if idem.idempotency_key <> p_idempotency_key then raise exception 'IDEMPOTENCY_KEY_MISMATCH'; end if;
  if idem.intent_fingerprint <> p_intent_fingerprint then raise exception 'IDEMPOTENCY_INTENT_MISMATCH'; end if;
  if idem.outcome is not null then raise exception 'IDEMPOTENCY_OUTCOME_ALREADY_RECORDED'; end if;

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
  update com_private.command_idempotency
  set outcome = coalesce(p_outcome, '{}'::jsonb), completed_at = now()
  where actor_id = p_actor_id and client_request_id = p_client_request_id;
  return jsonb_build_object('revision', current_revision + 1, 'eventHash', p_event_hash, 'outcomeRecorded', true);
end;
$$;

revoke all on function public.com_claim_idempotency_key_v2(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.com_create_community_projection_outcome_v1(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.com_commit_event_projection_outcome_v2(uuid,uuid,uuid,text,text,bigint,text,text,jsonb,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.com_claim_idempotency_key_v2(uuid,uuid,text,text) to service_role;
grant execute on function public.com_create_community_projection_outcome_v1(uuid,uuid,uuid,text,text,text,text,text,text,jsonb,jsonb,jsonb) to service_role;
grant execute on function public.com_commit_event_projection_outcome_v2(uuid,uuid,uuid,text,text,bigint,text,text,jsonb,jsonb,jsonb) to service_role;
