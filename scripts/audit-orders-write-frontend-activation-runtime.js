#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const failures = [];
const checks = [];

function read(file) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) {
    failures.push(`Missing file: ${file}`);
    return '';
  }
  return fs.readFileSync(target, 'utf8');
}

function requireIncludes(file, tokens) {
  const source = read(file);
  tokens.forEach((token) => {
    if (!source.includes(token)) failures.push(`${file} must include ${token}`);
    else checks.push(`${file} includes ${token}`);
  });
}

const scripts = JSON.parse(read('package.json')).scripts || {};
const expected = {
  'audit:orders-write-frontend-activation-runtime': 'node scripts/audit-orders-write-frontend-activation-runtime.js',
  'validate:orders-write-frontend-activation:runtime': 'node scripts/validate-orders-write-frontend-activation-runtime.js',
  'validate:orders-write-frontend-activation:runtime:report': 'node scripts/validate-orders-write-frontend-activation-runtime.js --write-report'
};
Object.entries(expected).forEach(([name, command]) => {
  if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  else checks.push(`package script ${name}`);
});

requireIncludes('assets/js/core/runtime-config.js', [
  'ordersWriteCanary',
  'ordersProvider',
  'orderWriteActivation',
  'dokeOrdersWriteCanary',
  'doke.ordersProvider',
  'doke.orderWriteActivation'
]);
requireIncludes('assets/js/services/orders-service.js', [
  'configureOrdersWriteCanary',
  'rollbackOrdersWriteCanary',
  'getOrdersWriteCanaryStatus',
  'api-write-canary-frontend-activation',
  'x-idempotency-key',
  'Orders write API canary requires idempotencyKey for every mutation.',
  'dataProvider must remain mock during orders write canary.'
]);
requireIncludes('scripts/validate-orders-write-frontend-activation-runtime.js', [
  'orders_write_frontend_activation_runtime_validated',
  'idempotency.required_before_fetch',
  'orders_write.calls_are_order_domain_only'
]);
requireIncludes('docs/ORDERS-WRITE-FRONTEND-RUNTIME-RUNBOOK.md', [
  'Orders write frontend activation runtime',
  'configureOrdersWriteCanary',
  'x-idempotency-key',
  'dataProvider=mock'
]);
requireIncludes('docs/VALIDATION.md', ['validate:orders-write-frontend-activation:runtime']);
requireIncludes('docs/ACTIVE-CONTRACTS-INDEX.md', ['ORDERS-WRITE-FRONTEND-RUNTIME-RUNBOOK.md']);
requireIncludes('docs/BACKEND-INTEGRATION-PLAN.md', ['orders_write_frontend_activation_runtime_validated']);
requireIncludes('docs/DATA-READY-CONTRACTS.md', ['ordersProvider=api-write-canary-frontend-activation']);

if (failures.length) {
  console.error(JSON.stringify({ name: 'audit-orders-write-frontend-activation-runtime', status: 'failed', failures, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ name: 'audit-orders-write-frontend-activation-runtime', status: 'passed', checks }, null, 2));
