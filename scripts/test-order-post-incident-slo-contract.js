'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = [
  read('supabase/migrations/076_order_operational_post_incident_schema.sql'),
  read('supabase/migrations/077_order_operational_incident_cycle_projection.sql'),
  read('supabase/migrations/078_order_operational_slo_metrics.sql'),
  read('supabase/migrations/079_order_operational_post_incident_projection.sql'),
  read('supabase/migrations/080_order_operational_post_incident_mutations.sql'),
  read('supabase/migrations/081_order_operational_prevention_mutations.sql'),
  read('supabase/migrations/083_order_operational_post_incident_permissions_hardening.sql'),
  read('supabase/migrations/084_order_operational_slo_legacy_transient_normalization.sql'),
  read('supabase/migrations/085_order_operational_post_incident_fk_indexes.sql'),
].join('\n');
const schedule = read('supabase/migrations/082_order_operational_slo_report_schedule.sql');
const edge = read('supabase/functions/order-event-operations/index.ts');
const operations = read('supabase/functions/order-event-operations/operations.mjs');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const controller = read('assets/js/pages/admin-order-operations.js');
const html = read('admin-pedidos-operacao.html');
const css = read('assets/css/pages/admin-order-operations.css');

[
  'private.order_operational_incident_cycles',
  'private.order_operational_post_incident_reviews',
  'private.order_operational_prevention_actions',
  'private.order_operational_post_incident_actions',
  'private.order_operational_slo_targets',
  'private.order_operational_slo_reports',
  'private.project_order_operational_incident_cycle',
  'private.calculate_order_operational_slo_metrics',
  'private.evaluate_order_operational_slo_targets',
  'private.generate_order_operational_slo_reports_daily',
  'public.get_order_operational_post_incident_internal',
  'public.mutate_order_operational_post_incident_internal',
  'public.mutate_order_operational_prevention_action_internal',
  'worker_availability_pct',
  'critical_mtta_seconds',
  'critical_mttr_seconds',
  'post_incident_completion_pct',
  'overdue_prevention_actions',
  'DOKE_ORDER_POST_INCIDENT_COMPLETION_INCOMPLETE',
  'DOKE_ORDER_PREVENTION_DUE_REQUIRED',
].forEach((snippet) => assert.ok(migration.includes(snippet), `post-incident migration missing ${snippet}`));

assert.ok(migration.includes("v_review.root_cause_category = 'unknown'"));
assert.ok(migration.includes("char_length(coalesce(v_review.detection_assessment, '')) < 10"));
assert.ok(migration.includes("p.status <> 'cancelled'\n        and p.due_at is not null"));
assert.ok(migration.includes("jsonb_array_length(v_factors) > 12"));
assert.ok(migration.includes("revoke all on function public.get_order_operational_post_incident_internal(uuid, integer)"));
assert.ok(migration.includes("grant execute on function public.get_order_operational_post_incident_internal(uuid, integer) to service_role"));
assert.ok(migration.includes("cronLastStatus', '')) in ('connecting', 'sending', 'running')"));
assert.ok(migration.includes('idx_order_operational_incident_cycles_first_owner'));
assert.ok(migration.includes('idx_order_operational_reviews_created_by'));
assert.ok(migration.includes('idx_order_operational_prevention_created_by'));
assert.ok(migration.includes('idx_order_operational_prevention_updated_by'));
assert.ok(schedule.includes("'doke-order-slo-daily-report'"));
assert.ok(schedule.includes("'15 3 * * *'"));
assert.ok(schedule.includes('private.generate_order_operational_slo_reports_daily()'));

assert.ok(edge.includes('get_order_operational_post_incident_internal'));
assert.ok(edge.includes('action === "post_incident_update"'));
assert.ok(edge.includes('action === "prevention_action_update"'));
assert.ok(edge.includes('optionalRpc(context, "get_order_operational_slos_internal"'));
assert.ok(edge.includes('action === "postmortem_update"'));
assert.ok(edge.includes('operationalSlos: operationalSlos || {}'));
assert.ok(operations.includes("'post_incident_update'"));
assert.ok(operations.includes("'prevention_action_update'"));
assert.ok(operations.includes("'postmortem_update'"));
assert.equal(require('child_process').spawnSync(process.execPath, ['--check', path.join(root, 'assets/js/pages/admin-order-operations.js')]).status, 0);
assert.ok(repository.includes('updatePostIncident'));
assert.ok(repository.includes('updatePreventionAction'));
assert.ok(controller.includes('renderSlo'));
assert.ok(controller.includes('renderPostIncidents'));
assert.ok(controller.includes('renderPreventionActions'));
assert.ok(controller.includes('openPostIncidentDialog'));
assert.ok(controller.includes('submitPostIncident'));
assert.ok(html.includes('data-admin-ops-slo'));
assert.ok(html.includes('data-admin-ops-post-incidents'));
assert.ok(html.includes('data-admin-ops-prevention-actions'));
assert.ok(html.includes('data-admin-ops-post-incident-dialog'));
assert.ok(html.includes('data-admin-ops-prevention-due type="date" required'));
assert.ok(css.includes('admin-ops-slo-grid'));
assert.ok(css.includes('admin-ops-post-incident-item'));
assert.ok(css.includes('admin-ops-prevention-item'));
assert.ok(css.includes('admin-ops-post-incident-dialog'));
assert.ok(!repository.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!repository.includes('SUPABASE_SECRET_KEY'));
assert.ok(!html.includes('service_role'));

console.log('[test:order-post-incident-slo-contract] ok');
console.log('- cycle telemetry, structured reviews and owned prevention actions');
console.log('- measurable MTTA/MTTR/availability targets with daily snapshots');
console.log('- service-role-only mutations and no privileged browser credentials');
