-- PAY-A08 repository-only migration source.
-- This file is immutable, provider-neutral and has not been applied to any remote environment.
-- It creates private reconciliation cases and append-only audit events only.

create schema if not exists private;

create table if not exists private.payment_reconciliation_cases (
  id uuid primary key default gen_random_uuid(),
  case_key text not null unique,
  status text not null check (status in (
    'open', 'triaged', 'replay_review', 'approved_for_replay', 'dry_run_passed',
    'replay_submitted', 'pending_verification', 'resolved', 'dismissed', 'escalated'
  )),
  severity text not null check (severity in ('none', 'low', 'medium', 'high', 'critical')),
  reason_code text not null,
  comparison_fingerprint_sha256 text not null check (comparison_fingerprint_sha256 ~ '^[a-f0-9]{64}$'),
  revision bigint not null default 0 check (revision >= 0),
  next_attempt_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  resolution_code text,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  resolved_at timestamptz,
  check ((status = 'resolved' and resolved_at is not null) or status <> 'resolved')
);

create index if not exists payment_reconciliation_cases_due_idx
  on private.payment_reconciliation_cases (next_attempt_at, severity, created_at)
  where status in ('open', 'triaged', 'replay_review', 'approved_for_replay', 'dry_run_passed', 'pending_verification', 'escalated');

create table if not exists private.payment_reconciliation_audit_events (
  id bigint generated always as identity primary key,
  case_id uuid not null references private.payment_reconciliation_cases(id) on delete restrict,
  event_type text not null,
  actor_type text not null check (actor_type in ('system', 'support', 'admin')),
  actor_reference_hash_sha256 text,
  previous_revision bigint not null check (previous_revision >= 0),
  next_revision bigint not null check (next_revision > previous_revision),
  evidence_hash_sha256 text not null check (evidence_hash_sha256 ~ '^[a-f0-9]{64}$'),
  sanitized_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp(),
  check (actor_reference_hash_sha256 is null or actor_reference_hash_sha256 ~ '^[a-f0-9]{64}$')
);

create index if not exists payment_reconciliation_audit_case_idx
  on private.payment_reconciliation_audit_events (case_id, id);

alter table private.payment_reconciliation_cases enable row level security;
alter table private.payment_reconciliation_audit_events enable row level security;

revoke all on table private.payment_reconciliation_cases from public, anon, authenticated;
revoke all on table private.payment_reconciliation_audit_events from public, anon, authenticated;
revoke all on sequence private.payment_reconciliation_audit_events_id_seq from public, anon, authenticated;

comment on table private.payment_reconciliation_cases is
  'PAY-A08 private server-only reconciliation case store. No raw provider payload or card data.';
comment on table private.payment_reconciliation_audit_events is
  'PAY-A08 append-only sanitized reconciliation audit trail.';
