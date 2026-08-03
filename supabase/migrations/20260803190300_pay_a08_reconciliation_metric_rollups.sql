-- PAY-A08 repository-only migration source.
-- This file is immutable and has not been applied to any remote environment.
-- It stores low-cardinality aggregate metric rollups only.

create table if not exists private.payment_reconciliation_metric_rollups (
  bucket_start timestamptz not null,
  bucket_seconds integer not null check (bucket_seconds in (60, 300, 900, 3600, 86400)),
  metric_name text not null check (metric_name in (
    'pay_reconciliation_cases',
    'pay_reconciliation_stale_cases',
    'pay_reconciliation_claim_conflicts_total',
    'pay_reconciliation_replay_attempts_total',
    'pay_reconciliation_replay_failures_total',
    'pay_reconciliation_latency_seconds',
    'pay_reconciliation_alert_outbox_pending',
    'pay_reconciliation_scheduler_tick_duration_seconds'
  )),
  environment text not null check (environment in ('local', 'test', 'staging')),
  severity text not null default 'none' check (severity in ('none', 'low', 'medium', 'high', 'critical')),
  status text not null default 'open',
  outcome text not null default 'success' check (outcome in ('success', 'failure', 'conflict', 'timeout', 'skipped')),
  operation text not null check (operation in ('scan', 'claim', 'renew', 'complete', 'alert', 'replay', 'verify')),
  sample_count bigint not null default 0 check (sample_count >= 0),
  value_sum double precision not null default 0 check (value_sum >= 0),
  value_max double precision not null default 0 check (value_max >= 0),
  updated_at timestamptz not null default clock_timestamp(),
  primary key (bucket_start, bucket_seconds, metric_name, environment, severity, status, outcome, operation)
);

create index if not exists payment_reconciliation_metric_rollups_retention_idx
  on private.payment_reconciliation_metric_rollups (bucket_start);

alter table private.payment_reconciliation_metric_rollups enable row level security;
revoke all on table private.payment_reconciliation_metric_rollups from public, anon, authenticated;

comment on table private.payment_reconciliation_metric_rollups is
  'PAY-A08 low-cardinality aggregate metrics only; financial and personal identifiers are prohibited.';
