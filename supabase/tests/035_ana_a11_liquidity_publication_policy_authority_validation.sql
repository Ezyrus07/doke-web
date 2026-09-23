-- ANA-A11 structural validation for publication-policy authority.
-- Run only after explicit staging migration authorization.
begin;

do $$
declare
  v_table regclass;
  v_selector regprocedure;
  v_selector_def text;
  v_policy_count bigint;
begin
  v_table := to_regclass('private.analytics_metric_publication_policies_v1');
  v_selector := to_regprocedure(
    'private.current_analytics_metric_publication_policy_v1(text,text,timestamp with time zone)'
  );

  if v_table is null or v_selector is null then
    raise exception 'ANA-A11 publication policy authority missing';
  end if;

  select count(*)::bigint
    into v_policy_count
  from private.analytics_metric_publication_policies_v1;

  if v_policy_count <> 0 then
    raise exception 'ANA-A11 schema migration unexpectedly inserted publication policy rows';
  end if;

  if has_table_privilege('anon', v_table, 'SELECT')
     or has_table_privilege('authenticated', v_table, 'SELECT')
     or has_table_privilege('service_role', v_table, 'SELECT')
     or has_table_privilege('anon', v_table, 'INSERT')
     or has_table_privilege('authenticated', v_table, 'INSERT')
     or has_table_privilege('service_role', v_table, 'INSERT') then
    raise exception 'ANA-A11 publication policy table exposed outside postgres owner boundary';
  end if;

  if has_function_privilege('anon', v_selector, 'EXECUTE')
     or has_function_privilege('authenticated', v_selector, 'EXECUTE')
     or has_function_privilege('service_role', v_selector, 'EXECUTE') then
    raise exception 'ANA-A11 publication policy selector exposed outside postgres owner boundary';
  end if;

  select pg_get_functiondef(v_selector::oid) into v_selector_def;

  if position('effective_from <= p_at' in v_selector_def) = 0
     or position('effective_until is null or p.effective_until > p_at' in v_selector_def) = 0
     or position('order by p.effective_from desc' in v_selector_def) = 0 then
    raise exception 'ANA-A11 publication policy selection is not deterministic';
  end if;
end;
$$;

rollback;
