create or replace function public.get_order_operational_post_incident_internal(
  p_actor_id uuid,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_limit integer := greatest(5, least(coalesce(p_limit, 20), 50));
  v_metrics_7 jsonb;
  v_metrics_30 jsonb;
  v_targets_30 jsonb;
  v_reviews jsonb := '[]'::jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_history jsonb := '[]'::jsonb;
  v_reports jsonb := '[]'::jsonb;
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  v_metrics_7 := private.calculate_order_operational_slo_metrics(7, now());
  v_metrics_30 := private.calculate_order_operational_slo_metrics(30, now());
  v_targets_30 := private.evaluate_order_operational_slo_targets(v_metrics_30);

  select coalesce(jsonb_agg(item order by status_sort, resolved_at desc), '[]'::jsonb)
  into v_reviews
  from (
    select
      case r.status when 'draft' then 1 else 2 end as status_sort,
      c.resolved_at,
      jsonb_build_object(
        'reviewId', r.id,
        'cycleId', c.id,
        'alertId', c.alert_id,
        'alertKey', c.alert_key,
        'alertType', c.alert_type,
        'cycleCount', c.cycle_count,
        'severity', c.severity,
        'title', c.title,
        'cycleStatus', c.status,
        'openedAt', c.opened_at,
        'acknowledgedAt', c.acknowledged_at,
        'resolvedAt', c.resolved_at,
        'mttaSeconds', c.mtta_seconds,
        'mttrSeconds', c.mttr_seconds,
        'escalationCount', c.escalation_count,
        'reviewStatus', r.status,
        'rootCauseCategory', r.root_cause_category,
        'impactSummary', r.impact_summary,
        'rootCause', r.root_cause,
        'contributingFactors', r.contributing_factors,
        'detectionAssessment', r.detection_assessment,
        'preventionSummary', r.prevention_summary,
        'lessonsLearned', r.lessons_learned,
        'updatedBy', r.updated_by,
        'updatedByName', coalesce(nullif(trim(updated_profile.display_name), ''), case when r.updated_by is null then null else 'Operador Doke' end),
        'completedBy', r.completed_by,
        'completedByName', coalesce(nullif(trim(completed_profile.display_name), ''), case when r.completed_by is null then null else 'Operador Doke' end),
        'createdAt', r.created_at,
        'updatedAt', r.updated_at,
        'completedAt', r.completed_at,
        'preventionActions', coalesce(actions.items, '[]'::jsonb)
      ) as item
    from private.order_operational_post_incident_reviews r
    join private.order_operational_incident_cycles c on c.id = r.cycle_id
    left join public.user_profiles updated_profile on updated_profile.user_id = r.updated_by
    left join public.user_profiles completed_profile on completed_profile.user_id = r.completed_by
    left join lateral (
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'ownerId', p.owner_id,
        'ownerName', coalesce(nullif(trim(owner_profile.display_name), ''), 'Operador Doke'),
        'status', p.status,
        'dueAt', p.due_at,
        'createdAt', p.created_at,
        'updatedAt', p.updated_at,
        'completedAt', p.completed_at
      ) order by case p.status when 'in_progress' then 1 when 'todo' then 2 when 'done' then 3 else 4 end, p.due_at nulls last, p.created_at) as items
      from private.order_operational_prevention_actions p
      left join public.user_profiles owner_profile on owner_profile.user_id = p.owner_id
      where p.review_id = r.id
    ) actions on true
    order by status_sort, c.resolved_at desc
    limit v_limit
  ) review_rows;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'reviewId', p.review_id,
    'title', p.title,
    'ownerId', p.owner_id,
    'ownerName', coalesce(nullif(trim(owner_profile.display_name), ''), 'Operador Doke'),
    'status', p.status,
    'dueAt', p.due_at,
    'alertKey', c.alert_key,
    'incidentTitle', c.title,
    'severity', c.severity,
    'updatedAt', p.updated_at,
    'completedAt', p.completed_at
  ) order by case p.status when 'in_progress' then 1 when 'todo' then 2 when 'done' then 3 else 4 end, p.due_at nulls last), '[]'::jsonb)
  into v_actions
  from private.order_operational_prevention_actions p
  join private.order_operational_post_incident_reviews r on r.id = p.review_id
  join private.order_operational_incident_cycles c on c.id = r.cycle_id
  left join public.user_profiles owner_profile on owner_profile.user_id = p.owner_id
  where p.status <> 'cancelled';

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', h.id,
    'reviewId', h.review_id,
    'actorId', h.actor_id,
    'actorRole', h.actor_role,
    'actorName', coalesce(nullif(trim(actor_profile.display_name), ''), case when h.actor_role = 'system' then 'Automação Doke' else 'Operador Doke' end),
    'action', h.action,
    'metadata', h.metadata,
    'createdAt', h.created_at
  ) order by h.created_at desc), '[]'::jsonb)
  into v_history
  from (
    select * from private.order_operational_post_incident_actions order by created_at desc limit 30
  ) h
  left join public.user_profiles actor_profile on actor_profile.user_id = h.actor_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id,
    'reportDate', s.report_date,
    'windowDays', s.window_days,
    'metrics', s.metrics,
    'targets', s.target_results,
    'generatedAt', s.generated_at
  ) order by s.report_date desc, s.window_days), '[]'::jsonb)
  into v_reports
  from (
    select * from private.order_operational_slo_reports
    order by report_date desc, window_days
    limit 12
  ) s;

  return jsonb_build_object(
    'actorId', p_actor_id,
    'actorRole', v_role,
    'metrics7d', v_metrics_7,
    'metrics30d', v_metrics_30,
    'targets30d', v_targets_30,
    'reviews', v_reviews,
    'preventionActions', v_actions,
    'history', v_history,
    'reports', v_reports
  );
end;
$$;

