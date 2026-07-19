-- Doke shared service catalog runtime.
-- Makes published listings readable across accounts/devices while keeping writes owner-scoped.

alter table public.services
  add column if not exists external_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists idx_services_external_id
  on public.services(external_id)
  where external_id is not null;

create index if not exists idx_services_published_updated
  on public.services(status, updated_at desc);

alter table public.services enable row level security;
alter table public.service_media enable row level security;

-- Recreate policies idempotently.
drop policy if exists services_public_read_published on public.services;
create policy services_public_read_published
  on public.services
  for select
  using (status = 'published' or professional_id = auth.uid());

drop policy if exists services_owner_insert on public.services;
create policy services_owner_insert
  on public.services
  for insert
  with check (professional_id = auth.uid());

drop policy if exists services_owner_update on public.services;
create policy services_owner_update
  on public.services
  for update
  using (professional_id = auth.uid())
  with check (professional_id = auth.uid());

drop policy if exists services_owner_delete on public.services;
create policy services_owner_delete
  on public.services
  for delete
  using (professional_id = auth.uid());

drop policy if exists service_media_public_read on public.service_media;
create policy service_media_public_read
  on public.service_media
  for select
  using (
    exists (
      select 1
      from public.services s
      where s.id = service_media.service_id
        and (s.status = 'published' or s.professional_id = auth.uid())
    )
  );

drop policy if exists service_media_owner_insert on public.service_media;
create policy service_media_owner_insert
  on public.service_media
  for insert
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_media.service_id
        and s.professional_id = auth.uid()
    )
  );

drop policy if exists service_media_owner_update on public.service_media;
create policy service_media_owner_update
  on public.service_media
  for update
  using (
    exists (
      select 1 from public.services s
      where s.id = service_media.service_id
        and s.professional_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.services s
      where s.id = service_media.service_id
        and s.professional_id = auth.uid()
    )
  );

drop policy if exists service_media_owner_delete on public.service_media;
create policy service_media_owner_delete
  on public.service_media
  for delete
  using (
    exists (
      select 1 from public.services s
      where s.id = service_media.service_id
        and s.professional_id = auth.uid()
    )
  );

-- Public service media bucket. Uploads remain owner-scoped by the first path segment (auth.uid()).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'service-media',
  'service-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists service_media_bucket_public_read on storage.objects;
create policy service_media_bucket_public_read
  on storage.objects
  for select
  using (bucket_id = 'service-media');

drop policy if exists service_media_bucket_owner_insert on storage.objects;
create policy service_media_bucket_owner_insert
  on storage.objects
  for insert
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists service_media_bucket_owner_update on storage.objects;
create policy service_media_bucket_owner_update
  on storage.objects
  for update
  using (
    bucket_id = 'service-media'
    and owner_id = auth.uid()::text
  )
  with check (
    bucket_id = 'service-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists service_media_bucket_owner_delete on storage.objects;
create policy service_media_bucket_owner_delete
  on storage.objects
  for delete
  using (
    bucket_id = 'service-media'
    and owner_id = auth.uid()::text
  );
