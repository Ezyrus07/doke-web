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
  'audit:orders-write-canary-execution-promotion-gate': 'node scripts/audit-orders-write-canary-execution-promotion-gate.js',
  'validate:orders-write-canary:execution-promotion-gate:dry-run': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js --dry-run',
  'validate:orders-write-canary:execution-promotion-gate': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js',
  'validate:orders-write-canary:execution-promotion-gate:report': 'node scripts/validate-orders-write-canary-execution-promotion-gate.js --write-report'
};
Object.entries(expected).forEach(([name, command]) => {
  if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  else checks.push(`package script ${name}`);
});

requireIncludes('scripts/validate-orders-write-canary-execution-promotion-gate.js', [
  'orders_write_canary_staging_execution_validated',
  'orders_write_canary_ready_for_manual_frontend_activation_planning',
  'blocked_until_real_orders_write_staging_execution_report',
  'writeActivation=false',
  'dataProvider=mock'
]);
requireIncludes('docs/ORDERS-WRITE-EXECUTION-PROMOTION-RUNBOOK.md', [
  'Orders write execution promotion gate',
  'orders_write_canary_staging_execution_validated',
  'frontend activation planning',
  'dataProvider=mock'
]);
requireIncludes('docs/VALIDATION.md', ['validate:orders-write-canary:execution-promotion-gate:dry-run']);
requireIncludes('docs/ACTIVE-CONTRACTS-INDEX.md', ['ORDERS-WRITE-EXECUTION-PROMOTION-RUNBOOK.md']);
requireIncludes('docs/BACKEND-INTEGRATION-PLAN.md', ['orders_write_canary_ready_for_manual_frontend_activation_planning']);
requireIncludes('docs/DATA-READY-CONTRACTS.md', ['ordersProvider=api-write-canary-staging-execution']);

if (failures.length) {
  console.error(JSON.stringify({ name: 'audit-orders-write-canary-execution-promotion-gate', status: 'failed', failures, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ name: 'audit-orders-write-canary-execution-promotion-gate', status: 'passed', checks }, null, 2));
