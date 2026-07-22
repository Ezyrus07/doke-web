'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

const migration = read('supabase/migrations/056_order_event_operations_panel.sql');
const alertMigration = [
  read('supabase/migrations/062_order_operational_alerts.sql'),
  read('supabase/migrations/063_order_operational_alert_evaluator.sql'),
  read('supabase/migrations/064_order_operational_alert_schedule.sql'),
].join('\n');
const incidentMigration = [
  read('supabase/migrations/066_order_operational_incident_schema.sql'),
  read('supabase/migrations/067_order_operational_incident_mutations.sql'),
  read('supabase/migrations/068_order_operational_incident_escalation.sql'),
  read('supabase/migrations/069_order_operational_incident_projection.sql'),
  read('supabase/migrations/070_order_operational_incident_escalation_schedule.sql'),
].join('\n');
const edge = read('supabase/functions/order-event-operations/index.ts');
const operations = read('supabase/functions/order-event-operations/operations.mjs');
const deno = JSON.parse(read('supabase/functions/order-event-operations/deno.json'));
const html = read('admin-pedidos-operacao.html');
const controller = read('assets/js/pages/admin-order-operations.js');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const routes = read('assets/js/core/auth-route-map.js');
const registry = read('assets/js/core/navigation-registry.js');
const router = read('assets/js/core/stable-shell-router.js');
const mobileShell = read('assets/js/components/mobile-app-shell.js');
const adminHtml = read('admin.html');

[
  'private.order_event_operator_actions',
  'private.assert_order_event_operator',
  'public.get_order_event_operations_dashboard_internal',
  'public.requeue_order_domain_event_internal',
  'public.run_order_event_worker_now_internal',
  "v_role not in ('support', 'admin')",
  "delivery_status in ('ready', 'failed', 'processing', 'dead_letter')",
  "v_event.delivery_status not in ('failed', 'dead_letter')",
  'manual_requeue_count = manual_requeue_count + 1',
  'private.invoke_order_event_worker_if_needed()',
].forEach((snippet) => assert.ok(migration.includes(snippet), `migration missing ${snippet}`));

[
  'get_order_event_operations_dashboard_internal(uuid, integer, integer)',
  'requeue_order_domain_event_internal(uuid, text, text)',
  'run_order_event_worker_now_internal(uuid, text)',
].forEach((signature) => {
  assert.ok(
    migration.includes(`revoke all on function public.${signature} from public, anon, authenticated`),
    `${signature} must be revoked from browser roles`,
  );
  assert.ok(
    migration.includes(`grant execute on function public.${signature} to service_role`),
    `${signature} must be service-role only`,
  );
});

assert.ok(edge.includes('authClient.auth.getUser()'), 'Edge Function must validate the bearer session');
assert.ok(edge.includes('get_order_operational_alerts_internal'), 'Edge Function must merge the automatic alert projection');
assert.ok(edge.includes('mutate_order_operational_incident_internal'), 'Edge Function must route controlled incident mutations');
assert.ok(incidentMigration.includes('private.order_operational_incident_actions'), 'incident workflow must keep an immutable action history');
assert.ok(incidentMigration.includes('private.escalate_order_operational_incidents'), 'incident workflow must include automatic escalation');
assert.ok(incidentMigration.includes("'doke-order-incident-escalation'"), 'incident escalation must be scheduled');
assert.ok(incidentMigration.includes('DOKE_ORDER_INCIDENT_ASSIGN_ADMIN_REQUIRED'), 'assignment must remain admin-only');
assert.ok(alertMigration.includes('private.evaluate_order_operational_alerts'), 'operations stack must include the automatic alert evaluator');
assert.ok(edge.includes('.from("users")') && edge.includes('.select("role,status")'), 'Edge Function must re-check account role and status');
assert.ok(edge.includes('SUPABASE_SECRET_KEY') && edge.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Edge Function must use server-only credentials for internal RPCs');
assert.ok(edge.includes('role !== "support" && role !== "admin"'), 'Edge Function must allow only support/admin');
assert.ok(!repository.includes('SUPABASE_SERVICE_ROLE_KEY') && !repository.includes('SUPABASE_SECRET_KEY'), 'browser repository must not contain server credentials');
assert.ok(repository.includes("functions.invoke(FUNCTION_NAME"), 'browser must call the protected Edge Function');
assert.ok(operations.includes('DOKE_ORDER_EVENT_REQUEUE_NOT_ALLOWED'), 'operations module must normalize controlled requeue errors');
assert.strictEqual(deno.imports['@supabase/supabase-js'], 'npm:@supabase/supabase-js@2.110.0');

[
  'data-admin-ops-root',
  'data-admin-ops-events',
  'data-admin-ops-runs',
  'data-admin-ops-requeue-dialog',
  'data-admin-ops-alerts',
  'data-admin-ops-incident-dialog',
  'assets/js/repositories/order-event-operations-repository.js',
  'assets/js/pages/admin-order-operations.js',
].forEach((snippet) => assert.ok(html.includes(snippet), `operations page missing ${snippet}`));

assert.ok(controller.includes('access.guardPage'), 'page controller must use the shared admin guard');
assert.ok(controller.includes('DokeInitAdminOrderOperations'), 'page must expose stable-shell initializer');
assert.ok(controller.includes('repo.requeue'), 'page must route requeue through the repository');
assert.ok(controller.includes('repo.updateIncident'), 'page must route incident actions through the repository');
assert.ok(repository.includes("invoke('incident_update'"), 'browser repository must use the protected incident action');
assert.ok(controller.includes('setTimeout') && controller.includes('AUTO_REFRESH_MS = 60000'), 'page must use bounded one-minute auto refresh');
assert.ok(routes.includes('admin-pedidos-operacao.html'), 'operations page must be a private route');
assert.ok(registry.includes("'admin-pedidos-operacao.html'"), 'operations page must be registered for navigation');
assert.ok(router.includes('DokeInitAdminOrderOperations'), 'stable shell must initialize the operations page');
assert.ok(mobileShell.includes("'admin-pedidos-operacao.html'"), 'mobile shell must know the operations page');
assert.ok(adminHtml.includes('data-header-nav="admin-pedidos-operacao.html"'), 'admin home must link to operations');
assert.ok(!/<\/button>\s*<\/button>/.test(html), 'operations page must not contain duplicate button closing tags');

console.log('[test:order-event-operations-contract] ok');
console.log('- protected Edge Function and service-role-only database projection');
console.log('- admin/support route, lifecycle and controlled requeue surface');
console.log('- no private worker table or server key exposed to the browser');
