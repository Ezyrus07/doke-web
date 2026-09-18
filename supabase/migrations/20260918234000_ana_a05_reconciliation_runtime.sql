-- ANA-001 / ANA-A05
-- Canonical ORD reconciliation and low-cardinality analytics data-quality rollups.
-- Repository migration only until explicitly applied in staging.

create table if not exists private.analytics_reconciliation_runs_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  source_domain text not null,
  projection_domain text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  source_count bigint not null,
  projection_count bigint not null,
  reconciliation_state text not null,
  divergence_counts jsonb not null default '{}'::jsonb,
  source_fingerprint text not null,
  projection_fingerprint text not null,
  comparison_fingerprint text not null,
  observed_at timestamptz not null default pg_catalog.clock_timestamp(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_reconciliation_window_check check (window_end > window_start),
  constraint analytics_reconciliation_count_check check (source_count >= 0 and projection_count >= 0),
  constraint analytics_reconciliation_state_check check (reconciliation_state in ('matched','diverged','blocked','not_applicable')),
  constraint analytics_reconciliation_source_hash_check check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint analytics_reconciliation_projection_hash_check check (projection_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint analytics_reconciliation_comparison_hash_check check (comparison_fingerprint ~ '^[0-9a-f]{64}$')
);

create table if not exists private.analytics_data_quality_rollups_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  metric_key text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  sample_count bigint not null,
  value numeric,
  health_state text not null,
  source_run_id uuid references private.analytics_reconciliation_runs_v1(id) on delete cascade,
  observed_at timestamptz not null default pg_catalog.clock_timestamp(),
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_dq_window_check check (window_end > window_start),
  constraint analytics_dq_sample_check check (sample_count >= 0),
  constraint analytics_dq_health_check check (health_state in ('no_data','healthy','warning','critical'))
);

create index if not exists analytics_reconciliation_runs_time_idx
  on private.analytics_reconciliation_runs_v1 (observed_at desc);

create index if not exists analytics_dq_rollups_metric_time_idx
  on private.analytics_data_quality_rollups_v1 (metric_key, observed_at desc);

revoke all on table private.analytics_reconciliation_runs_v1 from public, anon, authenticated, service_role;
revoke all on table private.analytics_data_quality_rollups_v1 from public, anon, authenticated, service_role;
grant select on table private.analytics_reconciliation_runs_v1 to service_role;
grant select on table private.analytics_data_quality_rollups_v1 to service_role;

create or replace function public.run_analytics_order_reconciliation_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_source_count bigint;
  v_projection_count bigint;
  v_projection_missing bigint;
  v_source_missing bigint;
  v_event_type_mismatch bigint;
  v_subject_mismatch bigint;
  v_timestamp_mismatch bigint;
  v_source_payload jsonb;
  v_projection_payload jsonb;
  v_source_hash text;
  v_projection_hash text;
  v_divergences jsonb;
  v_comparison_hash text;
  v_state text;
  v_run_id uuid;
  v_missing_rate numeric;
  v_mismatch_rate numeric;
  v_health text;
begin
  if p_window_end <= p_window_start then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_RECONCILIATION_WINDOW_INVALID';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.id,e.event_key,e.order_id,e.event_type,e.created_at
    ) order by e.id), '[]'::jsonb),
    count(*)
  into v_source_payload, v_source_count
  from private.order_domain_events e
  where e.created_at >= p_window_start and e.created_at < p_window_end;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.order_event_id,e.event_key,e.order_id,e.event_type,e.created_at
    ) order by e.order_event_id), '[]'::jsonb),
    count(*)
  into v_projection_payload, v_projection_count
  from private.order_metric_events e
  where e.created_at >= p_window_start and e.created_at < p_window_end;

  select count(*) into v_projection_missing
  from private.order_domain_events s
  left join private.order_metric_events p on p.order_event_id = s.id
  where s.created_at >= p_window_start and s.created_at < p_window_end
    and p.order_event_id is null;

  select count(*) into v_source_missing
  from private.order_metric_events p
  left join private.order_domain_events s on s.id = p.order_event_id
  where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
    and s.id is null;

  select
    count(*) filter (where s.event_type is distinct from p.event_type),
    count(*) filter (where s.order_id is distinct from p.order_id),
    count(*) filter (where s.created_at is distinct from p.occurred_at)
  into v_event_type_mismatch, v_subject_mismatch, v_timestamp_mismatch
  from private.order_domain_events s
  join private.order_metric_events p on p.order_event_id = s.id
  where s.created_at >= p_window_start and s.created_at < p_window_end;

  v_source_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_source_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_projection_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_projection_payload::text, 'UTF8'), 'sha256'),'hex'
  );
  v_divergences := pg_catalog.jsonb_build_object(
    'projectionMissing',v_projection_missing,
    'sourceMissing',v_source_missing,
    'duplicateProjection',0,
    'eventTypeMismatch',v_event_type_mismatch,
    'subjectMismatch',v_subject_mismatch,
    'timestampMismatch',v_timestamp_mismatch,
    'dimensionMismatch',0
  );
  v_state := case
    when v_projection_missing + v_source_missing + v_event_type_mismatch + v_subject_mismatch + v_timestamp_mismatch = 0
      then 'matched'
    else 'diverged'
  end;
  v_comparison_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.convert_to(pg_catalog.jsonb_build_object(
        'sourceHash',v_source_hash,'projectionHash',v_projection_hash,'divergences',v_divergences
      )::text,'UTF8'
    ),'sha256'),'hex'
  );

  insert into private.analytics_reconciliation_runs_v1 (
    source_domain,projection_domain,window_start,window_end,source_count,projection_count,
    reconciliation_state,divergence_counts,source_fingerprint,projection_fingerprint,comparison_fingerprint
  ) values (
    'ORD-001','ANA-001',p_window_start,p_window_end,v_source_count,v_projection_count,
    v_state,v_divergences,v_source_hash,v_projection_hash,v_comparison_hash
  ) returning id into v_run_id;

  v_missing_rate := case when v_source_count = 0 then null else v_projection_missing::numeric / v_source_count end;
  v_mismatch_rate := case when v_source_count = 0 then null else
    (v_projection_missing + v_source_missing + v_event_type_mismatch + v_subject_mismatch + v_timestamp_mismatch)::numeric
      / v_source_count end;
  v_health := case
    when v_source_count = 0 then 'no_data'
    when v_state = 'matched' then 'healthy'
    else 'warning'
  end;

  insert into private.analytics_data_quality_rollups_v1 (
    metric_key,window_start,window_end,sample_count,value,health_state,source_run_id
  ) values
    ('analytics_projection_missing_rate',p_window_start,p_window_end,v_source_count,v_missing_rate,v_health,v_run_id),
    ('analytics_reconciliation_mismatch_rate',p_window_start,p_window_end,v_source_count,v_mismatch_rate,v_health,v_run_id);

  return pg_catalog.jsonb_build_object(
    'runId',v_run_id,
    'sourceDomain','ORD-001',
    'projectionDomain','ANA-001',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'sourceCount',v_source_count,
    'projectionCount',v_projection_count,
    'reconciliationState',v_state,
    'divergenceCounts',v_divergences,
    'sourceFingerprint',v_source_hash,
    'projectionFingerprint',v_projection_hash,
    'comparisonFingerprint',v_comparison_hash
  );
end;
$$;

revoke all on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) to service_role;

comment on table private.analytics_reconciliation_runs_v1 is
  'ANA-A05 append-only reconciliation evidence comparing canonical source facts with analytics projections.';
comment on table private.analytics_data_quality_rollups_v1 is
  'ANA-A05 low-cardinality technical data-quality rollups. Business KPI changes are not incidents by themselves.';
comment on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) is
  'ANA-A05 deterministic ORD-to-ANA reconciliation. It never mutates the canonical ORD source.';
