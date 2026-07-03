-- Doke Sprint 23: runtime idempotency replay/conflict and audit persistence hardening.
-- This migration upgrades the database contract used by the staging runtime.

create index if not exists idx_idempotency_key_hash on public.api_idempotency_keys(idempotency_key, request_hash);
create index if not exists idx_idempotency_expires on public.api_idempotency_keys(expires_at, status);

create or replace function public.claim_idempotency_key(
  p_idempotency_key text,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_request_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_key public.api_idempotency_keys%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to claim an idempotency key.'
      using errcode = '28000';
  end if;

  select * into existing_key
  from public.api_idempotency_keys
  where idempotency_key = p_idempotency_key;

  if found then
    if existing_key.actor_id is distinct from auth.uid()
      or existing_key.action is distinct from p_action
      or existing_key.request_hash is distinct from p_request_hash then
      raise exception 'Idempotency key conflict.'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'claimed', false,
      'status', existing_key.status,
      'response', existing_key.response_body,
      'requestHash', existing_key.request_hash
    );
  end if;

  insert into public.api_idempotency_keys (
    idempotency_key,
    actor_id,
    action,
    entity_type,
    entity_id,
    request_hash
  ) values (
    p_idempotency_key,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_request_hash
  );

  return jsonb_build_object('claimed', true, 'status', 'claimed', 'requestHash', p_request_hash);
end;
$$;

create or replace function public.complete_idempotency_key(
  p_idempotency_key text,
  p_request_hash text,
  p_response_body jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_key public.api_idempotency_keys%rowtype;
begin
  update public.api_idempotency_keys
    set status = 'succeeded',
        response_body = p_response_body,
        updated_at = now()
  where idempotency_key = p_idempotency_key
    and request_hash = p_request_hash
  returning * into updated_key;

  if not found then
    raise exception 'Idempotency key was not claimed for this request hash.'
      using errcode = '23503';
  end if;

  return jsonb_build_object(
    'status', updated_key.status,
    'response', updated_key.response_body,
    'requestHash', updated_key.request_hash
  );
end;
$$;

create or replace function public.fail_idempotency_key(
  p_idempotency_key text,
  p_request_hash text,
  p_error_body jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_key public.api_idempotency_keys%rowtype;
begin
  update public.api_idempotency_keys
    set status = 'failed',
        response_body = p_error_body,
        updated_at = now()
  where idempotency_key = p_idempotency_key
    and request_hash = p_request_hash
  returning * into updated_key;

  if not found then
    raise exception 'Idempotency key was not claimed for this request hash.'
      using errcode = '23503';
  end if;

  return jsonb_build_object(
    'status', updated_key.status,
    'response', updated_key.response_body,
    'requestHash', updated_key.request_hash
  );
end;
$$;
