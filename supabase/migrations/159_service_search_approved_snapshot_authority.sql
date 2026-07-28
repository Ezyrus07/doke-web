-- SEARCH-001 / SEARCH-A04 hardening
-- Ensure the materialized search document is derived only from the approved
-- service-version snapshot. Pending edits must never influence discovery.

create or replace function private.build_approved_service_search_vector(p_snapshot jsonb)
returns tsvector
language plpgsql
stable
security invoker
set search_path = 'pg_catalog'
as $$
declare
  v_snapshot jsonb := coalesce(p_snapshot, '{}'::jsonb);
  v_tags text := case
    when pg_catalog.jsonb_typeof(v_snapshot -> 'tags') = 'array'
      then coalesce((
        select pg_catalog.string_agg(value, ' ')
        from pg_catalog.jsonb_array_elements_text(v_snapshot -> 'tags') as tag(value)
      ), '')
    else ''
  end;
  v_keywords text := case
    when pg_catalog.jsonb_typeof(v_snapshot -> 'keywords') = 'array'
      then coalesce((
        select pg_catalog.string_agg(value, ' ')
        from pg_catalog.jsonb_array_elements_text(v_snapshot -> 'keywords') as keyword(value)
      ), '')
    else ''
  end;
begin
  return
      pg_catalog.setweight(
        pg_catalog.to_tsvector(
          'pg_catalog.portuguese'::pg_catalog.regconfig,
          extensions.unaccent(coalesce(v_snapshot ->> 'title', ''))
        ),
        'A'
      )
    || pg_catalog.setweight(
        pg_catalog.to_tsvector(
          'pg_catalog.portuguese'::pg_catalog.regconfig,
          extensions.unaccent(
            pg_catalog.concat_ws(
              ' ',
              coalesce(v_snapshot ->> 'description', ''),
              coalesce(v_snapshot ->> 'shortDescription', ''),
              coalesce(v_snapshot ->> 'category', ''),
              coalesce(v_snapshot ->> 'categorySlug', ''),
              coalesce(v_snapshot ->> 'specialty', ''),
              coalesce(v_snapshot ->> 'providerName', ''),
              coalesce(v_snapshot ->> 'providerHandle', ''),
              coalesce(v_snapshot ->> 'providerUsername', ''),
              v_tags,
              v_keywords
            )
          )
        ),
        'B'
      )
    || pg_catalog.setweight(
        pg_catalog.to_tsvector(
          'pg_catalog.portuguese'::pg_catalog.regconfig,
          extensions.unaccent(
            pg_catalog.concat_ws(
              ' ',
              coalesce(v_snapshot ->> 'city', ''),
              coalesce(v_snapshot ->> 'state', ''),
              coalesce(v_snapshot ->> 'staté', ''),
              coalesce(v_snapshot ->> 'neighborhood', ''),
              coalesce(v_snapshot ->> 'location', ''),
              coalesce(v_snapshot ->> 'serviceRegion', '')
            )
          )
        ),
        'C'
      );
end;
$$;

revoke all on function private.build_approved_service_search_vector(jsonb) from public, anon, authenticated;

comment on function private.build_approved_service_search_vector(jsonb) is
  'SEARCH-A04 approved-snapshot-only builder for the public service search document. Pending service edits are excluded by construction.';

create or replace function private.refresh_service_search_vector()
returns trigger
language plpgsql
security invoker
set search_path = 'pg_catalog'
as $$
declare
  v_snapshot jsonb;
begin
  if new.status <> 'published'
     or new.approved_version_id is null
     or new.moderation_status not in ('published', 'changes_pending_review', 'changes_required') then
    new.search_vector := null;
    return new;
  end if;

  select version_row.snapshot
    into v_snapshot
    from public.service_versions version_row
   where version_row.id = new.approved_version_id
     and version_row.service_id = new.id
     and version_row.professional_id = new.professional_id
     and version_row.review_status = 'approved';

  if v_snapshot is null then
    new.search_vector := null;
    return new;
  end if;

  new.search_vector := private.build_approved_service_search_vector(v_snapshot);
  return new;
end;
$$;

revoke all on function private.refresh_service_search_vector() from public, anon, authenticated;

comment on function private.refresh_service_search_vector() is
  'SEARCH-A04 trigger authority that materializes search_vector exclusively from the current approved service-version snapshot.';

drop trigger if exists trg_services_search_vector on public.services;
create trigger trg_services_search_vector
before insert or update of approved_version_id, status, moderation_status, professional_id
on public.services
for each row
execute function private.refresh_service_search_vector();

update public.services service_row
   set search_vector = private.build_approved_service_search_vector(version_row.snapshot)
  from public.service_versions version_row
 where version_row.id = service_row.approved_version_id
   and version_row.service_id = service_row.id
   and version_row.professional_id = service_row.professional_id
   and version_row.review_status = 'approved'
   and service_row.status = 'published'
   and service_row.moderation_status in ('published', 'changes_pending_review', 'changes_required');

update public.services service_row
   set search_vector = null
 where service_row.search_vector is not null
   and not exists (
     select 1
       from public.service_versions version_row
      where version_row.id = service_row.approved_version_id
        and version_row.service_id = service_row.id
        and version_row.professional_id = service_row.professional_id
        and version_row.review_status = 'approved'
        and service_row.status = 'published'
        and service_row.moderation_status in ('published', 'changes_pending_review', 'changes_required')
   );
