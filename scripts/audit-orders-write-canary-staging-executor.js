#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const checks = [];
const failures = [];

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

const packageJson = JSON.parse(read('package.json'));
const scripts = packageJson.scripts || {};
const expectedScripts = {
  'audit:orders-write-canary-staging-executor': 'node scripts/audit-orders-write-canary-staging-executor.js',
  'execute:orders-write-canary:staging:dry-run': 'node scripts/execute-orders-write-canary-staging.js --dry-run',
  'execute:orders-write-canary:staging:check-env': 'node scripts/execute-orders-write-canary-staging.js --check-env',
  'execute:orders-write-canary:staging': 'node scripts/execute-orders-write-canary-staging.js --execute',
  'execute:orders-write-canary:staging:report': 'node scripts/execute-orders-write-canary-staging.js --execute --write-report'
};
Object.entries(expectedScripts).forEach(([name, command]) => {
  if (scripts[name] !== command) failures.push(`package.json missing ${name}: ${command}`);
  else checks.push(`package.json script ${name}`);
});

requireIncludes('scripts/execute-orders-write-canary-staging.js', [
  'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS',
  'orders_write_canary_staging_execution_validated',
  'orders_write_canary_ready_for_manual_staging_execution',
  'dataProvider: \'mock\'',
  'writeActivation: false',
  'x-idempotency-key',
  'DOKE_IDEMPOTENCY_CONFLICT'
]);

requireIncludes('docs/ORDERS-WRITE-STAGING-EXECUTOR-RUNBOOK.md', [
  'Orders write staging executor',
  'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE=1',
  'idempotency',
  'rollback',
  'dataProvider=mock'
]);

requireIncludes('docs/VALIDATION.md', ['execute:orders-write-canary:staging:dry-run', 'audit:orders-write-canary-staging-executor']);
requireIncludes('docs/ACTIVE-CONTRACTS-INDEX.md', ['ORDERS-WRITE-STAGING-EXECUTOR-RUNBOOK.md']);
requireIncludes('docs/BACKEND-INTEGRATION-PLAN.md', ['orders_write_canary_staging_execution_validated']);
requireIncludes('docs/DATA-READY-CONTRACTS.md', ['ordersProvider=api-write-canary-staging-execution']);
requireIncludes('backend/README.md', ['execute:orders-write-canary:staging:check-env']);

if (failures.length) {
  console.error(JSON.stringify({ name: 'audit-orders-write-canary-staging-executor', status: 'failed', failures, checks }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ name: 'audit-orders-write-canary-staging-executor', status: 'passed', checks }, null, 2));
