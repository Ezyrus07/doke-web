#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];

function read(file) {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

const server = read('backend/shared/testing/orders-write-canary-local-server.js');
const validator = read('scripts/validate-orders-write-canary-local-runtime.js');
const planningGate = read('scripts/validate-orders-write-canary-planning-gate.js');
const writeRunbook = read('docs/ORDERS-WRITE-CANARY-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const backendReadme = read('backend/README.md');
const packageJson = read('package.json');

expect(server, 'orders-write-canary-local-server', [
  'orders-write-canary-local-server',
  'ORDERS_WRITE_CANARY_ENDPOINTS',
  'DOKE_IDEMPOTENCY_REQUIRED',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'replay',
  'FORBIDDEN_DOMAIN_PATTERN',
  'POST /orders/:id/accept',
  'POST /orders/:id/status'
]);

expect(validator, 'validate-orders-write-canary-local-runtime', [
  'orders-write-canary-local-runtime',
  'orders_write_canary_local_runtime_validated',
  'writeActivation: false',
  'dataProvider: \'mock\'',
  'api-write-canary-local-runtime',
  'create_missing_key_rejected',
  'same_payload_replay',
  'payload_drift_conflict',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'validate-orders-write-canary-planning-gate.js'
]);

expect(planningGate, 'validate-orders-write-canary-planning-gate', [
  'orders_write_canary_ready_for_manual_contract_design',
  'blocked_until_real_orders_readonly_promotion_report'
]);

for (const [label, content] of [
  ['ORDERS-WRITE-CANARY-RUNBOOK', writeRunbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady],
  ['backend/README', backendReadme]
]) {
  if (!content.includes('Sprint 32')) failures.push(`${label} missing Sprint 32 reference.`);
  if (!content.includes('validate:orders-write-canary:local-runtime')) failures.push(`${label} missing local runtime command.`);
  if (!content.includes('orders_write_canary_local_runtime_validated')) failures.push(`${label} missing local runtime validated status.`);
  if (!content.includes('DOKE_IDEMPOTENCY_CONFLICT')) failures.push(`${label} missing idempotency conflict requirement.`);
  if (!content.includes('writeActivation=false')) failures.push(`${label} missing writeActivation=false safeguard.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-local-runtime': 'node scripts/audit-orders-write-canary-local-runtime.js',
    'validate:orders-write-canary:local-runtime': 'node scripts/validate-orders-write-canary-local-runtime.js',
    'validate:orders-write-canary:local-runtime:report': 'node scripts/validate-orders-write-canary-local-runtime.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders write canary local runtime audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Orders write canary local runtime audit passed.');
console.log('Orders write remains local-only; frontend write activation is still disabled.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}
