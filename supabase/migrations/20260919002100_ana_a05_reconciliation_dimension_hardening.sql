-- ANA-A05 follow-up hardening.
-- Applied after ana_a05_reconciliation_runtime; preserves immutable migration history.
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
  v_event_key_mismatch bigint;
  v_event_type_mismatch bigint;
  v_subject_mismatch bigint;
  v_timestamp_mismatch bigint;
  v_dimension_mismatch bigint;
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
  v_mismatch_subject_count bigint;
  v_reconciliation_universe_count bigint;
  v_health text;
begin
  if p_window_end <= p_window_start then
    raise exception using errcode = '22023', message = 'DOKE_ANALYTICS_RECONCILIATION_WINDOW_INVALID';
  end if;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.id,e.event_key,e.order_id,e.event_type,e.created_at,
      e.payload ->> 'serviceId',e.payload ->> 'clientId',e.payload ->> 'professionalId'
    ) order by e.id), '[]'::jsonb),
    count(*)
  into v_source_payload, v_source_count
  from private.order_domain_events e
  where e.created_at >= p_window_start and e.created_at < p_window_end;

  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      e.order_event_id,e.event_key,e.order_id,e.event_type,e.occurred_at,
      e.service_id,e.client_id,e.professional_id,e.dimensions
    ) order by e.order_event_id), '[]'::jsonb),
    count(*)
  into v_projection_payload, v_projection_count
  from private.order_metric_events e
  where e.occurred_at >= p_window_start and e.occurred_at < p_window_end;

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
    count(*) filter (where s.event_key is distinct from p.event_key),
    count(*) filter (where s.event_type is distinct from p.event_type),
    count(*) filter (where s.order_id is distinct from p.order_id),
    count(*) filter (where s.created_at is distinct from p.occurred_at),
    count(*) filter (
      where coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
         or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
         or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
         or coalesce(o.service_snapshot ->> 'category','') is distinct from coalesce(p.dimensions ->> 'serviceCategory','')
         or coalesce(o.service_snapshot ->> 'city','') is distinct from coalesce(p.dimensions ->> 'serviceCity','')
         or coalesce(o.service_snapshot ->> 'state','') is distinct from coalesce(p.dimensions ->> 'serviceState','')
         or coalesce(o.service_version_id::text,'') is distinct from coalesce(p.dimensions ->> 'serviceVersionId','')
    )
  into v_event_key_mismatch, v_event_type_mismatch, v_subject_mismatch, v_timestamp_mismatch, v_dimension_mismatch
  from private.order_domain_events s
  join private.order_metric_events p on p.order_event_id = s.id
  join public.orders o on o.id = s.order_id
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
    'eventKeyMismatch',v_event_key_mismatch,
    'eventTypeMismatch',v_event_type_mismatch,
    'subjectMismatch',v_subject_mismatch,
    'timestampMismatch',v_timestamp_mismatch,
    'dimensionMismatch',v_dimension_mismatch
  );
  with source_window as (
    select s.id,s.event_key,s.order_id,s.event_type,s.created_at,s.payload
    from private.order_domain_events s
    where s.created_at >= p_window_start and s.created_at < p_window_end
  ),
  projection_window as (
    select p.order_event_id,p.order_id,p.event_type,p.occurred_at,p.service_id,p.client_id,p.professional_id
    from private.order_metric_events p
    where p.occurred_at >= p_window_start and p.occurred_at < p_window_end
  ),
  universe as (
    select id as event_id from source_window
    union
    select order_event_id as event_id from projection_window
  ),
  mismatched as (
    select s.id as event_id
    from source_window s
    left join private.order_metric_events p on p.order_event_id = s.id
    left join public.orders o on o.id = s.order_id
    where p.order_event_id is null
       or s.event_key is distinct from p.event_key
       or s.event_type is distinct from p.event_type
       or s.order_id is distinct from p.order_id
       or s.created_at is distinct from p.occurred_at
       or coalesce(s.payload ->> 'serviceId','') is distinct from coalesce(p.service_id::text,'')
       or coalesce(s.payload ->> 'clientId','') is distinct from coalesce(p.client_id::text,'')
       or coalesce(s.payload ->> 'professionalId','') is distinct from coalesce(p.professional_id::text,'')
       or coalesce(o.service_snapshot ->> 'category','') is distinct from coalesce(p.dimensions ->> 'serviceCategory','')
       or coalesce(o.service_snapshot ->> 'city','') is distinct from coalesce(p.dimensions ->> 'serviceCity','')
       or coalesce(o.service_snapshot ->> 'state','') is distinct from coalesce(p.dimensions ->> 'serviceState','')
       or coalesce(o.service_version_id::text,'') is distinct from coalesce(p.dimensions ->> 'serviceVersionId','')
    union
    select p.order_event_id as event_id
    from projection_window p
    left join private.order_domain_events s on s.id = p.order_event_id
    where s.id is null
  )
  select
    (select count(*) from universe),
    (select count(*) from mismatched)
  into v_reconciliation_universe_count, v_mismatch_subject_count;

  v_state := case
    when v_projection_missing + v_source_missing + v_event_key_mismatch + v_event_type_mismatch + v_subject_mismatch + v_timestamp_mismatch + v_dimension_mismatch = 0
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
  v_mismatch_rate := case when v_reconciliation_universe_count = 0 then null else
    v_mismatch_subject_count::numeric / v_reconciliation_universe_count end;
  v_health := case
    when v_source_count = 0 then 'no_data'
    when v_state = 'matched' then 'healthy'
    else 'warning'
  end;

  insert into private.analytics_data_quality_rollups_v1 (
    metric_key,window_start,window_end,sample_count,value,health_state,source_run_id
  ) values
    ('analytics_projection_missing_rate',p_window_start,p_window_end,v_source_count,v_missing_rate,v_health,v_run_id),
    ('analytics_reconciliation_mismatch_rate',p_window_start,p_window_end,v_reconciliation_universe_count,v_mismatch_rate,v_health,v_run_id);

  return pg_catalog.jsonb_build_object(
    'runId',v_run_id,
    'sourceDomain','ORD-001',
    'projectionDomain','ANA-001',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'sourceCount',v_source_count,
    'projectionCount',v_projection_count,
    'reconciliationUniverseCount',v_reconciliation_universe_count,
    'mismatchedEventCount',v_mismatch_subject_count,
    'reconciliationState',v_state,
    'divergenceCounts',v_divergences,
    'sourceFingerprint',v_source_hash,
    'projectionFingerprint',v_projection_hash,
    'comparisonFingerprint',v_comparison_hash
  );
end;
$$;

comment on function public.run_analytics_order_reconciliation_v1(timestamptz,timestamptz) is
  'ANA-A05 deterministic ORD-to-ANA reconciliation including event-key parity and immutable service-dimension parity. It never mutates canonical ORD sources.';
