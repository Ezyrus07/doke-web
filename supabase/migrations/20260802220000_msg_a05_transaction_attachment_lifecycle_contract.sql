begin;

create table if not exists private.transaction_attachment_lifecycle (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.users(id) on delete cascade,
  resource_kind text not null check (resource_kind in ('order', 'conversation')),
  resource_id uuid not null,
  message_id uuid references public.messages(id) on delete set null,
  bucket_id text not null default 'transaction-attachments',
  object_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0 and size_bytes <= 10485760),
  status text not null default 'pending'
    check (status in ('pending', 'uploaded', 'attached', 'orphaned', 'removed', 'expired', 'failed')),
  intent_expires_at timestamptz not null default (now() + interval '2 hours'),
  retain_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  uploaded_at timestamptz,
  attached_at timestamptz,
  removed_at timestamptz,
  last_error text
);

create index if not exists transaction_attachment_lifecycle_actor_idx
  on private.transaction_attachment_lifecycle(actor_id, created_at desc);
create index if not exists transaction_attachment_lifecycle_resource_idx
  on private.transaction_attachment_lifecycle(resource_kind, resource_id, created_at desc);
create index if not exists transaction_attachment_lifecycle_cleanup_idx
  on private.transaction_attachment_lifecycle(status, coalesce(retain_until, intent_expires_at))
  where status in ('pending', 'uploaded', 'orphaned', 'expired', 'failed');

revoke all on table private.transaction_attachment_lifecycle
  from public, anon, authenticated;
grant select, insert, update, delete on table private.transaction_attachment_lifecycle
  to service_role;

create or replace function private.transaction_attachment_actor_can_access(
  p_actor_id uuid,
  p_resource_kind text,
  p_resource_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  account_status text;
begin
  if p_actor_id is null or p_resource_id is null then
    return false;
  end if;

  select pg_catalog.lower(account.status)
    into account_status
    from public.users account
   where account.id = p_actor_id;

  if account_status is distinct from 'active' then
    return false;
  end if;

  if p_resource_kind = 'order' then
    return exists (
      select 1
        from public.orders order_row
       where order_row.id = p_resource_id
         and p_actor_id in (order_row.client_id, order_row.professional_id)
    );
  end if;

  if p_resource_kind = 'conversation' then
    return exists (
      select 1
        from public.conversations conversation
       where conversation.id = p_resource_id
         and p_actor_id in (conversation.client_id, conversation.professional_id)
    );
  end if;

  return false;
end;
$$;

revoke all privileges on function private.transaction_attachment_actor_can_access(uuid, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.transaction_attachment_actor_can_access(uuid, text, uuid)
  to service_role;

create or replace function private.transaction_attachment_from_path(
  p_object_path text
)
returns private.transaction_attachment_lifecycle
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select lifecycle.*
    from private.transaction_attachment_lifecycle lifecycle
   where lifecycle.bucket_id = 'transaction-attachments'
     and lifecycle.object_path = p_object_path
   limit 1
$$;

revoke all privileges on function private.transaction_attachment_from_path(text)
  from public, anon, authenticated, service_role;
grant execute on function private.transaction_attachment_from_path(text)
  to authenticated, service_role;

create or replace function private.can_read_transaction_attachment(
  p_object_path text,
  p_actor_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  lifecycle private.transaction_attachment_lifecycle;
begin
  if p_actor_id is null then
    return false;
  end if;

  select *
    into lifecycle
    from private.transaction_attachment_lifecycle row_value
   where row_value.bucket_id = 'transaction-attachments'
     and row_value.object_path = p_object_path
     and row_value.status in ('uploaded', 'attached', 'orphaned')
   limit 1;

  if lifecycle.id is null then
    return false;
  end if;

  return private.transaction_attachment_actor_can_access(
    p_actor_id,
    lifecycle.resource_kind,
    lifecycle.resource_id
  );
end;
$$;

revoke all privileges on function private.can_read_transaction_attachment(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_read_transaction_attachment(text, uuid)
  to authenticated, service_role;

create or replace function private.can_upload_transaction_attachment(
  p_object_path text,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
      from private.transaction_attachment_lifecycle lifecycle
     where lifecycle.bucket_id = 'transaction-attachments'
       and lifecycle.object_path = p_object_path
       and lifecycle.actor_id = p_actor_id
       and lifecycle.status = 'pending'
       and lifecycle.intent_expires_at > pg_catalog.now()
       and private.transaction_attachment_actor_can_access(
         p_actor_id,
         lifecycle.resource_kind,
         lifecycle.resource_id
       )
  )
$$;

revoke all privileges on function private.can_upload_transaction_attachment(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function private.can_upload_transaction_attachment(text, uuid)
  to authenticated, service_role;

create or replace function public.prepare_transaction_attachment_uploads_internal(
  p_actor_id uuid,
  p_resource_kind text,
  p_resource_ref text,
  p_files jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  normalized_kind text := pg_catalog.lower(pg_catalog.trim(pg_catalog.coalesce(p_resource_kind, '')));
  resource_id uuid;
  file_value jsonb;
  file_name text;
  mime_type text;
  size_bytes bigint;
  extension text;
  attachment_id uuid;
  object_path text;
  items jsonb := '[]'::jsonb;
begin
  if p_actor_id is null then
    raise exception 'DOKE_ATTACHMENT_AUTH_REQUIRED' using errcode = '42501';
  end if;

  if normalized_kind not in ('order', 'conversation') then
    raise exception 'DOKE_ATTACHMENT_RESOURCE_KIND_INVALID' using errcode = '22023';
  end if;

  begin
    resource_id := p_resource_ref::uuid;
  exception when invalid_text_representation then
    resource_id := null;
  end;

  if resource_id is null and normalized_kind = 'order' then
    select order_row.id into resource_id
      from public.orders order_row
     where order_row.external_id = p_resource_ref
     limit 1;
  elsif resource_id is null and normalized_kind = 'conversation' then
    select conversation.id into resource_id
      from public.conversations conversation
     where conversation.external_id = p_resource_ref
     limit 1;
  end if;

  if resource_id is null then
    raise exception 'DOKE_ATTACHMENT_RESOURCE_NOT_FOUND' using errcode = 'P0002';
  end if;

  if not private.transaction_attachment_actor_can_access(p_actor_id, normalized_kind, resource_id) then
    raise exception 'DOKE_ATTACHMENT_RESOURCE_FORBIDDEN' using errcode = '42501';
  end if;

  if pg_catalog.jsonb_typeof(p_files) is distinct from 'array'
     or pg_catalog.jsonb_array_length(p_files) < 1
     or pg_catalog.jsonb_array_length(p_files) > 8 then
    raise exception 'DOKE_ATTACHMENT_FILE_COUNT_INVALID' using errcode = '22023';
  end if;

  for file_value in select value from pg_catalog.jsonb_array_elements(p_files)
  loop
    file_name := pg_catalog.left(pg_catalog.trim(pg_catalog.coalesce(file_value->>'name', 'anexo')), 180);
    mime_type := pg_catalog.lower(pg_catalog.trim(pg_catalog.coalesce(file_value->>'type', '')));
    begin
      size_bytes := (file_value->>'size')::bigint;
    exception when invalid_text_representation then
      size_bytes := -1;
    end;

    if mime_type not in (
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'application/pdf', 'video/mp4', 'video/webm'
    ) then
      raise exception 'DOKE_ATTACHMENT_MIME_INVALID' using errcode = '22023';
    end if;
    if size_bytes < 0 or size_bytes > 10485760 then
      raise exception 'DOKE_ATTACHMENT_SIZE_INVALID' using errcode = '22023';
    end if;

    extension := case mime_type
      when 'image/jpeg' then '.jpg'
      when 'image/png' then '.png'
      when 'image/webp' then '.webp'
      when 'image/gif' then '.gif'
      when 'application/pdf' then '.pdf'
      when 'video/mp4' then '.mp4'
      when 'video/webm' then '.webm'
      else ''
    end;

    attachment_id := gen_random_uuid();
    object_path := (
      case when normalized_kind = 'conversation' then 'conversations' else 'orders' end
      || '/' || resource_id::text
      || '/' || p_actor_id::text
      || '/' || attachment_id::text || extension
    );

    insert into private.transaction_attachment_lifecycle (
      id,
      actor_id,
      resource_kind,
      resource_id,
      bucket_id,
      object_path,
      original_name,
      mime_type,
      size_bytes,
      status,
      intent_expires_at
    ) values (
      attachment_id,
      p_actor_id,
      normalized_kind,
      resource_id,
      'transaction-attachments',
      object_path,
      file_name,
      mime_type,
      size_bytes,
      'pending',
      pg_catalog.now() + interval '2 hours'
    );

    items := items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'attachmentId', attachment_id,
      'bucket', 'transaction-attachments',
      'path', object_path,
      'name', file_name,
      'type', mime_type,
      'size', size_bytes,
      'expiresAt', pg_catalog.now() + interval '2 hours'
    ));
  end loop;

  return pg_catalog.jsonb_build_object('items', items);
end;
$$;

create or replace function public.confirm_transaction_attachment_uploads_internal(
  p_actor_id uuid,
  p_attachment_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  attachment_id uuid;
  lifecycle private.transaction_attachment_lifecycle;
  items jsonb := '[]'::jsonb;
begin
  if p_actor_id is null then
    raise exception 'DOKE_ATTACHMENT_AUTH_REQUIRED' using errcode = '42501';
  end if;
  if p_attachment_ids is null or pg_catalog.cardinality(p_attachment_ids) < 1
     or pg_catalog.cardinality(p_attachment_ids) > 8 then
    raise exception 'DOKE_ATTACHMENT_CONFIRMATION_INVALID' using errcode = '22023';
  end if;

  foreach attachment_id in array p_attachment_ids
  loop
    select *
      into lifecycle
      from private.transaction_attachment_lifecycle row_value
     where row_value.id = attachment_id
       and row_value.actor_id = p_actor_id
     for update;

    if lifecycle.id is null then
      raise exception 'DOKE_ATTACHMENT_NOT_FOUND' using errcode = 'P0002';
    end if;
    if lifecycle.status <> 'pending' or lifecycle.intent_expires_at <= pg_catalog.now() then
      raise exception 'DOKE_ATTACHMENT_UPLOAD_INTENT_EXPIRED' using errcode = '40001';
    end if;
    if not private.transaction_attachment_actor_can_access(
      p_actor_id, lifecycle.resource_kind, lifecycle.resource_id
    ) then
      raise exception 'DOKE_ATTACHMENT_RESOURCE_FORBIDDEN' using errcode = '42501';
    end if;
    if not exists (
      select 1
        from storage.objects object_row
       where object_row.bucket_id = lifecycle.bucket_id
         and object_row.name = lifecycle.object_path
         and object_row.owner_id = p_actor_id::text
    ) then
      raise exception 'DOKE_ATTACHMENT_UPLOAD_NOT_FOUND' using errcode = 'P0002';
    end if;

    update private.transaction_attachment_lifecycle
       set status = 'uploaded',
           uploaded_at = pg_catalog.now(),
           retain_until = pg_catalog.now() + interval '24 hours',
           updated_at = pg_catalog.now(),
           last_error = null
     where id = attachment_id
     returning * into lifecycle;

    items := items || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'attachmentId', lifecycle.id,
      'bucket', lifecycle.bucket_id,
      'path', lifecycle.object_path,
      'name', lifecycle.original_name,
      'type', lifecycle.mime_type,
      'size', lifecycle.size_bytes,
      'uploadedBy', lifecycle.actor_id,
      'status', lifecycle.status
    ));
  end loop;

  return pg_catalog.jsonb_build_object('items', items);
end;
$$;

create or replace function public.attach_transaction_attachments_to_message_internal(
  p_actor_id uuid,
  p_message_id uuid,
  p_attachment_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  conversation_id uuid;
begin
  select message_row.conversation_id
    into conversation_id
    from public.messages message_row
   where message_row.id = p_message_id
     and message_row.sender_id = p_actor_id;

  if conversation_id is null then
    raise exception 'DOKE_ATTACHMENT_MESSAGE_FORBIDDEN' using errcode = '42501';
  end if;

  if exists (
    select 1
      from private.transaction_attachment_lifecycle lifecycle
     where lifecycle.id = any(p_attachment_ids)
       and (
         lifecycle.actor_id <> p_actor_id
         or lifecycle.resource_kind <> 'conversation'
         or lifecycle.resource_id <> conversation_id
         or lifecycle.status <> 'uploaded'
       )
  ) then
    raise exception 'DOKE_ATTACHMENT_MESSAGE_BINDING_INVALID' using errcode = '42501';
  end if;

  update private.transaction_attachment_lifecycle
     set message_id = p_message_id,
         status = 'attached',
         attached_at = pg_catalog.now(),
         retain_until = null,
         updated_at = pg_catalog.now()
   where id = any(p_attachment_ids)
     and actor_id = p_actor_id;
end;
$$;

create or replace function public.authorize_transaction_attachment_removal_internal(
  p_actor_id uuid,
  p_attachment_id uuid,
  p_reason text default 'user_removed'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  lifecycle private.transaction_attachment_lifecycle;
begin
  select *
    into lifecycle
    from private.transaction_attachment_lifecycle row_value
   where row_value.id = p_attachment_id
   for update;

  if lifecycle.id is null then
    raise exception 'DOKE_ATTACHMENT_NOT_FOUND' using errcode = 'P0002';
  end if;
  if lifecycle.actor_id <> p_actor_id then
    raise exception 'DOKE_ATTACHMENT_OWNERSHIP_FORBIDDEN' using errcode = '42501';
  end if;
  if not private.transaction_attachment_actor_can_access(
    p_actor_id, lifecycle.resource_kind, lifecycle.resource_id
  ) then
    raise exception 'DOKE_ATTACHMENT_RESOURCE_FORBIDDEN' using errcode = '42501';
  end if;
  if lifecycle.status = 'attached' and pg_catalog.coalesce(p_reason, '') <> 'message_removed' then
    raise exception 'DOKE_ATTACHMENT_ATTACHED_REMOVAL_FORBIDDEN' using errcode = '42501';
  end if;

  return pg_catalog.jsonb_build_object(
    'attachmentId', lifecycle.id,
    'bucket', lifecycle.bucket_id,
    'path', lifecycle.object_path,
    'status', lifecycle.status
  );
end;
$$;

create or replace function public.mark_transaction_attachment_removed_internal(
  p_attachment_id uuid,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update private.transaction_attachment_lifecycle
     set status = case when p_error is null then 'removed' else 'failed' end,
         removed_at = case when p_error is null then pg_catalog.now() else removed_at end,
         retain_until = case when p_error is null then null else pg_catalog.now() + interval '1 hour' end,
         updated_at = pg_catalog.now(),
         last_error = pg_catalog.left(p_error, 1000)
   where id = p_attachment_id;
end;
$$;

create or replace function public.list_transaction_attachment_cleanup_candidates_internal(
  p_limit integer default 100
)
returns table (
  attachment_id uuid,
  bucket_id text,
  object_path text
)
language sql
security definer
set search_path = pg_catalog
as $$
  select lifecycle.id, lifecycle.bucket_id, lifecycle.object_path
    from private.transaction_attachment_lifecycle lifecycle
   where (
      lifecycle.status = 'pending'
      and lifecycle.intent_expires_at <= pg_catalog.now()
   ) or (
      lifecycle.status in ('uploaded', 'orphaned', 'expired', 'failed')
      and lifecycle.retain_until is not null
      and lifecycle.retain_until <= pg_catalog.now()
   )
   order by pg_catalog.coalesce(lifecycle.retain_until, lifecycle.intent_expires_at)
   limit pg_catalog.greatest(1, pg_catalog.least(pg_catalog.coalesce(p_limit, 100), 500))
$$;

create or replace function public.mark_transaction_attachment_cleanup_result_internal(
  p_attachment_id uuid,
  p_removed boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  update private.transaction_attachment_lifecycle
     set status = case when p_removed then 'removed' else 'failed' end,
         removed_at = case when p_removed then pg_catalog.now() else removed_at end,
         retain_until = case when p_removed then null else pg_catalog.now() + interval '1 hour' end,
         updated_at = pg_catalog.now(),
         last_error = case when p_removed then null else pg_catalog.left(p_error, 1000) end
   where id = p_attachment_id;
end;
$$;

create or replace function private.mark_removed_message_attachments_orphaned()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if new.status = 'removed' and old.status is distinct from new.status then
    update private.transaction_attachment_lifecycle
       set status = 'orphaned',
           retain_until = pg_catalog.now() + interval '30 days',
           updated_at = pg_catalog.now()
     where message_id = new.id
       and status = 'attached';
  end if;
  return new;
end;
$$;

drop trigger if exists messages_attachment_retention_after_removed on public.messages;
create trigger messages_attachment_retention_after_removed
after update of status on public.messages
for each row
execute function private.mark_removed_message_attachments_orphaned();

do $$
declare
  function_signature regprocedure;
begin
  foreach function_signature in array array[
    'public.prepare_transaction_attachment_uploads_internal(uuid,text,text,jsonb)'::regprocedure,
    'public.confirm_transaction_attachment_uploads_internal(uuid,uuid[])'::regprocedure,
    'public.attach_transaction_attachments_to_message_internal(uuid,uuid,uuid[])'::regprocedure,
    'public.authorize_transaction_attachment_removal_internal(uuid,uuid,text)'::regprocedure,
    'public.mark_transaction_attachment_removed_internal(uuid,text)'::regprocedure,
    'public.list_transaction_attachment_cleanup_candidates_internal(integer)'::regprocedure,
    'public.mark_transaction_attachment_cleanup_result_internal(uuid,boolean,text)'::regprocedure
  ]
  loop
    execute pg_catalog.format(
      'revoke all privileges on function %s from public, anon, authenticated',
      function_signature
    );
    execute pg_catalog.format(
      'grant execute on function %s to service_role',
      function_signature
    );
  end loop;
end;
$$;

drop policy if exists transaction_attachments_participant_select on storage.objects;
drop policy if exists transaction_attachments_participant_insert on storage.objects;
drop policy if exists transaction_attachments_owner_update on storage.objects;
drop policy if exists transaction_attachments_owner_delete on storage.objects;
drop policy if exists transaction_attachments_lifecycle_select on storage.objects;
drop policy if exists transaction_attachments_lifecycle_insert on storage.objects;

create policy transaction_attachments_lifecycle_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and private.can_read_transaction_attachment(name, (select auth.uid()))
  );

create policy transaction_attachments_lifecycle_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'transaction-attachments'
    and private.can_upload_transaction_attachment(name, (select auth.uid()))
  );

-- No authenticated UPDATE or DELETE policy is recreated.
-- Mutations after upload are server-owned and use the Storage API after actor validation.

notify pgrst, 'reload schema';
commit;
