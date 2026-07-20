-- Doke quote-template conversion metrics.
-- Records template applications and an append-only client funnel without storing answer text.

create table if not exists public.quote_template_application_events (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.users(id) on delete cascade,
  service_external_id text,
  template_identity text not null check (char_length(template_identity) between 3 and 220),
  template_id text not null check (char_length(template_id) between 1 and 160),
  personal_template_id uuid references public.professional_quote_templates(id) on delete set null,
  template_kind text not null check (template_kind in ('doke', 'personal')),
  template_source text not null check (template_source in ('preset', 'personal_template')),
  template_label text not null check (char_length(template_label) between 1 and 120),
  template_category text,
  question_count integer not null default 0 check (question_count between 0 and 10),
  event_key text not null unique check (char_length(event_key) between 12 and 180),
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_template_applications_owner_created
  on public.quote_template_application_events(professional_id, created_at desc);
create index if not exists idx_quote_template_applications_identity_created
  on public.quote_template_application_events(template_identity, created_at desc);

alter table public.quote_template_application_events enable row level security;
revoke all on table public.quote_template_application_events from anon, authenticated;
grant insert, select on table public.quote_template_application_events to authenticated;

drop policy if exists quote_template_applications_owner_insert on public.quote_template_application_events;
create policy quote_template_applications_owner_insert
  on public.quote_template_application_events
  for insert
  to authenticated
  with check (
    professional_id = (select auth.uid())
    and private.is_active_verified_professional((select auth.uid()))
    and (
      personal_template_id is null
      or exists (
        select 1
        from public.professional_quote_templates pqt
        where pqt.id = quote_template_application_events.personal_template_id
          and pqt.professional_id = (select auth.uid())
      )
    )
  );

drop policy if exists quote_template_applications_owner_read on public.quote_template_application_events;
create policy quote_template_applications_owner_read
  on public.quote_template_application_events
  for select
  to authenticated
  using (
    professional_id = (select auth.uid())
    or public.is_active_admin_or_moderator()
  );

create table if not exists public.quote_template_funnel_events (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  professional_id uuid not null references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  visitor_key text not null check (char_length(visitor_key) between 12 and 180),
  session_key text not null check (char_length(session_key) between 12 and 180),
  event_key text not null unique check (char_length(event_key) between 12 and 220),
  event_type text not null check (event_type in ('started', 'progress', 'completed', 'submitted')),
  template_identity text not null check (char_length(template_identity) between 3 and 240),
  template_id text not null check (char_length(template_id) between 1 and 180),
  template_kind text not null check (template_kind in ('doke', 'personal', 'custom', 'default')),
  template_source text not null check (template_source in (
    'preset', 'preset_customized', 'personal_template', 'personal_template_customized', 'custom', 'default'
  )),
  template_label text not null check (char_length(template_label) between 1 and 140),
  template_category text,
  template_version text,
  question_count integer not null default 0 check (question_count between 0 and 10),
  step_index integer not null default 0 check (step_index between 0 and 10),
  answered_question_count integer not null default 0 check (answered_question_count between 0 and 10),
  last_question_id text,
  last_question_label text,
  order_id uuid references public.orders(id) on delete set null,
  order_external_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_quote_template_funnel_owner_created
  on public.quote_template_funnel_events(professional_id, created_at desc);
create index if not exists idx_quote_template_funnel_session_created
  on public.quote_template_funnel_events(session_key, created_at asc);
create index if not exists idx_quote_template_funnel_identity_created
  on public.quote_template_funnel_events(template_identity, created_at desc);
create index if not exists idx_quote_template_funnel_service_created
  on public.quote_template_funnel_events(service_id, created_at desc);

alter table public.quote_template_funnel_events enable row level security;
revoke all on table public.quote_template_funnel_events from anon, authenticated;
grant insert on table public.quote_template_funnel_events to anon, authenticated;
grant select on table public.quote_template_funnel_events to authenticated;

create or replace function private.canonicalize_quote_template_funnel_event()
returns trigger
language plpgsql
security definer
set search_path = public, private, auth
as $$
declare
  v_service public.services%rowtype;
  v_template jsonb;
  v_questions jsonb;
  v_source text;
  v_kind text;
  v_template_id text;
  v_label text;
  v_category text;
  v_version text;
  v_order public.orders%rowtype;
begin
  select * into v_service
  from public.services s
  where s.id = new.service_id
    and s.status = 'published'
    and (
      s.moderation_status in ('published', 'changes_pending_review')
      or (s.moderation_status = 'changes_required' and s.approved_version_id is not null)
    );

  if v_service.id is null then
    raise exception 'QUOTE_METRIC_SERVICE_NOT_PUBLIC' using errcode = '42501';
  end if;

  if auth.uid() is not null and auth.uid() = v_service.professional_id then
    raise exception 'QUOTE_METRIC_OWNER_EXCLUDED' using errcode = '42501';
  end if;

  new.professional_id := v_service.professional_id;
  new.actor_id := auth.uid();
  new.created_at := now();
  new.visitor_key := left(trim(coalesce(new.visitor_key, '')), 180);
  new.session_key := left(trim(coalesce(new.session_key, '')), 180);
  new.event_key := left(trim(coalesce(new.event_key, '')), 220);
  new.step_index := least(10, greatest(0, coalesce(new.step_index, 0)));

  v_template := coalesce(v_service.metadata -> 'quoteTemplate', '{}'::jsonb);
  v_questions := coalesce(v_template -> 'questions', '[]'::jsonb);
  if jsonb_typeof(v_questions) <> 'array' then v_questions := '[]'::jsonb; end if;

  v_source := lower(trim(coalesce(v_template ->> 'source', '')));
  if v_source not in ('preset', 'preset_customized', 'personal_template', 'personal_template_customized', 'custom', 'default') then
    v_source := case
      when lower(trim(coalesce(v_service.metadata ->> 'quoteMode', 'default'))) = 'custom' then 'custom'
      else 'default'
    end;
  end if;

  v_kind := lower(trim(coalesce(v_template ->> 'templateKind', '')));
  if v_kind not in ('doke', 'personal', 'custom', 'default') then
    v_kind := case
      when v_source in ('preset', 'preset_customized') then 'doke'
      when v_source in ('personal_template', 'personal_template_customized') then 'personal'
      when v_source = 'custom' then 'custom'
      else 'default'
    end;
  end if;

  v_version := left(trim(coalesce(v_template ->> 'version', '1')), 80);
  v_template_id := trim(coalesce(
    v_template ->> 'personalTemplateId',
    v_template ->> 'templateId',
    case
      when v_kind = 'default' then 'default'
      else 'service-' || v_service.id::text || '-v-' || v_version
    end
  ));
  if v_template_id = '' then v_template_id := 'default'; end if;

  v_label := trim(coalesce(
    v_template ->> 'templateLabel',
    case
      when v_kind = 'default' then 'Modelo padrão da Doke'
      when v_kind = 'custom' then 'Formulário personalizado'
      else v_service.title
    end
  ));
  if v_label = '' then v_label := 'Formulário do anúncio'; end if;

  v_category := trim(coalesce(v_template ->> 'templateCategory', v_service.metadata ->> 'category', ''));

  new.template_id := left(v_template_id, 180);
  new.template_kind := v_kind;
  new.template_source := v_source;
  new.template_identity := left(v_kind || ':' || v_template_id || ':' || v_source, 240);
  new.template_label := left(v_label, 140);
  new.template_category := nullif(left(v_category, 100), '');
  new.template_version := nullif(v_version, '');
  new.question_count := least(10, jsonb_array_length(v_questions));
  new.answered_question_count := least(new.question_count, greatest(0, coalesce(new.answered_question_count, 0)));
  new.last_question_id := nullif(left(trim(coalesce(new.last_question_id, '')), 100), '');
  new.last_question_label := nullif(left(trim(coalesce(new.last_question_label, '')), 140), '');

  if new.event_type = 'submitted' then
    if auth.uid() is null then
      raise exception 'QUOTE_METRIC_AUTH_REQUIRED' using errcode = '28000';
    end if;

    select * into v_order
    from public.orders o
    where (
      (new.order_id is not null and o.id = new.order_id)
      or (nullif(trim(coalesce(new.order_external_id, '')), '') is not null and o.external_id = trim(new.order_external_id))
    )
      and o.client_id = auth.uid()
      and (o.service_id is null or o.service_id = v_service.id)
    order by o.created_at desc
    limit 1;

    if v_order.id is null then
      raise exception 'QUOTE_METRIC_ORDER_NOT_FOUND' using errcode = '42501';
    end if;

    new.order_id := v_order.id;
    new.order_external_id := v_order.external_id;
  else
    new.order_id := null;
    new.order_external_id := null;
  end if;

  return new;
end;
$$;

revoke all on function private.canonicalize_quote_template_funnel_event() from public, anon, authenticated;

drop trigger if exists trg_canonicalize_quote_template_funnel_event on public.quote_template_funnel_events;
create trigger trg_canonicalize_quote_template_funnel_event
before insert on public.quote_template_funnel_events
for each row execute function private.canonicalize_quote_template_funnel_event();

drop policy if exists quote_template_funnel_record on public.quote_template_funnel_events;
create policy quote_template_funnel_record
  on public.quote_template_funnel_events
  for insert
  to anon, authenticated
  with check (
    actor_id is not distinct from (select auth.uid())
    and exists (
      select 1
      from public.services s
      where s.id = quote_template_funnel_events.service_id
        and s.status = 'published'
        and s.professional_id = quote_template_funnel_events.professional_id
        and s.professional_id is distinct from (select auth.uid())
    )
  );

drop policy if exists quote_template_funnel_owner_read on public.quote_template_funnel_events;
create policy quote_template_funnel_owner_read
  on public.quote_template_funnel_events
  for select
  to authenticated
  using (
    professional_id = (select auth.uid())
    or public.is_active_admin_or_moderator()
  );

drop view if exists public.quote_template_funnel_sessions;
create view public.quote_template_funnel_sessions
with (security_invoker = true)
as
with latest as (
  select distinct on (session_key)
    session_key,
    professional_id,
    service_id,
    actor_id,
    visitor_key,
    template_identity,
    template_id,
    template_kind,
    template_source,
    template_label,
    template_category,
    template_version,
    question_count,
    step_index,
    answered_question_count,
    last_question_id,
    last_question_label,
    created_at as last_activity_at
  from public.quote_template_funnel_events
  order by session_key, created_at desc, id desc
), aggregated as (
  select
    session_key,
    min(created_at) filter (where event_type = 'started') as started_at,
    min(created_at) filter (where event_type = 'completed') as completed_at,
    min(created_at) filter (where event_type = 'submitted') as submitted_at,
    (array_agg(order_id order by created_at desc) filter (where event_type = 'submitted'))[1] as order_id,
    (array_agg(order_external_id order by created_at desc) filter (where event_type = 'submitted'))[1] as order_external_id
  from public.quote_template_funnel_events
  group by session_key
)
select
  l.*,
  coalesce(a.started_at, l.last_activity_at) as started_at,
  a.completed_at,
  a.submitted_at,
  a.order_id,
  a.order_external_id,
  case
    when a.completed_at is not null then greatest(0, extract(epoch from (a.completed_at - coalesce(a.started_at, l.last_activity_at)))::integer)
    else null
  end as completion_seconds,
  case
    when a.submitted_at is not null then greatest(0, extract(epoch from (a.submitted_at - coalesce(a.started_at, l.last_activity_at)))::integer)
    else null
  end as submission_seconds,
  (
    a.submitted_at is null
    and l.last_activity_at < now() - interval '30 minutes'
  ) as is_abandoned
from latest l
join aggregated a using (session_key);

revoke all on table public.quote_template_funnel_sessions from anon, authenticated;
grant select on table public.quote_template_funnel_sessions to authenticated;

drop view if exists public.quote_template_conversion_metrics;
create view public.quote_template_conversion_metrics
with (security_invoker = true)
as
with applications as (
  select
    professional_id,
    template_identity,
    template_id,
    template_kind,
    template_source,
    max(template_label) as template_label,
    max(template_category) as template_category,
    count(*)::bigint as applications_count,
    max(created_at) as last_application_at
  from public.quote_template_application_events
  group by professional_id, template_identity, template_id, template_kind, template_source
), sessions as (
  select
    professional_id,
    template_identity,
    template_id,
    template_kind,
    template_source,
    max(template_label) as template_label,
    max(template_category) as template_category,
    count(*)::bigint as forms_started,
    count(*) filter (where completed_at is not null)::bigint as forms_completed,
    count(*) filter (where submitted_at is not null)::bigint as requests_submitted,
    count(*) filter (where is_abandoned)::bigint as abandoned_count,
    round(avg(completion_seconds) filter (where completion_seconds is not null))::bigint as avg_completion_seconds,
    round(avg(submission_seconds) filter (where submission_seconds is not null))::bigint as avg_submission_seconds,
    max(last_activity_at) as last_funnel_activity_at
  from public.quote_template_funnel_sessions
  group by professional_id, template_identity, template_id, template_kind, template_source
)
select
  coalesce(a.professional_id, s.professional_id) as professional_id,
  coalesce(a.template_identity, s.template_identity) as template_identity,
  coalesce(a.template_id, s.template_id) as template_id,
  coalesce(a.template_kind, s.template_kind) as template_kind,
  coalesce(a.template_source, s.template_source) as template_source,
  coalesce(s.template_label, a.template_label, 'Formulário') as template_label,
  coalesce(s.template_category, a.template_category) as template_category,
  coalesce(a.applications_count, 0)::bigint as applications_count,
  coalesce(s.forms_started, 0)::bigint as forms_started,
  coalesce(s.forms_completed, 0)::bigint as forms_completed,
  coalesce(s.requests_submitted, 0)::bigint as requests_submitted,
  coalesce(s.abandoned_count, 0)::bigint as abandoned_count,
  coalesce(s.avg_completion_seconds, 0)::bigint as avg_completion_seconds,
  coalesce(s.avg_submission_seconds, 0)::bigint as avg_submission_seconds,
  case when coalesce(s.forms_started, 0) > 0
    then round((s.forms_completed::numeric / s.forms_started::numeric) * 100, 1)
    else 0 end as completion_rate,
  case when coalesce(s.forms_started, 0) > 0
    then round((s.requests_submitted::numeric / s.forms_started::numeric) * 100, 1)
    else 0 end as submission_rate,
  case when coalesce(s.forms_completed, 0) > 0
    then round((s.requests_submitted::numeric / s.forms_completed::numeric) * 100, 1)
    else 0 end as completed_to_submission_rate,
  greatest(coalesce(a.last_application_at, '-infinity'::timestamptz), coalesce(s.last_funnel_activity_at, '-infinity'::timestamptz)) as last_activity_at
from applications a
full join sessions s
  on s.professional_id = a.professional_id
 and s.template_identity = a.template_identity;

revoke all on table public.quote_template_conversion_metrics from anon, authenticated;
grant select on table public.quote_template_conversion_metrics to authenticated;

drop view if exists public.quote_template_question_dropoff;
create view public.quote_template_question_dropoff
with (security_invoker = true)
as
select
  professional_id,
  template_identity,
  template_id,
  template_kind,
  template_source,
  max(template_label) as template_label,
  max(template_category) as template_category,
  last_question_id,
  max(last_question_label) as last_question_label,
  count(*)::bigint as abandonment_count
from public.quote_template_funnel_sessions
where is_abandoned
  and last_question_id is not null
group by professional_id, template_identity, template_id, template_kind, template_source, last_question_id;

revoke all on table public.quote_template_question_dropoff from anon, authenticated;
grant select on table public.quote_template_question_dropoff to authenticated;
