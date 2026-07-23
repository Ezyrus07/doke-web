begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'transaction-attachments',
  'transaction-attachments',
  false,
  10485760,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists transaction_attachments_participant_select on storage.objects;
drop policy if exists transaction_attachments_participant_insert on storage.objects;
drop policy if exists transaction_attachments_owner_update on storage.objects;
drop policy if exists transaction_attachments_owner_delete on storage.objects;

drop function if exists public.can_access_transaction_attachment(text);

create or replace function private.can_access_transaction_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = pg_catalog
as $$
declare
  actor_id uuid := auth.uid();
  account_status text;
  parts text[];
  resource_kind text;
  resource_id uuid;
begin
  if actor_id is null then
    return false;
  end if;

  select pg_catalog.lower(account.status)
    into account_status
    from public.users account
   where account.id = actor_id;

  if account_status is distinct from 'active' then
    return false;
  end if;

  parts := storage.foldername(object_name);
  if coalesce(pg_catalog.array_length(parts, 1), 0) < 3 then
    return false;
  end if;

  resource_kind := parts[1];
  begin
    resource_id := parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;

  if resource_kind = 'orders' then
    return exists (
      select 1
        from public.orders order_row
       where order_row.id = resource_id
         and actor_id in (order_row.client_id, order_row.professional_id)
    );
  end if;

  if resource_kind = 'conversations' then
    return exists (
      select 1
        from public.conversations conversation
       where conversation.id = resource_id
         and actor_id in (conversation.client_id, conversation.professional_id)
    );
  end if;

  return false;
end;
$$;

revoke all privileges on function private.can_access_transaction_attachment(text)
  from public, anon, authenticated, service_role;
grant execute on function private.can_access_transaction_attachment(text) to authenticated;

create policy transaction_attachments_participant_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and private.can_access_transaction_attachment(name)
  );

create policy transaction_attachments_participant_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'transaction-attachments'
    and private.can_access_transaction_attachment(name)
    and (storage.foldername(name))[3] = (select auth.uid())::text
  );

create policy transaction_attachments_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and owner_id = (select auth.uid())::text
    and private.can_access_transaction_attachment(name)
    and (storage.foldername(name))[3] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'transaction-attachments'
    and owner_id = (select auth.uid())::text
    and private.can_access_transaction_attachment(name)
    and (storage.foldername(name))[3] = (select auth.uid())::text
  );

create policy transaction_attachments_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'transaction-attachments'
    and owner_id = (select auth.uid())::text
    and private.can_access_transaction_attachment(name)
    and (storage.foldername(name))[3] = (select auth.uid())::text
  );

notify pgrst, 'reload schema';
commit;
