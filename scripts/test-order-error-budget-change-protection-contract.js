'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const root = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = [
  read('supabase/migrations/086_order_operational_postmortems_slos_reconciliation.sql'),
  read('supabase/migrations/087_order_operational_error_budget_schema.sql'),
  read('supabase/migrations/088_order_operational_error_budget_calculation.sql'),
  read('supabase/migrations/089_order_operational_change_protection_workflow.sql'),
  read('supabase/migrations/090_order_operational_change_protection_projection.sql'),
  read('supabase/migrations/091_order_operational_change_protection_schedule.sql'),
  read('supabase/migrations/092_order_operational_change_protection_digest_hardening.sql'),
].join('\n');
const edge = read('supabase/functions/order-event-operations/index.ts');
const operations = read('supabase/functions/order-event-operations/operations.mjs');
const repository = read('assets/js/repositories/order-event-operations-repository.js');
const controller = read('assets/js/pages/admin-order-operations.js');
const html = read('admin-pedidos-operacao.html');
const css = read('assets/css/pages/admin-order-operations.css');
const architecture = read('ARCHITECTURE.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');

[
  'private.order_operational_error_budget_policies',
  'private.order_operational_error_budget_snapshots',
  'private.order_operational_changes',
  'private.order_operational_change_overrides',
  'private.order_operational_change_decisions',
  'private.order_operational_change_incidents',
  'private.calculate_order_operational_error_budget',
  'private.refresh_order_operational_change_protection',
  'public.get_order_operational_change_protection_internal',
  'public.register_order_operational_change_internal',
  'public.approve_order_operational_change_override_internal',
  'public.start_order_operational_change_internal',
  'public.consume_order_operational_change_gate_internal',
  'public.complete_order_operational_change_internal',
  'worker_availability',
  'worker_delivery_success',
  'incident_mtta_compliance',
  'incident_mttr_compliance',
  "array['1h', '6h', '24h', '30d']",
  "v_burn_1h, 0) >= 14.4",
  "v_burn_6h, 0) >= 6",
  "v_max_30d, 0) >= 100",
  "'doke-order-change-protection'",
  "'*/5 * * * *'",
  'DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED',
  'DOKE_ORDER_CHANGE_CONFIRMATION_INVALID',
  'DOKE_ORDER_CHANGE_DECISION_IMMUTABLE',
  'extensions.digest',
].forEach((snippet) => assert.ok(migration.includes(snippet), `change-protection migration missing ${snippet}`));

assert.ok(migration.includes('trg_correlate_order_incident_change'));
assert.ok(migration.includes("status = 'expired'"));
assert.ok(migration.includes("granted_protection_state"));
assert.ok(migration.includes("private.order_operational_protection_state_rank"));
assert.ok(migration.includes("if trim(coalesce(p_confirmation_text, '')) <> ('LIBERAR ' || v_change.external_key)"));
assert.ok(migration.includes('revoke all on function public.get_order_operational_change_protection_internal(uuid, integer)'));
assert.ok(migration.includes('grant execute on function public.get_order_operational_change_protection_internal(uuid, integer)'));
assert.ok(migration.includes('private.order_operational_postmortems'), 'remote concurrent postmortem schema must be reconciled locally');
assert.ok(migration.includes('private.materialize_order_operational_postmortem'));

[
  'get_order_operational_change_protection_internal',
  'action === "change_register"',
  'action === "change_approve"',
  'action === "change_start"',
  'action === "change_complete"',
  'changeProtection: changeProtection || {}',
].forEach((snippet) => assert.ok(edge.includes(snippet), `Edge Function missing ${snippet}`));

['change_register', 'change_approve', 'change_start', 'change_complete'].forEach((action) => {
  assert.ok(operations.includes(`'${action}'`), `operations action missing ${action}`);
});
assert.ok(operations.includes('DOKE_ORDER_CHANGE_BLOCKED'));
assert.ok(operations.includes('DOKE_ORDER_CHANGE_OVERRIDE_ADMIN_REQUIRED'));

['registerChange', 'approveChange', 'startChange', 'completeChange'].forEach((method) => {
  assert.ok(repository.includes(method), `browser repository missing ${method}`);
});
assert.ok(!repository.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert.ok(!repository.includes('SUPABASE_SECRET_KEY'));

['renderChangeProtection', 'openChangeRegisterDialog', 'openChangeActionDialog', 'submitChangeAction'].forEach((fn) => {
  assert.ok(controller.includes(fn), `controller missing ${fn}`);
});
[
  'data-admin-ops-change-summary',
  'data-admin-ops-budget-windows',
  'data-admin-ops-changes',
  'data-admin-ops-change-decisions',
  'data-admin-ops-change-dialog',
  'data-admin-ops-change-action-dialog',
].forEach((snippet) => assert.ok(html.includes(snippet), `operations page missing ${snippet}`));
assert.ok(css.includes('.admin-ops-budget-windows'));
assert.ok(css.includes('.admin-ops-change-item'));
assert.ok(css.includes('.admin-ops-change-badge'));
assert.ok(!html.includes('service_role'));
assert.equal(childProcess.spawnSync(process.execPath, ['--check', path.join(root, 'assets/js/pages/admin-order-operations.js')]).status, 0);
assert.equal(childProcess.spawnSync(process.execPath, ['--check', path.join(root, 'assets/js/repositories/order-event-operations-repository.js')]).status, 0);
assert.ok(architecture.includes('Error budgets e proteção de mudanças'));
assert.ok(dataReady.includes('Change protection authority'));

console.log('[test:order-error-budget-change-protection-contract] ok');
console.log('- multi-window budgets, burn rate and state transition contract');
console.log('- risk gate, temporary admin override, CI consumption and incident correlation');
console.log('- protected admin projection with no privileged browser credentials');
