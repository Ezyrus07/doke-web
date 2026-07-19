-- Doke: private Storage authority for order and conversation attachments.
-- Apply after 009, 010 and 011.

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

create or replace function public.can_access_transaction_attachment(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  parts text[];
  resource_kind text;
  resource_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  parts := storage.foldername(object_name);
  if coalesce(array_length(parts, 1), 0) < 2 then
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
      from public.orders o
      where o.id = resource_id
        and (auth.uid() = o.client_id or auth.uid() = o.professional_id)
    );
  end if;

  if resource_kind = 'conversations' then
    return exists (
      select 1
      from public.conversations c
      where c.id = resource_id
        and (auth.uid() = c.client_id or auth.uid() = c.professional_id)
    );
  end if;

  return false;
end;
$$;

revoke all on function public.can_access_transaction_attachment(text) from public;
grant execute on function public.can_access_transaction_attachment(text) to authenticated;

alter table storage.objects enable row level security;

drop policy if exists transaction_attachments_participant_select on storage.objects;
drop policy if exists transaction_attachments_participant_insert on storage.objects;
drop policy if exists transaction_attachments_owner_update on storage.objects;
drop policy if exists transaction_attachments_owner_delete on storage.objects;

create policy transaction_attachments_participant_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and public.can_access_transaction_attachment(name)
);

create policy transaction_attachments_participant_insert
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'transaction-attachments'
  and public.can_access_transaction_attachment(name)
  and (storage.foldername(name))[3] = auth.uid()::text
);

create policy transaction_attachments_owner_update
on storage.objects for update
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and public.can_access_transaction_attachment(name)
  and (storage.foldername(name))[3] = auth.uid()::text
)
with check (
  bucket_id = 'transaction-attachments'
  and public.can_access_transaction_attachment(name)
  and (storage.foldername(name))[3] = auth.uid()::text
);

create policy transaction_attachments_owner_delete
on storage.objects for delete
to authenticated
using (
  bucket_id = 'transaction-attachments'
  and public.can_access_transaction_attachment(name)
  and (storage.foldername(name))[3] = auth.uid()::text
);

comment on function public.can_access_transaction_attachment(text) is
  'Checks whether the authenticated user participates in the order/conversation encoded in a private Storage object path.';
