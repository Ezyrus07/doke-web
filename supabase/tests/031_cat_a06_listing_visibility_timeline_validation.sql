begin;

do $test$
declare
  v_events_table regclass := to_regclass('private.cat_listing_visibility_events_v1');
  v_state_table regclass := to_regclass('private.cat_listing_visibility_ledger_state_v1');
begin
  if v_events_table is null then
    raise exception 'CAT_A06_VISIBILITY_EVENTS_TABLE_MISSING';
  end if;
  if v_state_table is null then
    raise exception 'CAT_A06_VISIBILITY_STATE_TABLE_MISSING';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='private' and c.relname='cat_listing_visibility_events_v1' and c.relrowsecurity
  ) then
    raise exception 'CAT_A06_LEDGER_RLS_DISABLED';
  end if;

  if has_table_privilege('anon', 'private.cat_listing_visibility_events_v1', 'SELECT,INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'private.cat_listing_visibility_events_v1', 'SELECT,INSERT,UPDATE,DELETE') then
    raise exception 'CAT_A06_BROWSER_LEDGER_PRIVILEGE';
  end if;

  if not has_table_privilege('service_role', 'private.cat_listing_visibility_events_v1', 'SELECT')
     or has_table_privilege('service_role', 'private.cat_listing_visibility_events_v1', 'INSERT,UPDATE,DELETE') then
    raise exception 'CAT_A06_SERVICE_ROLE_PRIVILEGE_DRIFT';
  end if;

  if to_regprocedure('private.capture_cat_listing_visibility_transition_v1()') is null then
    raise exception 'CAT_A06_CAPTURE_FUNCTION_MISSING';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.services'::regclass
      and tgname='trg_cat_listing_visibility_insert_v1'
      and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid='public.services'::regclass
      and tgname='trg_cat_listing_visibility_update_v1'
      and not tgisinternal
  ) or not exists (
    select 1 from pg_trigger
    where tgrelid='public.services'::regclass
      and tgname='trg_cat_listing_visibility_delete_v1'
      and not tgisinternal
  ) then
    raise exception 'CAT_A06_CAPTURE_TRIGGER_MISSING';
  end if;

  if exists (
    select 1
    from pg_constraint c
    where c.conrelid='private.cat_listing_visibility_events_v1'::regclass
      and c.contype='f'
  ) then
    raise exception 'CAT_A06_LEDGER_MUST_SURVIVE_SOURCE_DELETION';
  end if;

  if not exists (
    select 1
    from private.cat_listing_visibility_ledger_state_v1
    where contract_id='cat-a06-listing-visibility-timeline-v1'
      and schema_version=1
      and coverage_before_activation='partial'
      and existing_listing_baseline_policy='not_performed_synthetic_only'
  ) then
    raise exception 'CAT_A06_ACTIVATION_STATE_INVALID';
  end if;
end;
$test$;

rollback;
