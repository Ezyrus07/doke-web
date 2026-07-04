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

const promotionGate = read('scripts/validate-orders-readonly-canary-promotion-gate.js');
const ordersValidator = read('scripts/validate-orders-readonly-canary.js');
const ordersAudit = read('scripts/audit-orders-readonly-canary-contract.js');
const ordersRunbook = read('docs/ORDERS-READONLY-CANARY-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const backendReadme = read('backend/README.md');
const packageJson = read('package.json');

expect(promotionGate, 'validate-orders-readonly-canary-promotion-gate', [
  'orders-readonly-canary-promotion-gate',
  'DOKE_ORDERS_READONLY_CANARY_REQUIRE_REAL_REPORT',
  'DOKE_ORDERS_READONLY_CANARY_REAL_REPORT_PATH',
  'blocked_until_real_orders_readonly_canary_report',
  'orders_readonly_canary_ready_for_manual_write_canary_planning',
  'validate:orders-readonly-canary:local-runtime',
  'validate:orders-readonly-canary:dry-run',
  'audit:orders-readonly-canary-contract',
  'authProvider: \'api\'',
  'dataProvider: \'mock\'',
  'ordersProvider: \'api-readonly\'',
  'FORBIDDEN_ORDER_WRITE_PATTERN',
  'FORBIDDEN_DOMAIN_PATTERN',
  'Real orders read-only promotion cannot use DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE'
]);

expect(ordersValidator, 'validate-orders-readonly-canary', [
  'orders-readonly-canary',
  'endpoint_scope.readonly_orders_only',
  'DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE',
  'auth_identity_promotion_gate.ready',
  'ordersProvider: \'api-readonly\''
]);

expect(ordersAudit, 'audit-orders-readonly-canary-contract', [
  'validate-orders-readonly-canary-local-runtime',
  'auth_identity_canary_ready_for_manual_staging_rollout',
  "ordersProvider: \\'api-readonly\\'"
]);

for (const [label, content] of [
  ['ORDERS-READONLY-CANARY-RUNBOOK', ordersRunbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady],
  ['backend/README', backendReadme]
]) {
  if (!content.includes('Sprint 30')) failures.push(`${label} missing Sprint 30 reference.`);
  if (!content.includes('validate:orders-readonly-canary:promotion-gate')) failures.push(`${label} missing orders read-only promotion gate command.`);
  if (!content.includes('blocked_until_real_orders_readonly_canary_report')) failures.push(`${label} missing blocked orders read-only status.`);
  if (!content.includes('orders_readonly_canary_ready_for_manual_write_canary_planning')) failures.push(`${label} missing orders read-only promotion status.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-readonly-canary-promotion-gate': 'node scripts/audit-orders-readonly-canary-promotion-gate.js',
    'validate:orders-readonly-canary:promotion-gate:dry-run': 'node scripts/validate-orders-readonly-canary-promotion-gate.js --dry-run',
    'validate:orders-readonly-canary:promotion-gate': 'node scripts/validate-orders-readonly-canary-promotion-gate.js',
    'validate:orders-readonly-canary:promotion-gate:report': 'node scripts/validate-orders-readonly-canary-promotion-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders read-only promotion gate audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Orders read-only promotion gate audit passed.');
console.log('Orders writes remain blocked until a real orders read-only canary report is approved.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}
