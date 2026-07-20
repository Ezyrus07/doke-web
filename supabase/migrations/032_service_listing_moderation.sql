begin;

alter table public.services
  add column if not exists moderation_status text not null default 'draft',
  add column if not exists approved_version_id uuid,
  add column if not exists pending_version_id uuid,
  add column if not exists review_reason text,
  add column if not exists review_submitted_at timestamptz,
  add column if not exists reviewed_at timestamptz;

alter table public.services drop constraint if exists services_moderation_status_check;
alter table public.services add constraint services_moderation_status_check
  check (moderation_status in (
    'draft', 'pending_review', 'published', 'changes_pending_review',
    'changes_required', 'rejected', 'suspended'
  ));

create table if not exists public.service_versions (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  version_number integer not null check (version_number > 0),
  source text not null default 'create' check (source in ('create', 'edit', 'resubmit')),
  change_class text not null default 'major' check (change_class in ('minor', 'major', 'critical')),
  review_status text not null default 'pending_review' check (review_status in (
    'pending_review', 'approved', 'changes_required', 'rejected', 'superseded'
  )),
  snapshot jsonb not null default '{}'::jsonb,
  change_summary jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  review_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_id, version_number)
);

create index if not exists idx_service_versions_queue
  on public.service_versions(review_status, submitted_at desc);
create index if not exists idx_service_versions_owner
  on public.service_versions(professional_id, submitted_at desc);
create index if not exists idx_service_versions_service
  on public.service_versions(service_id, version_number desc);

alter table public.services
  drop constraint if exists services_approved_version_id_fkey,
  drop constraint if exists services_pending_version_id_fkey;
alter table public.services
  add constraint services_approved_version_id_fkey
    foreign key (approved_version_id) references public.service_versions(id) on delete set null,
  add constraint services_pending_version_id_fkey
    foreign key (pending_version_id) references public.service_versions(id) on delete set null;

alter table public.service_versions enable row level security;

drop policy if exists service_versions_owner_read on public.service_versions;
create policy service_versions_owner_read
  on public.service_versions for select
  to authenticated
  using ((select auth.uid()) = professional_id);

drop policy if exists service_versions_admin_read on public.service_versions;
create policy service_versions_admin_read
  on public.service_versions for select
  to authenticated
  using (public.is_active_admin_or_moderator());

grant select on public.service_versions to authenticated;
revoke insert, update, delete on public.service_versions from anon, authenticated;

create or replace function public.service_snapshot_text(
  p_snapshot jsonb,
  p_key text,
  p_fallback text default ''
)
returns text
language sql
immutable
set search_path = public
as $$
  select trim(coalesce(p_snapshot ->> p_key, p_fallback, ''));
$$;

create or replace function public.validate_service_review_snapshot(p_snapshot jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_title text := public.service_snapshot_text(p_snapshot, 'title');
  v_category text := public.service_snapshot_text(p_snapshot, 'category');
  v_short text := public.service_snapshot_text(p_snapshot, 'shortDescription');
  v_description text := coalesce(
    nullif(public.service_snapshot_text(p_snapshot, 'description'), ''),
    public.service_snapshot_text(p_snapshot, 'fullDescription')
  );
  v_quote_mode text := lower(coalesce(nullif(public.service_snapshot_text(p_snapshot, 'quoteMode'), ''), 'default'));
  v_images jsonb := coalesce(p_snapshot -> 'images', '[]'::jsonb);
begin
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'SERVICE_SNAPSHOT_INVALID' using errcode = '22023';
  end if;
  if char_length(v_title) < 5 or char_length(v_title) > 70 then
    raise exception 'SERVICE_TITLE_INVALID' using errcode = '22023';
  end if;
  if v_category = '' or char_length(v_category) > 80 then
    raise exception 'SERVICE_CATEGORY_INVALID' using errcode = '22023';
  end if;
  if char_length(v_short) < 20 or char_length(v_short) > 180 then
    raise exception 'SERVICE_SHORT_DESCRIPTION_INVALID' using errcode = '22023';
  end if;
  if char_length(v_description) < 40 or char_length(v_description) > 1200 then
    raise exception 'SERVICE_DESCRIPTION_INVALID' using errcode = '22023';
  end if;
  if v_quote_mode not in ('default', 'custom', 'disabled') then
    raise exception 'SERVICE_QUOTE_MODE_INVALID' using errcode = '22023';
  end if;
  if jsonb_typeof(v_images) <> 'array'
     or jsonb_array_length(v_images) < 1
     or jsonb_array_length(v_images) > 3 then
    raise exception 'SERVICE_IMAGES_INVALID' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.doke_price_cents_from_snapshot(p_snapshot jsonb)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_raw text := regexp_replace(
    coalesce(p_snapshot ->> 'priceLabel', p_snapshot ->> 'priceValue', ''),
    '[^0-9,.-]', '', 'g'
  );
  v_numeric numeric;
begin
  if v_raw = '' then return null; end if;
  begin
    v_numeric := replace(replace(v_raw, '.', ''), ',', '.')::numeric;
  exception when others then
    return null;
  end;
  if v_numeric < 0 then return null; end if;
  return round(v_numeric * 100)::integer;
end;
$$;

create or replace function public.submit_service_for_review(
  p_external_id text,
  p_snapshot jsonb,
  p_change_class text default 'major'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user uuid := auth.uid();
  v_external_id text := trim(coalesce(p_external_id, ''));
  v_service public.services%rowtype;
  v_version public.service_versions%rowtype;
  v_version_number integer;
  v_title text;
  v_slug text;
  v_description text;
  v_price_mode text;
  v_price_cents integer;
  v_city text;
  v_state text;
  v_is_new boolean := false;
  v_source text := 'edit';
  v_change_class text := lower(trim(coalesce(p_change_class, 'major')));
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if v_external_id = '' or char_length(v_external_id) > 140 then
    raise exception 'SERVICE_EXTERNAL_ID_INVALID' using errcode = '22023';
  end if;
  if v_change_class not in ('minor', 'major', 'critical') then
    v_change_class := 'major';
  end if;

  if not exists (
    select 1
    from public.users u
    join public.professional_profiles p on p.user_id = u.id
    where u.id = v_user
      and u.role = 'professional'
      and u.status = 'active'
      and u.onboarding_status = 'completed'
      and p.setup_status = 'active'
      and p.verification_status = 'verified'
      and p.document_status = 'verified'
  ) then
    raise exception 'PROFESSIONAL_APPROVAL_REQUIRED' using errcode = '42501';
  end if;

  perform public.validate_service_review_snapshot(p_snapshot);

  v_title := public.service_snapshot_text(p_snapshot, 'title');
  v_slug := lower(regexp_replace(v_title, '[^[:alnum:]]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'servico'; end if;
  v_description := coalesce(
    nullif(public.service_snapshot_text(p_snapshot, 'description'), ''),
    public.service_snapshot_text(p_snapshot, 'fullDescription')
  );
  v_price_mode := lower(public.service_snapshot_text(p_snapshot, 'remotePriceMode', 'quote'));
  if v_price_mode not in ('quote', 'fixed', 'from') then v_price_mode := 'quote'; end if;
  v_price_cents := public.doke_price_cents_from_snapshot(p_snapshot);
  v_city := public.service_snapshot_text(p_snapshot, 'city');
  v_state := public.service_snapshot_text(p_snapshot, 'state');

  select * into v_service
  from public.services
  where external_id = v_external_id
  limit 1
  for update;

  if v_service.id is null then
    v_is_new := true;
    v_source := 'create';
    perform set_config('doke.service_moderation_apply', 'on', true);
    insert into public.services (
      professional_id, external_id, title, slug, description,
      price_mode, price_cents, currency, status, city, state, metadata,
      moderation_status, review_submitted_at
    ) values (
      v_user, v_external_id, v_title,
      left(v_slug || '-' || right(replace(v_external_id, '-', ''), 10), 96),
      v_description, v_price_mode, v_price_cents, 'BRL', 'draft',
      v_city, v_state, p_snapshot, 'pending_review', now()
    ) returning * into v_service;
  elsif v_service.professional_id <> v_user then
    raise exception 'SERVICE_OWNERSHIP_REQUIRED' using errcode = '42501';
  else
    v_source := case when v_service.moderation_status = 'changes_required' then 'resubmit' else 'edit' end;
  end if;

  update public.service_versions
  set review_status = 'superseded', updated_at = now()
  where service_id = v_service.id
    and review_status in ('pending_review', 'changes_required');

  select coalesce(max(version_number), 0) + 1
  into v_version_number
  from public.service_versions
  where service_id = v_service.id;

  insert into public.service_versions (
    service_id, professional_id, version_number, source, change_class,
    review_status, snapshot, change_summary, submitted_at
  ) values (
    v_service.id, v_user, v_version_number, v_source, v_change_class,
    'pending_review', p_snapshot,
    jsonb_build_object(
      'titleChanged', coalesce(v_service.title, '') is distinct from v_title,
      'categoryChanged', coalesce(v_service.metadata ->> 'category', '') is distinct from public.service_snapshot_text(p_snapshot, 'category'),
      'priceChanged', coalesce(v_service.price_cents, -1) is distinct from coalesce(v_price_cents, -1),
      'imagesChanged', coalesce(v_service.metadata -> 'images', '[]'::jsonb) is distinct from coalesce(p_snapshot -> 'images', '[]'::jsonb),
      'quoteChanged', coalesce(v_service.metadata -> 'quoteTemplate', '{}'::jsonb) is distinct from coalesce(p_snapshot -> 'quoteTemplate', '{}'::jsonb)
    ),
    now()
  ) returning * into v_version;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set pending_version_id = v_version.id,
      moderation_status = case when approved_version_id is null then 'pending_review' else 'changes_pending_review' end,
      review_reason = null,
      review_submitted_at = now(),
      reviewed_at = null,
      updated_at = now()
  where id = v_service.id
  returning * into v_service;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'versionId', v_version.id,
    'versionNumber', v_version.version_number,
    'moderationStatus', v_service.moderation_status,
    'publicStatus', v_service.status,
    'isNew', v_is_new,
    'submittedAt', v_version.submitted_at
  );
end;
$$;

create or replace function public.apply_service_version_snapshot(
  p_service_id uuid,
  p_snapshot jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_title text := public.service_snapshot_text(p_snapshot, 'title');
  v_slug text;
  v_description text := coalesce(
    nullif(public.service_snapshot_text(p_snapshot, 'description'), ''),
    public.service_snapshot_text(p_snapshot, 'fullDescription')
  );
  v_price_mode text := lower(public.service_snapshot_text(p_snapshot, 'remotePriceMode', 'quote'));
  v_price_cents integer := public.doke_price_cents_from_snapshot(p_snapshot);
  v_images jsonb := coalesce(p_snapshot -> 'images', '[]'::jsonb);
begin
  v_slug := lower(regexp_replace(v_title, '[^[:alnum:]]+', '-', 'g'));
  v_slug := trim(both '-' from v_slug);
  if v_slug = '' then v_slug := 'servico'; end if;
  if v_price_mode not in ('quote', 'fixed', 'from') then v_price_mode := 'quote'; end if;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set title = v_title,
      slug = left(v_slug || '-' || right(replace(external_id, '-', ''), 10), 96),
      description = v_description,
      price_mode = v_price_mode,
      price_cents = v_price_cents,
      currency = coalesce(nullif(public.service_snapshot_text(p_snapshot, 'currency'), ''), 'BRL'),
      city = public.service_snapshot_text(p_snapshot, 'city'),
      state = public.service_snapshot_text(p_snapshot, 'state'),
      metadata = p_snapshot,
      status = 'published',
      moderation_status = 'published',
      review_reason = null,
      reviewed_at = now(),
      updated_at = now()
  where id = p_service_id;

  delete from public.service_media where service_id = p_service_id;
  insert into public.service_media(service_id, media_type, url, thumbnail_url, alt_text, sort_order)
  select p_service_id, 'image', value, value, v_title || ' — imagem ' || ordinality, ordinality - 1
  from jsonb_array_elements_text(v_images) with ordinality;
end;
$$;

create or replace function public.approve_service_version(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_version public.service_versions%rowtype;
  v_service public.services%rowtype;
begin
  if v_admin is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;

  select * into v_version from public.service_versions where id = p_version_id for update;
  if v_version.id is null then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_version.review_status <> 'pending_review' then raise exception 'SERVICE_VERSION_NOT_PENDING' using errcode = '22023'; end if;

  perform public.apply_service_version_snapshot(v_version.service_id, v_version.snapshot);

  update public.service_versions
  set review_status = 'superseded', updated_at = now()
  where service_id = v_version.service_id and review_status = 'approved' and id <> v_version.id;

  update public.service_versions
  set review_status = 'approved', reviewed_at = now(), reviewed_by = v_admin,
      review_reason = null, updated_at = now()
  where id = v_version.id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set approved_version_id = v_version.id,
      pending_version_id = null,
      moderation_status = 'published',
      review_reason = null,
      reviewed_at = now(),
      updated_at = now()
  where id = v_version.service_id
  returning * into v_service;

  insert into public.notifications(
    user_id, type, title, body, data, external_id, category,
    event_key, target_url, action_label, service_id
  ) values (
    v_version.professional_id,
    'service_review_approved',
    'Anúncio aprovado',
    'Seu anúncio foi aprovado e já pode aparecer para os clientes.',
    jsonb_build_object('serviceId', v_service.external_id, 'versionId', v_version.id),
    'service-review-approved-' || v_version.id::text,
    'professional',
    'service_review_approved',
    'detalhe-anuncio.html?id=' || v_service.external_id,
    'Ver anúncio',
    v_service.id
  ) on conflict do nothing;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'status', v_service.status,
    'moderationStatus', v_service.moderation_status
  );
end;
$$;

create or replace function public.request_service_version_changes(
  p_version_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_version public.service_versions%rowtype;
  v_service public.services%rowtype;
begin
  if v_admin is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then
    raise exception 'REVIEW_REASON_INVALID' using errcode = '22023';
  end if;

  select * into v_version from public.service_versions where id = p_version_id for update;
  if v_version.id is null then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_version.review_status <> 'pending_review' then raise exception 'SERVICE_VERSION_NOT_PENDING' using errcode = '22023'; end if;

  update public.service_versions
  set review_status = 'changes_required', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = v_admin, updated_at = now()
  where id = v_version.id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set moderation_status = 'changes_required', review_reason = v_reason,
      reviewed_at = now(), updated_at = now()
  where id = v_version.service_id
  returning * into v_service;

  insert into public.notifications(
    user_id, type, title, body, data, external_id, category,
    event_key, target_url, action_label, service_id
  ) values (
    v_version.professional_id,
    'service_review_changes_required',
    'Seu anúncio precisa de ajustes',
    v_reason,
    jsonb_build_object('serviceId', v_service.external_id, 'versionId', v_version.id, 'reason', v_reason),
    'service-review-changes-' || v_version.id::text,
    'professional',
    'service_review_changes_required',
    'anunciar-servico.html?mode=edit&edit=' || v_service.external_id,
    'Corrigir anúncio',
    v_service.id
  ) on conflict do nothing;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'moderationStatus', v_service.moderation_status,
    'reason', v_reason
  );
end;
$$;

create or replace function public.reject_service_version(
  p_version_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_admin uuid := auth.uid();
  v_reason text := trim(coalesce(p_reason, ''));
  v_version public.service_versions%rowtype;
  v_service public.services%rowtype;
begin
  if v_admin is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;
  if char_length(v_reason) < 10 or char_length(v_reason) > 500 then
    raise exception 'REVIEW_REASON_INVALID' using errcode = '22023';
  end if;

  select * into v_version from public.service_versions where id = p_version_id for update;
  if v_version.id is null then raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002'; end if;
  if v_version.review_status <> 'pending_review' then raise exception 'SERVICE_VERSION_NOT_PENDING' using errcode = '22023'; end if;

  update public.service_versions
  set review_status = 'rejected', review_reason = v_reason,
      reviewed_at = now(), reviewed_by = v_admin, updated_at = now()
  where id = v_version.id;

  perform set_config('doke.service_moderation_apply', 'on', true);
  update public.services
  set pending_version_id = null,
      moderation_status = case when approved_version_id is null then 'rejected' else 'published' end,
      review_reason = v_reason,
      reviewed_at = now(), updated_at = now()
  where id = v_version.service_id
  returning * into v_service;

  insert into public.notifications(
    user_id, type, title, body, data, external_id, category,
    event_key, target_url, action_label, service_id
  ) values (
    v_version.professional_id,
    'service_review_rejected',
    'Anúncio não aprovado',
    v_reason,
    jsonb_build_object('serviceId', v_service.external_id, 'versionId', v_version.id, 'reason', v_reason),
    'service-review-rejected-' || v_version.id::text,
    'professional',
    'service_review_rejected',
    'perfil-profissional.html#profile-ads',
    'Ver anúncios',
    v_service.id
  ) on conflict do nothing;

  return jsonb_build_object(
    'serviceId', v_service.id,
    'externalId', v_service.external_id,
    'moderationStatus', v_service.moderation_status,
    'reason', v_reason
  );
end;
$$;

create or replace function public.list_service_review_queue()
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  if not public.is_active_admin_or_moderator() then raise exception 'ADMIN_REQUIRED' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'versionId', v.id,
    'serviceId', s.id,
    'externalId', s.external_id,
    'versionNumber', v.version_number,
    'source', v.source,
    'changeClass', v.change_class,
    'reviewStatus', v.review_status,
    'submittedAt', v.submitted_at,
    'snapshot', v.snapshot,
    'changeSummary', v.change_summary,
    'professionalId', v.professional_id,
    'professionalName', coalesce(
      nullif(p.setup_payload ->> 'displayName', ''),
      nullif(p.setup_payload ->> 'fullName', ''),
      u.email,
      'Profissional Doke'
    ),
    'professionalEmail', u.email,
    'currentTitle', s.title,
    'publicStatus', s.status,
    'moderationStatus', s.moderation_status,
    'approvedVersionId', s.approved_version_id
  ) order by v.submitted_at asc), '[]'::jsonb)
  into v_result
  from public.service_versions v
  join public.services s on s.id = v.service_id
  join public.users u on u.id = v.professional_id
  left join public.professional_profiles p on p.user_id = v.professional_id
  where v.review_status = 'pending_review';

  return v_result;
end;
$$;

create or replace function public.protect_service_moderation_state()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_apply boolean := coalesce(current_setting('doke.service_moderation_apply', true), '') = 'on';
begin
  if tg_op = 'INSERT' and not v_apply then
    new.status := 'draft';
    new.moderation_status := 'draft';
    new.approved_version_id := null;
    new.pending_version_id := null;
  elsif tg_op = 'UPDATE' and not v_apply then
    if old.approved_version_id is null and new.status = 'published' then
      raise exception 'SERVICE_REVIEW_REQUIRED' using errcode = '42501';
    end if;
    if old.approved_version_id is not null and (
      new.title is distinct from old.title or
      new.slug is distinct from old.slug or
      new.description is distinct from old.description or
      new.price_mode is distinct from old.price_mode or
      new.price_cents is distinct from old.price_cents or
      new.city is distinct from old.city or
      new.state is distinct from old.state or
      new.metadata is distinct from old.metadata
    ) then
      raise exception 'SERVICE_VERSION_REVIEW_REQUIRED' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_service_moderation_state on public.services;
create trigger trg_protect_service_moderation_state
before insert or update on public.services
for each row execute function public.protect_service_moderation_state();

revoke all on function public.submit_service_for_review(text, jsonb, text) from public;
grant execute on function public.submit_service_for_review(text, jsonb, text) to authenticated;
revoke all on function public.approve_service_version(uuid) from public;
grant execute on function public.approve_service_version(uuid) to authenticated;
revoke all on function public.request_service_version_changes(uuid, text) from public;
grant execute on function public.request_service_version_changes(uuid, text) to authenticated;
revoke all on function public.reject_service_version(uuid, text) from public;
grant execute on function public.reject_service_version(uuid, text) to authenticated;
revoke all on function public.list_service_review_queue() from public;
grant execute on function public.list_service_review_queue() to authenticated;

commit;
