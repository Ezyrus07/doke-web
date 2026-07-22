-- Doke: ownership, acknowledgement, SLA and escalation workflow for order incidents.
-- Alerts remain detector-owned; human operators only acknowledge, assign and annotate.

alter table private.order_operational_alerts
  add column if not exists workflow_status text not null default 'unassigned'
    check (workflow_status in ('unassigned', 'acknowledged', 'escalated', 'resolved')),
  add column if not exists owner_id uuid references public.users(id) on delete set null,
  add column if not exists owner_role text check (owner_role is null or owner_role in ('support', 'admin')),
  add column if not exists acknowledged_at timestamptz,
  add column if not exists acknowledged_by uuid references public.users(id) on delete set null,
  add column if not exists acknowledgement_due_at timestamptz,
  add column if not exists response_due_at timestamptz,
  add column if not exists escalation_count integer not null default 0 check (escalation_count >= 0),
  add column if not exists escalated_at timestamptz,
  add column if not exists last_escalated_at timestamptz,
  add column if not exists next_escalation_at timestamptz;

create index if not exists idx_order_operational_alerts_owner_open
  on private.order_operational_alerts(owner_id, last_seen_at desc)
  where status = 'open' and owner_id is not null;

create index if not exists idx_order_operational_alerts_escalation_due
  on private.order_operational_alerts(next_escalation_at)
  where status = 'open' and next_escalation_at is not null;

create table if not exists private.order_operational_incident_actions (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid not null references private.order_operational_alerts(id) on delete cascade,
  alert_key text not null,
  cycle_count integer not null check (cycle_count >= 1),
  actor_id uuid references public.users(id) on delete set null,
  actor_role text not null check (actor_role in ('support', 'admin', 'system')),
  action text not null check (action in (
    'opened_auto', 'reopened_auto', 'acknowledge', 'assign', 'note',
    'escalate_auto', 'resolved_auto'
  )),
  note text,
  previous_owner_id uuid references public.users(id) on delete set null,
  new_owner_id uuid references public.users(id) on delete set null,
  previous_workflow_status text,
  new_workflow_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_order_operational_incident_actions_alert
  on private.order_operational_incident_actions(alert_id, created_at desc);
create index if not exists idx_order_operational_incident_actions_actor
  on private.order_operational_incident_actions(actor_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_order_operational_incident_actions_created
  on private.order_operational_incident_actions(created_at desc);

revoke all on private.order_operational_incident_actions from public, anon, authenticated;
grant select on private.order_operational_incident_actions to service_role;

create or replace function private.prepare_order_operational_incident()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_ack_minutes integer;
begin
  v_ack_minutes := case when new.severity = 'critical' then 10 else 30 end;

  if tg_op = 'INSERT' then
    new.workflow_status := case when new.status = 'resolved' then 'resolved' else 'unassigned' end;
    new.acknowledgement_due_at := case
      when new.status = 'open' then coalesce(new.opened_at, now()) + make_interval(mins => v_ack_minutes)
      else null
    end;
    new.response_due_at := null;
    new.next_escalation_at := new.acknowledgement_due_at;
    return new;
  end if;

  if old.status = 'resolved' and new.status = 'open' then
    new.workflow_status := 'unassigned';
    new.owner_id := null;
    new.owner_role := null;
    new.acknowledged_at := null;
    new.acknowledged_by := null;
    new.acknowledgement_due_at := coalesce(new.opened_at, now()) + make_interval(mins => v_ack_minutes);
    new.response_due_at := null;
    new.escalation_count := 0;
    new.escalated_at := null;
    new.last_escalated_at := null;
    new.next_escalation_at := new.acknowledgement_due_at;
  elsif old.status <> 'resolved' and new.status = 'resolved' then
    new.workflow_status := 'resolved';
    new.next_escalation_at := null;
  end if;

  return new;
end;
$$;

create or replace function private.audit_order_operational_incident_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    insert into private.order_operational_incident_actions (
      alert_id, alert_key, cycle_count, actor_role, action,
      previous_workflow_status, new_workflow_status, metadata, created_at
    ) values (
      new.id, new.alert_key, new.cycle_count, 'system', 'opened_auto',
      null, new.workflow_status, jsonb_build_object('severity', new.severity), new.created_at
    );
    return new;
  end if;

  if old.status = 'resolved' and new.status = 'open' then
    insert into private.order_operational_incident_actions (
      alert_id, alert_key, cycle_count, actor_role, action,
      previous_owner_id, new_owner_id,
      previous_workflow_status, new_workflow_status, metadata, created_at
    ) values (
      new.id, new.alert_key, new.cycle_count, 'system', 'reopened_auto',
      old.owner_id, new.owner_id,
      old.workflow_status, new.workflow_status,
      jsonb_build_object('severity', new.severity), new.opened_at
    );
  elsif old.status <> 'resolved' and new.status = 'resolved' then
    insert into private.order_operational_incident_actions (
      alert_id, alert_key, cycle_count, actor_role, action,
      previous_owner_id, new_owner_id,
      previous_workflow_status, new_workflow_status, metadata, created_at
    ) values (
      new.id, new.alert_key, new.cycle_count, 'system', 'resolved_auto',
      old.owner_id, new.owner_id,
      old.workflow_status, new.workflow_status,
      jsonb_build_object('resolvedAt', new.resolved_at), coalesce(new.resolved_at, now())
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_prepare_order_operational_incident on private.order_operational_alerts;
create trigger trg_prepare_order_operational_incident
before insert or update on private.order_operational_alerts
for each row execute function private.prepare_order_operational_incident();

drop trigger if exists trg_audit_order_operational_incident_lifecycle on private.order_operational_alerts;
create trigger trg_audit_order_operational_incident_lifecycle
after insert or update on private.order_operational_alerts
for each row execute function private.audit_order_operational_incident_lifecycle();

-- Backfill active incidents created before the workflow existed.
update private.order_operational_alerts
set workflow_status = case when status = 'resolved' then 'resolved' else 'unassigned' end,
    acknowledgement_due_at = case
      when status = 'open' then opened_at + make_interval(mins => case when severity = 'critical' then 10 else 30 end)
      else null
    end,
    next_escalation_at = case
      when status = 'open' then opened_at + make_interval(mins => case when severity = 'critical' then 10 else 30 end)
      else null
    end
where acknowledgement_due_at is null;

