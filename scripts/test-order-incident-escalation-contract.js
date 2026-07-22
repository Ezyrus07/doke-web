'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = [
  read('supabase/migrations/066_order_operational_incident_schema.sql'),
  read('supabase/migrations/067_order_operational_incident_mutations.sql'),
  read('supabase/migrations/068_order_operational_incident_escalation.sql'),
  read('supabase/migrations/069_order_operational_incident_projection.sql'),
].join('\n');
const schedule = read('supabase/migrations/070_order_operational_incident_escalation_schedule.sql');
const transientHardening = read('supabase/migrations/072_order_operational_alert_transient_states_hardening.sql');
const incidentIndexes = read('supabase/migrations/073_order_operational_incident_fk_indexes.sql');
const controller = read('assets/js/pages/admin-order-operations.js');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const edge = read('supabase/functions/order-event-operations/index.ts');
const operations = read('supabase/functions/order-event-operations/operations.mjs');
const html = read('admin-pedidos-operacao.html');
const css = read('assets/css/pages/admin-order-operations.css');

[
  'workflow_status',
  'owner_id uuid references public.users(id)',
  'acknowledgement_due_at',
  'response_due_at',
  'escalation_count',
  'private.order_operational_incident_actions',
  'private.prepare_order_operational_incident',
  'private.audit_order_operational_incident_lifecycle',
  'public.mutate_order_operational_incident_internal',
  'private.escalate_order_operational_incidents',
  "v_action not in ('acknowledge', 'assign', 'note')",
  "v_actor_role <> 'admin'",
  "lower(u.role) = 'admin'",
  'get_order_operational_alerts_internal',
].forEach((snippet) => assert.ok(migration.includes(snippet), `incident migration missing ${snippet}`));

assert.ok(schedule.includes("'doke-order-incident-escalation'"));
assert.ok(schedule.includes("'*/5 * * * *'"));
assert.ok(schedule.includes('private.escalate_order_operational_incidents(now())'));
assert.ok(transientHardening.includes("('connecting', 'sending', 'running')"));
assert.ok(transientHardening.includes("('succeeded', 'success', 'running', 'sending', 'connecting')"));
assert.ok(incidentIndexes.includes('idx_order_operational_alerts_acknowledged_by'));
assert.ok(incidentIndexes.includes('idx_order_operational_incident_actions_previous_owner'));
assert.ok(incidentIndexes.includes('idx_order_operational_incident_actions_new_owner'));
assert.ok(migration.includes('revoke all on function public.mutate_order_operational_incident_internal(uuid, uuid, text, text, uuid)'));
assert.ok(migration.includes('grant execute on function public.mutate_order_operational_incident_internal(uuid, uuid, text, text, uuid)\n  to service_role'));
assert.ok(edge.includes('action === "incident_update"'));
assert.ok(operations.includes("'incident_update'"));
assert.ok(repository.includes('updateIncident'));
assert.ok(controller.includes('openIncidentDialog'));
assert.ok(controller.includes('submitIncidentUpdate'));
assert.ok(html.includes('data-admin-ops-incident-dialog'));
assert.ok(html.includes('data-admin-ops-incident-assignee'));
assert.ok(css.includes('admin-ops-alert-item__ownership'));
assert.ok(!repository.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!repository.includes('SUPABASE_SECRET_KEY'));

console.log('[test:order-incident-escalation-contract] ok');
console.log('- incident ownership, acknowledgement SLA and immutable history');
console.log('- admin-only assignment and automatic escalation to administrators');
console.log('- protected Edge Function mutation with no private credentials in browser');
