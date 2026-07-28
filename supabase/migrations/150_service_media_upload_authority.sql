-- CAT-001 / CAT-A04 candidate 1: immutable service-media upload reservation.
-- Browser clients prepare exact object paths through the JWT-verified self-service
-- Edge Function, upload only with signed tokens, and consume the intent atomically
-- with the versioned service submission.

create table if not exists private.service_media_upload_intents (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  external_id text not null,
  status text not null default 'prepared'
    check (status in ('prepared', 'consumed', 'expired', 'cancelled')),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  service_id uuid references public.services(id) on delete set null,
  service_version_id uuid references public.service_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(external_id) between 1 and 140),
  check (expires_at > created_at),
  check ((status = 'consumed') = (consumed_at is not null))
);

create index if not exists idx_service_media_upload_intents_actor_status
  on private.service_media_upload_intents(actor_id, status, created_at desc);
create index if not exists idx_service_media_upload_intents_expiry
  on private.service_media_upload_intents(expires_at)
  where status = 'prepared';

create table if not exists private.service_media_upload_items (
  id uuid primary key default gen_random_uuid(),
  intent_id uuid not null references private.service_media_upload_intents(id) on delete cascade,
  actor_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('upload', 'retain')),
  sort_order smallint not null check (sort_order between 0 and 2),
  bucket_id text not null default 'service-media' check (bucket_id = 'service-media'),
  object_path text,
  retained_url text,
  canonical_url text,
  file_name text,
  mime_type text,
  size_bytes bigint,
  status text not null default 'prepared'
    check (status in ('prepared', 'consumed', 'superseded', 'cleanup_eligible', 'deleted')),
  service_id uuid references public.services(id) on delete set null,
  service_version_id uuid references public.service_versions(id) on delete set null,
  consumed_at timestamptz,
  superseded_at timestamptz,
  cleanup_eligible_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(intent_id, sort_order),
  check (
    (kind = 'upload'
      and object_path is not null
      and retained_url is null
      and file_name is not null
      and mime_type is not null
      and size_bytes is not null)
    or
    (kind = 'retain'
      and object_path is null
      and retained_url is not null)
  )
);

create unique index if not exists idx_service_media_upload_items_object_path
  on private.service_media_upload_items(bucket_id, object_path)
  where object_path is not null;
create index if not exists idx_service_media_upload_items_version
  on private.service_media_upload_items(service_version_id, sort_order);
create index if not exists idx_service_media_upload_items_cleanup
  on private.service_media_upload_items(status, cleanup_eligible_at)
  where status = 'cleanup_eligible';

revoke all privileges on table
  private.service_media_upload_intents,
  private.service_media_upload_items
from public, anon, authenticated, service_role;

create or replace function public.create_service_media_upload_intent_internal(
  p_actor_id uuid,
  p_external_id text,
  p_files jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_external_id text := btrim(coalesce(p_external_id, ''));
  v_intent_id uuid := gen_random_uuid();
  v_expires_at timestamptz := now() + interval '30 minutes';
  v_service_id uuid;
  v_service_owner uuid;
  v_item jsonb;
  v_kind text;
  v_file_name text;
  v_mime text;
  v_size bigint;
  v_extension text;
  v_object_path text;
  v_retained_url text;
  v_sort_order integer;
  v_items jsonb;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SERVICE_MEDIA_AUTH_REQUIRED';
  end if;
  if v_external_id = '' or char_length(v_external_id) > 140 then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_EXTERNAL_ID_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_files, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_files) < 1
     or jsonb_array_length(p_files) > 3 then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_FILES_INVALID';
  end if;

  if not exists (
    select 1
    from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = p_actor_id
      and u.role = 'professional'
      and u.status = 'active'
      and u.onboarding_status = 'completed'
      and p.setup_status = 'active'
      and p.verification_status = 'verified'
      and p.document_status = 'verified'
  ) then
    raise exception using errcode = '42501', message = 'PROFESSIONAL_APPROVAL_REQUIRED';
  end if;

  select s.id, s.professional_id
  into v_service_id, v_service_owner
  from public.services s
  where s.external_id = v_external_id
  limit 1;

  if v_service_id is not null and v_service_owner <> p_actor_id then
    raise exception using errcode = '42501', message = 'SERVICE_OWNERSHIP_REQUIRED';
  end if;

  update private.service_media_upload_intents
  set status = 'expired', updated_at = now()
  where actor_id = p_actor_id
    and external_id = v_external_id
    and status = 'prepared'
    and expires_at <= now();

  insert into private.service_media_upload_intents (
    id, actor_id, external_id, status, expires_at, created_at, updated_at
  ) values (
    v_intent_id, p_actor_id, v_external_id, 'prepared', v_expires_at, now(), now()
  );

  for v_item, v_sort_order in
    select value, ordinality::integer - 1
    from jsonb_array_elements(p_files) with ordinality
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_FILE_INVALID';
    end if;

    v_kind := lower(btrim(coalesce(v_item ->> 'kind', 'upload')));
    if v_kind not in ('upload', 'retain') then
      raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_KIND_INVALID';
    end if;

    if v_kind = 'retain' then
      if v_service_id is null then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_RETAIN_NEW_SERVICE_INVALID';
      end if;
      v_retained_url := btrim(coalesce(v_item ->> 'url', ''));
      if v_retained_url = '' or char_length(v_retained_url) > 2048 then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_RETAIN_URL_INVALID';
      end if;
      if not (
        exists (
          select 1
          from public.service_media m
          where m.service_id = v_service_id
            and m.url = v_retained_url
        )
        or exists (
          select 1
          from public.service_versions v
          cross join lateral jsonb_array_elements_text(
            case
              when jsonb_typeof(v.snapshot -> 'images') = 'array' then v.snapshot -> 'images'
              else '[]'::jsonb
            end
          ) image_url
          where v.service_id = v_service_id
            and image_url.value = v_retained_url
        )
      ) then
        raise exception using errcode = '42501', message = 'DOKE_SERVICE_MEDIA_RETAIN_REFERENCE_FORBIDDEN';
      end if;

      insert into private.service_media_upload_items (
        intent_id, actor_id, kind, sort_order, retained_url, status
      ) values (
        v_intent_id, p_actor_id, 'retain', v_sort_order, v_retained_url, 'prepared'
      );
    else
      v_file_name := regexp_replace(
        btrim(coalesce(v_item ->> 'fileName', '')),
        '[[:cntrl:]/\\]+',
        '-',
        'g'
      );
      v_mime := lower(btrim(coalesce(v_item ->> 'type', '')));
      begin
        v_size := (v_item ->> 'size')::bigint;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_SIZE_INVALID';
      end;

      if char_length(v_file_name) < 1 or char_length(v_file_name) > 180 then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_FILENAME_INVALID';
      end if;
      if v_mime not in ('image/jpeg', 'image/png', 'image/webp', 'image/gif') then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_TYPE_INVALID';
      end if;
      if v_size < 1 or v_size > 10485760 then
        raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_SIZE_INVALID';
      end if;

      v_extension := case v_mime
        when 'image/jpeg' then '.jpg'
        when 'image/png' then '.png'
        when 'image/webp' then '.webp'
        when 'image/gif' then '.gif'
        else ''
      end;
      v_object_path := format(
        'pending/%s/%s/%s-%s%s',
        p_actor_id,
        v_intent_id,
        lpad((v_sort_order + 1)::text, 2, '0'),
        gen_random_uuid(),
        v_extension
      );

      insert into private.service_media_upload_items (
        intent_id, actor_id, kind, sort_order, bucket_id, object_path,
        file_name, mime_type, size_bytes, status
      ) values (
        v_intent_id, p_actor_id, 'upload', v_sort_order, 'service-media', v_object_path,
        v_file_name, v_mime, v_size, 'prepared'
      );
    end if;
  end loop;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemId', i.id,
        'kind', i.kind,
        'sortOrder', i.sort_order,
        'bucket', i.bucket_id,
        'path', i.object_path,
        'url', i.retained_url,
        'fileName', i.file_name,
        'type', i.mime_type,
        'size', i.size_bytes
      )
      order by i.sort_order
    ),
    '[]'::jsonb
  )
  into v_items
  from private.service_media_upload_items i
  where i.intent_id = v_intent_id;

  return jsonb_build_object(
    'intentId', v_intent_id,
    'externalId', v_external_id,
    'expiresAt', v_expires_at,
    'items', v_items
  );
end;
$function$;

create or replace function public.get_service_media_upload_intent_internal(
  p_actor_id uuid,
  p_upload_intent_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_intent private.service_media_upload_intents%rowtype;
  v_items jsonb;
begin
  if p_actor_id is null then
    raise exception using errcode = '28000', message = 'DOKE_SERVICE_MEDIA_AUTH_REQUIRED';
  end if;
  if p_upload_intent_id is null then
    raise exception using errcode = '22023', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_REQUIRED';
  end if;

  update private.service_media_upload_intents
  set status = 'expired', updated_at = now()
  where id = p_upload_intent_id
    and status = 'prepared'
    and expires_at <= now();

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
  if v_intent.status <> 'prepared' then
    raise exception using errcode = '55000', message = 'DOKE_SERVICE_MEDIA_UPLOAD_INTENT_NOT_PREPARED';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'itemId', i.id,
        'kind', i.kind,
        'sortOrder', i.sort_order,
        'bucket', i.bucket_id,
        'path', i.object_path,
        'url', i.retained_url,
        'fileName', i.file_name,
        'type', i.mime_type,
        'size', i.size_bytes
      )
      order by i.sort_order
    ),
    '[]'::jsonb
  )
  into v_items
  from private.service_media_upload_items i
  where i.intent_id = v_intent.id;

  return jsonb_build_object(
    'intentId', v_intent.id,
    'externalId', v_intent.external_id,
    'expiresAt', v_intent.expires_at,
    'items', v_items
  );
end;
$function$;

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

  if jsonb_array_length(p_public_urls) <> (
    select count(*) from private.service_media_upload_items i where i.intent_id = v_intent.id
  ) then
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

revoke all on function public.create_service_media_upload_intent_internal(uuid, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.get_service_media_upload_intent_internal(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.submit_service_for_review_with_media_internal(uuid, text, jsonb, text, uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.create_service_media_upload_intent_internal(uuid, text, jsonb)
  to service_role;
grant execute on function public.get_service_media_upload_intent_internal(uuid, uuid)
  to service_role;
grant execute on function public.submit_service_for_review_with_media_internal(uuid, text, jsonb, text, uuid, jsonb)
  to service_role;

drop policy if exists service_media_owner_insert on public.service_media;
drop policy if exists service_media_owner_update on public.service_media;
drop policy if exists service_media_owner_delete on public.service_media;
drop policy if exists "professionals manage own service media" on public.service_media;
revoke insert, update, delete on table public.service_media from anon, authenticated;

drop policy if exists service_media_bucket_owner_insert on storage.objects;
drop policy if exists service_media_bucket_owner_update on storage.objects;
drop policy if exists service_media_bucket_owner_delete on storage.objects;

comment on table private.service_media_upload_intents is
  'CAT-A04 short-lived service-media upload reservations generated by server authority.';
comment on table private.service_media_upload_items is
  'CAT-A04 canonical service-media item ledger; browser clients cannot choose mutable object paths.';
comment on function public.create_service_media_upload_intent_internal(uuid, text, jsonb) is
  'CAT-A04 service-role-only immutable service-media upload reservation.';
comment on function public.get_service_media_upload_intent_internal(uuid, uuid) is
  'CAT-A04 service-role-only upload-intent projection for signed URL issuance and submission.';
comment on function public.submit_service_for_review_with_media_internal(uuid, text, jsonb, text, uuid, jsonb) is
  'CAT-A04 atomic upload-intent consumption and versioned service submission.';
