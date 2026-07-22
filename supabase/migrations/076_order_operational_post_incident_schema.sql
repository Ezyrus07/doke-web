-- Doke: post-incident reviews, prevention actions and measurable order-operation SLOs.
-- Operational state remains private; browser access is mediated by the authenticated Edge Function.

create table if not exists private.order_operational_incident_cycles (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references private.order_operational_alerts(id) on delete cascade,
  alert_key text not null,
  cycle_count integer not null check (cycle_count >= 1),
  alert_type text not null,
  severity text not null check (severity in ('warning', 'critical')),
  title text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  opened_at timestamptz not null,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  mtta_seconds integer check (mtta_seconds is null or mtta_seconds >= 0),
  mttr_seconds integer check (mttr_seconds is null or mttr_seconds >= 0),
  escalation_count integer not null default 0 check (escalation_count >= 0),
  first_owner_id uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, cycle_count)
);

create table if not exists private.order_operational_post_incident_reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null unique references private.order_operational_incident_cycles(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'completed')),
  root_cause_category text not null default 'unknown' check (root_cause_category in (
    'code', 'dependency', 'data', 'configuration', 'capacity', 'process', 'human', 'unknown'
  )),
  impact_summary text,
  root_cause text,
  contributing_factors jsonb not null default '[]'::jsonb,
  detection_assessment text,
  prevention_summary text,
  lessons_learned text,
  created_by uuid references public.users(id) on delete set null,
  updated_by uuid references public.users(id) on delete set null,
  completed_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists private.order_operational_prevention_actions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references private.order_operational_post_incident_reviews(id) on delete cascade,
  title text not null,
  owner_id uuid not null references public.users(id) on delete restrict,
  due_at date,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'cancelled')),
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists private.order_operational_post_incident_actions (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references private.order_operational_post_incident_reviews(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role in ('support', 'admin', 'system')),
  action text not null check (action in (
    'created_auto', 'saved', 'completed', 'reopened',
    'prevention_created', 'prevention_updated', 'prevention_completed', 'prevention_cancelled'
  )),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists private.order_operational_slo_targets (
  metric_key text primary key,
  title text not null,
  comparison text not null check (comparison in ('gte', 'lte')),
  target_value numeric not null,
  unit text not null,
  window_days integer not null default 30 check (window_days between 1 and 365),
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists private.order_operational_slo_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null,
  window_days integer not null check (window_days between 1 and 365),
  metrics jsonb not null default '{}'::jsonb,
  target_results jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  unique (report_date, window_days)
);

create index if not exists idx_order_operational_incident_cycles_opened
  on private.order_operational_incident_cycles(opened_at desc);
create index if not exists idx_order_operational_incident_cycles_resolved
  on private.order_operational_incident_cycles(resolved_at desc)
  where status = 'resolved';
create index if not exists idx_order_operational_incident_cycles_severity
  on private.order_operational_incident_cycles(severity, opened_at desc);
create index if not exists idx_order_operational_reviews_status
  on private.order_operational_post_incident_reviews(status, updated_at desc);
create index if not exists idx_order_operational_reviews_updated_by
  on private.order_operational_post_incident_reviews(updated_by)
  where updated_by is not null;
create index if not exists idx_order_operational_reviews_completed_by
  on private.order_operational_post_incident_reviews(completed_by)
  where completed_by is not null;
create index if not exists idx_order_operational_prevention_review
  on private.order_operational_prevention_actions(review_id, status, due_at);
create index if not exists idx_order_operational_prevention_owner
  on private.order_operational_prevention_actions(owner_id, status, due_at);
create index if not exists idx_order_operational_post_incident_action_review
  on private.order_operational_post_incident_actions(review_id, created_at desc);
create index if not exists idx_order_operational_post_incident_action_actor
  on private.order_operational_post_incident_actions(actor_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_order_operational_slo_reports_date
  on private.order_operational_slo_reports(report_date desc, window_days);

revoke all on private.order_operational_incident_cycles from public, anon, authenticated;
revoke all on private.order_operational_post_incident_reviews from public, anon, authenticated;
revoke all on private.order_operational_prevention_actions from public, anon, authenticated;
revoke all on private.order_operational_post_incident_actions from public, anon, authenticated;
revoke all on private.order_operational_slo_targets from public, anon, authenticated;
revoke all on private.order_operational_slo_reports from public, anon, authenticated;
grant select on private.order_operational_incident_cycles to service_role;
grant select on private.order_operational_post_incident_reviews to service_role;
grant select on private.order_operational_prevention_actions to service_role;
grant select on private.order_operational_post_incident_actions to service_role;
grant select on private.order_operational_slo_targets to service_role;
grant select on private.order_operational_slo_reports to service_role;

insert into private.order_operational_slo_targets (
  metric_key, title, comparison, target_value, unit, window_days, metadata
) values
  ('worker_availability_pct', 'Disponibilidade do worker', 'gte', 99.9, 'percent', 30, '{"source":"health_evaluations"}'::jsonb),
  ('critical_mtta_seconds', 'MTTA de incidentes críticos', 'lte', 600, 'seconds', 30, '{"alignedWith":"critical_ack_sla"}'::jsonb),
  ('warning_mtta_seconds', 'MTTA de alertas de atenção', 'lte', 1800, 'seconds', 30, '{"alignedWith":"warning_ack_sla"}'::jsonb),
  ('critical_mttr_seconds', 'MTTR de incidentes críticos', 'lte', 2400, 'seconds', 30, '{"alignedWith":"ack_plus_response_sla"}'::jsonb),
  ('warning_mttr_seconds', 'MTTR de alertas de atenção', 'lte', 9000, 'seconds', 30, '{"alignedWith":"ack_plus_response_sla"}'::jsonb),
  ('post_incident_completion_pct', 'Conclusão de análises pós-incidente', 'gte', 90, 'percent', 30, '{"scope":"resolved_cycles"}'::jsonb),
  ('overdue_prevention_actions', 'Ações preventivas vencidas', 'lte', 0, 'count', 30, '{"scope":"open_actions"}'::jsonb)
on conflict (metric_key) do update
set title = excluded.title,
    comparison = excluded.comparison,
    target_value = excluded.target_value,
    unit = excluded.unit,
    window_days = excluded.window_days,
    metadata = excluded.metadata,
    updated_at = now();

