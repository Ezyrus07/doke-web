-- PAY-A08 repository-only migration source.
-- This file is immutable and has not been applied to any remote environment.
-- It defines a private transactional alert outbox without an external delivery integration.

create table if not exists private.payment_reconciliation_alert_outbox (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references private.payment_reconciliation_cases(id) on delete restrict,
  dedupe_key_sha256 text not null unique check (dedupe_key_sha256 ~ '^[a-f0-9]{64}$'),
  priority text not null check (priority in ('P0', 'P1', 'P2', 'P3')),
  reason_code text not null,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'pending_delivery'
    check (status in ('pending_delivery', 'leased', 'delivered', 'failed', 'acknowledged', 'discarded')),
  available_at timestamptz not null default clock_timestamp(),
  lease_expires_at timestamptz,
  delivery_attempts integer not null default 0 check (delivery_attempts >= 0),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create index if not exists payment_reconciliation_alert_outbox_due_idx
  on private.payment_reconciliation_alert_outbox (available_at, priority, created_at)
  where status in ('pending_delivery', 'failed');

alter table private.payment_reconciliation_alert_outbox enable row level security;
revoke all on table private.payment_reconciliation_alert_outbox from public, anon, authenticated;

comment on table private.payment_reconciliation_alert_outbox is
  'PAY-A08 sanitized transactional outbox only. Direct notification delivery is not configured.';
