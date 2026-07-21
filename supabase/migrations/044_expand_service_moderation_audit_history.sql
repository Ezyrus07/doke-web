begin;

create schema if not exists private;

alter table public.service_versions
  add column if not exists baseline_version_id uuid;

alter table public.service_versions
  drop constraint if exists service_versions_baseline_version_id_fkey;

alter table public.service_versions
  add constraint service_versions_baseline_version_id_fkey
  foreign key (baseline_version_id)
  references public.service_versions(id)
  on delete set null;

create index if not exists idx_service_versions_baseline
  on public.service_versions(baseline_version_id)
  where baseline_version_id is not null;

create table if not exists public.service_moderation_events (
  id uuid primary key default gen_random_uuid(),
  event_key text,
  service_id uuid not null references public.services(id) on delete cascade,
  version_id uuid references public.service_versions(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null default 'system',
  event_type text not null,
  from_status text,
  to_status text,
  review_status text,
  reason text,
  change_class text,
  visibility_action text,
  risk_flags jsonb not null default '[]'::jsonb,
  classification_reasons jsonb not null default '[]'::jsonb,
  public_status text,
  moderation_status text,
  public_status_before text,
  public_status_after text,
  moderation_status_before text,
  moderation_status_after text,
  review_duration_seconds bigint,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.service_moderation_events
  add column if not exists event_key text,
  add column if not exists actor_role text not null default 'system',
  add column if not exists from_status text,
  add column if not exists to_status text,
  add column if not exists review_status text,
  add column if not exists risk_flags jsonb not null default '[]'::jsonb,
  add column if not exists classification_reasons jsonb not null default '[]'::jsonb,
  add column if not exists public_status text,
  add column if not exists moderation_status text,
  add column if not exists public_status_before text,
  add column if not exists public_status_after text,
  add column if not exists moderation_status_before text,
  add column if not exists moderation_status_after text,
  add column if not exists review_duration_seconds bigint,
  add column if not exists created_at timestamptz not null default now();

alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_event_type_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_type_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_change_class_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_visibility_action_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_risk_flags_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_reasons_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_metadata_check;
alter table public.service_moderation_events
  drop constraint if exists service_moderation_events_duration_check;

update public.service_moderation_events
set event_type = case event_type
  when 'submitted' then 'version_submitted'
  when 'resubmitted' then 'version_resubmitted'
  when 'approved' then 'version_approved'
  when 'rejected' then 'version_rejected'
  when 'superseded' then 'version_superseded'
  when 'visibility_paused' then 'listing_paused'
  when 'visibility_restored' then 'listing_restored'
  when 'status_changed' then case
    when coalesce(metadata ->> 'publicStatus', public_status, '') = 'published'
      and coalesce(metadata ->> 'previousPublicStatus', '') = 'paused' then 'listing_restored'
    when coalesce(metadata ->> 'publicStatus', public_status, '') = 'published' then 'listing_published'
    when coalesce(metadata ->> 'publicStatus', public_status, '') = 'paused' then 'listing_paused'
    else 'listing_unpublished'
  end
  else event_type
end;

update public.service_moderation_events e
set actor_role = coalesce(u.role, case when e.actor_id is null then 'system' else 'authenticated' end),
    from_status = coalesce(e.from_status, e.metadata ->> 'previousReviewStatus'),
    to_status = coalesce(e.to_status, e.review_status),
    risk_flags = case
      when jsonb_typeof(e.metadata -> 'riskFlags') = 'array' then e.metadata -> 'riskFlags'
      else coalesce(e.risk_flags, '[]'::jsonb)
    end,
    classification_reasons = case
      when jsonb_typeof(e.metadata -> 'classificationReasons') = 'array' then e.metadata -> 'classificationReasons'
      else coalesce(e.classification_reasons, '[]'::jsonb)
    end,
    public_status_before = coalesce(e.public_status_before, e.metadata ->> 'previousPublicStatus'),
    public_status_after = coalesce(e.public_status_after, e.metadata ->> 'publicStatus', e.public_status),
    moderation_status_before = coalesce(e.moderation_status_before, e.metadata ->> 'previousModerationStatus'),
    moderation_status_after = coalesce(e.moderation_status_after, e.metadata ->> 'moderationStatus', e.moderation_status),
    review_duration_seconds = coalesce(
      e.review_duration_seconds,
      case
        when coalesce(e.metadata ->> 'reviewDurationSeconds', '') ~ '^[0-9]+$'
          then (e.metadata ->> 'reviewDurationSeconds')::bigint
        else null
      end
    ),
    created_at = coalesce(e.created_at, e.occurred_at, now())
from public.users u
where u.id is not distinct from e.actor_id;

update public.service_moderation_events e
set actor_role = case when e.actor_id is null then 'system' else 'authenticated' end,
    from_status = coalesce(e.from_status, e.metadata ->> 'previousReviewStatus'),
    to_status = coalesce(e.to_status, e.review_status),
    risk_flags = case
      when jsonb_typeof(e.metadata -> 'riskFlags') = 'array' then e.metadata -> 'riskFlags'
      else coalesce(e.risk_flags, '[]'::jsonb)
    end,
    classification_reasons = case
      when jsonb_typeof(e.metadata -> 'classificationReasons') = 'array' then e.metadata -> 'classificationReasons'
      else coalesce(e.classification_reasons, '[]'::jsonb)
    end,
    public_status_before = coalesce(e.public_status_before, e.metadata ->> 'previousPublicStatus'),
    public_status_after = coalesce(e.public_status_after, e.metadata ->> 'publicStatus', e.public_status),
    moderation_status_before = coalesce(e.moderation_status_before, e.metadata ->> 'previousModerationStatus'),
    moderation_status_after = coalesce(e.moderation_status_after, e.metadata ->> 'moderationStatus', e.moderation_status),
    review_duration_seconds = coalesce(
      e.review_duration_seconds,
      case
        when coalesce(e.metadata ->> 'reviewDurationSeconds', '') ~ '^[0-9]+$'
          then (e.metadata ->> 'reviewDurationSeconds')::bigint
        else null
      end
    ),
    created_at = coalesce(e.created_at, e.occurred_at, now())
where not exists (select 1 from public.users u where u.id = e.actor_id);

update public.service_moderation_events
set event_key = case
  when event_type in ('version_submitted', 'version_resubmitted') and version_id is not null
    then 'service-version:' || version_id::text || ':submitted'
  when event_type in ('version_approved', 'changes_requested', 'version_rejected', 'version_superseded') and version_id is not null
    then 'service-version:' || version_id::text || ':status:' || case event_type
      when 'version_approved' then 'approved'
      when 'changes_requested' then 'changes_required'
      when 'version_rejected' then 'rejected'
      when 'version_superseded' then 'superseded'
    end
  else 'legacy-event:' || id::text
end
where event_key is null or trim(event_key) = '';

alter table public.service_moderation_events
  alter column event_key set not null,
  alter column actor_role set default 'system',
  alter column risk_flags set default '[]'::jsonb,
  alter column classification_reasons set default '[]'::jsonb,
  alter column metadata set default '{}'::jsonb,
  alter column created_at set default now();

create unique index if not exists idx_service_moderation_events_event_key
  on public.service_moderation_events(event_key);

alter table public.service_moderation_events
  add constraint service_moderation_events_type_check check (event_type in (
    'version_submitted',
    'version_resubmitted',
    'version_approved',
    'changes_requested',
    'version_rejected',
    'version_superseded',
    'listing_paused',
    'listing_published',
    'listing_restored',
    'listing_unpublished'
  ));
alter table public.service_moderation_events
  add constraint service_moderation_events_change_class_check check (
    change_class is null or change_class in ('minor', 'major', 'critical')
  );
alter table public.service_moderation_events
  add constraint service_moderation_events_visibility_action_check check (
    visibility_action is null or visibility_action in (
      'not_public_until_approved',
      'keep_public',
      'take_down_until_decision'
    )
  );
alter table public.service_moderation_events
  add constraint service_moderation_events_risk_flags_check check (jsonb_typeof(risk_flags) = 'array');
alter table public.service_moderation_events
  add constraint service_moderation_events_reasons_check check (jsonb_typeof(classification_reasons) = 'array');
alter table public.service_moderation_events
  add constraint service_moderation_events_metadata_check check (jsonb_typeof(metadata) = 'object');
alter table public.service_moderation_events
  add constraint service_moderation_events_duration_check check (
    review_duration_seconds is null or review_duration_seconds >= 0
  );

create index if not exists idx_service_moderation_events_service_time
  on public.service_moderation_events(service_id, occurred_at desc);
create index if not exists idx_service_moderation_events_version_time
  on public.service_moderation_events(version_id, occurred_at desc)
  where version_id is not null;
create index if not exists idx_service_moderation_events_actor_time
  on public.service_moderation_events(actor_id, occurred_at desc)
  where actor_id is not null;
create index if not exists idx_service_moderation_events_professional_time
  on public.service_moderation_events(professional_id, occurred_at desc);
create index if not exists idx_service_moderation_events_type_time
  on public.service_moderation_events(event_type, occurred_at desc);

alter table public.service_moderation_events enable row level security;

drop policy if exists service_moderation_events_admin_read on public.service_moderation_events;
create policy service_moderation_events_admin_read
  on public.service_moderation_events
  for select
  to authenticated
  using (public.is_active_admin_or_moderator());

drop policy if exists service_moderation_events_owner_read on public.service_moderation_events;
create policy service_moderation_events_owner_read
  on public.service_moderation_events
  for select
  to authenticated
  using ((select auth.uid()) = professional_id);

revoke all on table public.service_moderation_events from anon;
revoke insert, update, delete, truncate, references, trigger on table public.service_moderation_events from authenticated;
grant select on table public.service_moderation_events to authenticated;

create or replace function private.set_service_version_baseline()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth
as $$
begin
  if new.baseline_version_id is null then
    select s.approved_version_id
      into new.baseline_version_id
    from public.services s
    where s.id = new.service_id;
  end if;

  if new.baseline_version_id = new.id then
    new.baseline_version_id := null;
  end if;

  return new;
end;
$$;

revoke all on function private.set_service_version_baseline() from public, anon, authenticated;

drop trigger if exists trg_service_version_baseline on public.service_versions;
create trigger trg_service_version_baseline
before insert on public.service_versions
for each row execute function private.set_service_version_baseline();

update public.service_versions v
set baseline_version_id = coalesce(
  case when s.pending_version_id = v.id then s.approved_version_id end,
  (
    select prior.id
    from public.service_versions prior
    where prior.service_id = v.service_id
      and prior.version_number < v.version_number
      and prior.reviewed_at is not null
      and prior.review_reason is null
    order by prior.version_number desc
    limit 1
  )
)
from public.services s
where s.id = v.service_id
  and v.baseline_version_id is null;

create or replace function private.capture_service_version_moderation_event()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth
as $$
declare
  v_actor uuid;
  v_actor_role text := 'system';
  v_event_type text;
  v_event_key text;
  v_duration bigint;
  v_occurred_at timestamptz;
  v_service public.services%rowtype;
begin
  if tg_op = 'INSERT' then
    v_actor := coalesce(auth.uid(), new.professional_id);
    v_event_type := case when new.source = 'resubmit' then 'version_resubmitted' else 'version_submitted' end;
    v_event_key := 'service-version:' || new.id::text || ':submitted';
    v_occurred_at := coalesce(new.submitted_at, new.created_at, now());
  elsif old.review_status is distinct from new.review_status then
    v_actor := coalesce(new.reviewed_by, auth.uid(), new.professional_id);
    v_event_type := case new.review_status
      when 'approved' then 'version_approved'
      when 'changes_required' then 'changes_requested'
      when 'rejected' then 'version_rejected'
      when 'superseded' then 'version_superseded'
      else null
    end;
    if v_event_type is null then
      return new;
    end if;
    v_event_key := 'service-version:' || new.id::text || ':status:' || new.review_status;
    v_occurred_at := coalesce(new.reviewed_at, new.updated_at, now());
    if new.reviewed_at is not null and new.submitted_at is not null then
      v_duration := greatest(0, floor(extract(epoch from (new.reviewed_at - new.submitted_at)))::bigint);
    elsif new.review_status = 'superseded' and new.submitted_at is not null then
      v_duration := greatest(0, floor(extract(epoch from (v_occurred_at - new.submitted_at)))::bigint);
    end if;
  else
    return new;
  end if;

  select coalesce(u.role, 'system') into v_actor_role
  from public.users u
  where u.id = v_actor;

  select * into v_service
  from public.services s
  where s.id = new.service_id;

  insert into public.service_moderation_events (
    event_key,
    service_id,
    version_id,
    professional_id,
    actor_id,
    actor_role,
    event_type,
    from_status,
    to_status,
    review_status,
    reason,
    change_class,
    visibility_action,
    risk_flags,
    classification_reasons,
    public_status,
    moderation_status,
    public_status_after,
    moderation_status_after,
    review_duration_seconds,
    metadata,
    occurred_at
  ) values (
    v_event_key,
    new.service_id,
    new.id,
    new.professional_id,
    v_actor,
    coalesce(v_actor_role, 'system'),
    v_event_type,
    case when tg_op = 'UPDATE' then old.review_status else null end,
    new.review_status,
    new.review_status,
    new.review_reason,
    new.change_class,
    new.visibility_action,
    coalesce(new.risk_flags, '[]'::jsonb),
    coalesce(new.classification_reasons, '[]'::jsonb),
    v_service.status,
    v_service.moderation_status,
    v_service.status,
    v_service.moderation_status,
    v_duration,
    jsonb_build_object(
      'source', new.source,
      'versionNumber', new.version_number,
      'baselineVersionId', new.baseline_version_id,
      'title', coalesce(new.snapshot ->> 'title', ''),
      'changedFields', coalesce(new.change_summary -> 'changedFields', '[]'::jsonb),
      'backfill', false
    ),
    v_occurred_at
  )
  on conflict (event_key) do nothing;

  return new;
end;
$$;

revoke all on function private.capture_service_version_moderation_event() from public, anon, authenticated;

drop trigger if exists trg_service_version_moderation_event on public.service_versions;
drop trigger if exists trg_capture_service_version_moderation_event on public.service_versions;
create trigger trg_service_version_moderation_event
after insert or update of review_status on public.service_versions
for each row execute function private.capture_service_version_moderation_event();

create or replace function private.capture_service_visibility_event()
returns trigger
language plpgsql
security definer
set search_path = private, public, auth
as $$
declare
  v_event_type text;
  v_version_id uuid;
  v_version public.service_versions%rowtype;
  v_actor uuid := auth.uid();
  v_actor_role text := 'system';
  v_event_key text;
begin
  if old.status is not distinct from new.status then
    return new;
  end if;

  if new.status = 'paused' then
    v_event_type := 'listing_paused';
  elsif old.status = 'paused' and new.status = 'published' and new.approved_version_id is not distinct from old.approved_version_id then
    v_event_type := 'listing_restored';
  elsif new.status = 'published' then
    v_event_type := 'listing_published';
  elsif new.status in ('draft', 'archived', 'removed') then
    v_event_type := 'listing_unpublished';
  else
    return new;
  end if;

  v_version_id := coalesce(new.pending_version_id, old.pending_version_id, new.approved_version_id, old.approved_version_id);
  if v_version_id is not null then
    select * into v_version from public.service_versions where id = v_version_id;
  end if;

  select coalesce(u.role, 'system') into v_actor_role
  from public.users u
  where u.id = v_actor;

  v_event_key := 'service:' || new.id::text || ':visibility:' || old.status || ':' || new.status || ':' || coalesce(v_version_id::text, 'none');

  insert into public.service_moderation_events (
    event_key,
    service_id,
    version_id,
    professional_id,
    actor_id,
    actor_role,
    event_type,
    reason,
    change_class,
    visibility_action,
    risk_flags,
    classification_reasons,
    public_status,
    moderation_status,
    public_status_before,
    public_status_after,
    moderation_status_before,
    moderation_status_after,
    metadata,
    occurred_at
  ) values (
    v_event_key,
    new.id,
    v_version_id,
    new.professional_id,
    v_actor,
    coalesce(v_actor_role, 'system'),
    v_event_type,
    new.review_reason,
    v_version.change_class,
    v_version.visibility_action,
    coalesce(v_version.risk_flags, '[]'::jsonb),
    coalesce(v_version.classification_reasons, '[]'::jsonb),
    new.status,
    new.moderation_status,
    old.status,
    new.status,
    old.moderation_status,
    new.moderation_status,
    jsonb_build_object(
      'approvedVersionBefore', old.approved_version_id,
      'approvedVersionAfter', new.approved_version_id,
      'pendingVersionBefore', old.pending_version_id,
      'pendingVersionAfter', new.pending_version_id,
      'backfill', false
    ),
    now()
  )
  on conflict (event_key) do nothing;

  return new;
end;
$$;

revoke all on function private.capture_service_visibility_event() from public, anon, authenticated;

drop trigger if exists trg_service_visibility_event on public.services;
drop trigger if exists trg_capture_service_visibility_event on public.services;
create trigger trg_service_visibility_event
after update of status on public.services
for each row execute function private.capture_service_visibility_event();

insert into public.service_moderation_events (
  event_key,
  service_id,
  version_id,
  professional_id,
  actor_id,
  actor_role,
  event_type,
  from_status,
  to_status,
  review_status,
  change_class,
  visibility_action,
  risk_flags,
  classification_reasons,
  public_status,
  moderation_status,
  public_status_after,
  moderation_status_after,
  metadata,
  occurred_at
)
select
  'service-version:' || v.id::text || ':submitted',
  v.service_id,
  v.id,
  v.professional_id,
  v.professional_id,
  'professional',
  case when v.source = 'resubmit' then 'version_resubmitted' else 'version_submitted' end,
  null,
  'pending_review',
  'pending_review',
  v.change_class,
  v.visibility_action,
  coalesce(v.risk_flags, '[]'::jsonb),
  coalesce(v.classification_reasons, '[]'::jsonb),
  s.status,
  s.moderation_status,
  s.status,
  s.moderation_status,
  jsonb_build_object(
    'source', v.source,
    'versionNumber', v.version_number,
    'baselineVersionId', v.baseline_version_id,
    'title', coalesce(v.snapshot ->> 'title', ''),
    'changedFields', coalesce(v.change_summary -> 'changedFields', '[]'::jsonb),
    'backfill', true
  ),
  coalesce(v.submitted_at, v.created_at)
from public.service_versions v
join public.services s on s.id = v.service_id
on conflict (event_key) do nothing;

insert into public.service_moderation_events (
  event_key,
  service_id,
  version_id,
  professional_id,
  actor_id,
  actor_role,
  event_type,
  from_status,
  to_status,
  review_status,
  reason,
  change_class,
  visibility_action,
  risk_flags,
  classification_reasons,
  public_status,
  moderation_status,
  public_status_after,
  moderation_status_after,
  review_duration_seconds,
  metadata,
  occurred_at
)
select
  'service-version:' || v.id::text || ':status:' || case
    when v.review_status = 'approved' then 'approved'
    when v.review_status = 'changes_required' then 'changes_required'
    when v.review_status = 'rejected' then 'rejected'
    when v.review_status = 'superseded' and v.review_reason is null then 'approved'
    else 'superseded'
  end,
  v.service_id,
  v.id,
  v.professional_id,
  v.reviewed_by,
  coalesce(u.role, 'system'),
  case
    when v.review_status = 'approved' then 'version_approved'
    when v.review_status = 'changes_required' then 'changes_requested'
    when v.review_status = 'rejected' then 'version_rejected'
    when v.review_status = 'superseded' and v.review_reason is null then 'version_approved'
    else 'version_superseded'
  end,
  'pending_review',
  case when v.review_status = 'superseded' and v.review_reason is null then 'approved' else v.review_status end,
  case when v.review_status = 'superseded' and v.review_reason is null then 'approved' else v.review_status end,
  v.review_reason,
  v.change_class,
  v.visibility_action,
  coalesce(v.risk_flags, '[]'::jsonb),
  coalesce(v.classification_reasons, '[]'::jsonb),
  s.status,
  s.moderation_status,
  s.status,
  s.moderation_status,
  case
    when v.reviewed_at is not null and v.submitted_at is not null
      then greatest(0, floor(extract(epoch from (v.reviewed_at - v.submitted_at)))::bigint)
    else null
  end,
  jsonb_build_object(
    'versionNumber', v.version_number,
    'baselineVersionId', v.baseline_version_id,
    'backfill', true,
    'inferredApproval', v.review_status = 'superseded' and v.review_reason is null
  ),
  coalesce(v.reviewed_at, v.updated_at)
from public.service_versions v
join public.services s on s.id = v.service_id
left join public.users u on u.id = v.reviewed_by
where v.review_status in ('approved', 'changes_required', 'rejected', 'superseded')
on conflict (event_key) do nothing;

create or replace function public.get_service_review_detail(p_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not public.is_active_admin_or_moderator() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'versionId', v.id,
    'serviceId', s.id,
    'externalId', s.external_id,
    'versionNumber', v.version_number,
    'source', v.source,
    'changeClass', v.change_class,
    'visibilityAction', v.visibility_action,
    'riskFlags', v.risk_flags,
    'classificationReasons', v.classification_reasons,
    'reviewStatus', v.review_status,
    'reviewReason', v.review_reason,
    'submittedAt', v.submitted_at,
    'reviewedAt', v.reviewed_at,
    'reviewDurationSeconds', case
      when v.reviewed_at is not null then greatest(0, floor(extract(epoch from (v.reviewed_at - v.submitted_at)))::bigint)
      else greatest(0, floor(extract(epoch from (now() - v.submitted_at)))::bigint)
    end,
    'reviewedById', v.reviewed_by,
    'reviewedByName', coalesce(nullif(rp.setup_payload ->> 'displayName', ''), nullif(rp.setup_payload ->> 'fullName', ''), ru.email, case when v.reviewed_by is null then 'Ainda não analisado' else 'Equipe Doke' end),
    'reviewedByEmail', ru.email,
    'snapshot', v.snapshot,
    'changeSummary', v.change_summary,
    'professionalId', v.professional_id,
    'professionalName', coalesce(nullif(pp.setup_payload ->> 'displayName', ''), nullif(pp.setup_payload ->> 'fullName', ''), pu.email, 'Profissional Doke'),
    'professionalEmail', pu.email,
    'currentTitle', s.title,
    'publicStatus', s.status,
    'moderationStatus', s.moderation_status,
    'approvedVersionId', s.approved_version_id,
    'currentApprovedVersionNumber', current_approved.version_number,
    'baselineVersionId', v.baseline_version_id,
    'approvedVersionNumber', baseline.version_number,
    'approvedSnapshot', coalesce(baseline.snapshot, '{}'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object(
        'eventId', e.id,
        'eventType', e.event_type,
        'versionId', e.version_id,
        'versionNumber', ev.version_number,
        'actorId', e.actor_id,
        'actorRole', e.actor_role,
        'actorName', coalesce(nullif(ap.setup_payload ->> 'displayName', ''), nullif(ap.setup_payload ->> 'fullName', ''), au.email, case when e.actor_role = 'system' then 'Sistema Doke' else 'Equipe Doke' end),
        'actorEmail', au.email,
        'fromStatus', e.from_status,
        'toStatus', e.to_status,
        'reason', e.reason,
        'changeClass', e.change_class,
        'visibilityAction', e.visibility_action,
        'riskFlags', e.risk_flags,
        'classificationReasons', e.classification_reasons,
        'publicStatusBefore', e.public_status_before,
        'publicStatusAfter', e.public_status_after,
        'moderationStatusBefore', e.moderation_status_before,
        'moderationStatusAfter', e.moderation_status_after,
        'reviewDurationSeconds', e.review_duration_seconds,
        'metadata', e.metadata,
        'occurredAt', e.occurred_at
      ) order by e.occurred_at desc, e.created_at desc)
      from public.service_moderation_events e
      left join public.service_versions ev on ev.id = e.version_id
      left join public.users au on au.id = e.actor_id
      left join public.professional_profiles ap on ap.user_id = e.actor_id
      where e.service_id = s.id
    ), '[]'::jsonb),
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'versionId', vh.id,
        'versionNumber', vh.version_number,
        'source', vh.source,
        'changeClass', vh.change_class,
        'visibilityAction', vh.visibility_action,
        'reviewStatus', vh.review_status,
        'submittedAt', vh.submitted_at,
        'reviewedAt', vh.reviewed_at,
        'reviewReason', vh.review_reason,
        'reviewedById', vh.reviewed_by,
        'baselineVersionId', vh.baseline_version_id,
        'title', coalesce(vh.snapshot ->> 'title', '')
      ) order by vh.version_number desc)
      from public.service_versions vh
      where vh.service_id = s.id
    ), '[]'::jsonb)
  ) into v_result
  from public.service_versions v
  join public.services s on s.id = v.service_id
  join public.users pu on pu.id = v.professional_id
  left join public.professional_profiles pp on pp.user_id = v.professional_id
  left join public.users ru on ru.id = v.reviewed_by
  left join public.professional_profiles rp on rp.user_id = v.reviewed_by
  left join public.service_versions baseline on baseline.id = v.baseline_version_id
  left join public.service_versions current_approved on current_approved.id = s.approved_version_id
  where v.id = p_version_id;

  if v_result is null then
    raise exception 'SERVICE_VERSION_NOT_FOUND' using errcode = 'P0002';
  end if;

  return v_result;
end;
$$;

create or replace function public.list_service_moderation_audit(p_limit integer default 20)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_limit integer := greatest(1, least(coalesce(p_limit, 20), 100));
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED' using errcode = '28000';
  end if;
  if not public.is_active_admin_or_moderator() then
    raise exception 'ADMIN_REQUIRED' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(item order by occurred_at desc), '[]'::jsonb)
  into v_result
  from (
    select jsonb_build_object(
      'eventId', e.id,
      'eventType', e.event_type,
      'serviceId', e.service_id,
      'externalId', s.external_id,
      'serviceTitle', coalesce(nullif(ev.snapshot ->> 'title', ''), s.title),
      'versionId', e.version_id,
      'versionNumber', ev.version_number,
      'professionalId', e.professional_id,
      'professionalName', coalesce(nullif(pp.setup_payload ->> 'displayName', ''), nullif(pp.setup_payload ->> 'fullName', ''), pu.email, 'Profissional Doke'),
      'actorId', e.actor_id,
      'actorRole', e.actor_role,
      'actorName', coalesce(nullif(ap.setup_payload ->> 'displayName', ''), nullif(ap.setup_payload ->> 'fullName', ''), au.email, case when e.actor_role = 'system' then 'Sistema Doke' else 'Equipe Doke' end),
      'actorEmail', au.email,
      'reason', e.reason,
      'changeClass', e.change_class,
      'visibilityAction', e.visibility_action,
      'fromStatus', e.from_status,
      'toStatus', e.to_status,
      'publicStatusBefore', e.public_status_before,
      'publicStatusAfter', e.public_status_after,
      'reviewDurationSeconds', e.review_duration_seconds,
      'occurredAt', e.occurred_at,
      'targetUrl', case when e.version_id is not null then 'admin-anuncio-revisao.html?version=' || e.version_id::text else null end
    ) as item,
    e.occurred_at
    from public.service_moderation_events e
    join public.services s on s.id = e.service_id
    left join public.service_versions ev on ev.id = e.version_id
    join public.users pu on pu.id = e.professional_id
    left join public.professional_profiles pp on pp.user_id = e.professional_id
    left join public.users au on au.id = e.actor_id
    left join public.professional_profiles ap on ap.user_id = e.actor_id
    order by e.occurred_at desc
    limit v_limit
  ) recent;

  return v_result;
end;
$$;

revoke execute on function public.get_service_review_detail(uuid) from public, anon;
grant execute on function public.get_service_review_detail(uuid) to authenticated;
revoke execute on function public.list_service_moderation_audit(integer) from public, anon;
grant execute on function public.list_service_moderation_audit(integer) to authenticated;

commit;
