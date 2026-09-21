-- ANA-001 defense-in-depth hardening.
-- Authorized for staging by explicit user approval on 2026-09-21.
-- Adds a second security boundary to private ANA tables and covers three
-- advisor-reported foreign keys. It deliberately does not create policies,
-- change grants, enable FORCE RLS, alter RPC authority, or touch production.

alter table private.analytics_behavior_events_v1
  enable row level security;

alter table private.analytics_metric_snapshots_v1
  enable row level security;

alter table private.analytics_reconciliation_runs_v1
  enable row level security;

alter table private.analytics_data_quality_rollups_v1
  enable row level security;

create index if not exists analytics_behavior_events_order_id_idx
  on private.analytics_behavior_events_v1 (order_id);

create index if not exists analytics_dq_rollups_source_run_id_idx
  on private.analytics_data_quality_rollups_v1 (source_run_id);

create index if not exists analytics_metric_snapshots_supersedes_id_idx
  on private.analytics_metric_snapshots_v1 (supersedes_snapshot_id);
