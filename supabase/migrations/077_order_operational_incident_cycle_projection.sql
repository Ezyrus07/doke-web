create or replace function private.project_order_operational_incident_cycle()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_alert private.order_operational_alerts%rowtype;
  v_opened_at timestamptz;
  v_escalation integer;
begin
  select * into v_alert
  from private.order_operational_alerts
  where id = new.alert_id;

  if not found then
    return new;
  end if;

  if new.action in ('opened_auto', 'reopened_auto') then
    insert into private.order_operational_incident_cycles (
      alert_id, alert_key, cycle_count, alert_type, severity, title,
      status, opened_at, created_at, updated_at
    ) values (
      new.alert_id, new.alert_key, new.cycle_count, v_alert.alert_type, v_alert.severity, v_alert.title,
      'open', new.created_at, new.created_at, new.created_at
    )
    on conflict (alert_id, cycle_count) do update
    set alert_key = excluded.alert_key,
        alert_type = excluded.alert_type,
        severity = excluded.severity,
        title = excluded.title,
        status = 'open',
        opened_at = excluded.opened_at,
        acknowledged_at = null,
        resolved_at = null,
        mtta_seconds = null,
        mttr_seconds = null,
        escalation_count = 0,
        first_owner_id = null,
        updated_at = excluded.updated_at;

  elsif new.action in ('acknowledge', 'assign') then
    update private.order_operational_incident_cycles c
       set acknowledged_at = coalesce(c.acknowledged_at, new.created_at),
           first_owner_id = coalesce(c.first_owner_id, new.new_owner_id, new.actor_id),
           mtta_seconds = coalesce(c.mtta_seconds, greatest(0, floor(extract(epoch from (new.created_at - c.opened_at)))::integer)),
           updated_at = new.created_at
     where c.alert_id = new.alert_id
       and c.cycle_count = new.cycle_count;

  elsif new.action = 'escalate_auto' then
    v_escalation := greatest(1, coalesce((new.metadata ->> 'escalationNumber')::integer, 1));
    update private.order_operational_incident_cycles c
       set escalation_count = greatest(c.escalation_count, v_escalation),
           updated_at = new.created_at
     where c.alert_id = new.alert_id
       and c.cycle_count = new.cycle_count;

  elsif new.action = 'resolved_auto' then
    select c.opened_at into v_opened_at
    from private.order_operational_incident_cycles c
    where c.alert_id = new.alert_id
      and c.cycle_count = new.cycle_count;

    update private.order_operational_incident_cycles c
       set status = 'resolved',
           resolved_at = new.created_at,
           mttr_seconds = greatest(0, floor(extract(epoch from (new.created_at - c.opened_at)))::integer),
           updated_at = new.created_at
     where c.alert_id = new.alert_id
       and c.cycle_count = new.cycle_count;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_project_order_operational_incident_cycle on private.order_operational_incident_actions;
create trigger trg_project_order_operational_incident_cycle
after insert on private.order_operational_incident_actions
for each row execute function private.project_order_operational_incident_cycle();

create or replace function private.ensure_order_operational_post_incident_review()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_review_id uuid;
begin
  if new.status <> 'resolved' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'resolved' then
    return new;
  end if;

  insert into private.order_operational_post_incident_reviews (cycle_id, created_at, updated_at)
  values (new.id, coalesce(new.resolved_at, now()), coalesce(new.resolved_at, now()))
  on conflict (cycle_id) do nothing
  returning id into v_review_id;

  if v_review_id is not null then
    insert into private.order_operational_post_incident_actions (
      review_id, actor_role, action, metadata, created_at
    ) values (
      v_review_id, 'system', 'created_auto',
      jsonb_build_object('alertKey', new.alert_key, 'cycleCount', new.cycle_count),
      coalesce(new.resolved_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ensure_order_operational_post_incident_review on private.order_operational_incident_cycles;
create trigger trg_ensure_order_operational_post_incident_review
after insert or update of status on private.order_operational_incident_cycles
for each row execute function private.ensure_order_operational_post_incident_review();

-- Backfill cycle-level telemetry from the immutable action ledger.
insert into private.order_operational_incident_cycles (
  alert_id, alert_key, cycle_count, alert_type, severity, title, status,
  opened_at, acknowledged_at, resolved_at, mtta_seconds, mttr_seconds,
  escalation_count, first_owner_id, created_at, updated_at
)
select
  h.alert_id,
  h.alert_key,
  h.cycle_count,
  a.alert_type,
  a.severity,
  a.title,
  case when max(h.created_at) filter (where h.action = 'resolved_auto') is null then 'open' else 'resolved' end,
  min(h.created_at) filter (where h.action in ('opened_auto', 'reopened_auto')),
  min(h.created_at) filter (where h.action in ('acknowledge', 'assign')),
  max(h.created_at) filter (where h.action = 'resolved_auto'),
  case when min(h.created_at) filter (where h.action in ('acknowledge', 'assign')) is null then null
       else greatest(0, floor(extract(epoch from (
         min(h.created_at) filter (where h.action in ('acknowledge', 'assign'))
         - min(h.created_at) filter (where h.action in ('opened_auto', 'reopened_auto'))
       )))::integer) end,
  case when max(h.created_at) filter (where h.action = 'resolved_auto') is null then null
       else greatest(0, floor(extract(epoch from (
         max(h.created_at) filter (where h.action = 'resolved_auto')
         - min(h.created_at) filter (where h.action in ('opened_auto', 'reopened_auto'))
       )))::integer) end,
  count(*) filter (where h.action = 'escalate_auto')::integer,
  (array_agg(coalesce(h.new_owner_id, h.actor_id) order by h.created_at)
    filter (where h.action in ('acknowledge', 'assign') and coalesce(h.new_owner_id, h.actor_id) is not null))[1],
  min(h.created_at),
  max(h.created_at)
from private.order_operational_incident_actions h
join private.order_operational_alerts a on a.id = h.alert_id
group by h.alert_id, h.alert_key, h.cycle_count, a.alert_type, a.severity, a.title
having min(h.created_at) filter (where h.action in ('opened_auto', 'reopened_auto')) is not null
on conflict (alert_id, cycle_count) do nothing;

insert into private.order_operational_post_incident_reviews (cycle_id, created_at, updated_at)
select c.id, coalesce(c.resolved_at, now()), coalesce(c.resolved_at, now())
from private.order_operational_incident_cycles c
where c.status = 'resolved'
on conflict (cycle_id) do nothing;

