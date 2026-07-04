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

const validator = read('scripts/validate-orders-write-canary-staging-preflight-gate.js');
const audit = read('scripts/audit-orders-write-canary-staging-preflight-gate.js');
const writeRunbook = read('docs/ORDERS-WRITE-CANARY-RUNBOOK.md');
const preflightRunbook = read('docs/ORDERS-WRITE-STAGING-PREFLIGHT-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const backendReadme = read('backend/README.md');
const packageJson = read('package.json');

expect(validator, 'validate-orders-write-canary-staging-preflight-gate', [
  'orders-write-canary-staging-preflight-gate',
  'blocked_until_orders_write_staging_preflight_prerequisites',
  'orders_write_canary_ready_for_manual_staging_execution',
  'blocked_unsafe_orders_write_staging_target',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS',
  'DOKE_ORDERS_WRITE_CANARY_REQUIRE_STAGING_PREFLIGHT_READY',
  'reports/generated/orders-write-canary-local-runtime-report.json',
  'auth_identity_canary_ready_for_manual_staging_rollout',
  'orders_readonly_canary_ready_for_manual_write_canary_planning',
  'orders_write_canary_ready_for_manual_contract_design',
  'orders_write_canary_local_runtime_validated',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'writeActivation: false',
  'performsNetworkRequest: false',
  'performsMutation: false',
  'api-write-canary-staging-preflight'
]);

expect(audit, 'audit-orders-write-canary-staging-preflight-gate', [
  'Orders write canary staging preflight audit passed',
  'validate:orders-write-canary:staging-preflight-gate'
]);

for (const [label, content] of [
  ['ORDERS-WRITE-STAGING-PREFLIGHT-RUNBOOK', preflightRunbook],
  ['ORDERS-WRITE-CANARY-RUNBOOK', writeRunbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady],
  ['backend/README', backendReadme]
]) {
  if (!content.includes('Sprint 33')) failures.push(`${label} missing Sprint 33 reference.`);
  if (!content.includes('validate:orders-write-canary:staging-preflight-gate')) failures.push(`${label} missing staging preflight command.`);
  if (!content.includes('orders_write_canary_ready_for_manual_staging_execution')) failures.push(`${label} missing staging ready status.`);
  if (!content.includes('blocked_until_orders_write_staging_preflight_prerequisites')) failures.push(`${label} missing blocked prerequisites status.`);
  if (!content.includes('DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1')) failures.push(`${label} missing explicit mutations flag.`);
  if (!content.includes('writeActivation=false')) failures.push(`${label} missing writeActivation=false safeguard.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-staging-preflight-gate': 'node scripts/audit-orders-write-canary-staging-preflight-gate.js',
    'validate:orders-write-canary:staging-preflight-gate:dry-run': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --dry-run',
    'validate:orders-write-canary:staging-preflight-gate:check-env': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --check-env',
    'validate:orders-write-canary:staging-preflight-gate': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js',
    'validate:orders-write-canary:staging-preflight-gate:report': 'node scripts/validate-orders-write-canary-staging-preflight-gate.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders write canary staging preflight audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Orders write canary staging preflight audit passed.');
console.log('No network request or external order mutation is executed by this gate.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}
