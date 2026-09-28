-- ANA-A09 canonical funnel snapshot payload adapter runtime type remediation.
-- FORWARD-ONLY repository candidate after staging migration 20260928005802 applied the original adapter.
-- Fixes SQLSTATE 42883 from schema-qualifying PostgreSQL special form GREATEST as pg_catalog.greatest.
-- No append invocation, snapshot mutation/publication, scheduler, production, merge, or Ready authority is granted.

create or replace function public.compute_analytics_canonical_funnel_snapshot_payloads_v1(
  p_window_start timestamptz,
  p_window_end timestamptz
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_projection jsonb;
  v_upstream_state text;
  v_computed_at timestamptz;
  v_metric jsonb;
  v_metric_key text;
  v_metric_version text;
  v_data_through timestamptz;
  v_policy_count integer;
  v_policy_id text;
  v_max_lag_seconds integer;
  v_lag_seconds bigint;
  v_projection_state text;
  v_source_fingerprint text;
  v_projection_fingerprint text;
  v_payload jsonb;
  v_payloads jsonb := '[]'::jsonb;
  v_policy_bindings jsonb := '[]'::jsonb;
  v_dimensions jsonb := '{}'::jsonb;
begin
  if p_window_start is null or p_window_end is null or p_window_end <= p_window_start then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_SNAPSHOT_PAYLOAD_WINDOW_INVALID';
  end if;

  v_projection := public.compute_analytics_canonical_funnel_v1(p_window_start,p_window_end);
  v_upstream_state := coalesce(v_projection ->> 'state','');

  if v_upstream_state <> 'computed_policy_pending' then
    return pg_catalog.jsonb_build_object(
      'contractId','ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1',
      'state','blocked_upstream',
      'upstreamState',v_upstream_state,
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'payloadCount',0,
      'payloads','[]'::jsonb,
      'appendRpc','public.append_analytics_metric_snapshot_v1',
      'appendInvoked',false,
      'runtimeProjectionAuthority',true,
      'upstreamLiveRuntimeAuthority',coalesce((v_projection ->> 'runtimeAuthority')::boolean,false),
      'runtimeSnapshotAuthority',false,
      'snapshotPublicationAllowed',false,
      'schedulerAuthority',false
    );
  end if;

  v_computed_at := (v_projection ->> 'computedAt')::timestamptz;

  if pg_catalog.jsonb_array_length(coalesce(v_projection -> 'metrics','[]'::jsonb)) <> 8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_SNAPSHOT_PAYLOAD_METRIC_CARDINALITY';
  end if;

  for v_metric in
    select value
    from pg_catalog.jsonb_array_elements(v_projection -> 'metrics')
  loop
    v_metric_key := pg_catalog.btrim(coalesce(v_metric ->> 'metricKey',''));
    v_metric_version := pg_catalog.btrim(coalesce(v_metric ->> 'metricVersion',''));
    v_data_through := (v_metric ->> 'dataThrough')::timestamptz;

    select count(*)::integer,min(f.policy_id),min(f.max_lag_seconds)
      into v_policy_count,v_policy_id,v_max_lag_seconds
    from private.analytics_metric_freshness_policies_v1 f
    where f.metric_key=v_metric_key
      and f.metric_version=v_metric_version
      and f.effective_from <= v_computed_at
      and (f.effective_until is null or v_computed_at < f.effective_until);

    if v_policy_count <> 1
       or v_policy_id is null
       or v_max_lag_seconds is null
       or v_max_lag_seconds <= 0 then
      raise exception using
        errcode='55000',
        message='DOKE_ANALYTICS_A09_SNAPSHOT_PAYLOAD_POLICY_CARDINALITY';
    end if;

    v_lag_seconds := greatest(
      0::bigint,
      pg_catalog.floor(extract(epoch from (v_computed_at-v_data_through)))::bigint
    );
    v_projection_state := case
      when v_lag_seconds > v_max_lag_seconds then 'stale'
      else 'authoritative'
    end;

    if v_metric_key='funnel.quote_submitted_to_order_requested' then
      v_source_fingerprint := pg_catalog.encode(
        extensions.digest(
          pg_catalog.convert_to(
            pg_catalog.jsonb_build_object(
              'crossBehavior',v_projection #>> '{sourceFingerprints,crossBehavior}',
              'order',v_projection #>> '{sourceFingerprints,order}'
            )::text,
            'UTF8'
          ),
          'sha256'
        ),
        'hex'
      );
    else
      v_source_fingerprint := pg_catalog.lower(
        coalesce(v_projection #>> '{sourceFingerprints,behavior}','')
      );
    end if;

    if v_source_fingerprint !~ '^[0-9a-f]{64}$' then
      raise exception using
        errcode='55000',
        message='DOKE_ANALYTICS_A09_SNAPSHOT_PAYLOAD_SOURCE_FINGERPRINT_INVALID';
    end if;

    v_projection_fingerprint := pg_catalog.encode(
      extensions.digest(
        pg_catalog.convert_to(
          pg_catalog.jsonb_build_object(
            'coverageState','complete',
            'dimensions',v_dimensions,
            'sampleCount',coalesce((v_metric ->> 'sampleCount')::bigint,0),
            'value',v_metric -> 'value'
          )::text,
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    );

    v_payload := pg_catalog.jsonb_build_object(
      'metricKey',v_metric_key,
      'metricVersion',v_metric_version,
      'windowStart',p_window_start,
      'windowEnd',p_window_end,
      'dataThrough',v_data_through,
      'dimensions',v_dimensions,
      'numerator',v_metric -> 'numerator',
      'denominator',v_metric -> 'denominator',
      'value',v_metric -> 'value',
      'sampleCount',coalesce((v_metric ->> 'sampleCount')::bigint,0),
      'projectionState',v_projection_state,
      'coverageState','complete',
      'reconciliationState','not_applicable',
      'sourceFingerprint',v_source_fingerprint,
      'projectionFingerprint',v_projection_fingerprint,
      'correctionReason',null,
      'computedAt',v_computed_at
    );

    v_payloads := v_payloads || pg_catalog.jsonb_build_array(v_payload);
    v_policy_bindings := v_policy_bindings || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'metricKey',v_metric_key,
        'metricVersion',v_metric_version,
        'policyId',v_policy_id,
        'maxLagSeconds',v_max_lag_seconds,
        'freshnessLagSeconds',v_lag_seconds,
        'projectionState',v_projection_state
      )
    );
  end loop;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-canonical-funnel-snapshot-payload-adapter-candidate-v1',
    'state','payloads_computed_candidate',
    'scope','global_funnel_only',
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'computedAt',v_computed_at,
    'payloadCount',pg_catalog.jsonb_array_length(v_payloads),
    'payloads',v_payloads,
    'policyBindings',v_policy_bindings,
    'appendRpc','public.append_analytics_metric_snapshot_v1',
    'appendInvoked',false,
    'lateFactRevisionAuthority','ANA-A05',
    'runtimeProjectionAuthority',true,
    'upstreamLiveRuntimeAuthority',coalesce((v_projection ->> 'runtimeAuthority')::boolean,false),
    'runtimeSnapshotAuthority',false,
    'snapshotPublicationAllowed',false,
    'schedulerAuthority',false
  );
end;
$function$;

alter function public.compute_analytics_canonical_funnel_snapshot_payloads_v1(timestamptz,timestamptz) owner to postgres;
revoke all on function public.compute_analytics_canonical_funnel_snapshot_payloads_v1(timestamptz,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.compute_analytics_canonical_funnel_snapshot_payloads_v1(timestamptz,timestamptz)
  to service_role;

comment on function public.compute_analytics_canonical_funnel_snapshot_payloads_v1(timestamptz,timestamptz) is
  'ANA-A09 compute-only global funnel snapshot payload adapter candidate. Produces A04/A05 append-compatible payloads using active A07/A09 freshness policy and deterministic fingerprints; never appends snapshots and grants no snapshot/publication/scheduler authority.';
