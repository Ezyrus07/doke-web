-- Doke smart recommendations for quote templates.
-- Derives explainable guidance from conversion, abandonment and category benchmarks.

create or replace view public.quote_template_conversion_metrics
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
    max(question_count)::integer as question_count,
    max(service_external_id) as sample_service_external_id,
    count(*)::bigint as applications_count,
    max(created_at) as last_application_at
  from public.quote_template_application_events
  group by professional_id, template_identity
), sessions as (
  select
    f.professional_id,
    f.template_identity,
    max(f.template_id) as template_id,
    max(f.template_kind) as template_kind,
    case
      when bool_or(f.template_source = 'personal_template_customized') then 'personal_template_customized'
      when bool_or(f.template_source = 'preset_customized') then 'preset_customized'
      else max(f.template_source)
    end as template_source,
    max(f.template_label) as template_label,
    max(f.template_category) as template_category,
    max(f.question_count)::integer as question_count,
    (array_agg(s.external_id order by f.last_activity_at desc) filter (where s.external_id is not null))[1] as sample_service_external_id,
    count(*)::bigint as forms_started,
    count(*) filter (where f.completed_at is not null)::bigint as forms_completed,
    count(*) filter (where f.submitted_at is not null)::bigint as requests_submitted,
    count(*) filter (where f.is_abandoned)::bigint as abandoned_count,
    round(avg(f.completion_seconds) filter (where f.completion_seconds is not null))::bigint as avg_completion_seconds,
    round(avg(f.submission_seconds) filter (where f.submission_seconds is not null))::bigint as avg_submission_seconds,
    max(f.last_activity_at) as last_funnel_activity_at
  from public.quote_template_funnel_sessions f
  join public.services s on s.id = f.service_id
  group by f.professional_id, f.template_identity
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
  greatest(coalesce(a.last_application_at, '-infinity'::timestamptz), coalesce(s.last_funnel_activity_at, '-infinity'::timestamptz)) as last_activity_at,
  coalesce(s.question_count, a.question_count, 0)::integer as question_count,
  coalesce(s.sample_service_external_id, a.sample_service_external_id) as sample_service_external_id
from applications a
full join sessions s
  on s.professional_id = a.professional_id
 and s.template_identity = a.template_identity;

revoke all on table public.quote_template_conversion_metrics from anon, authenticated;
grant select on table public.quote_template_conversion_metrics to authenticated;

create or replace view public.quote_template_category_benchmarks
with (security_invoker = true)
as
with base as (
  select *
  from public.quote_template_conversion_metrics
  where nullif(trim(coalesce(template_category, '')), '') is not null
    and forms_started > 0
), benchmark as (
  select
    professional_id,
    template_category,
    sum(forms_started)::bigint as forms_started,
    sum(forms_completed)::bigint as forms_completed,
    sum(requests_submitted)::bigint as requests_submitted,
    count(*)::bigint as template_count,
    count(*) filter (where forms_started >= 5)::bigint as qualified_template_count,
    round((sum(forms_completed)::numeric / nullif(sum(forms_started), 0)::numeric) * 100, 1) as completion_rate,
    round((sum(requests_submitted)::numeric / nullif(sum(forms_started), 0)::numeric) * 100, 1) as submission_rate,
    round(sum(question_count * forms_started)::numeric / nullif(sum(forms_started), 0)::numeric, 1) as avg_question_count
  from base
  group by professional_id, template_category
), top_forms as (
  select b.professional_id, b.template_category,
    least(8, greatest(1, round(
      sum(b.question_count * b.forms_started)::numeric / nullif(sum(b.forms_started), 0)::numeric
    )::integer)) as recommended_question_count
  from base b
  join benchmark c
    on c.professional_id = b.professional_id
   and c.template_category = b.template_category
  where b.forms_started >= 5
    and b.submission_rate >= c.submission_rate
  group by b.professional_id, b.template_category
)
select
  c.professional_id,
  c.template_category,
  c.forms_started,
  c.forms_completed,
  c.requests_submitted,
  c.template_count,
  c.qualified_template_count,
  c.completion_rate,
  c.submission_rate,
  c.avg_question_count,
  coalesce(t.recommended_question_count, least(6, greatest(1, round(c.avg_question_count)::integer)), 6) as recommended_question_count
from benchmark c
left join top_forms t
  on t.professional_id = c.professional_id
 and t.template_category = c.template_category;

revoke all on table public.quote_template_category_benchmarks from anon, authenticated;
grant select on table public.quote_template_category_benchmarks to authenticated;

create or replace view public.quote_template_smart_recommendations
with (security_invoker = true)
as
with dropoff_ranked as (
  select
    d.*,
    row_number() over (
      partition by d.professional_id, d.template_identity
      order by d.abandonment_count desc, d.last_question_label asc
    ) as position
  from public.quote_template_question_dropoff d
), base as (
  select
    m.*,
    coalesce(b.completion_rate, 0) as benchmark_completion_rate,
    coalesce(b.submission_rate, 0) as benchmark_submission_rate,
    coalesce(b.recommended_question_count, 6) as recommended_question_count,
    coalesce(d.last_question_id, '') as top_dropoff_question_id,
    coalesce(d.last_question_label, '') as top_dropoff_question_label,
    coalesce(d.abandonment_count, 0)::bigint as top_dropoff_count,
    case when m.forms_started > 0
      then round((m.abandoned_count::numeric / m.forms_started::numeric) * 100, 1)
      else 0 end as abandonment_rate,
    case when m.abandoned_count > 0
      then round((coalesce(d.abandonment_count, 0)::numeric / m.abandoned_count::numeric) * 100, 1)
      else 0 end as top_dropoff_share,
    case
      when m.forms_started >= 30 then 'high'
      when m.forms_started >= 10 then 'medium'
      else 'low'
    end as confidence
  from public.quote_template_conversion_metrics m
  left join public.quote_template_category_benchmarks b
    on b.professional_id = m.professional_id
   and b.template_category = m.template_category
  left join dropoff_ranked d
    on d.professional_id = m.professional_id
   and d.template_identity = m.template_identity
   and d.position = 1
), recommendations as (
  select b.*, r.recommendation_code, r.priority, r.tone
  from base b
  cross join lateral (
    select * from (values
      ('collect_more_data'::text, 5, 'neutral'::text, b.forms_started < 10),
      ('investigate_dropoff_question'::text, 1, 'warning'::text,
        b.forms_started >= 10 and b.abandoned_count >= 3 and b.top_dropoff_count >= 2 and b.top_dropoff_share >= 35),
      ('reduce_question_count'::text, 1, 'warning'::text,
        b.forms_started >= 10 and b.question_count > b.recommended_question_count
        and (b.submission_rate + 8 < b.benchmark_submission_rate or b.abandonment_rate >= 30)),
      ('improve_completion'::text, 2, 'warning'::text,
        b.forms_started >= 10 and b.benchmark_completion_rate > 0
        and b.completion_rate + 8 < b.benchmark_completion_rate),
      ('improve_review_to_submit'::text, 2, 'neutral'::text,
        b.forms_completed >= 8 and b.completed_to_submission_rate < 75),
      ('keep_current'::text, 4, 'positive'::text,
        b.forms_started >= 10 and b.benchmark_submission_rate > 0
        and b.submission_rate >= b.benchmark_submission_rate
        and b.completion_rate >= b.benchmark_completion_rate)
    ) as v(recommendation_code, priority, tone, applies)
    where v.applies
  ) r
)
select
  professional_id,
  template_identity,
  template_id,
  template_kind,
  template_source,
  template_label,
  template_category,
  sample_service_external_id,
  question_count,
  applications_count,
  forms_started,
  forms_completed,
  requests_submitted,
  abandoned_count,
  completion_rate,
  submission_rate,
  completed_to_submission_rate,
  abandonment_rate,
  benchmark_completion_rate,
  benchmark_submission_rate,
  recommended_question_count,
  top_dropoff_question_id,
  top_dropoff_question_label,
  top_dropoff_count,
  top_dropoff_share,
  confidence,
  recommendation_code,
  priority,
  tone,
  last_activity_at
from recommendations;

revoke all on table public.quote_template_smart_recommendations from anon, authenticated;
grant select on table public.quote_template_smart_recommendations to authenticated;
