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

function requireSnippet(file, snippet) {
  const content = read(file);
  if (!content.includes(snippet)) failures.push(`${file} missing snippet: ${snippet}`);
}

function requirePackageScript(name, value) {
  const packageJson = JSON.parse(read('package.json') || '{}');
  if (!packageJson.scripts || packageJson.scripts[name] !== value) {
    failures.push(`package.json missing script ${name}: ${value}`);
  }
}

function requireModule(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const gate = requireModule('backend/shared/testing/supabase-execution-gate.js');
if (gate) {
  [
    'supabase/tests/001_rls_matrix_validation.sql',
    'supabase/tests/002_idempotency_and_audit_validation.sql',
    'supabase/tests/003_policy_negative_cases.sql',
    'supabase/tests/004_runtime_e2e_postconditions.sql',
    'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
  ].forEach((file) => {
    if (!gate.REQUIRED_SQL_TESTS.includes(file)) failures.push(`execution gate missing SQL test: ${file}`);
  });

  const plan = gate.buildExecutionPlan({ includeLocalReset: true });
  [
    'supabase.start',
    'supabase.db.reset',
    'audit:runtime-idempotency-audit',
    'validate:staging-e2e',
    'sql.postcondition.2'
  ].forEach((name) => {
    if (!plan.some((entry) => entry.name === name)) failures.push(`execution plan missing command: ${name}`);
  });
}

[
  'dry-run',
  'check-env',
  'print-plan',
  'run-sql-tests',
  'run-e2e',
  'full',
  'DOKE_ENVIRONMENT',
  'DOKE_SUPABASE_DB_URL',
  'SUPABASE_DB_URL',
  'DOKE_STAGING_API_URL',
  'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
  'DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS',
  'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  'DOKE_STAGING_VALIDATION_MARKER',
  'reports/generated/staging-validation-report.json',
  'production-like',
  'Frontend remains on mock providers',
  'validate:staging-e2e',
  'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
].forEach((snippet) => requireSnippet('scripts/run-supabase-staging-validation.js', snippet));

[
  'Sprint 24',
  'run-supabase-staging-validation.js',
  'DOKE_ENVIRONMENT=local',
  'DOKE_ENVIRONMENT=staging',
  'DOKE_SUPABASE_SQL_TESTS_ALLOW_MUTATIONS=1',
  'DOKE_STAGING_E2E_ALLOW_MUTATIONS=1',
  'SQL tests 001–005',
  'Do not enable frontend API provider',
  'Sprint 25'
].forEach((snippet) => requireSnippet('docs/SUPABASE-STAGING-RUNBOOK.md', snippet));

[
  'validate:supabase-staging:dry-run',
  'validate:supabase-staging:plan',
  'validate:supabase-staging',
  'DOKE_SUPABASE_DB_URL',
  'DOKE_ENVIRONMENT'
].forEach((snippet) => requireSnippet('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md', snippet));

requireSnippet('docs/STAGING-E2E-VALIDATION.md', 'Sprint 24 orchestration');
requireSnippet('docs/VALIDATION.md', 'validate:supabase-staging:dry-run');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:supabase-staging-validation-runbook');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 24 — Supabase staging validation gate');
requireSnippet('backend/README.md', 'Sprint 24 Supabase staging runbook');

requirePackageScript('audit:supabase-staging-validation-runbook', 'node scripts/audit-supabase-staging-validation-runbook.js');
requirePackageScript('validate:supabase-staging:dry-run', 'node scripts/run-supabase-staging-validation.js --dry-run');
requirePackageScript('validate:supabase-staging:plan', 'node scripts/run-supabase-staging-validation.js --print-plan');
requirePackageScript('validate:supabase-staging', 'node scripts/run-supabase-staging-validation.js --full');

if (failures.length) {
  console.error('audit:supabase-staging-validation-runbook failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:supabase-staging-validation-runbook passed');
