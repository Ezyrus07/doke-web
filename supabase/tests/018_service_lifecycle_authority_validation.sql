begin;

do $test$
begin
  if to_regprocedure('public.transition_owned_service_lifecycle(text,text)') is null then
    raise exception 'CAT_A03_LIFECYCLE_FUNCTION_MISSING';
  end if;
  if has_function_privilege('anon', 'public.transition_owned_service_lifecycle(text,text)', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.transition_owned_service_lifecycle(text,text)', 'EXECUTE') then
    raise exception 'CAT_A03_DIRECT_BROWSER_GRANT';
  end if;
  if not has_function_privilege('service_role', 'public.transition_owned_service_lifecycle(text,text)', 'EXECUTE') then
    raise exception 'CAT_A03_SERVICE_ROLE_GRANT_MISSING';
  end if;
  if has_table_privilege('anon', 'public.services', 'INSERT,UPDATE,DELETE')
     or has_table_privilege('authenticated', 'public.services', 'INSERT,UPDATE,DELETE') then
    raise exception 'CAT_A03_DIRECT_SERVICE_WRITE_GRANT';
  end if;
  if position('transition_owned_service_lifecycle' in pg_get_functiondef('public.execute_self_service_operation_internal(uuid,text,jsonb)'::regprocedure)) = 0 then
    raise exception 'CAT_A03_DISPATCHER_ROUTE_MISSING';
  end if;
  if position('execute_self_service_operation_internal_pre_cat_a03' in pg_get_functiondef('public.execute_self_service_operation_internal(uuid,text,jsonb)'::regprocedure)) = 0 then
    raise exception 'CAT_A03_DISPATCHER_DELEGATION_MISSING';
  end if;
end;
$test$;

rollback;
