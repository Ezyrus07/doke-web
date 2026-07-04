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

const planningGate = read('scripts/validate-orders-write-canary-planning-gate.js');
const readOnlyPromotionGate = read('scripts/validate-orders-readonly-canary-promotion-gate.js');
const readOnlyRunbook = read('docs/ORDERS-READONLY-CANARY-RUNBOOK.md');
const writeRunbook = read('docs/ORDERS-WRITE-CANARY-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const backendReadme = read('backend/README.md');
const packageJson = read('package.json');

expect(planningGate, 'validate-orders-write-canary-planning-gate', [
  'orders-write-canary-planning-gate',
  'DOKE_ORDERS_WRITE_CANARY_REQUIRE_READONLY_PROMOTION',
  'DOKE_ORDERS_WRITE_CANARY_READONLY_PROMOTION_REPORT_PATH',
  'blocked_until_real_orders_readonly_promotion_report',
  'orders_write_canary_ready_for_manual_contract_design',
  'orders_readonly_canary_ready_for_manual_write_canary_planning',
  'writeActivation: false',
  'ordersProvider: \'api-write-canary-planning\'',
  'dataProvider: \'mock\'',
  'idempotency_key_required_for_every_mutation',
  'same_key_different_payload_conflict',
  'rollback_to_dataProvider_mock',
  'POST /orders/:id/accept',
  'POST /orders/:id/status',
  'manual_activation_only'
]);

expect(readOnlyPromotionGate, 'validate-orders-readonly-canary-promotion-gate', [
  'orders-readonly-canary-promotion-gate',
  'orders_readonly_canary_ready_for_manual_write_canary_planning'
]);

for (const [label, content] of [
  ['ORDERS-WRITE-CANARY-RUNBOOK', writeRunbook],
  ['ORDERS-READONLY-CANARY-RUNBOOK', readOnlyRunbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady],
  ['backend/README', backendReadme]
]) {
  if (!content.includes('Sprint 31')) failures.push(`${label} missing Sprint 31 reference.`);
  if (!content.includes('validate:orders-write-canary:planning-gate')) failures.push(`${label} missing orders write planning gate command.`);
  if (!content.includes('blocked_until_real_orders_readonly_promotion_report')) failures.push(`${label} missing blocked read-only promotion status.`);
  if (!content.includes('orders_write_canary_ready_for_manual_contract_design')) failures.push(`${label} missing orders write planning ready status.`);
  if (!content.includes('idempotency_key_required_for_every_mutation')) failures.push(`${label} missing idempotency safeguard.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-planning-gate': 'node scripts/audit-orders-write-canary-planning-gate.js',
    'validate:orders-write-canary:planning-gate:dry-run': 'node scripts/validate-orders-write-canary-planning-gate.js --dry-run',
    'validate:orders-write-canary:planning-gate': 'node scripts/validate-orders-write-canary-planning-gate.js',
    'validate:orders-write-canary:planning-gate:report': 'node scripts/validate-orders-write-canary-planning-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders write canary planning gate audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Orders write canary planning gate audit passed.');
console.log('Orders writes remain disabled; this gate only prepares manual contract design after read-only promotion.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}
