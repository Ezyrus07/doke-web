begin;

do $test$
declare
  v_a06_activation timestamptz;
  v_a06_policy text;
begin
  if to_regclass('private.cat_listing_supply_coverage_epochs_v1') is null then
    raise exception 'CAT_A07_COVERAGE_EPOCH_TABLE_MISSING';
  end if;
  if to_regprocedure('public.run_cat_listing_supply_coverage_baseline_v1(uuid)') is null then
    raise exception 'CAT_A07_BASELINE_FUNCTION_MISSING';
  end if;

  if has_table_privilege('anon','private.cat_listing_supply_coverage_epochs_v1','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated','private.cat_listing_supply_coverage_epochs_v1','SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('service_role','private.cat_listing_supply_coverage_epochs_v1','INSERT,UPDATE,DELETE') then
    raise exception 'CAT_A07_COVERAGE_EPOCH_PRIVILEGE_DRIFT';
  end if;
  if not has_table_privilege('service_role','private.cat_listing_supply_coverage_epochs_v1','SELECT') then
    raise exception 'CAT_A07_SERVICE_ROLE_EPOCH_READ_MISSING';
  end if;

  if has_function_privilege('anon','public.run_cat_listing_supply_coverage_baseline_v1(uuid)','EXECUTE')
     or has_function_privilege('authenticated','public.run_cat_listing_supply_coverage_baseline_v1(uuid)','EXECUTE')
     or not has_function_privilege('service_role','public.run_cat_listing_supply_coverage_baseline_v1(uuid)','EXECUTE') then
    raise exception 'CAT_A07_BASELINE_EXECUTE_PRIVILEGE_DRIFT';
  end if;

  select activated_at,existing_listing_baseline_policy
    into v_a06_activation,v_a06_policy
  from private.cat_listing_visibility_ledger_state_v1
  where contract_id='cat-a06-listing-visibility-timeline-v1';

  if v_a06_activation is null or v_a06_policy <> 'not_performed_synthetic_only' then
    raise exception 'CAT_A07_A06_ACTIVATION_EVIDENCE_DRIFT';
  end if;
end;
$test$;

rollback;
