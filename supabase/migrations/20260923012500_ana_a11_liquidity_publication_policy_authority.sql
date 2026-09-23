-- ANA-A11: repository-only candidate for versioned analytics publication policy authority.
--
-- This migration creates storage/provenance shape only. It inserts no policy row,
-- schedules no cron job, activates no freshness threshold and changes no source fact.
-- The fixed-duration grid is defined by (window_anchor + N * window_step_seconds);
-- no separate timezone input participates in the mathematical boundary calculation.

create table if not exists private.analytics_metric_publication_policies_v1 (
  policy_id text primary key,
  metric_key text not null,
  metric_version text not null,
  window_step_seconds integer not null,
  projection_delay_slo_seconds integer not null,
  derived_max_lag_seconds bigint generated always as (
    window_step_seconds::bigint + projection_delay_slo_seconds::bigint
  ) stored,
  window_anchor timestamptz not null,
  max_catch_up_windows_per_invocation integer not null,
  missed_window_order text not null default 'oldest_first',
  scheduler_mechanism text not null,
  derivation_contract_id text not null,
  series_contract_id text not null,
  approval_evidence jsonb not null,
  effective_from timestamptz not null,
  effective_until timestamptz,
  created_at timestamptz not null default pg_catalog.now(),

  constraint analytics_metric_publication_policy_id_check
    check (pg_catalog.char_length(pg_catalog.btrim(policy_id)) between 3 and 120),
  constraint analytics_metric_publication_metric_key_check
    check (pg_catalog.char_length(pg_catalog.btrim(metric_key)) between 3 and 120),
  constraint analytics_metric_publication_metric_version_check
    check (pg_catalog.char_length(pg_catalog.btrim(metric_version)) between 1 and 40),
  constraint analytics_metric_publication_window_step_check
    check (window_step_seconds > 0),
  constraint analytics_metric_publication_projection_delay_check
    check (projection_delay_slo_seconds >= 0),
  constraint analytics_metric_publication_derived_lag_int_check
    check (derived_max_lag_seconds between 1 and 2147483647),
  constraint analytics_metric_publication_catch_up_check
    check (max_catch_up_windows_per_invocation > 0),
  constraint analytics_metric_publication_missed_order_check
    check (missed_window_order = 'oldest_first'),
  constraint analytics_metric_publication_scheduler_check
    check (scheduler_mechanism = 'supabase_pg_cron_database_local'),
  constraint analytics_metric_publication_derivation_contract_check
    check (derivation_contract_id = 'ana-a11-liquidity-freshness-policy-derivation-v1'),
  constraint analytics_metric_publication_series_contract_check
    check (series_contract_id = 'ana-a11-liquidity-series-orchestration-v1'),
  constraint analytics_metric_publication_approval_evidence_check
    check (pg_catalog.jsonb_typeof(approval_evidence) = 'object'),
  constraint analytics_metric_publication_effective_window_check
    check (effective_until is null or effective_until > effective_from),
  constraint analytics_metric_publication_unique_effective
    unique (metric_key, metric_version, effective_from)
);

create index if not exists analytics_metric_publication_policy_lookup_idx
  on private.analytics_metric_publication_policies_v1 (
    metric_key,
    metric_version,
    effective_from desc
  );

alter table private.analytics_metric_publication_policies_v1 enable row level security;

revoke all privileges on table private.analytics_metric_publication_policies_v1
  from public, anon, authenticated, service_role;

comment on table private.analytics_metric_publication_policies_v1 is
  'ANA-A11 versioned publication-policy provenance. Stores approved cadence, fixed-duration grid anchor, delay SLO, bounded oldest-first catch-up, selected pg_cron topology and approval evidence. derived_max_lag_seconds is mechanical and no policy row is created by the schema migration.';

create or replace function private.current_analytics_metric_publication_policy_v1(
  p_metric_key text,
  p_metric_version text,
  p_at timestamptz
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'policyId',p.policy_id,
    'metricKey',p.metric_key,
    'metricVersion',p.metric_version,
    'windowStepSeconds',p.window_step_seconds,
    'projectionDelaySloSeconds',p.projection_delay_slo_seconds,
    'derivedMaxLagSeconds',p.derived_max_lag_seconds,
    'windowAnchor',p.window_anchor,
    'maxCatchUpWindowsPerInvocation',p.max_catch_up_windows_per_invocation,
    'missedWindowOrder',p.missed_window_order,
    'schedulerMechanism',p.scheduler_mechanism,
    'derivationContractId',p.derivation_contract_id,
    'seriesContractId',p.series_contract_id,
    'approvalEvidence',p.approval_evidence,
    'effectiveFrom',p.effective_from,
    'effectiveUntil',p.effective_until
  )
  from private.analytics_metric_publication_policies_v1 p
  where p.metric_key = pg_catalog.btrim(p_metric_key)
    and p.metric_version = pg_catalog.btrim(p_metric_version)
    and p.effective_from <= p_at
    and (p.effective_until is null or p.effective_until > p_at)
  order by p.effective_from desc
  limit 1
$$;

revoke all privileges on function private.current_analytics_metric_publication_policy_v1(text,text,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.current_analytics_metric_publication_policy_v1(text,text,timestamptz) is
  'ANA-A11 owner-only selector for the versioned publication policy effective at a point in time. No implicit/default policy exists.';
