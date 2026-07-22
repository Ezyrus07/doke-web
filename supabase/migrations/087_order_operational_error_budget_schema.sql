-- Doke: error budgets, change registry, temporary overrides and immutable gate decisions.

create table if not exists private.order_operational_error_budget_policies (
  metric_key text primary key,
  title text not null,
  target_percent numeric(7,4) not null check (target_percent > 0 and target_percent <= 100),
  enforcement_enabled boolean not null default true,
  minimum_samples_1h integer not null default 1 check (minimum_samples_1h >= 0),
  minimum_samples_6h integer not null default 1 check (minimum_samples_6h >= 0),
  minimum_samples_24h integer not null default 1 check (minimum_samples_24h >= 0),
  minimum_samples_30d integer not null default 1 check (minimum_samples_30d >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.order_operational_error_budget_snapshots (
  id uuid primary key default gen_random_uuid(),
  protection_state text not null check (protection_state in ('healthy', 'warning', 'restricted', 'frozen')),
  reasons jsonb not null default '[]'::jsonb,
  windows jsonb not null default '{}'::jsonb,
  worst_short_burn_rate numeric(14,4),
  maximum_30d_consumed_percent numeric(14,4),
  open_critical_incidents integer not null default 0 check (open_critical_incidents >= 0),
  escalated_critical_incidents integer not null default 0 check (escalated_critical_incidents >= 0),
  source_hash text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists private.order_operational_changes (
  id uuid primary key default gen_random_uuid(),
  external_key text not null unique,
  change_type text not null check (change_type in (
    'deploy', 'migration', 'edge_function', 'configuration', 'feature_flag', 'manual'
  )),
  risk_level text not null check (risk_level in ('low', 'medium', 'high', 'critical')),
  title text not null,
  description text,
  change_reference text,
  status text not null default 'registered' check (status in (
    'registered', 'evaluated', 'approval_required', 'blocked', 'approved',
    'started', 'completed', 'failed', 'cancelled'
  )),
  gate_decision text not null default 'hard_block' check (gate_decision in (
    'allow', 'approval_required', 'hard_block'
  )),
  protection_state text not null default 'frozen' check (protection_state in (
    'healthy', 'warning', 'restricted', 'frozen'
  )),
  evaluation_snapshot jsonb not null default '{}'::jsonb,
  evaluation_hash text,
  requested_by uuid references public.users(id) on delete set null,
  requested_role text not null check (requested_role in ('support', 'admin', 'system')),
  requested_at timestamptz not null default now(),
  evaluated_at timestamptz,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  override_expires_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  completion_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists private.order_operational_change_overrides (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references private.order_operational_changes(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role = 'admin'),
  reason text not null,
  granted_protection_state text not null check (granted_protection_state in (
    'healthy', 'warning', 'restricted', 'frozen'
  )),
  evaluation_hash text,
  status text not null default 'active' check (status in ('active', 'used', 'expired', 'revoked')),
  granted_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.order_operational_change_decisions (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references private.order_operational_changes(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role in ('support', 'admin', 'system')),
  action text not null check (action in (
    'registered', 'evaluated', 'allowed', 'approval_required', 'blocked',
    'override_granted', 'override_expired', 'override_used', 'released_auto',
    'started', 'completed', 'failed', 'cancelled', 'incident_correlated'
  )),
  previous_status text,
  new_status text,
  gate_decision text check (gate_decision is null or gate_decision in (
    'allow', 'approval_required', 'hard_block'
  )),
  protection_state text check (protection_state is null or protection_state in (
    'healthy', 'warning', 'restricted', 'frozen'
  )),
  reason text,
  snapshot jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists private.order_operational_change_incidents (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references private.order_operational_changes(id) on delete cascade,
  alert_id uuid not null references private.order_operational_alerts(id) on delete cascade,
  cycle_count integer not null check (cycle_count >= 1),
  correlation_score integer not null check (correlation_score between 0 and 100),
  correlation_reason text not null,
  correlated_at timestamptz not null default now(),
  unique (change_id, alert_id, cycle_count)
);

insert into private.order_operational_error_budget_policies (
  metric_key, title, target_percent, enforcement_enabled,
  minimum_samples_1h, minimum_samples_6h, minimum_samples_24h, minimum_samples_30d, metadata
) values
  ('worker_availability', 'Disponibilidade do worker', 99.9, true, 6, 24, 72, 72, '{"source":"health_evaluations","cadenceMinutes":5}'::jsonb),
  ('worker_delivery_success', 'Conclusão dos eventos reivindicados', 99.0, true, 10, 10, 20, 20, '{"source":"worker_runs"}'::jsonb),
  ('incident_mtta_compliance', 'Incidentes assumidos dentro do SLA', 90.0, true, 3, 3, 3, 3, '{"criticalSeconds":600,"warningSeconds":1800}'::jsonb),
  ('incident_mttr_compliance', 'Incidentes recuperados dentro do SLA', 90.0, true, 3, 3, 3, 3, '{"criticalSeconds":2400,"warningSeconds":9000}'::jsonb)
on conflict (metric_key) do update
set title = excluded.title,
    target_percent = excluded.target_percent,
    enforcement_enabled = excluded.enforcement_enabled,
    minimum_samples_1h = excluded.minimum_samples_1h,
    minimum_samples_6h = excluded.minimum_samples_6h,
    minimum_samples_24h = excluded.minimum_samples_24h,
    minimum_samples_30d = excluded.minimum_samples_30d,
    metadata = excluded.metadata,
    updated_at = now();

create index if not exists idx_order_error_budget_snapshots_observed
  on private.order_operational_error_budget_snapshots(observed_at desc);
create index if not exists idx_order_error_budget_snapshots_state
  on private.order_operational_error_budget_snapshots(protection_state, observed_at desc);
create index if not exists idx_order_operational_changes_status
  on private.order_operational_changes(status, requested_at desc);
create index if not exists idx_order_operational_changes_risk
  on private.order_operational_changes(risk_level, requested_at desc);
create index if not exists idx_order_operational_changes_requested_by
  on private.order_operational_changes(requested_by)
  where requested_by is not null;
create index if not exists idx_order_operational_changes_approved_by
  on private.order_operational_changes(approved_by)
  where approved_by is not null;
create index if not exists idx_order_change_overrides_change_active
  on private.order_operational_change_overrides(change_id, expires_at desc)
  where status = 'active';
create index if not exists idx_order_change_overrides_actor
  on private.order_operational_change_overrides(actor_id, granted_at desc)
  where actor_id is not null;
create index if not exists idx_order_change_decisions_change
  on private.order_operational_change_decisions(change_id, created_at desc);
create index if not exists idx_order_change_decisions_actor
  on private.order_operational_change_decisions(actor_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_order_change_incidents_alert
  on private.order_operational_change_incidents(alert_id, cycle_count, correlated_at desc);

revoke all on private.order_operational_error_budget_policies from public, anon, authenticated;
revoke all on private.order_operational_error_budget_snapshots from public, anon, authenticated;
revoke all on private.order_operational_changes from public, anon, authenticated;
revoke all on private.order_operational_change_overrides from public, anon, authenticated;
revoke all on private.order_operational_change_decisions from public, anon, authenticated;
revoke all on private.order_operational_change_incidents from public, anon, authenticated;

grant select on private.order_operational_error_budget_policies to service_role;
grant select on private.order_operational_error_budget_snapshots to service_role;
grant select on private.order_operational_changes to service_role;
grant select on private.order_operational_change_overrides to service_role;
grant select on private.order_operational_change_decisions to service_role;
grant select on private.order_operational_change_incidents to service_role;

create or replace function private.prevent_order_operational_change_decision_mutation()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  raise exception using errcode = '55000', message = 'DOKE_ORDER_CHANGE_DECISION_IMMUTABLE';
end;
$$;

drop trigger if exists trg_prevent_order_change_decision_mutation on private.order_operational_change_decisions;
create trigger trg_prevent_order_change_decision_mutation
before update or delete on private.order_operational_change_decisions
for each row execute function private.prevent_order_operational_change_decision_mutation();

revoke all on function private.prevent_order_operational_change_decision_mutation() from public, anon, authenticated;
