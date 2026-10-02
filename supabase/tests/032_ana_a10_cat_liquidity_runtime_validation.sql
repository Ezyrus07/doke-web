begin;

do $test$
begin
  if to_regclass('private.analytics_metric_freshness_policies_v1') is null then
    raise exception 'ANA_A10_FRESHNESS_POLICY_TABLE_MISSING';
  end if;
  if to_regprocedure('private.cat_listing_visibility_watermark_v1()') is null then
    raise exception 'ANA_A10_CAT_WATERMARK_MISSING';
  end if;
  if to_regprocedure('public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)') is null
     or to_regprocedure('public.run_analytics_cat_liquidity_reconciliation_v1(timestamptz,timestamptz,text,text)') is null
     or to_regprocedure('public.run_analytics_cat_liquidity_projection_v1(timestamptz,timestamptz,text,text)') is null then
    raise exception 'ANA_A10_RUNTIME_FUNCTION_MISSING';
  end if;
  if has_table_privilege('anon','private.analytics_metric_freshness_policies_v1','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated','private.analytics_metric_freshness_policies_v1','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('service_role','private.analytics_metric_freshness_policies_v1','INSERT,UPDATE,DELETE') then
    raise exception 'ANA_A10_FRESHNESS_POLICY_PRIVILEGE_DRIFT';
  end if;
  if not has_table_privilege('service_role','private.analytics_metric_freshness_policies_v1','SELECT') then
    raise exception 'ANA_A10_FRESHNESS_POLICY_SERVICE_READ_MISSING';
  end if;
  if has_function_privilege('anon','public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)','EXECUTE')
     or has_function_privilege('anon','public.run_analytics_cat_liquidity_projection_v1(timestamptz,timestamptz,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.run_analytics_cat_liquidity_projection_v1(timestamptz,timestamptz,text,text)','EXECUTE') then
    raise exception 'ANA_A10_BROWSER_EXECUTE_PRIVILEGE';
  end if;
  if not has_function_privilege('service_role','public.compute_analytics_cat_liquidity_v1(timestamptz,timestamptz,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.run_analytics_cat_liquidity_reconciliation_v1(timestamptz,timestamptz,text,text)','EXECUTE')
     or not has_function_privilege('service_role','public.run_analytics_cat_liquidity_projection_v1(timestamptz,timestamptz,text,text)','EXECUTE') then
    raise exception 'ANA_A10_SERVICE_ROLE_EXECUTE_MISSING';
  end if;
end;
$test$;

rollback;
