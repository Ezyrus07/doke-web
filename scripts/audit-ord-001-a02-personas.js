'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (path) => fs.readFileSync(path, 'utf8');
const evidence = JSON.parse(read('docs/validation/ORD-001-A02-PERSONAS.json'));
const migration = read('supabase/migrations/20260729190500_ord_a02_trigger_only_grants.sql');
const worker = read('supabase/functions/order-event-worker/index.ts');
const orderPolicies = read('supabase/migrations/010_orders_shared_runtime.sql');
const incidentSchema = read('supabase/migrations/066_order_operational_incident_schema.sql');
const postmortemSchema = read('supabase/migrations/076_order_operational_postmortems_slos.sql');
const documentation = read('docs/ORD-001-PERSONAS-AND-GRANTS.md');

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A02');
assert.strictEqual(evidence.status, 'complete_with_residual_blockers');
assert.strictEqual(evidence.productionChanged, false);
assert.strictEqual(evidence.realRowsMutated, 0);
assert(Object.values(evidence.probeRowsRemaining).every((value) => value === 0), 'Reversible persona probes must leave no rows.');

const personas = evidence.personaProbe;
assert.strictEqual(personas.anon.ordersSelect, 'denied_42501');
assert.strictEqual(personas.anon.transitionOrderStatusExecute, false);
assert.strictEqual(personas.clientParticipant.ordersVisible, 1);
assert.strictEqual(personas.clientParticipant.budgetsVisible, 1);
assert.strictEqual(personas.clientParticipant.historyVisible, 1);
assert.strictEqual(personas.clientParticipant.insertOwnRequestedOrder, 'allowed');
assert.strictEqual(personas.clientParticipant.insertBudget, 'denied_42501');
assert.strictEqual(personas.professionalParticipant.insertOwnBudget, 'allowed');
assert.strictEqual(personas.professionalParticipant.insertOrderActingAsClient, 'allowed');
assert.strictEqual(personas.thirdAuthenticatedUser.ordersVisible, 0);
assert.strictEqual(personas.thirdAuthenticatedUser.impersonatedClientInsert, 'denied_42501');
assert.strictEqual(personas.support.ordersVisibleThroughPublicRls, 0);
assert.strictEqual(personas.admin.ordersVisibleThroughPublicRls, 0);
assert.strictEqual(personas.serviceRole.ordersVisible, 1);

assert(orderPolicies.includes('orders_participants_select'));
const a03Closed = fs.existsSync('docs/validation/ORD-001-A03-COMMAND-BOUNDARY.json');
if (!a03Closed) {
  assert(orderPolicies.includes('orders_client_insert'));
  assert(orderPolicies.includes('orders_participants_update'));
  assert(orderPolicies.includes('orders_client_delete_draft'));
} else {
  const a03 = JSON.parse(read('docs/validation/ORD-001-A03-COMMAND-BOUNDARY.json'));
  assert.strictEqual(a03.status, 'complete');
  assert.strictEqual(a03.staging.authenticatedDirectDml.orders.insert, false);
  assert.strictEqual(a03.staging.authenticatedDirectDml.orders.update, false);
  assert.strictEqual(a03.staging.authenticatedDirectDml.orders.delete, false);
}

[
  'private.prepare_order_operational_incident()',
  'private.audit_order_operational_incident_lifecycle()',
  'private.materialize_order_operational_postmortem()'
].forEach((signature) => {
  assert(migration.includes(`revoke execute on function ${signature}`), `${signature} must have direct execution revoked.`);
});
assert(migration.includes('from public, anon, authenticated, service_role'));
assert(incidentSchema.includes('returns trigger'));
assert(incidentSchema.includes('trg_prepare_order_operational_incident'));
assert(incidentSchema.includes('trg_audit_order_operational_incident_lifecycle'));
assert(postmortemSchema.includes('trg_materialize_order_operational_postmortem'));
assert.strictEqual(evidence.grantHardening.triggersRemainEnabled, true);
assert(Object.values(evidence.grantHardening.directExecuteAfterMigration).every((value) => value === false));

assert(worker.includes('req.method !== "POST"'));
assert(worker.includes('x-doke-worker-token'));
assert(worker.includes('verify_order_event_worker_token'));
assert(worker.includes('WORKER_AUTH_REQUIRED'));
assert.strictEqual(evidence.workerAuth.nullTokenValid, false);
assert.strictEqual(evidence.workerAuth.invalidTokenValid, false);
assert.strictEqual(evidence.workerAuth.verifyFunctionExecute.anon, false);
assert.strictEqual(evidence.workerAuth.verifyFunctionExecute.authenticated, false);
assert.strictEqual(evidence.workerAuth.verifyFunctionExecute.service_role, true);
assert.strictEqual(evidence.workerAuth.replayResistance.nonce, false);
assert.strictEqual(evidence.workerAuth.replayResistance.timestampWindow, false);
assert.strictEqual(evidence.workerAuth.replayResistance.requestSignature, false);

const findingIds = new Set(evidence.findings.map((finding) => finding.id));
['ORD-A02-F01', 'ORD-A02-F02', 'ORD-A02-F03', 'ORD-A02-F04', 'ORD-A02-F05', 'ORD-A02-F06']
  .forEach((id) => assert(findingIds.has(id), `Missing finding ${id}.`));
assert.strictEqual(evidence.matrixDecision.promotion, false);
assert.strictEqual(evidence.matrixDecision.securityGate, 'partial');
assert.strictEqual(evidence.matrixDecision.productionGate, 'blocked');
assert(documentation.includes('ORD-A03 — command boundary canônico'));

console.log('ORD-A02 persona, worker-auth and trigger-grant contracts passed.');
