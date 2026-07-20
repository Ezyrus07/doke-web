-- Align application events with later customized uses of the same template.
-- The public source remains descriptive, while template_identity uses the reusable model family.

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
  v_identity_source text;
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

  v_identity_source := case
    when v_source = 'preset_customized' then 'preset'
    when v_source = 'personal_template_customized' then 'personal_template'
    else v_source
  end;

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
  new.template_identity := left(v_kind || ':' || v_template_id || ':' || v_identity_source, 240);
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

drop view if exists public.quote_template_conversion_metrics;
create view public.quote_template_conversion_metrics
with (security_invoker = true)
as
with applications as (
  select
    professional_id,
    template_identity,
    max(template_id) as template_id,
    max(template_kind) as template_kind,
    max(template_source) as template_source,
    max(template_label) as template_label,
    max(template_category) as template_category,
    count(*)::bigint as applications_count,
    max(created_at) as last_application_at
  from public.quote_template_application_events
  group by professional_id, template_identity
), sessions as (
  select
    professional_id,
    template_identity,
    max(template_id) as template_id,
    max(template_kind) as template_kind,
    case
      when bool_or(template_source = 'personal_template_customized') then 'personal_template_customized'
      when bool_or(template_source = 'preset_customized') then 'preset_customized'
      else max(template_source)
    end as template_source,
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
  group by professional_id, template_identity
)
select
  coalesce(a.professional_id, s.professional_id) as professional_id,
  coalesce(a.template_identity, s.template_identity) as template_identity,
  coalesce(s.template_id, a.template_id) as template_id,
  coalesce(s.template_kind, a.template_kind) as template_kind,
  coalesce(s.template_source, a.template_source) as template_source,
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
  max(template_id) as template_id,
  max(template_kind) as template_kind,
  case
    when bool_or(template_source = 'personal_template_customized') then 'personal_template_customized'
    when bool_or(template_source = 'preset_customized') then 'preset_customized'
    else max(template_source)
  end as template_source,
  max(template_label) as template_label,
  max(template_category) as template_category,
  last_question_id,
  max(last_question_label) as last_question_label,
  count(*)::bigint as abandonment_count
from public.quote_template_funnel_sessions
where is_abandoned
  and last_question_id is not null
group by professional_id, template_identity, last_question_id;

revoke all on table public.quote_template_question_dropoff from anon, authenticated;
grant select on table public.quote_template_question_dropoff to authenticated;
