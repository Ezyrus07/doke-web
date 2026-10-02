-- CAT-B06: restore canonical operator identity context for service-role moderation wrappers.
--
-- Historical migration 122 intentionally remains immutable. The JWT-verified Edge Function
-- derives p_actor_id from auth.getUser(), validates the canonical active admin/moderator role,
-- then invokes these service-role-only wrappers. Downstream moderation RPCs still authorize
-- through auth.uid() / current_user_role(), so the wrapper must reconstruct the same
-- transaction-local authenticated context used by later canonical dispatchers.

create or replace function public.list_service_review_queue_internal(p_actor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
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
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
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
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
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
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
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
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
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
  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
    true
  );
  return public.reject_service_version(p_version_id, p_reason);
end;
$$;

-- Preserve the existing service-role-only Data API boundary explicitly.
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
