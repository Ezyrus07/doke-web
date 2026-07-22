create or replace function public.mutate_order_operational_post_incident_internal(
  p_actor_id uuid,
  p_review_id uuid,
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
  v_category text := lower(trim(coalesce(p_payload ->> 'rootCauseCategory', 'unknown')));
  v_impact text := nullif(regexp_replace(trim(coalesce(p_payload ->> 'impactSummary', '')), '\s+', ' ', 'g'), '');
  v_root_cause text := nullif(regexp_replace(trim(coalesce(p_payload ->> 'rootCause', '')), '\s+', ' ', 'g'), '');
  v_detection text := nullif(regexp_replace(trim(coalesce(p_payload ->> 'detectionAssessment', '')), '\s+', ' ', 'g'), '');
  v_prevention text := nullif(regexp_replace(trim(coalesce(p_payload ->> 'preventionSummary', '')), '\s+', ' ', 'g'), '');
  v_lessons text := nullif(regexp_replace(trim(coalesce(p_payload ->> 'lessonsLearned', '')), '\s+', ' ', 'g'), '');
  v_factors jsonb := coalesce(p_payload -> 'contributingFactors', '[]'::jsonb);
  v_action_count integer := 0;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if p_review_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_REVIEW_REQUIRED';
  end if;
  if v_action not in ('save', 'complete', 'reopen') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_ACTION_INVALID';
  end if;
  if v_category not in ('code', 'dependency', 'data', 'configuration', 'capacity', 'process', 'human', 'unknown') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_CATEGORY_INVALID';
  end if;
  if jsonb_typeof(v_factors) <> 'array'
     or jsonb_array_length(v_factors) > 12
     or exists (
       select 1
       from jsonb_array_elements(v_factors) factor
       where jsonb_typeof(factor) <> 'string'
          or char_length(trim(factor #>> '{}')) < 3
          or char_length(trim(factor #>> '{}')) > 300
     ) then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_FACTORS_INVALID';
  end if;

  select * into v_review
  from private.order_operational_post_incident_reviews
  where id = p_review_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_POST_INCIDENT_NOT_FOUND';
  end if;

  if v_action = 'reopen' then
    if v_role <> 'admin' then
      raise exception using errcode = '42501', message = 'DOKE_ORDER_POST_INCIDENT_ADMIN_REQUIRED';
    end if;
    if v_review.status <> 'completed' then
      raise exception using errcode = '55000', message = 'DOKE_ORDER_POST_INCIDENT_ALREADY_DRAFT';
    end if;
    update private.order_operational_post_incident_reviews
       set status = 'draft', completed_by = null, completed_at = null,
           updated_by = p_actor_id, updated_at = now()
     where id = v_review.id
     returning * into v_review;
    insert into private.order_operational_post_incident_actions (review_id, actor_id, actor_role, action, metadata)
    values (v_review.id, p_actor_id, v_role, 'reopened', '{}'::jsonb);
  else
    if v_review.status = 'completed' then
      raise exception using errcode = '55000', message = 'DOKE_ORDER_POST_INCIDENT_COMPLETED';
    end if;

    update private.order_operational_post_incident_reviews
       set root_cause_category = v_category,
           impact_summary = left(v_impact, 2000),
           root_cause = left(v_root_cause, 4000),
           contributing_factors = v_factors,
           detection_assessment = left(v_detection, 2000),
           prevention_summary = left(v_prevention, 3000),
           lessons_learned = left(v_lessons, 2000),
           updated_by = p_actor_id,
           updated_at = now()
     where id = v_review.id
     returning * into v_review;

    if v_action = 'complete' then
      if v_role <> 'admin' then
        raise exception using errcode = '42501', message = 'DOKE_ORDER_POST_INCIDENT_ADMIN_REQUIRED';
      end if;
      select count(*) into v_action_count
      from private.order_operational_prevention_actions p
      where p.review_id = v_review.id
        and p.status <> 'cancelled'
        and p.due_at is not null;
      if v_review.root_cause_category = 'unknown'
         or char_length(coalesce(v_review.impact_summary, '')) < 20
         or char_length(coalesce(v_review.root_cause, '')) < 20
         or char_length(coalesce(v_review.detection_assessment, '')) < 10
         or char_length(coalesce(v_review.prevention_summary, '')) < 20
         or char_length(coalesce(v_review.lessons_learned, '')) < 10
         or v_action_count < 1 then
        raise exception using errcode = '22023', message = 'DOKE_ORDER_POST_INCIDENT_COMPLETION_INCOMPLETE';
      end if;
      update private.order_operational_post_incident_reviews
         set status = 'completed', completed_by = p_actor_id,
             completed_at = now(), updated_by = p_actor_id, updated_at = now()
       where id = v_review.id
       returning * into v_review;
      insert into private.order_operational_post_incident_actions (review_id, actor_id, actor_role, action, metadata)
      values (v_review.id, p_actor_id, v_role, 'completed', jsonb_build_object('preventionActionCount', v_action_count));
    else
      insert into private.order_operational_post_incident_actions (review_id, actor_id, actor_role, action, metadata)
      values (v_review.id, p_actor_id, v_role, 'saved', jsonb_build_object('rootCauseCategory', v_category));
    end if;
  end if;

  return jsonb_build_object(
    'reviewId', v_review.id,
    'status', v_review.status,
    'rootCauseCategory', v_review.root_cause_category,
    'updatedAt', v_review.updated_at,
    'completedAt', v_review.completed_at
  );
end;
$$;

