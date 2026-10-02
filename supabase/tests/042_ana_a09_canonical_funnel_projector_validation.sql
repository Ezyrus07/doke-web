-- ANA-A09 canonical funnel projector validation candidate.
-- Run only after separately authorized staging application. Read-only/rollback-only.
begin;

do $$
declare
  v_stage regprocedure := to_regprocedure('private.analytics_canonical_funnel_stage_rows_v1(timestamptz,timestamptz,timestamptz)');
  v_compute regprocedure := to_regprocedure('public.compute_analytics_canonical_funnel_v1(timestamptz,timestamptz)');
  v_stage_def text;
  v_compute_def text;
  v_result jsonb;
begin
  if v_stage is null or v_compute is null then
    raise exception 'ANA-A09 projector functions missing';
  end if;

  select pg_get_functiondef(v_stage::oid) into v_stage_def;
  select pg_get_functiondef(v_compute::oid) into v_compute_def;

  if position('received_at <= p_data_through' in v_stage_def)=0
     or position('occurred_at <= p_data_through' in v_stage_def)=0
     or position('quote_session_id=q.quote_session_id' in replace(v_stage_def,' ',''))=0 then
    raise exception 'ANA-A09 stage materialization/linkage contract missing';
  end if;

  if position('private.analytics_behavior_watermark_v1()' in v_compute_def)=0
     or position('private.order_metric_watermark_v1()' in v_compute_def)=0
     or position('e.received_at <= v_behavior_data_through' in v_compute_def)=0
     or position('e.created_at <= v_cross_data_through' in v_compute_def)=0
     or position('snapshotPublicationAllowed' in v_compute_def)=0
     or position('A07_METRIC_SPECIFIC_THRESHOLD_POLICY_PENDING' in v_compute_def)=0 then
    raise exception 'ANA-A09 compute authority incomplete';
  end if;

  if position('insert into' in lower(v_compute_def))>0
     or position('update ' in lower(v_compute_def))>0
     or position('delete from' in lower(v_compute_def))>0
     or position('cron.' in lower(v_compute_def))>0 then
    raise exception 'ANA-A09 compute-only boundary violated';
  end if;

  if pg_get_userbyid((select proowner from pg_proc where oid=v_stage::oid)) <> 'postgres'
     or pg_get_userbyid((select proowner from pg_proc where oid=v_compute::oid)) <> 'postgres'
     or not (select prosecdef from pg_proc where oid=v_stage::oid)
     or not (select prosecdef from pg_proc where oid=v_compute::oid) then
    raise exception 'ANA-A09 owner/security-definer boundary invalid';
  end if;

  if has_function_privilege('anon',v_compute,'EXECUTE')
     or has_function_privilege('authenticated',v_compute,'EXECUTE')
     or not has_function_privilege('service_role',v_compute,'EXECUTE')
     or has_function_privilege('service_role',v_stage,'EXECUTE') then
    raise exception 'ANA-A09 execute boundary invalid';
  end if;

  v_result := public.compute_analytics_canonical_funnel_v1(
    clock_timestamp() - interval '1 hour',
    clock_timestamp()
  );

  if (v_result ->> 'contractId') is distinct from 'ana-a09-server-side-funnel-projector-v1'
     or coalesce((v_result ->> 'snapshotPublicationAllowed')::boolean,true) <> false
     or coalesce((v_result ->> 'runtimeAuthority')::boolean,true) <> false then
    raise exception 'ANA-A09 projector result boundary invalid';
  end if;
end;
$$;

rollback;
