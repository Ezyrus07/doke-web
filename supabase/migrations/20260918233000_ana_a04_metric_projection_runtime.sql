-- ANA-001 / ANA-A04
-- Canonical order-health projection support and append-only metric snapshots.
-- Repository migration only until explicitly applied in staging.

create or replace function private.enrich_order_metric_dimensions_for_analytics_v1()
returns trigger
language plpgsql
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_order public.orders%rowtype;
  v_requested_dimensions jsonb;
begin
  select o.* into v_order
  from public.orders o
  where o.id = new.order_id;

  if not found then
    return new;
  end if;

  if new.event_type <> 'order.requested' then
    select e.dimensions
      into v_requested_dimensions
    from private.order_metric_events e
    where e.order_id = new.order_id
      and e.event_type = 'order.requested'
    order by e.occurred_at asc, e.created_at asc
    limit 1;
  end if;

  new.dimensions := coalesce(new.dimensions, '{}'::jsonb)
    || pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'serviceCategory', nullif(v_order.service_snapshot ->> 'category', ''),
      'serviceCity', nullif(v_order.service_snapshot ->> 'city', ''),
      'serviceState', nullif(v_order.service_snapshot ->> 'state', ''),
      'serviceVersionId', v_order.service_version_id,
      'demandCity', case
        when new.event_type = 'order.requested' then nullif(v_order.city, '')
        else nullif(v_requested_dimensions ->> 'demandCity', '')
      end,
      'demandState', case
        when new.event_type = 'order.requested' then nullif(v_order.state, '')
        else nullif(v_requested_dimensions ->> 'demandState', '')
      end
    ));

  return new;
end;
$$;

revoke all on function private.enrich_order_metric_dimensions_for_analytics_v1() from public, anon, authenticated;

drop trigger if exists trg_order_metric_analytics_dimensions_v1 on private.order_metric_events;
create trigger trg_order_metric_analytics_dimensions_v1
before insert on private.order_metric_events
for each row execute function private.enrich_order_metric_dimensions_for_analytics_v1();

-- Safe historical enrichment only from the immutable service snapshot.
-- Demand region is intentionally not backfilled from mutable order columns.
update private.order_metric_events e
set dimensions = coalesce(e.dimensions, '{}'::jsonb)
  || pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'serviceCategory', nullif(o.service_snapshot ->> 'category', ''),
    'serviceCity', nullif(o.service_snapshot ->> 'city', ''),
    'serviceState', nullif(o.service_snapshot ->> 'state', ''),
    'serviceVersionId', o.service_version_id
  ))
from public.orders o
where o.id = e.order_id
  and o.service_snapshot is not null;

create table if not exists private.analytics_metric_snapshots_v1 (
  id uuid primary key default extensions.gen_random_uuid(),
  metric_key text not null,
  metric_version text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  data_through timestamptz not null,
  dimensions jsonb not null default '{}'::jsonb,
  dimension_hash text not null,
  revision integer not null,
  numerator numeric,
  denominator numeric,
  value numeric,
  sample_count bigint not null default 0,
  projection_state text not null,
  coverage_state text not null,
  reconciliation_state text not null,
  source_fingerprint text not null,
  projection_fingerprint text not null,
  correction_reason text,
  supersedes_snapshot_id uuid references private.analytics_metric_snapshots_v1(id) on delete restrict,
  computed_at timestamptz not null,
  created_at timestamptz not null default pg_catalog.now(),
  constraint analytics_metric_snapshot_window_check check (window_end > window_start),
  constraint analytics_metric_snapshot_revision_check check (revision > 0),
  constraint analytics_metric_snapshot_sample_check check (sample_count >= 0),
  constraint analytics_metric_snapshot_projection_state_check check (projection_state in ('authoritative','stale','unavailable')),
  constraint analytics_metric_snapshot_coverage_state_check check (coverage_state in ('complete','partial','not_applicable')),
  constraint analytics_metric_snapshot_reconciliation_state_check check (reconciliation_state in ('matched','diverged','blocked','not_applicable')),
  constraint analytics_metric_snapshot_dimension_hash_check check (dimension_hash ~ '^[0-9a-f]{64}$'),
  constraint analytics_metric_snapshot_source_hash_check check (source_fingerprint ~ '^[0-9a-f]{64}$'),
  constraint analytics_metric_snapshot_projection_hash_check check (projection_fingerprint ~ '^[0-9a-f]{64}$'),
  unique (metric_key, metric_version, window_start, window_end, dimension_hash, revision)
);

create index if not exists analytics_metric_snapshots_lookup_idx
  on private.analytics_metric_snapshots_v1 (metric_key, metric_version, window_end desc, revision desc);

revoke all on table private.analytics_metric_snapshots_v1 from public, anon, authenticated, service_role;
grant select on table private.analytics_metric_snapshots_v1 to service_role;

create or replace function public.append_analytics_metric_snapshot_v1(p_snapshot jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $$
declare
  v_snapshot jsonb := coalesce(p_snapshot, '{}'::jsonb);
  v_dimensions jsonb := coalesce(v_snapshot -> 'dimensions', '{}'::jsonb);
  v_dimension_hash text;
  v_source_hash text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_snapshot ->> 'sourceFingerprint', '')));
  v_projection_hash text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_snapshot ->> 'projectionFingerprint', '')));
  v_metric_key text := pg_catalog.btrim(coalesce(v_snapshot ->> 'metricKey', ''));
  v_metric_version text := pg_catalog.btrim(coalesce(v_snapshot ->> 'metricVersion', ''));
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_data_through timestamptz;
  v_computed_at timestamptz;
  v_current private.analytics_metric_snapshots_v1%rowtype;
  v_id uuid;
  v_revision integer;
  v_projection_state text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_snapshot ->> 'projectionState', '')));
  v_coverage_state text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_snapshot ->> 'coverageState', '')));
  v_reconciliation_state text := pg_catalog.lower(pg_catalog.btrim(coalesce(v_snapshot ->> 'reconciliationState', '')));
begin
  if pg_catalog.jsonb_typeof(v_snapshot) <> 'object'
     or pg_catalog.jsonb_typeof(v_dimensions) <> 'object' then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_METRIC_SNAPSHOT_INVALID';
  end if;

  if exists (
    select 1 from pg_catalog.jsonb_object_keys(v_snapshot) as snapshot_key(key)
    where snapshot_key.key not in (
      'metricKey','metricVersion','windowStart','windowEnd','dataThrough','dimensions',
      'numerator','denominator','value','sampleCount','projectionState','coverageState',
      'reconciliationState','sourceFingerprint','projectionFingerprint','correctionReason','computedAt'
    )
  ) then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_METRIC_SNAPSHOT_UNKNOWN_FIELD';
  end if;

  if length(v_metric_key) not between 3 and 120
     or length(v_metric_version) not between 1 and 40
     or v_source_hash !~ '^[0-9a-f]{64}$'
     or v_projection_hash !~ '^[0-9a-f]{64}$'
     or v_projection_state not in ('authoritative','stale','unavailable')
     or v_coverage_state not in ('complete','partial','not_applicable')
     or v_reconciliation_state not in ('matched','diverged','blocked','not_applicable') then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_METRIC_SNAPSHOT_SHAPE_INVALID';
  end if;

  begin
    v_window_start := (v_snapshot ->> 'windowStart')::timestamptz;
    v_window_end := (v_snapshot ->> 'windowEnd')::timestamptz;
    v_data_through := (v_snapshot ->> 'dataThrough')::timestamptz;
    v_computed_at := (v_snapshot ->> 'computedAt')::timestamptz;
  exception when others then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_METRIC_SNAPSHOT_TIME_INVALID';
  end;

  if v_window_end <= v_window_start then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_METRIC_WINDOW_INVALID';
  end if;

  v_dimension_hash := pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(v_dimensions::text, 'UTF8'), 'sha256'),
    'hex'
  );

  select s.* into v_current
  from private.analytics_metric_snapshots_v1 s
  where s.metric_key = v_metric_key
    and s.metric_version = v_metric_version
    and s.window_start = v_window_start
    and s.window_end = v_window_end
    and s.dimension_hash = v_dimension_hash
  order by s.revision desc
  limit 1;

  if found
     and v_current.source_fingerprint = v_source_hash
     and v_current.projection_fingerprint = v_projection_hash then
    return pg_catalog.jsonb_build_object(
      'state','NO_CHANGE','snapshotId',v_current.id,'revision',v_current.revision
    );
  end if;

  v_revision := coalesce(v_current.revision, 0) + 1;

  insert into private.analytics_metric_snapshots_v1 (
    metric_key,metric_version,window_start,window_end,data_through,dimensions,dimension_hash,
    revision,numerator,denominator,value,sample_count,projection_state,coverage_state,
    reconciliation_state,source_fingerprint,projection_fingerprint,correction_reason,
    supersedes_snapshot_id,computed_at
  ) values (
    v_metric_key,v_metric_version,v_window_start,v_window_end,v_data_through,v_dimensions,v_dimension_hash,
    v_revision,nullif(v_snapshot ->> 'numerator','')::numeric,nullif(v_snapshot ->> 'denominator','')::numeric,
    nullif(v_snapshot ->> 'value','')::numeric,coalesce(nullif(v_snapshot ->> 'sampleCount','')::bigint,0),
    v_projection_state,v_coverage_state,v_reconciliation_state,v_source_hash,v_projection_hash,
    nullif(pg_catalog.btrim(coalesce(v_snapshot ->> 'correctionReason','')),''),
    v_current.id,v_computed_at
  )
  returning id into v_id;

  return pg_catalog.jsonb_build_object('state','APPENDED','snapshotId',v_id,'revision',v_revision);
end;
$$;

revoke all on function public.append_analytics_metric_snapshot_v1(jsonb) from public, anon, authenticated;
grant execute on function public.append_analytics_metric_snapshot_v1(jsonb) to service_role;

create or replace function public.compute_analytics_order_health_v1(
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_service_category text default null,
  p_service_state text default null
)
returns jsonb
language sql
stable
security definer
set search_path = 'pg_catalog'
as $$
with requested as (
  select
    e.order_id,
    e.client_id,
    e.occurred_at as requested_at,
    e.dimensions
  from private.order_metric_events e
  where e.event_type = 'order.requested'
    and e.occurred_at >= p_window_start
    and e.occurred_at < p_window_end
    and (p_service_category is null or pg_catalog.lower(coalesce(e.dimensions ->> 'serviceCategory','')) = pg_catalog.lower(p_service_category))
    and (p_service_state is null or pg_catalog.upper(coalesce(e.dimensions ->> 'serviceState','')) = pg_catalog.upper(p_service_state))
),
timeline as (
  select
    r.order_id,
    r.client_id,
    r.requested_at,
    r.dimensions,
    min(e.occurred_at) filter (where e.event_type = 'order.quoted') as first_quoted_at,
    bool_or(e.event_type = 'order.disputed') as ever_disputed,
    (array_agg(e.event_type order by e.occurred_at desc, e.created_at desc))[1] as final_event_type
  from requested r
  join private.order_metric_events e
    on e.order_id = r.order_id
   and e.occurred_at <= p_window_end
  group by r.order_id,r.client_id,r.requested_at,r.dimensions
),
aggregates as (
  select
    count(*)::bigint as requested_count,
    count(*) filter (where first_quoted_at is not null)::bigint as quoted_count,
    count(*) filter (where first_quoted_at is null and final_event_type = 'order.cancelled')::bigint as cancelled_before_quote_count,
    count(*) filter (where final_event_type = 'order.completed')::bigint as final_completed_count,
    count(*) filter (where final_event_type = 'order.cancelled')::bigint as final_cancelled_count,
    count(*) filter (where ever_disputed)::bigint as ever_disputed_count,
    count(*) filter (
      where first_quoted_at is null
        and final_event_type not in ('order.cancelled','order.completed')
    )::bigint as open_unquoted_count,
    percentile_cont(0.5) within group (
      order by extract(epoch from (first_quoted_at - requested_at))
    ) filter (where first_quoted_at is not null) as p50_first_quote_seconds,
    percentile_cont(0.9) within group (
      order by extract(epoch from (first_quoted_at - requested_at))
    ) filter (where first_quoted_at is not null) as p90_first_quote_seconds,
    count(*) filter (
      where nullif(dimensions ->> 'serviceCategory','') is null
         or nullif(dimensions ->> 'serviceState','') is null
    )::bigint as missing_service_dimension_count
  from timeline
)
select pg_catalog.jsonb_build_object(
  'contractId','ana-a04-marketplace-funnel-health-projections-v1',
  'windowStart',p_window_start,
  'windowEnd',p_window_end,
  'dataThrough',p_window_end,
  'dimensions',pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'serviceCategory',p_service_category,
    'serviceState',p_service_state
  )),
  'requestedCount',a.requested_count,
  'quotedCount',a.quoted_count,
  'resolvedQuoteDenominator',a.quoted_count + a.cancelled_before_quote_count,
  'resolvedQuoteFillRate',case
    when a.quoted_count + a.cancelled_before_quote_count = 0 then null
    else pg_catalog.round(a.quoted_count::numeric / (a.quoted_count + a.cancelled_before_quote_count), 6)
  end,
  'finalCompletedCount',a.final_completed_count,
  'finalCancelledCount',a.final_cancelled_count,
  'resolvedFulfillmentRate',case
    when a.final_completed_count + a.final_cancelled_count = 0 then null
    else pg_catalog.round(a.final_completed_count::numeric / (a.final_completed_count + a.final_cancelled_count), 6)
  end,
  'everDisputedCount',a.ever_disputed_count,
  'disputeIncidence',case
    when a.requested_count = 0 then null
    else pg_catalog.round(a.ever_disputed_count::numeric / a.requested_count, 6)
  end,
  'openUnquotedCount',a.open_unquoted_count,
  'p50FirstQuoteSeconds',a.p50_first_quote_seconds,
  'p90FirstQuoteSeconds',a.p90_first_quote_seconds,
  'projectionState','authoritative',
  'coverageState',case when a.missing_service_dimension_count > 0 then 'partial' else 'complete' end
)
from aggregates a;
$$;

revoke all on function public.compute_analytics_order_health_v1(timestamptz,timestamptz,text,text) from public, anon, authenticated;
grant execute on function public.compute_analytics_order_health_v1(timestamptz,timestamptz,text,text) to service_role;

comment on table private.analytics_metric_snapshots_v1 is
  'ANA-A04 append-only metric projection snapshots with explicit authority, coverage and reconciliation state.';
comment on function public.compute_analytics_order_health_v1(timestamptz,timestamptz,text,text) is
  'ANA-A04 canonical ORD-derived marketplace health projection. No financial metrics are synthesized.';
