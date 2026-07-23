begin;

create or replace function private.assert_service_moderation_operator(p_actor_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  v_role text;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SERVICE_MODERATION_AUTH_REQUIRED';
  end if;

  select lower(account.role)
    into v_role
    from public.users account
   where account.id = p_actor_id
     and lower(account.status) = 'active'
     and lower(account.role) in ('admin', 'moderator');

  if v_role is null then
    raise exception using errcode = '42501', message = 'DOKE_SERVICE_MODERATION_OPERATOR_REQUIRED';
  end if;
  return v_role;
end;
$$;

revoke all privileges on function private.assert_service_moderation_operator(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.list_service_review_queue_internal(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.list_service_review_queue();
end;
$$;

create or replace function public.get_service_review_detail_internal(
  p_actor_id uuid,
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.get_service_review_detail(p_version_id);
end;
$$;

create or replace function public.list_service_moderation_audit_internal(
  p_actor_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.list_service_moderation_audit(greatest(1, least(coalesce(p_limit, 20), 100)));
end;
$$;

create or replace function public.approve_service_version_internal(
  p_actor_id uuid,
  p_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.approve_service_version(p_version_id);
end;
$$;

create or replace function public.request_service_version_changes_internal(
  p_actor_id uuid,
  p_version_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.request_service_version_changes(p_version_id, p_reason);
end;
$$;

create or replace function public.reject_service_version_internal(
  p_actor_id uuid,
  p_version_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id, 'role', 'authenticated')::text,
    true
  );
  return public.reject_service_version(p_version_id, p_reason);
end;
$$;

-- The legacy implementations remain owner-callable only and are reached through
-- the exact internal wrappers above. Pin their runtime lookup path as defense in depth.
alter function public.list_service_review_queue() set search_path = pg_catalog;
alter function public.get_service_review_detail(uuid) set search_path = pg_catalog;
alter function public.list_service_moderation_audit(integer) set search_path = pg_catalog;
alter function public.approve_service_version(uuid) set search_path = pg_catalog;
alter function public.request_service_version_changes(uuid, text) set search_path = pg_catalog;
alter function public.reject_service_version(uuid, text) set search_path = pg_catalog;

revoke all privileges on function public.list_service_review_queue()
  from public, anon, authenticated, service_role;
revoke all privileges on function public.get_service_review_detail(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.list_service_moderation_audit(integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.approve_service_version(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.request_service_version_changes(uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.reject_service_version(uuid, text)
  from public, anon, authenticated, service_role;

revoke all privileges on function public.list_service_review_queue_internal(uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.get_service_review_detail_internal(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.list_service_moderation_audit_internal(uuid, integer)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.approve_service_version_internal(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.request_service_version_changes_internal(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all privileges on function public.reject_service_version_internal(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.list_service_review_queue_internal(uuid) to service_role;
grant execute on function public.get_service_review_detail_internal(uuid, uuid) to service_role;
grant execute on function public.list_service_moderation_audit_internal(uuid, integer) to service_role;
grant execute on function public.approve_service_version_internal(uuid, uuid) to service_role;
grant execute on function public.request_service_version_changes_internal(uuid, uuid, text) to service_role;
grant execute on function public.reject_service_version_internal(uuid, uuid, text) to service_role;

notify pgrst, 'reload schema';
commit;
