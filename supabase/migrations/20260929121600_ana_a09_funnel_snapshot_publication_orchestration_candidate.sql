-- ANA-A09 funnel snapshot publication orchestration candidate.
-- REPOSITORY-ONLY CANDIDATE. Applying this migration requires a separate exact-head staging authorization.
--
-- This forward-only candidate generalizes the existing ANA-A11 publication-policy authority
-- instead of creating a second publication authority. It preserves the existing A11 liquidity
-- contract pair, adds an exact A09 funnel contract scope, and defines private owner-only
-- planner/orchestrator/catch-up functions.
--
-- Applying the migration itself inserts no publication policy rows, appends no metric snapshot,
-- creates no pg_cron job, and grants no browser/service_role execution on the new private functions.
-- Late-fact correction of already materialized windows remains ANA-A05 authority.

alter table private.analytics_metric_publication_policies_v1
  drop constraint if exists analytics_metric_publication_derivation_contract_check,
  drop constraint if exists analytics_metric_publication_series_contract_check;

alter table private.analytics_metric_publication_policies_v1
  drop constraint if exists analytics_metric_publication_contract_scope_check;

alter table private.analytics_metric_publication_policies_v1
  add constraint analytics_metric_publication_contract_scope_check
  check (
    (
      metric_key = 'liquidity.active_service_seconds'
      and derivation_contract_id = 'ana-a11-liquidity-freshness-policy-derivation-v1'
      and series_contract_id = 'ana-a11-liquidity-series-orchestration-v1'
    )
    or
    (
      metric_key in (
        'funnel.search_ctr',
        'funnel.impression_to_click',
        'funnel.click_to_detail',
        'funnel.detail_to_budget_cta',
        'funnel.budget_cta_to_quote_started',
        'funnel.quote_started_to_completed',
        'funnel.quote_completed_to_submitted',
        'funnel.quote_submitted_to_order_requested'
      )
      and derivation_contract_id = 'ana-a07-a09-funnel-freshness-policy-candidate-v1'
      and series_contract_id = 'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'
    )
  );

create index if not exists analytics_metric_publication_policy_set_lookup_idx
  on private.analytics_metric_publication_policies_v1 (
    ((approval_evidence ->> 'policySetId')),
    effective_from desc
  )
  where approval_evidence ? 'policySetId';

create or replace function private.current_analytics_a09_funnel_publication_policy_set_v1(
  p_policy_set_id text,
  p_at timestamptz
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_count integer;
  v_metric_keys text[];
  v_window_step_min integer;
  v_window_step_max integer;
  v_delay_min integer;
  v_delay_max integer;
  v_lag_min bigint;
  v_lag_max bigint;
  v_anchor_count integer;
  v_window_anchor timestamptz;
  v_catch_up_min integer;
  v_catch_up_max integer;
  v_order_count integer;
  v_order text;
  v_scheduler_count integer;
  v_scheduler text;
  v_effective_from_count integer;
  v_effective_from timestamptz;
  v_effective_until_count integer;
  v_effective_until timestamptz;
begin
  if p_at is null
     or pg_catalog.btrim(coalesce(p_policy_set_id,'')) <> 'ana-a07-a09-funnel-v1-r1' then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_SET_UNSUPPORTED';
  end if;

  select
    count(*)::integer,
    array_agg(p.metric_key order by p.metric_key),
    min(p.window_step_seconds),max(p.window_step_seconds),
    min(p.projection_delay_slo_seconds),max(p.projection_delay_slo_seconds),
    min(p.derived_max_lag_seconds),max(p.derived_max_lag_seconds),
    count(distinct p.window_anchor)::integer,min(p.window_anchor),
    min(p.max_catch_up_windows_per_invocation),max(p.max_catch_up_windows_per_invocation),
    count(distinct p.missed_window_order)::integer,min(p.missed_window_order),
    count(distinct p.scheduler_mechanism)::integer,min(p.scheduler_mechanism),
    count(distinct p.effective_from)::integer,min(p.effective_from),
    count(distinct coalesce(p.effective_until,'infinity'::timestamptz))::integer,min(p.effective_until)
  into
    v_count,v_metric_keys,
    v_window_step_min,v_window_step_max,
    v_delay_min,v_delay_max,
    v_lag_min,v_lag_max,
    v_anchor_count,v_window_anchor,
    v_catch_up_min,v_catch_up_max,
    v_order_count,v_order,
    v_scheduler_count,v_scheduler,
    v_effective_from_count,v_effective_from,
    v_effective_until_count,v_effective_until
  from private.analytics_metric_publication_policies_v1 p
  where p.approval_evidence ->> 'policySetId' = p_policy_set_id
    and p.metric_version = 'v1'
    and p.derivation_contract_id = 'ana-a07-a09-funnel-freshness-policy-candidate-v1'
    and p.series_contract_id = 'ana-a09-funnel-snapshot-publication-orchestration-candidate-v1'
    and p.effective_from <= p_at
    and (p.effective_until is null or p_at < p.effective_until);

  if v_count <> 8
     or v_metric_keys is distinct from array[
       'funnel.budget_cta_to_quote_started',
       'funnel.click_to_detail',
       'funnel.detail_to_budget_cta',
       'funnel.impression_to_click',
       'funnel.quote_completed_to_submitted',
       'funnel.quote_started_to_completed',
       'funnel.quote_submitted_to_order_requested',
       'funnel.search_ctr'
     ]::text[] then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_SET_REQUIRED';
  end if;

  if v_window_step_min <> 300 or v_window_step_max <> 300
     or v_delay_min <> 60 or v_delay_max <> 60
     or v_lag_min <> 360 or v_lag_max <> 360
     or v_anchor_count <> 1 or v_window_anchor is null
     or v_catch_up_min <> 3 or v_catch_up_max <> 3
     or v_order_count <> 1 or v_order <> 'oldest_first'
     or v_scheduler_count <> 1 or v_scheduler <> 'supabase_pg_cron_database_local'
     or v_effective_from_count <> 1 or v_effective_from is null
     or v_effective_until_count <> 1 then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_PUBLICATION_POLICY_SET_BINDING_MISMATCH';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-publication-policy-set-runtime-v1',
    'policySetId',p_policy_set_id,
    'metricVersion','v1',
    'metricCount',v_count,
    'metricKeys',pg_catalog.to_jsonb(v_metric_keys),
    'windowStepSeconds',v_window_step_min,
    'projectionDelaySloSeconds',v_delay_min,
    'derivedMaxLagSeconds',v_lag_min,
    'windowAnchor',v_window_anchor,
    'maxCatchUpWindowsPerInvocation',v_catch_up_min,
    'missedWindowOrder',v_order,
    'schedulerMechanism',v_scheduler,
    'effectiveFrom',v_effective_from,
    'effectiveUntil',v_effective_until
  );
end;
$function$;

alter function private.current_analytics_a09_funnel_publication_policy_set_v1(text,timestamptz)
  owner to postgres;
revoke all privileges on function private.current_analytics_a09_funnel_publication_policy_set_v1(text,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.plan_analytics_a09_funnel_windows_v1(
  p_policy_set_id text,
  p_at timestamptz
)
returns table (
  window_ordinal integer,
  window_start timestamptz,
  window_end timestamptz,
  required_metric_count integer,
  materialized_metric_count integer,
  missing_metric_count integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog
as $function$
declare
  v_policy jsonb;
  v_step integer;
  v_delay integer;
  v_anchor timestamptz;
  v_effective_from timestamptz;
  v_effective_until timestamptz;
  v_max_catch_up integer;
  v_upper_bound timestamptz;
  v_first_index bigint;
  v_last_end_index bigint;
  v_first_start timestamptz;
  v_last_start timestamptz;
begin
  if p_at is null then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_AT_REQUIRED';
  end if;

  v_policy:=private.current_analytics_a09_funnel_publication_policy_set_v1(
    p_policy_set_id,p_at
  );
  v_step:=(v_policy->>'windowStepSeconds')::integer;
  v_delay:=(v_policy->>'projectionDelaySloSeconds')::integer;
  v_anchor:=(v_policy->>'windowAnchor')::timestamptz;
  v_effective_from:=(v_policy->>'effectiveFrom')::timestamptz;
  v_effective_until:=(v_policy->>'effectiveUntil')::timestamptz;
  v_max_catch_up:=(v_policy->>'maxCatchUpWindowsPerInvocation')::integer;

  v_upper_bound:=p_at-pg_catalog.make_interval(secs=>v_delay);
  if v_effective_until is not null and v_upper_bound>v_effective_until then
    v_upper_bound:=v_effective_until;
  end if;
  if v_upper_bound<=v_effective_from then
    return;
  end if;

  v_first_index:=pg_catalog.ceil(
    extract(epoch from (v_effective_from-v_anchor))/v_step
  )::bigint;
  v_last_end_index:=pg_catalog.floor(
    extract(epoch from (v_upper_bound-v_anchor))/v_step
  )::bigint;

  if v_last_end_index<=v_first_index then
    return;
  end if;

  v_first_start:=v_anchor+(v_first_index*v_step)*interval '1 second';
  v_last_start:=v_anchor+((v_last_end_index-1)*v_step)*interval '1 second';

  return query
  with candidate_windows as (
    select
      gs as candidate_window_start,
      gs+pg_catalog.make_interval(secs=>v_step) as candidate_window_end
    from pg_catalog.generate_series(
      v_first_start,
      v_last_start,
      pg_catalog.make_interval(secs=>v_step)
    ) gs
  ),
  window_state as (
    select
      w.candidate_window_start,
      w.candidate_window_end,
      count(distinct s.metric_key)::integer as materialized_count
    from candidate_windows w
    left join private.analytics_metric_snapshots_v1 s
      on s.window_start=w.candidate_window_start
     and s.window_end=w.candidate_window_end
     and s.metric_version='v1'
     and s.dimensions='{}'::jsonb
     and s.metric_key in (
       'funnel.search_ctr',
       'funnel.impression_to_click',
       'funnel.click_to_detail',
       'funnel.detail_to_budget_cta',
       'funnel.budget_cta_to_quote_started',
       'funnel.quote_started_to_completed',
       'funnel.quote_completed_to_submitted',
       'funnel.quote_submitted_to_order_requested'
     )
    group by w.candidate_window_start,w.candidate_window_end
  ),
  missing_windows as (
    select
      w.candidate_window_start,
      w.candidate_window_end,
      w.materialized_count,
      (8-w.materialized_count)::integer as missing_count
    from window_state w
    where w.materialized_count<8
    order by w.candidate_window_start,w.candidate_window_end
    limit v_max_catch_up
  )
  select
    pg_catalog.row_number() over (
      order by w.candidate_window_start,w.candidate_window_end
    )::integer,
    w.candidate_window_start,
    w.candidate_window_end,
    8::integer,
    w.materialized_count,
    w.missing_count
  from missing_windows w
  order by w.candidate_window_start,w.candidate_window_end;
end;
$function$;

alter function private.plan_analytics_a09_funnel_windows_v1(text,timestamptz)
  owner to postgres;
revoke all privileges on function private.plan_analytics_a09_funnel_windows_v1(text,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.run_analytics_a09_funnel_window_v1(
  p_policy_set_id text,
  p_window_start timestamptz,
  p_window_end timestamptz,
  p_evaluated_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_policy jsonb;
  v_step integer;
  v_delay integer;
  v_anchor timestamptz;
  v_adapter jsonb;
  v_payload jsonb;
  v_result jsonb;
  v_seen text[]:=array[]::text[];
  v_processed integer:=0;
  v_appended integer:=0;
  v_no_change integer:=0;
  v_results jsonb:='[]'::jsonb;
begin
  if p_window_start is null or p_window_end is null or p_evaluated_at is null
     or p_window_end<=p_window_start then
    raise exception using errcode='22023',message='DOKE_ANALYTICS_A09_PUBLICATION_WINDOW_INVALID';
  end if;

  v_policy:=private.current_analytics_a09_funnel_publication_policy_set_v1(
    p_policy_set_id,p_evaluated_at
  );
  v_step:=(v_policy->>'windowStepSeconds')::integer;
  v_delay:=(v_policy->>'projectionDelaySloSeconds')::integer;
  v_anchor:=(v_policy->>'windowAnchor')::timestamptz;

  if p_window_end-p_window_start<>pg_catalog.make_interval(secs=>v_step)
     or mod(
       pg_catalog.floor(extract(epoch from (p_window_start-v_anchor)))::bigint,
       v_step::bigint
     )<>0
     or p_window_end>p_evaluated_at-pg_catalog.make_interval(secs=>v_delay) then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_WINDOW_POLICY_MISMATCH';
  end if;

  v_adapter:=public.compute_analytics_canonical_funnel_snapshot_payloads_v1(
    p_window_start,p_window_end
  );

  if coalesce(v_adapter->>'state','')<>'payloads_computed_candidate'
     or coalesce((v_adapter->>'payloadCount')::integer,0)<>8
     or pg_catalog.jsonb_array_length(coalesce(v_adapter->'payloads','[]'::jsonb))<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_PAYLOAD_SET_INVALID';
  end if;

  for v_payload in
    select value
    from pg_catalog.jsonb_array_elements(v_adapter->'payloads')
    order by value->>'metricKey'
  loop
    if v_processed>=8
       or coalesce(v_payload->>'metricVersion','')<>'v1'
       or coalesce(v_payload->'dimensions','{}'::jsonb)<>'{}'::jsonb
       or coalesce(v_payload->>'coverageState','')<>'complete'
       or coalesce(v_payload->>'projectionState','') not in ('authoritative','stale')
       or coalesce(v_payload->>'metricKey','') not in (
         'funnel.search_ctr',
         'funnel.impression_to_click',
         'funnel.click_to_detail',
         'funnel.detail_to_budget_cta',
         'funnel.budget_cta_to_quote_started',
         'funnel.quote_started_to_completed',
         'funnel.quote_completed_to_submitted',
         'funnel.quote_submitted_to_order_requested'
       )
       or (v_payload->>'metricKey')=any(v_seen) then
      raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_PAYLOAD_IDENTITY_INVALID';
    end if;

    v_result:=public.append_analytics_metric_snapshot_v1(v_payload);
    if coalesce(v_result->>'state','') not in ('APPENDED','NO_CHANGE') then
      raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_APPEND_STATE_INVALID';
    end if;

    v_seen:=pg_catalog.array_append(v_seen,v_payload->>'metricKey');
    v_processed:=v_processed+1;
    v_appended:=v_appended+case when v_result->>'state'='APPENDED' then 1 else 0 end;
    v_no_change:=v_no_change+case when v_result->>'state'='NO_CHANGE' then 1 else 0 end;
    v_results:=v_results||pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'metricKey',v_payload->>'metricKey',
        'state',v_result->>'state',
        'snapshotId',v_result->>'snapshotId',
        'revision',v_result->>'revision'
      )
    );
  end loop;

  if v_processed<>8
     or pg_catalog.array_length(v_seen,1)<>8
     or v_appended+v_no_change<>8 then
    raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_CARDINALITY_INVALID';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-snapshot-window-orchestrator-candidate-v1',
    'policySetId',p_policy_set_id,
    'windowStart',p_window_start,
    'windowEnd',p_window_end,
    'processedCount',v_processed,
    'appendedCount',v_appended,
    'noChangeCount',v_no_change,
    'results',v_results,
    'lateFactRevisionAuthority','ANA-A05'
  );
end;
$function$;

alter function private.run_analytics_a09_funnel_window_v1(text,timestamptz,timestamptz,timestamptz)
  owner to postgres;
revoke all privileges on function private.run_analytics_a09_funnel_window_v1(text,timestamptz,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create or replace function private.run_analytics_a09_funnel_catch_up_v1(
  p_policy_set_id text,
  p_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_window record;
  v_window_result jsonb;
  v_results jsonb:='[]'::jsonb;
  v_planned integer:=0;
  v_appended integer:=0;
  v_no_change integer:=0;
begin
  for v_window in
    select *
    from private.plan_analytics_a09_funnel_windows_v1(p_policy_set_id,p_at)
    order by window_ordinal
  loop
    if v_window.window_ordinal<>v_planned+1 then
      raise exception using errcode='55000',message='DOKE_ANALYTICS_A09_PUBLICATION_PLANNER_ORDER_INVALID';
    end if;

    v_window_result:=private.run_analytics_a09_funnel_window_v1(
      p_policy_set_id,
      v_window.window_start,
      v_window.window_end,
      p_at
    );

    v_planned:=v_planned+1;
    v_appended:=v_appended+coalesce((v_window_result->>'appendedCount')::integer,0);
    v_no_change:=v_no_change+coalesce((v_window_result->>'noChangeCount')::integer,0);
    v_results:=v_results||pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'windowOrdinal',v_window.window_ordinal,
        'windowStart',v_window.window_start,
        'windowEnd',v_window.window_end,
        'requiredMetricCount',v_window.required_metric_count,
        'materializedMetricCountBefore',v_window.materialized_metric_count,
        'missingMetricCountBefore',v_window.missing_metric_count,
        'result',v_window_result
      )
    );
  end loop;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a09-funnel-snapshot-catch-up-executor-candidate-v1',
    'policySetId',p_policy_set_id,
    'evaluatedAt',p_at,
    'plannedWindowCount',v_planned,
    'appendedSnapshotCount',v_appended,
    'noChangeSnapshotCount',v_no_change,
    'maxSnapshotAppendAttempts',24,
    'windows',v_results,
    'lateFactRevisionAuthority','ANA-A05'
  );
end;
$function$;

alter function private.run_analytics_a09_funnel_catch_up_v1(text,timestamptz)
  owner to postgres;
revoke all privileges on function private.run_analytics_a09_funnel_catch_up_v1(text,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.current_analytics_a09_funnel_publication_policy_set_v1(text,timestamptz) is
  'ANA-A09 owner-only publication policy-set selector. Requires exactly eight active global funnel policy rows sharing the already-approved 300s/60s/360s/3 oldest-first contract. Creates no policy, snapshot or scheduler.';
comment on function private.plan_analytics_a09_funnel_windows_v1(text,timestamptz) is
  'ANA-A09 owner-only bounded missing-window planner. It plans only windows with fewer than eight global funnel snapshot identities; already materialized windows are not automatically revised and remain under ANA-A05 late-fact correction authority.';
comment on function private.run_analytics_a09_funnel_window_v1(text,timestamptz,timestamptz,timestamptz) is
  'ANA-A09 owner-only atomic eight-metric window orchestrator candidate. It is mutation-capable only after a separate staging application plus publication-policy authority; this repository candidate grants neither.';
comment on function private.run_analytics_a09_funnel_catch_up_v1(text,timestamptz) is
  'ANA-A09 owner-only bounded oldest-first catch-up candidate. At most three windows and twenty-four append attempts per invocation. No scheduler is created by this migration.';
