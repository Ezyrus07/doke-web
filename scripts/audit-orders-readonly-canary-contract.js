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

const validator = read('scripts/validate-orders-readonly-canary.js');
const localRuntime = read('scripts/validate-orders-readonly-canary-local-runtime.js');
const localServer = read('backend/shared/testing/orders-readonly-canary-local-server.js');
const authPromotionGate = read('scripts/validate-auth-identity-canary-promotion-gate.js');
const ordersService = read('assets/js/services/orders-service.js');
const repositoryBoundary = read('assets/js/services/repository-boundary.js');
const apiProvider = read('assets/js/services/api-repository-provider.js');
const runbook = read('docs/ORDERS-READONLY-CANARY-RUNBOOK.md');
const authRunbook = read('docs/AUTH-IDENTITY-CANARY-RUNBOOK.md');
const validation = read('docs/VALIDATION.md');
const backendPlan = read('docs/BACKEND-INTEGRATION-PLAN.md');
const activeContracts = read('docs/ACTIVE-CONTRACTS-INDEX.md');
const dataReady = read('docs/DATA-READY-CONTRACTS.md');
const backendReadme = read('backend/README.md');
const packageJson = read('package.json');

expect(validator, 'validate-orders-readonly-canary', [
  'DOKE_ORDERS_READONLY_CANARY_API_URL',
  'DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK',
  'DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE',
  'auth_identity_promotion_gate.ready',
  "'GET', '/orders'",
  "`/orders/${encodeURIComponent(firstOrder.id)}`",
  'FORBIDDEN_ORDER_WRITE_PATTERN',
  'FORBIDDEN_DOMAIN_PATTERN',
  'dataProvider: \'mock\'',
  'ordersProvider: \'api-readonly\''
]);

expect(localRuntime, 'validate-orders-readonly-canary-local-runtime', [
  'createOrdersReadonlyCanaryLocalServer',
  'DOKE_ORDERS_READONLY_CANARY_API_URL',
  'DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK',
  'DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE',
  'server_traffic.orders_readonly_only',
  'validate-orders-readonly-canary.js'
]);

expect(localServer, 'orders-readonly-canary-local-server', [
  'createOrdersReadonlyCanaryLocalServer',
  'GET /orders',
  'GET /orders/:id',
  'DOKE_LOCAL_ORDERS_READONLY_FORBIDDEN_ENDPOINT',
  'DOKE_LOCAL_ORDERS_READONLY_UNEXPECTED_ENDPOINT',
  'FORBIDDEN_WRITE_PATTERN',
  'FORBIDDEN_DOMAIN_PATTERN'
]);

expect(authPromotionGate, 'auth promotion gate', [
  'auth_identity_canary_ready_for_manual_staging_rollout',
  'blocked_until_real_auth_identity_canary_report'
]);

expect(ordersService, 'orders-service', [
  'getOrdersProviderStatus',
  'shouldUseOrdersApi',
  "boundary.list('orders'",
  "boundary.getById('orders'"
]);

expect(repositoryBoundary, 'repository-boundary', [
  'getDataProviderStatus',
  'enableNetworkRequests flag is disabled',
  'Provider "'
]);

expect(apiProvider, 'api-repository-provider', [
  "orders: '/orders'",
  'function list(resourceName, query)',
  'function getById(resourceName, payload)',
  "accept: '/orders/:id/accept'"
]);

for (const [label, content] of [
  ['ORDERS-READONLY-CANARY-RUNBOOK', runbook],
  ['AUTH-IDENTITY-CANARY-RUNBOOK', authRunbook],
  ['VALIDATION', validation],
  ['BACKEND-INTEGRATION-PLAN', backendPlan],
  ['ACTIVE-CONTRACTS-INDEX', activeContracts],
  ['DATA-READY-CONTRACTS', dataReady],
  ['backend/README', backendReadme]
]) {
  if (!content.includes('Sprint 29')) failures.push(`${label} missing Sprint 29 reference.`);
  if (!content.includes('validate:orders-readonly-canary:local-runtime')) failures.push(`${label} missing orders read-only local runtime command.`);
  if (!content.includes('auth_identity_canary_ready_for_manual_staging_rollout')) failures.push(`${label} missing auth promotion gate dependency.`);
}

try {
  const parsed = JSON.parse(packageJson);
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-readonly-canary-contract': 'node scripts/audit-orders-readonly-canary-contract.js',
    'validate:orders-readonly-canary:dry-run': 'node scripts/validate-orders-readonly-canary.js --dry-run',
    'validate:orders-readonly-canary': 'node scripts/validate-orders-readonly-canary.js',
    'validate:orders-readonly-canary:report': 'node scripts/validate-orders-readonly-canary.js --write-report',
    'validate:orders-readonly-canary:local-runtime': 'node scripts/validate-orders-readonly-canary-local-runtime.js',
    'validate:orders-readonly-canary:local-runtime:report': 'node scripts/validate-orders-readonly-canary-local-runtime.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  });
} catch (error) {
  failures.push(`package.json is invalid JSON: ${error.message}`);
}

if (failures.length) {
  console.error('Orders read-only canary contract audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Orders read-only canary contract audit passed.');
console.log('Orders API remains blocked behind auth/identity promotion gate and read-only endpoint scope.');

function expect(content, label, snippets) {
  for (const snippet of snippets) {
    if (!content.includes(snippet)) failures.push(`${label} missing snippet: ${snippet}`);
  }
}
