-- PAY-A08 repository-only migration source.
-- This file is immutable and has not been applied to any remote environment.
-- It defines private lease state for compare-and-swap worker claims.

create table if not exists private.payment_reconciliation_leases (
  case_id uuid primary key references private.payment_reconciliation_cases(id) on delete cascade,
  lease_id text not null unique,
  lease_token_hash_sha256 text not null check (lease_token_hash_sha256 ~ '^[a-f0-9]{64}$'),
  worker_reference_hash_sha256 text not null check (worker_reference_hash_sha256 ~ '^[a-f0-9]{64}$'),
  expected_revision bigint not null check (expected_revision >= 0),
  attempt integer not null check (attempt between 1 and 20),
  claimed_at timestamptz not null default clock_timestamp(),
  heartbeat_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  completed_at timestamptz,
  outcome text check (outcome in ('success', 'failure', 'conflict', 'timeout', 'skipped')),
  check (expires_at > claimed_at),
  check (completed_at is null or completed_at >= claimed_at)
);

create index if not exists payment_reconciliation_leases_expiry_idx
  on private.payment_reconciliation_leases (expires_at)
  where completed_at is null;

alter table private.payment_reconciliation_leases enable row level security;
revoke all on table private.payment_reconciliation_leases from public, anon, authenticated;

comment on table private.payment_reconciliation_leases is
  'PAY-A08 private database-clock lease state. Takeover is permitted only after expiry.';
