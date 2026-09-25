-- ANA-A07/A09 funnel freshness policy activation validation.
-- Run only after separately authorized staging application. Rollback-only.
begin;

do $$
declare
  v_fn regprocedure := to_regprocedure('private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz)');
  v_def text;
  v_result jsonb;
  v_overlap_rejected boolean := false;
  v_count integer;
begin
  if v_fn is null then raise exception 'ANA-A07/A09 activation function missing'; end if;
  select pg_get_functiondef(v_fn::oid) into v_def;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_fn::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_fn::oid)
     or has_function_privilege('anon',v_fn,'EXECUTE')
     or has_function_privilege('authenticated',v_fn,'EXECUTE')
     or has_function_privilege('service_role',v_fn,'EXECUTE') then
    raise exception 'ANA-A07/A09 activation privilege boundary invalid';
  end if;

  if position('360' in v_def)=0
     or position('funnel.search_ctr' in v_def)=0
     or position('funnel.impression_to_click' in v_def)=0
     or position('funnel.click_to_detail' in v_def)=0
     or position('funnel.detail_to_budget_cta' in v_def)=0
     or position('funnel.budget_cta_to_quote_started' in v_def)=0
     or position('funnel.quote_started_to_completed' in v_def)=0
     or position('funnel.quote_completed_to_submitted' in v_def)=0
     or position('funnel.quote_submitted_to_order_requested' in v_def)=0 then
    raise exception 'ANA-A07/A09 exact policy set missing';
  end if;

  if position('analytics_metric_snapshots_v1' in lower(v_def))>0
     or position('analytics_metric_publication_policies_v1' in lower(v_def))>0
     or position('cron.' in lower(v_def))>0 then
    raise exception 'ANA-A07/A09 activation boundary exceeded';
  end if;

  v_result := private.activate_analytics_a09_funnel_freshness_policy_v1(
    'ana-a07-a09-funnel-v1-r1',
    '2099-01-01T00:00:00Z'::timestamptz,
    null
  );

  if (v_result->>'rowsInserted')::integer <> 8
     or (v_result->>'maxLagSeconds')::integer <> 360
     or coalesce((v_result->>'snapshotPublicationAllowed')::boolean,true) <> false then
    raise exception 'ANA-A07/A09 activation result invalid';
  end if;

  select count(*)::integer into v_count
  from private.analytics_metric_freshness_policies_v1
  where effective_from='2099-01-01T00:00:00Z'::timestamptz
    and metric_version='v1'
    and metric_key like 'funnel.%'
    and max_lag_seconds=360;
  if v_count <> 8 then raise exception 'ANA-A07/A09 transient policy cardinality invalid'; end if;

  begin
    perform private.activate_analytics_a09_funnel_freshness_policy_v1(
      'ana-a07-a09-funnel-v1-r1',
      '2099-01-01T00:00:00Z'::timestamptz,
      null
    );
  exception when others then
    if sqlerrm='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP' then
      v_overlap_rejected := true;
    else
      raise;
    end if;
  end;

  if not v_overlap_rejected then raise exception 'ANA-A07/A09 overlap was not rejected'; end if;
end;
$$;

rollback;
