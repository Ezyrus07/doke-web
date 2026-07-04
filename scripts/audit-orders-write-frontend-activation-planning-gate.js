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
  'audit:orders-write-frontend-activation-planning-gate': 'node scripts/audit-orders-write-frontend-activation-planning-gate.js',
  'validate:orders-write-frontend-activation:planning-gate:dry-run': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js --dry-run',
  'validate:orders-write-frontend-activation:planning-gate': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js',
  'validate:orders-write-frontend-activation:planning-gate:report': 'node scripts/validate-orders-write-frontend-activation-planning-gate.js --write-report'
};
Object.entries(expected).forEach(([name, command]) => {
  if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  else checks.push(`package script ${name}`);
});

requireIncludes('scripts/validate-orders-write-frontend-activation-planning-gate.js', [
  'orders_write_canary_ready_for_manual_frontend_activation_planning',
  'orders_write_frontend_activation_ready_for_manual_contract_design',
  'blocked_until_orders_write_execution_promotion_report',
  'dataProvider: \'mock\'',
  'orderWriteActivationDefault: false',
  'manualActivationOnly: true'
]);
requireIncludes('docs/ORDERS-WRITE-FRONTEND-ACTIVATION-RUNBOOK.md', [
  'Orders write frontend activation planning gate',
  'manualActivationOnly',
  'orderWriteActivationDefault=false',
  'rollback'
]);
requireIncludes('docs/VALIDATION.md', ['validate:orders-write-frontend-activation:planning-gate:dry-run']);
requireIncludes('docs/ACTIVE-CONTRACTS-INDEX.md', ['ORDERS-WRITE-FRONTEND-ACTIVATION-RUNBOOK.md']);
requireIncludes('docs/BACKEND-INTEGRATION-PLAN.md', ['orders_write_frontend_activation_ready_for_manual_contract_design']);
requireIncludes('docs/DATA-READY-CONTRACTS.md', ['ordersProvider=api-write-canary-frontend-activation-planning']);

if (failures.length) {
  console.error(JSON.stringify({ name: 'audit-orders-write-frontend-activation-planning-gate', status: 'failed', failures, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ name: 'audit-orders-write-frontend-activation-planning-gate', status: 'passed', checks }, null, 2));
