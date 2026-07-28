-- CAT-001 / CAT-A04 candidate 2: reference-safe media cleanup authority.
-- Storage objects are claimed in PostgreSQL, deleted only through the Storage API,
-- and finalized with an auditable server-side result.

alter table private.service_media_upload_items
  add column if not exists cleanup_claimed_at timestamptz,
  add column if not exists cleanup_claimed_by uuid references public.users(id) on delete set null,
  add column if not exists cleanup_attempts integer not null default 0,
  add column if not exists last_cleanup_error text,
  add column if not exists deleted_at timestamptz;

alter table private.service_media_upload_items
  drop constraint if exists service_media_upload_items_status_check;
alter table private.service_media_upload_items
  add constraint service_media_upload_items_status_check
  check (status in ('prepared','consumed','superseded','cleanup_eligible','cleanup_claimed','delete_failed','deleted'));

alter table private.service_media_upload_items
  drop constraint if exists service_media_upload_items_cleanup_attempts_check;
alter table private.service_media_upload_items
  add constraint service_media_upload_items_cleanup_attempts_check
  check (cleanup_attempts >= 0);

alter table private.service_media_upload_items
  drop constraint if exists service_media_upload_items_deleted_state_check;
alter table private.service_media_upload_items
  add constraint service_media_upload_items_deleted_state_check
  check ((status = 'deleted') = (deleted_at is not null));

alter table private.service_media_upload_items
  drop constraint if exists service_media_upload_items_claim_state_check;
alter table private.service_media_upload_items
  add constraint service_media_upload_items_claim_state_check
  check (status <> 'cleanup_claimed' or (cleanup_claimed_at is not null and cleanup_claimed_by is not null));

create index if not exists idx_service_media_upload_intents_service_id
  on private.service_media_upload_intents(service_id)
  where service_id is not null;
create index if not exists idx_service_media_upload_intents_service_version_id
  on private.service_media_upload_intents(service_version_id)
  where service_version_id is not null;
create index if not exists idx_service_media_upload_items_actor_id
  on private.service_media_upload_items(actor_id);
create index if not exists idx_service_media_upload_items_service_id
  on private.service_media_upload_items(service_id)
  where service_id is not null;
create index if not exists idx_service_media_upload_items_cleanup_claimed_by
  on private.service_media_upload_items(cleanup_claimed_by)
  where cleanup_claimed_by is not null;
create index if not exists idx_service_media_upload_items_cleanup_state
  on private.service_media_upload_items(status, cleanup_eligible_at, cleanup_claimed_at, cleanup_attempts);

create or replace function private.service_media_item_is_referenced(p_item_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_item private.service_media_upload_items%rowtype;
  v_url text;
begin
  select * into v_item
  from private.service_media_upload_items
  where id = p_item_id;

  if v_item.id is null or v_item.kind <> 'upload' or v_item.object_path is null then
    return true;
  end if;

  v_url := nullif(btrim(coalesce(v_item.canonical_url, '')), '');

  if v_url is not null and exists (
    select 1
    from public.service_media m
    where m.url = v_url or m.thumbnail_url = v_url
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.service_versions v
    where (
      v_url is not null and exists (
        select 1
        from jsonb_array_elements_text(
          case when jsonb_typeof(v.snapshot -> 'images') = 'array'
            then v.snapshot -> 'images' else '[]'::jsonb end
        ) image_url
        where image_url.value = v_url
      )
    ) or exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(v.snapshot -> 'mediaAssets') = 'array'
          then v.snapshot -> 'mediaAssets' else '[]'::jsonb end
      ) asset
      where asset.value ->> 'assetId' = v_item.id::text
         or ((asset.value ->> 'bucket') = v_item.bucket_id and (asset.value ->> 'path') = v_item.object_path)
         or (v_url is not null and asset.value ->> 'url' = v_url)
    )
  ) then
    return true;
  end if;

  if exists (
    select 1
    from public.services s
    where (
      v_url is not null and exists (
        select 1
        from jsonb_array_elements_text(
          case when jsonb_typeof(s.metadata -> 'images') = 'array'
            then s.metadata -> 'images' else '[]'::jsonb end
        ) image_url
        where image_url.value = v_url
      )
    ) or exists (
      select 1
      from jsonb_array_elements(
        case when jsonb_typeof(s.metadata -> 'mediaAssets') = 'array'
          then s.metadata -> 'mediaAssets' else '[]'::jsonb end
      ) asset
      where asset.value ->> 'assetId' = v_item.id::text
         or ((asset.value ->> 'bucket') = v_item.bucket_id and (asset.value ->> 'path') = v_item.object_path)
         or (v_url is not null and asset.value ->> 'url' = v_url)
    )
  ) then
    return true;
  end if;

  if v_url is not null and exists (
    select 1
    from private.service_media_upload_items other_item
    where other_item.id <> v_item.id
      and other_item.status <> 'deleted'
      and (other_item.retained_url = v_url or other_item.canonical_url = v_url)
  ) then
    return true;
  end if;

  return false;
end;
$function$;

create or replace function private.sync_service_media_item_version_status()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if new.review_status in ('superseded','rejected')
     and old.review_status is distinct from new.review_status then
    update private.service_media_upload_items
    set status = 'superseded',
        superseded_at = coalesce(superseded_at, now()),
        updated_at = now()
    where service_version_id = new.id
      and status = 'consumed';
  end if;
  return new;
end;
$function$;

drop trigger if exists service_media_item_version_status_sync on public.service_versions;
create trigger service_media_item_version_status_sync
after update of review_status on public.service_versions
for each row
execute function private.sync_service_media_item_version_status();

create or replace function private.reconcile_service_media_cleanup_state()
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_expired_intents integer := 0;
  v_abandoned_uploads integer := 0;
  v_superseded_items integer := 0;
  v_retryable_items integer := 0;
  v_stale_claims integer := 0;
begin
  update private.service_media_upload_intents
  set status = 'expired', updated_at = now()
  where status = 'prepared' and expires_at <= now();
  get diagnostics v_expired_intents = row_count;

  update private.service_media_upload_items i
  set status = 'deleted',
      deleted_at = now(),
      last_cleanup_error = null,
      updated_at = now()
  from private.service_media_upload_intents intent
  where i.intent_id = intent.id
    and intent.status in ('expired','cancelled')
    and i.kind = 'retain'
    and i.status = 'prepared';

  update private.service_media_upload_items i
  set status = 'cleanup_eligible',
      cleanup_eligible_at = coalesce(i.cleanup_eligible_at, now()),
      last_cleanup_error = null,
      updated_at = now()
  from private.service_media_upload_intents intent
  where i.intent_id = intent.id
    and intent.status in ('expired','cancelled')
    and i.kind = 'upload'
    and i.status = 'prepared'
    and now() >= intent.created_at + interval '2 hours 15 minutes';
  get diagnostics v_abandoned_uploads = row_count;

  update private.service_media_upload_items i
  set status = 'superseded',
      superseded_at = coalesce(i.superseded_at, now()),
      updated_at = now()
  from public.service_versions v
  where i.service_version_id = v.id
    and i.status = 'consumed'
    and v.review_status in ('superseded','rejected');
  get diagnostics v_superseded_items = row_count;

  update private.service_media_upload_items
  set status = 'cleanup_eligible',
      cleanup_claimed_at = null,
      cleanup_claimed_by = null,
      cleanup_eligible_at = coalesce(cleanup_eligible_at, now()),
      last_cleanup_error = 'DOKE_SERVICE_MEDIA_CLEANUP_STALE_CLAIM_RECOVERED',
      updated_at = now()
  where status = 'cleanup_claimed'
    and cleanup_claimed_at <= now() - interval '15 minutes';
  get diagnostics v_stale_claims = row_count;

  update private.service_media_upload_items
  set status = 'cleanup_eligible',
      cleanup_eligible_at = now(),
      updated_at = now()
  where status = 'delete_failed'
    and cleanup_attempts < 5
    and cleanup_eligible_at <= now();
  get diagnostics v_retryable_items = row_count;

  update private.service_media_upload_items i
  set status = 'cleanup_eligible',
      cleanup_eligible_at = coalesce(i.cleanup_eligible_at, now()),
      updated_at = now()
  where i.status = 'superseded'
    and i.kind = 'upload'
    and i.superseded_at <= now() - interval '30 days'
    and not private.service_media_item_is_referenced(i.id);

  return jsonb_build_object(
    'expiredIntents', v_expired_intents,
    'abandonedUploads', v_abandoned_uploads,
    'supersededItems', v_superseded_items,
    'retryableItems', v_retryable_items,
    'staleClaims', v_stale_claims
  );
end;
$function$;

create or replace function public.prepare_service_media_cleanup_batch_internal(
  p_actor_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_reconciliation jsonb;
  v_items jsonb;
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  v_reconciliation := private.reconcile_service_media_cleanup_state();

  with candidates as (
    select i.id
    from private.service_media_upload_items i
    where i.status = 'cleanup_eligible'
      and i.kind = 'upload'
      and i.object_path is not null
      and coalesce(i.cleanup_eligible_at, i.updated_at) <= now()
      and i.cleanup_attempts < 5
      and not private.service_media_item_is_referenced(i.id)
    order by coalesce(i.cleanup_eligible_at, i.updated_at), i.created_at, i.id
    for update skip locked
    limit v_limit
  ), claimed as (
    update private.service_media_upload_items i
    set status = 'cleanup_claimed',
        cleanup_claimed_at = now(),
        cleanup_claimed_by = p_actor_id,
        cleanup_attempts = i.cleanup_attempts + 1,
        last_cleanup_error = null,
        updated_at = now()
    from candidates c
    where i.id = c.id
    returning i.id, i.bucket_id, i.object_path, i.cleanup_attempts,
      case when i.service_version_id is null then 'abandoned_upload' else 'unreferenced_superseded' end as reason
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId', id,
    'bucket', bucket_id,
    'path', object_path,
    'attempt', cleanup_attempts,
    'reason', reason
  ) order by id), '[]'::jsonb)
  into v_items
  from claimed;

  return jsonb_build_object(
    'count', jsonb_array_length(v_items),
    'items', v_items,
    'reconciliation', coalesce(v_reconciliation, '{}'::jsonb)
  );
end;
$function$;

create or replace function public.complete_service_media_cleanup_batch_internal(
  p_actor_id uuid,
  p_results jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_result jsonb;
  v_item_id uuid;
  v_success boolean;
  v_error text;
  v_deleted integer := 0;
  v_failed integer := 0;
begin
  perform private.assert_service_moderation_operator(p_actor_id);
  if jsonb_typeof(coalesce(p_results, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_results) > 100 then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_CLEANUP_RESULTS_INVALID';
  end if;

  for v_result in select value from jsonb_array_elements(p_results)
  loop
    begin
      v_item_id := nullif(btrim(coalesce(v_result ->> 'itemId', '')), '')::uuid;
      v_success := coalesce((v_result ->> 'success')::boolean, false);
    exception when invalid_text_representation then
      raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_CLEANUP_RESULT_INVALID';
    end;
    v_error := left(btrim(coalesce(v_result ->> 'error', '')), 500);

    if v_item_id is null then
      raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_CLEANUP_RESULT_INVALID';
    end if;

    if v_success then
      update private.service_media_upload_items
      set status = 'deleted',
          deleted_at = now(),
          cleanup_claimed_at = null,
          cleanup_claimed_by = null,
          cleanup_eligible_at = null,
          last_cleanup_error = null,
          updated_at = now()
      where id = v_item_id
        and status = 'cleanup_claimed'
        and cleanup_claimed_by = p_actor_id;
      if found then v_deleted := v_deleted + 1; end if;
    else
      update private.service_media_upload_items
      set status = 'delete_failed',
          cleanup_claimed_at = null,
          cleanup_claimed_by = null,
          cleanup_eligible_at = now() + interval '1 hour',
          last_cleanup_error = coalesce(nullif(v_error, ''), 'DOKE_SERVICE_MEDIA_STORAGE_DELETE_FAILED'),
          updated_at = now()
      where id = v_item_id
        and status = 'cleanup_claimed'
        and cleanup_claimed_by = p_actor_id;
      if found then v_failed := v_failed + 1; end if;
    end if;
  end loop;

  return jsonb_build_object('deleted', v_deleted, 'failed', v_failed, 'processed', v_deleted + v_failed);
end;
$function$;

revoke all on function private.service_media_item_is_referenced(uuid)
  from public, anon, authenticated, service_role;
revoke all on function private.sync_service_media_item_version_status()
  from public, anon, authenticated, service_role;
revoke all on function private.reconcile_service_media_cleanup_state()
  from public, anon, authenticated, service_role;
revoke all on function public.prepare_service_media_cleanup_batch_internal(uuid, integer)
  from public, anon, authenticated;
revoke all on function public.complete_service_media_cleanup_batch_internal(uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.prepare_service_media_cleanup_batch_internal(uuid, integer)
  to service_role;
grant execute on function public.complete_service_media_cleanup_batch_internal(uuid, jsonb)
  to service_role;

comment on function private.service_media_item_is_referenced(uuid) is
  'CAT-A04 reference proof across catalog, immutable service versions, service metadata and retained ledger references.';
comment on function public.prepare_service_media_cleanup_batch_internal(uuid, integer) is
  'CAT-A04 moderator-authorized cleanup claim; returns only unreferenced Storage objects after signed-token expiry.';
comment on function public.complete_service_media_cleanup_batch_internal(uuid, jsonb) is
  'CAT-A04 records Storage API deletion outcomes without deleting storage.objects through SQL.';
