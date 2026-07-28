-- CAT-001 / CAT-A04: require an explicit item count when consuming an upload intent.
-- This prevents an empty or malformed intent from reaching the versioned submission path.

create or replace function public.submit_service_for_review_with_media_internal(
  p_actor_id uuid,
  p_external_id text,
  p_snapshot jsonb,
  p_change_class text,
  p_upload_intent_id uuid,
  p_public_urls jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_external_id text := btrim(coalesce(p_external_id, ''));
  v_intent private.service_media_upload_intents%rowtype;
  v_item private.service_media_upload_items%rowtype;
  v_item_count integer;
  v_images jsonb := '[]'::jsonb;
  v_assets jsonb := '[]'::jsonb;
  v_snapshot jsonb;
  v_url text;
  v_result jsonb;
  v_service_id uuid;
  v_version_id uuid;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SERVICE_MEDIA_AUTH_REQUIRED';
  end if;
  if v_external_id = '' or char_length(v_external_id) > 140 then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_EXTERNAL_ID_INVALID';
  end if;
  if p_upload_intent_id is null then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED';
  end if;
  if jsonb_typeof(coalesce(p_snapshot, 'null'::jsonb)) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_SNAPSHOT_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_public_urls, 'null'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_PUBLIC_URLS_INVALID';
  end if;

  select *
  into v_intent
  from private.service_media_upload_intents
  where id = p_upload_intent_id
  for update;

  if v_intent.id is null then
    raise exception using errcode = 'P0002', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_NOT_FOUND';
  end if;
  if v_intent.actor_id <> p_actor_id then
    raise exception using errcode = '42501', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_OWNERSHIP_REQUIRED';
  end if;
  if v_intent.external_id <> v_external_id then
    raise exception using errcode = '42501', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_SUBJECT_MISMATCH';
  end if;
  if v_intent.status <> 'prepared' then
    raise exception using errcode = '55000', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_NOT_PREPARED';
  end if;
  if v_intent.expires_at <= now() then
    update private.service_media_upload_intents
    set status = 'expired', updated_at = now()
    where id = v_intent.id;
    raise exception using errcode = '55000', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_EXPIRED';
  end if;

  select count(*)
  into v_item_count
  from private.service_media_upload_items i
  where i.intent_id = v_intent.id;

  if v_item_count < 1 or v_item_count > 3
     or jsonb_array_length(p_public_urls) <> v_item_count then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_PUBLIC_URLS_INVALID';
  end if;

  for v_item in
    select *
    from private.service_media_upload_items i
    where i.intent_id = v_intent.id
    order by i.sort_order
    for update
  loop
    v_url := btrim(coalesce(p_public_urls ->> v_item.sort_order, ''));
    if v_url = '' or char_length(v_url) > 2048 then
      raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_PUBLIC_URL_INVALID';
    end if;

    if v_item.kind = 'retain' then
      if v_url <> v_item.retained_url then
        raise exception using errcode = '42501', message = 'DOKE_SERVICE_MEDIA_RETAIN_REFERENCE_MISMATCH';
      end if;
    else
      if not exists (
        select 1
        from storage.objects o
        where o.bucket_id = v_item.bucket_id
          and o.name = v_item.object_path
      ) then
        raise exception using errcode = 'P0002', message = 'DOKE_SERVICE_MEDIA_OBJECT_NOT_FOUND';
      end if;
    end if;

    v_images := v_images || jsonb_build_array(v_url);
    v_assets := v_assets || jsonb_build_array(jsonb_build_object(
      'assetId', v_item.id,
      'kind', v_item.kind,
      'sortOrder', v_item.sort_order,
      'bucket', v_item.bucket_id,
      'path', v_item.object_path,
      'url', v_url
    ));
  end loop;

  v_snapshot := (p_snapshot - 'images' - 'image' - 'mediaAssets')
    || jsonb_build_object(
      'images', v_images,
      'image', v_images ->> 0,
      'mediaAssets', v_assets
    );

  perform set_config('request.jwt.claim.sub', p_actor_id::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object('sub', p_actor_id::text, 'role', 'authenticated')::text,
    true
  );

  v_result := public.submit_service_for_review(
    p_external_id := v_external_id,
    p_snapshot := v_snapshot,
    p_change_class := coalesce(nullif(btrim(p_change_class), ''), 'major')
  );

  v_service_id := nullif(v_result ->> 'serviceId', '')::uuid;
  v_version_id := nullif(v_result ->> 'versionId', '')::uuid;

  update private.service_media_upload_intents
  set status = 'consumed',
      consumed_at = now(),
      service_id = v_service_id,
      service_version_id = v_version_id,
      updated_at = now()
  where id = v_intent.id;

  update private.service_media_upload_items
  set status = 'consumed',
      canonical_url = case when kind = 'retain' then retained_url else p_public_urls ->> sort_order end,
      service_id = v_service_id,
      service_version_id = v_version_id,
      consumed_at = now(),
      updated_at = now()
  where intent_id = v_intent.id;

  return coalesce(v_result, '{}'::jsonb) || jsonb_build_object(
    'uploadIntentId', v_intent.id,
    'mediaUrls', v_images,
    'mediaAssets', v_assets
  );
end;
$function$;

revoke all on function public.submit_service_for_review_with_media_internal(uuid, text, jsonb, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_service_for_review_with_media_internal(uuid, text, jsonb, text, uuid, jsonb)
  to service_role;
