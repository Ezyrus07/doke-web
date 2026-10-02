-- ANA-A07/A09: versioned funnel freshness policy activation boundary.
-- Repository candidate only. Applying this migration defines the owner-only activation function;
-- it inserts no freshness policy row, publishes no snapshot and creates no scheduler.

create or replace function private.activate_analytics_a09_funnel_freshness_policy_v1(
  p_policy_set_id text,
  p_effective_from timestamptz,
  p_effective_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = 'pg_catalog'
as $function$
declare
  v_policy_set_id text := pg_catalog.btrim(coalesce(p_policy_set_id,''));
  v_inserted integer := 0;
begin
  if v_policy_set_id <> 'ana-a07-a09-funnel-v1-r1'
     or p_effective_from is null
     or (p_effective_until is not null and p_effective_until <= p_effective_from) then
    raise exception using
      errcode='22023',
      message='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_INVALID';
  end if;

  if exists (
    select 1
    from private.analytics_metric_freshness_policies_v1 f
    join (
      values
        ('funnel.search_ctr'),
        ('funnel.impression_to_click'),
        ('funnel.click_to_detail'),
        ('funnel.detail_to_budget_cta'),
        ('funnel.budget_cta_to_quote_started'),
        ('funnel.quote_started_to_completed'),
        ('funnel.quote_completed_to_submitted'),
        ('funnel.quote_submitted_to_order_requested')
    ) as expected(metric_key)
      on expected.metric_key=f.metric_key
    where f.metric_version='v1'
      and f.effective_from < coalesce(p_effective_until,'infinity'::timestamptz)
      and p_effective_from < coalesce(f.effective_until,'infinity'::timestamptz)
  ) then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_OVERLAP';
  end if;

  insert into private.analytics_metric_freshness_policies_v1 (
    policy_id,metric_key,metric_version,max_lag_seconds,effective_from,effective_until
  )
  select v.policy_id,v.metric_key,'v1',360,p_effective_from,p_effective_until
  from (
    values
      ('ana-a07-a09-funnel-search-ctr-v1-r1','funnel.search_ctr'),
      ('ana-a07-a09-funnel-impression-click-v1-r1','funnel.impression_to_click'),
      ('ana-a07-a09-funnel-click-detail-v1-r1','funnel.click_to_detail'),
      ('ana-a07-a09-funnel-detail-budget-v1-r1','funnel.detail_to_budget_cta'),
      ('ana-a07-a09-funnel-budget-quote-start-v1-r1','funnel.budget_cta_to_quote_started'),
      ('ana-a07-a09-funnel-quote-start-complete-v1-r1','funnel.quote_started_to_completed'),
      ('ana-a07-a09-funnel-quote-complete-submit-v1-r1','funnel.quote_completed_to_submitted'),
      ('ana-a07-a09-funnel-submit-order-v1-r1','funnel.quote_submitted_to_order_requested')
  ) as v(policy_id,metric_key);

  get diagnostics v_inserted = row_count;
  if v_inserted <> 8 then
    raise exception using
      errcode='55000',
      message='DOKE_ANALYTICS_A09_FUNNEL_FRESHNESS_POLICY_CARDINALITY';
  end if;

  return pg_catalog.jsonb_build_object(
    'contractId','ana-a07-a09-funnel-freshness-policy-activation-v1',
    'policySetId',v_policy_set_id,
    'revision',1,
    'metricVersion','v1',
    'metricCount',8,
    'maxLagSeconds',360,
    'effectiveFrom',p_effective_from,
    'effectiveUntil',p_effective_until,
    'rowsInserted',v_inserted,
    'publicationPolicyInserted',false,
    'snapshotPublicationAllowed',false,
    'snapshotWritten',false,
    'cronCreated',false
  );
end;
$function$;

alter function private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz) owner to postgres;
revoke all on function private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

comment on function private.activate_analytics_a09_funnel_freshness_policy_v1(text,timestamptz,timestamptz) is
  'ANA-A07/A09 owner-only atomic activation boundary for the eight explicit funnel freshness policies. Revision 1 fixes max_lag_seconds=360 for all eight metrics, rejects overlap, requires explicit effectiveFrom, inserts no publication policy, writes no snapshot and creates no cron.';
