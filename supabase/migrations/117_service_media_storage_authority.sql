-- Doke — service media owner authority without public bucket listing.

begin;

drop policy if exists service_media_bucket_owner_delete on storage.objects;
drop policy if exists service_media_bucket_owner_insert on storage.objects;
drop policy if exists service_media_bucket_owner_update on storage.objects;
drop policy if exists service_media_bucket_owner_select on storage.objects;
drop policy if exists service_media_bucket_public_read on storage.objects;

create policy service_media_bucket_owner_select
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'service-media'
    and owner_id = (select auth.uid())::text
  );

create policy service_media_bucket_owner_insert
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'service-media'
    and public.current_user_role() = 'professional'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy service_media_bucket_owner_update
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'service-media'
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'service-media'
    and public.current_user_role() = 'professional'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy service_media_bucket_owner_delete
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'service-media'
    and owner_id = (select auth.uid())::text
  );

commit;
