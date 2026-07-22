-- Doke: local migration parity for the concurrent operational postmortem module already present in staging.
-- This migration is idempotent and preserves the richer post-incident review module introduced in 076-085.

create table if not exists private.order_operational_postmortems (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references private.order_operational_alerts(id) on delete cascade,
  alert_key text not null,
  alert_type text not null,
  severity text not null check (severity in ('warning', 'critical')),
  cycle_count integer not null check (cycle_count >= 1),
  status text not null default 'draft' check (status in ('draft', 'completed')),
  owner_id uuid references public.users(id) on delete set null,
  detected_at timestamptz not null,
  acknowledged_at timestamptz,
  resolved_at timestamptz not null,
  mtta_seconds integer check (mtta_seconds is null or mtta_seconds >= 0),
  mttr_seconds integer not null check (mttr_seconds >= 0),
  escalation_count integer not null default 0 check (escalation_count >= 0),
  root_cause_category text check (
    root_cause_category is null or root_cause_category in (
      'application', 'database', 'integration', 'infrastructure',
      'configuration', 'capacity', 'process', 'unknown'
    )
  ),
  root_cause_summary text,
  impact_summary text,
  prevention_action text,
  recurrence_key text,
  completed_by uuid references public.users(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (alert_id, cycle_count)
);

create index if not exists idx_order_operational_postmortems_status
  on private.order_operational_postmortems(status, resolved_at desc);
create index if not exists idx_order_operational_postmortems_resolved
  on private.order_operational_postmortems(resolved_at desc);
create index if not exists idx_order_operational_postmortems_owner
  on private.order_operational_postmortems(owner_id)
  where owner_id is not null;
create index if not exists idx_order_operational_postmortems_completed_by
  on private.order_operational_postmortems(completed_by)
  where completed_by is not null;
create index if not exists idx_order_operational_postmortems_recurrence
  on private.order_operational_postmortems(recurrence_key, resolved_at desc)
  where recurrence_key is not null;

revoke all on private.order_operational_postmortems from public, anon, authenticated;
grant select on private.order_operational_postmortems to service_role;

create or replace function private.materialize_order_operational_postmortem()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_detected timestamptz;
  v_ack timestamptz;
  v_resolved timestamptz;
begin
  if new.status <> 'resolved' or old.status = 'resolved' then
    return new;
  end if;

  v_detected := coalesce(new.opened_at, new.first_seen_at, new.created_at);
  v_ack := new.acknowledged_at;
  v_resolved := coalesce(new.resolved_at, now());

  insert into private.order_operational_postmortems (
    alert_id, alert_key, alert_type, severity, cycle_count, owner_id,
    detected_at, acknowledged_at, resolved_at, mtta_seconds, mttr_seconds,
    escalation_count, recurrence_key, created_at, updated_at
  ) values (
    new.id, new.alert_key, new.alert_type, new.severity, new.cycle_count, new.owner_id,
    v_detected, v_ack, v_resolved,
    case when v_ack is null then null else greatest(0, extract(epoch from (v_ack - v_detected))::integer) end,
    greatest(0, extract(epoch from (v_resolved - v_detected))::integer),
    new.escalation_count, new.alert_type, v_resolved, v_resolved
  )
  on conflict (alert_id, cycle_count) do update
  set owner_id = excluded.owner_id,
      acknowledged_at = excluded.acknowledged_at,
      resolved_at = excluded.resolved_at,
      mtta_seconds = excluded.mtta_seconds,
      mttr_seconds = excluded.mttr_seconds,
      escalation_count = excluded.escalation_count,
      updated_at = excluded.updated_at;

  return new;
end;
$$;

drop trigger if exists trg_materialize_order_operational_postmortem on private.order_operational_alerts;
create trigger trg_materialize_order_operational_postmortem
after update of status on private.order_operational_alerts
for each row execute function private.materialize_order_operational_postmortem();

insert into private.order_operational_postmortems (
  alert_id, alert_key, alert_type, severity, cycle_count, owner_id,
  detected_at, acknowledged_at, resolved_at, mtta_seconds, mttr_seconds,
  escalation_count, recurrence_key, created_at, updated_at
)
select
  a.id, a.alert_key, a.alert_type, a.severity, a.cycle_count, a.owner_id,
  coalesce(a.opened_at, a.first_seen_at, a.created_at),
  a.acknowledged_at,
  coalesce(a.resolved_at, a.updated_at),
  case when a.acknowledged_at is null then null else greatest(0, extract(epoch from (
    a.acknowledged_at - coalesce(a.opened_at, a.first_seen_at, a.created_at)
  ))::integer) end,
  greatest(0, extract(epoch from (
    coalesce(a.resolved_at, a.updated_at) - coalesce(a.opened_at, a.first_seen_at, a.created_at)
  ))::integer),
  a.escalation_count,
  a.alert_type,
  coalesce(a.resolved_at, a.updated_at),
  coalesce(a.resolved_at, a.updated_at)
from private.order_operational_alerts a
where a.status = 'resolved'
on conflict (alert_id, cycle_count) do nothing;

create or replace function public.get_order_operational_slos_internal(
  p_actor_id uuid,
  p_days integer default 30,
  p_limit integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_days integer := greatest(7, least(coalesce(p_days, 30), 90));
  v_limit integer := greatest(5, least(coalesce(p_limit, 20), 50));
  v_since timestamptz := now() - make_interval(days => v_days);
  v_total bigint := 0;
  v_completed bigint := 0;
  v_drafts bigint := 0;
  v_ack_compliant bigint := 0;
  v_recovery_compliant bigint := 0;
  v_avg_mtta numeric;
  v_avg_mttr numeric;
  v_p95_mttr numeric;
  v_recurrences bigint := 0;
  v_items jsonb := '[]'::jsonb;
begin
  v_role := private.assert_order_event_operator(p_actor_id);

  select count(*),
         count(*) filter (where status = 'completed'),
         count(*) filter (where status = 'draft'),
         count(*) filter (where mtta_seconds is not null and mtta_seconds <= case when severity = 'critical' then 600 else 1800 end),
         count(*) filter (where mttr_seconds <= case when severity = 'critical' then 3600 else 14400 end),
         round(avg(mtta_seconds) filter (where mtta_seconds is not null)),
         round(avg(mttr_seconds)),
         round(percentile_cont(0.95) within group (order by mttr_seconds)),
         greatest(0, count(*) - count(distinct recurrence_key))
    into v_total, v_completed, v_drafts, v_ack_compliant, v_recovery_compliant,
         v_avg_mtta, v_avg_mttr, v_p95_mttr, v_recurrences
  from private.order_operational_postmortems
  where resolved_at >= v_since;

  select coalesce(jsonb_agg(item order by resolved_at desc), '[]'::jsonb)
    into v_items
  from (
    select p.resolved_at,
      jsonb_build_object(
        'id', p.id,
        'alertId', p.alert_id,
        'alertKey', p.alert_key,
        'alertType', p.alert_type,
        'severity', p.severity,
        'cycleCount', p.cycle_count,
        'status', p.status,
        'ownerId', p.owner_id,
        'detectedAt', p.detected_at,
        'acknowledgedAt', p.acknowledged_at,
        'resolvedAt', p.resolved_at,
        'mttaSeconds', p.mtta_seconds,
        'mttrSeconds', p.mttr_seconds,
        'escalationCount', p.escalation_count,
        'rootCauseCategory', p.root_cause_category,
        'rootCauseSummary', p.root_cause_summary,
        'impactSummary', p.impact_summary,
        'preventionAction', p.prevention_action,
        'completedAt', p.completed_at
      ) item
    from private.order_operational_postmortems p
    order by p.resolved_at desc
    limit v_limit
  ) rows_postmortem;

  return jsonb_build_object(
    'actorId', p_actor_id,
    'actorRole', v_role,
    'windowDays', v_days,
    'targets', jsonb_build_object(
      'criticalAckSeconds', 600,
      'warningAckSeconds', 1800,
      'criticalRecoverySeconds', 3600,
      'warningRecoverySeconds', 14400
    ),
    'summary', jsonb_build_object(
      'incidents', v_total,
      'completedPostmortems', v_completed,
      'draftPostmortems', v_drafts,
      'ackCompliancePercent', case when v_total = 0 then null else round(v_ack_compliant::numeric * 100 / v_total, 1) end,
      'recoveryCompliancePercent', case when v_total = 0 then null else round(v_recovery_compliant::numeric * 100 / v_total, 1) end,
      'averageMttaSeconds', v_avg_mtta,
      'averageMttrSeconds', v_avg_mttr,
      'p95MttrSeconds', v_p95_mttr,
      'recurrences', v_recurrences
    ),
    'postmortems', v_items
  );
end;
$$;

create or replace function public.mutate_order_operational_postmortem_internal(
  p_actor_id uuid,
  p_postmortem_id uuid,
  p_root_cause_category text,
  p_root_cause_summary text,
  p_impact_summary text,
  p_prevention_action text,
  p_complete boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_role text;
  v_row private.order_operational_postmortems%rowtype;
  v_category text := lower(trim(coalesce(p_root_cause_category, 'unknown')));
  v_root text := regexp_replace(trim(coalesce(p_root_cause_summary, '')), '\s+', ' ', 'g');
  v_impact text := regexp_replace(trim(coalesce(p_impact_summary, '')), '\s+', ' ', 'g');
  v_prevention text := regexp_replace(trim(coalesce(p_prevention_action, '')), '\s+', ' ', 'g');
begin
  v_role := private.assert_order_event_operator(p_actor_id);
  if p_postmortem_id is null then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POSTMORTEM_ID_REQUIRED';
  end if;
  if v_category not in ('application','database','integration','infrastructure','configuration','capacity','process','unknown') then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POSTMORTEM_CATEGORY_INVALID';
  end if;
  if char_length(v_root) < 10 or char_length(v_impact) < 10 or char_length(v_prevention) < 10 then
    raise exception using errcode = '22023', message = 'DOKE_ORDER_POSTMORTEM_FIELDS_REQUIRED';
  end if;
  if p_complete and v_role <> 'admin' then
    raise exception using errcode = '42501', message = 'DOKE_ORDER_POSTMORTEM_COMPLETE_ADMIN_REQUIRED';
  end if;

  select * into v_row
  from private.order_operational_postmortems
  where id = p_postmortem_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'DOKE_ORDER_POSTMORTEM_NOT_FOUND';
  end if;

  update private.order_operational_postmortems
     set root_cause_category = v_category,
         root_cause_summary = v_root,
         impact_summary = v_impact,
         prevention_action = v_prevention,
         status = case when p_complete then 'completed' else status end,
         completed_by = case when p_complete then p_actor_id else completed_by end,
         completed_at = case when p_complete then now() else completed_at end,
         updated_at = now()
   where id = p_postmortem_id
   returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'completedAt', v_row.completed_at,
    'rootCauseCategory', v_row.root_cause_category
  );
end;
$$;

revoke all on function private.materialize_order_operational_postmortem() from public, anon, authenticated;
revoke all on function public.get_order_operational_slos_internal(uuid, integer, integer) from public, anon, authenticated;
revoke all on function public.mutate_order_operational_postmortem_internal(uuid, uuid, text, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.get_order_operational_slos_internal(uuid, integer, integer) to service_role;
grant execute on function public.mutate_order_operational_postmortem_internal(uuid, uuid, text, text, text, text, boolean) to service_role;
