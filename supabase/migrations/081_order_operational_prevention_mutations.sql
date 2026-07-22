create or replace function public.mutate_order_operational_prevention_action_internal(
  p_actor_id uuid,
  p_review_id uuid,
  p_action_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_action text := lower(trim(coalesce(p_action, '')));
  v_review private.order_operational_post_incident_reviews%rowtype;
  v_item private.order_operational_prevention_actions%rowtype;
  v_title text := regexp_replace(trim(coalesce(p_payload ->> 'title', '')), '\s+', ' ', 'g');
  v_owner_id uuid := nullif(trim(coalesce(p_payload ->> 'ownerId', '')), '')::uuid;
  v_due_at date := nullif(trim(coalesce(p_payload ->> 'dueAt', '')), '')::date;
  v_owner_role text;
  v_audit_action text;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if p_review_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_REVIEW_REQUIRED';
  end if;
  if v_action not in ('create', 'update', 'start', 'complete', 'cancel', 'reopen') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_ACTION_INVALID';
  end if;

  select * into v_review
  from private.order_operational_post_incident_reviews
  where id = p_review_id;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_POST_INCIDENT_NOT_FOUND';
  end if;

  if v_review.status = 'completed' and v_action in ('create', 'update') then
    raise exception using errcode = '55000', message = 'DOKE_ORDER_POST_INCIDENT_COMPLETED';
  end if;

  if v_action = 'create' then
    if char_length(v_title) < 10 then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_TITLE_REQUIRED';
    end if;
    if v_due_at is null then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_DUE_REQUIRED';
    end if;
    v_owner_id := coalesce(v_owner_id, p_actor_id);
    select lower(u.role) into v_owner_role
    from public.users u
    where u.id = v_owner_id and lower(u.status) = 'active' and lower(u.role) in ('support', 'admin');
    if v_owner_role is null then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_OWNER_INVALID';
    end if;
    if v_role <> 'admin' and v_owner_id <> p_actor_id then
      raise exception using errcode = '42501', message = 'DOKE_ORDER_PREVENTION_ASSIGN_ADMIN_REQUIRED';
    end if;

    insert into private.order_operational_prevention_actions (
      review_id, title, owner_id, due_at, created_by, updated_by
    ) values (
      v_review.id, left(v_title, 500), v_owner_id, v_due_at, p_actor_id, p_actor_id
    ) returning * into v_item;
    v_audit_action := 'prevention_created';
  else
    if p_action_id is null then
      raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_ACTION_REQUIRED';
    end if;
    select * into v_item
    from private.order_operational_prevention_actions
    where id = p_action_id and review_id = v_review.id
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'DOKE_ORDER_PREVENTION_NOT_FOUND';
    end if;

    if v_role <> 'admin' and v_item.owner_id <> p_actor_id then
      raise exception using errcode = '42501', message = 'DOKE_ORDER_PREVENTION_OWNER_REQUIRED';
    end if;

    if v_action = 'update' then
      if char_length(v_title) < 10 then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_TITLE_REQUIRED';
      end if;
      if v_due_at is null then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_DUE_REQUIRED';
      end if;
      v_owner_id := coalesce(v_owner_id, v_item.owner_id);
      select lower(u.role) into v_owner_role
      from public.users u
      where u.id = v_owner_id and lower(u.status) = 'active' and lower(u.role) in ('support', 'admin');
      if v_owner_role is null then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_PREVENTION_OWNER_INVALID';
      end if;
      if v_role <> 'admin' and v_owner_id <> p_actor_id then
        raise exception using errcode = '42501', message = 'DOKE_ORDER_PREVENTION_ASSIGN_ADMIN_REQUIRED';
      end if;
      update private.order_operational_prevention_actions
         set title = left(v_title, 500), owner_id = v_owner_id, due_at = v_due_at,
             updated_by = p_actor_id, updated_at = now()
       where id = v_item.id returning * into v_item;
      v_audit_action := 'prevention_updated';
    elsif v_action = 'start' then
      update private.order_operational_prevention_actions
         set status = 'in_progress', updated_by = p_actor_id, updated_at = now(), completed_at = null
       where id = v_item.id returning * into v_item;
      v_audit_action := 'prevention_updated';
    elsif v_action = 'complete' then
      update private.order_operational_prevention_actions
         set status = 'done', updated_by = p_actor_id, updated_at = now(), completed_at = now()
       where id = v_item.id returning * into v_item;
      v_audit_action := 'prevention_completed';
    elsif v_action = 'cancel' then
      if v_role <> 'admin' then
        raise exception using errcode = '42501', message = 'DOKE_ORDER_PREVENTION_ADMIN_REQUIRED';
      end if;
      update private.order_operational_prevention_actions
         set status = 'cancelled', updated_by = p_actor_id, updated_at = now(), completed_at = null
       where id = v_item.id returning * into v_item;
      v_audit_action := 'prevention_cancelled';
    else
      update private.order_operational_prevention_actions
         set status = 'todo', updated_by = p_actor_id, updated_at = now(), completed_at = null
       where id = v_item.id returning * into v_item;
      v_audit_action := 'prevention_updated';
    end if;
  end if;

  insert into private.order_operational_post_incident_actions (
    review_id, actor_id, actor_role, action, metadata
  ) values (
    v_review.id, p_actor_id, v_role, v_audit_action,
    jsonb_build_object('preventionActionId', v_item.id, 'status', v_item.status, 'ownerId', v_item.owner_id, 'dueAt', v_item.due_at)
  );

  return jsonb_build_object(
    'id', v_item.id,
    'reviewId', v_item.review_id,
    'title', v_item.title,
    'ownerId', v_item.owner_id,
    'dueAt', v_item.due_at,
    'status', v_item.status,
    'updatedAt', v_item.updated_at,
    'completedAt', v_item.completed_at
  );
end;
$$;

revoke all on function private.project_order_operational_incident_cycle() from public, anon, authenticated;
revoke all on function private.ensure_order_operational_post_incident_review() from public, anon, authenticated;
revoke all on function private.calculate_order_operational_slo_metrics(integer, timestamptz) from public, anon, authenticated;
revoke all on function private.evaluate_order_operational_slo_targets(jsonb) from public, anon, authenticated;
revoke all on function private.generate_order_operational_slo_report(date, integer) from public, anon, authenticated;
revoke all on function private.generate_order_operational_slo_reports_daily() from public, anon, authenticated;
revoke all on function public.get_order_operational_post_incident_internal(uuid, integer) from public, anon, authenticated;
revoke all on function public.mutate_order_operational_post_incident_internal(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.mutate_order_operational_prevention_action_internal(uuid, uuid, uuid, text, jsonb) from public, anon, authenticated;

grant execute on function private.generate_order_operational_slo_reports_daily() to service_role;
grant execute on function public.get_order_operational_post_incident_internal(uuid, integer) to service_role;
grant execute on function public.mutate_order_operational_post_incident_internal(uuid, uuid, text, jsonb) to service_role;
grant execute on function public.mutate_order_operational_prevention_action_internal(uuid, uuid, uuid, text, jsonb) to service_role;

select private.generate_order_operational_slo_report(current_date, 7);
select private.generate_order_operational_slo_report(current_date, 30);

comment on table private.order_operational_incident_cycles is
  'Cycle-level incident telemetry projected from the immutable incident action ledger.';
comment on table private.order_operational_post_incident_reviews is
  'Structured post-incident review for each resolved order-operation incident cycle.';
comment on table private.order_operational_prevention_actions is
  'Owned and dated prevention actions derived from post-incident reviews.';
comment on table private.order_operational_slo_reports is
  'Periodic immutable snapshots of order-operation SLO metrics and target evaluations.';
comment on function public.get_order_operational_post_incident_internal(uuid, integer) is
  'Service-role-only projection of SLOs, post-incident reviews and prevention work after independent operator authentication.';
