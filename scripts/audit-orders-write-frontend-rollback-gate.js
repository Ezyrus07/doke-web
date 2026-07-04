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
  'audit:orders-write-frontend-rollback-gate': 'node scripts/audit-orders-write-frontend-rollback-gate.js',
  'validate:orders-write-frontend-rollback:gate:dry-run': 'node scripts/validate-orders-write-frontend-rollback-gate.js --dry-run',
  'validate:orders-write-frontend-rollback:gate': 'node scripts/validate-orders-write-frontend-rollback-gate.js',
  'validate:orders-write-frontend-rollback:gate:report': 'node scripts/validate-orders-write-frontend-rollback-gate.js --write-report'
};
Object.entries(expected).forEach(([name, command]) => {
  if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  else checks.push(`package script ${name}`);
});

requireIncludes('scripts/validate-orders-write-frontend-rollback-gate.js', [
  'orders_write_frontend_rollback_gate_validated',
  'rollback.restores_previous_storage_state',
  'degradation.fetch_unavailable_blocks_canary',
  'window.fetch is not available.'
]);
requireIncludes('assets/js/services/orders-service.js', [
  'rollbackOrdersWriteCanary',
  'restoreOrdersWriteCanaryBackup',
  'window.fetch is not available.'
]);
requireIncludes('docs/ORDERS-WRITE-FRONTEND-ROLLBACK-RUNBOOK.md', [
  'Orders write frontend rollback gate',
  'ordersProvider=mock',
  'orderWriteActivation=false',
  'degradação segura'
]);
requireIncludes('docs/VALIDATION.md', ['validate:orders-write-frontend-rollback:gate']);
requireIncludes('docs/ACTIVE-CONTRACTS-INDEX.md', ['ORDERS-WRITE-FRONTEND-ROLLBACK-RUNBOOK.md']);
requireIncludes('docs/BACKEND-INTEGRATION-PLAN.md', ['orders_write_frontend_rollback_gate_validated']);
requireIncludes('docs/DATA-READY-CONTRACTS.md', ['orderWriteActivation=false']);

if (failures.length) {
  console.error(JSON.stringify({ name: 'audit-orders-write-frontend-rollback-gate', status: 'failed', failures, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ name: 'audit-orders-write-frontend-rollback-gate', status: 'passed', checks }, null, 2));
