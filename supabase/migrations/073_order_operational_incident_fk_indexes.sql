-- Doke: covering indexes for incident workflow foreign keys.
create index if not exists idx_order_operational_alerts_acknowledged_by
  on private.order_operational_alerts(acknowledged_by)
  where acknowledged_by is not null;

create index if not exists idx_order_operational_incident_actions_previous_owner
  on private.order_operational_incident_actions(previous_owner_id)
  where previous_owner_id is not null;

create index if not exists idx_order_operational_incident_actions_new_owner
  on private.order_operational_incident_actions(new_owner_id)
  where new_owner_id is not null;
