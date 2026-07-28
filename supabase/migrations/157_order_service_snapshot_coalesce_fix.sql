-- CAT-001 / CAT-B04
-- Correct the applied snapshot trigger: COALESCE is SQL syntax and cannot be schema-qualified.

create or replace function private.canonicalize_order_service_snapshot()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_service public.services%rowtype;
  v_version public.service_versions%rowtype;
  v_snapshot jsonb;
  v_status text := pg_catalog.lower(coalesce(new.status, 'draft'));
  v_old_projection jsonb;
  v_new_projection jsonb;
begin
  if tg_op = 'UPDATE' and old.status <> 'draft' then
    v_old_projection := pg_catalog.jsonb_build_object(
      'serviceSnapshot', coalesce(old.metadata, '{}'::jsonb) -> 'serviceSnapshot',
      'serviceVersionId', coalesce(old.metadata, '{}'::jsonb) -> 'serviceVersionId',
      'serviceSnapshotAuthority', coalesce(old.metadata, '{}'::jsonb) -> 'serviceSnapshotAuthority'
    );
    v_new_projection := pg_catalog.jsonb_build_object(
      'serviceSnapshot', coalesce(new.metadata, '{}'::jsonb) -> 'serviceSnapshot',
      'serviceVersionId', coalesce(new.metadata, '{}'::jsonb) -> 'serviceVersionId',
      'serviceSnapshotAuthority', coalesce(new.metadata, '{}'::jsonb) -> 'serviceSnapshotAuthority'
    );

    if new.service_id is distinct from old.service_id
       or new.professional_id is distinct from old.professional_id
       or new.service_version_id is distinct from old.service_version_id
       or new.service_snapshot is distinct from old.service_snapshot
       or v_new_projection is distinct from v_old_projection then
      raise exception using
        errcode = '23514',
        message = 'DOKE_ORDER_SERVICE_SNAPSHOT_IMMUTABLE';
    end if;
    return new;
  end if;

  if new.service_id is null then
    if v_status <> 'draft' then
      raise exception using
        errcode = '23502',
        message = 'DOKE_ORDER_SERVICE_REQUIRED';
    end if;
    new.service_version_id := null;
    new.service_snapshot := null;
    new.metadata := coalesce(new.metadata, '{}'::jsonb)
      - 'serviceSnapshot'
      - 'serviceVersionId'
      - 'serviceSnapshotAuthority';
    return new;
  end if;

  select service_row.*
    into v_service
    from public.services service_row
   where service_row.id = new.service_id;

  if v_service.id is null then
    raise exception using
      errcode = '23503',
      message = 'DOKE_ORDER_SERVICE_NOT_FOUND';
  end if;

  if v_service.status <> 'published'
     or v_service.approved_version_id is null
     or not (
       v_service.moderation_status in ('published', 'changes_pending_review')
       or v_service.moderation_status = 'changes_required'
     ) then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_SERVICE_NOT_ELIGIBLE';
  end if;

  if new.client_id = v_service.professional_id then
    raise exception using
      errcode = '23514',
      message = 'DOKE_ORDER_OWN_SERVICE_FORBIDDEN';
  end if;

  select version_row.*
    into v_version
    from public.service_versions version_row
   where version_row.id = v_service.approved_version_id
     and version_row.service_id = v_service.id
     and version_row.professional_id = v_service.professional_id
     and version_row.review_status = 'approved';

  if v_version.id is null then
    raise exception using
      errcode = '23503',
      message = 'DOKE_ORDER_APPROVED_VERSION_NOT_FOUND';
  end if;

  v_snapshot := coalesce(v_version.snapshot, '{}'::jsonb)
    || pg_catalog.jsonb_build_object(
      'serviceId', v_service.id,
      'serviceExternalId', v_service.external_id,
      'serviceVersionId', v_version.id,
      'serviceVersionNumber', v_version.version_number,
      'professionalId', v_service.professional_id,
      'capturedAt', coalesce(new.created_at, pg_catalog.now()),
      'snapshotAuthority', 'approved_service_version'
    );

  new.professional_id := v_service.professional_id;
  new.service_version_id := v_version.id;
  new.service_snapshot := v_snapshot;
  new.metadata := coalesce(new.metadata, '{}'::jsonb)
    || pg_catalog.jsonb_build_object(
      'serviceSnapshot', v_snapshot,
      'serviceVersionId', v_version.id::text,
      'serviceSnapshotAuthority', 'approved_service_version'
    );
  return new;
end;
$$;

revoke all on function private.canonicalize_order_service_snapshot() from public, anon, authenticated;

comment on function private.canonicalize_order_service_snapshot() is
  'CAT-B04 canonical authority that resolves an eligible approved service version, overrides professional identity and freezes the immutable order snapshot.';