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

function requireJs(file) {
  try {
    return require(path.join(root, file));
  } catch (error) {
    failures.push(`${file} cannot be required: ${error.message}`);
    return null;
  }
}

const gate = requireJs('backend/shared/testing/supabase-execution-gate.js');
if (gate) {
  [
    'SUPABASE_DB_URL',
    'DOKE_STAGING_API_URL',
    'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
    'DOKE_STAGING_E2E_ALLOW_MUTATIONS'
  ].forEach((envName) => {
    const values = Object.values(gate.SUPABASE_EXECUTION_ENVIRONMENT || {});
    if (!values.includes(envName)) failures.push(`execution gate environment missing ${envName}`);
  });

  [
    'supabase/migrations/001_identity_profiles.sql',
    'supabase/migrations/006_runtime_idempotency_audit_foundation.sql',
    'supabase/migrations/007_account_profile_base.sql'
  ].forEach((file) => {
    if (!gate.REQUIRED_MIGRATIONS.includes(file)) failures.push(`required migration missing from execution gate: ${file}`);
  });

  [
    'supabase/tests/001_rls_matrix_validation.sql',
    'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
  ].forEach((file) => {
    if (!gate.REQUIRED_SQL_TESTS.includes(file)) failures.push(`required SQL test missing from execution gate: ${file}`);
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
  '--execute',
  '--local-reset',
  'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
  'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  'SUPABASE_DB_URL',
  'validate:staging-e2e',
  'supabase-local-staging-execution-report.json',
  'Run with --execute only after local/staging Supabase is prepared'
].forEach((snippet) => requireSnippet('scripts/validate-supabase-local-staging.js', snippet));

[
  'Sprint 24',
  'validate:supabase-local-staging',
  'DOKE_SUPABASE_VALIDATION_ALLOW_MUTATIONS',
  'SQL tests 001 through 005',
  'Do not enable frontend API provider'
].forEach((snippet) => requireSnippet('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md', snippet));

requireSnippet('docs/STAGING-E2E-VALIDATION.md', 'Sprint 24');
requireSnippet('docs/STAGING-API-RUNTIME.md', 'validate:supabase-local-staging');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'audit:supabase-local-staging-execution');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 24');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:supabase-local-staging-execution');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:supabase-local-staging-execution');
requireSnippet('docs/VALIDATION.md', 'validate:supabase-local-staging');
requireSnippet('backend/README.md', 'Sprint 24 Supabase execution gate');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:supabase-local-staging-execution'] !== 'node scripts/audit-supabase-local-staging-execution.js') {
  failures.push('package.json missing audit:supabase-local-staging-execution script.');
}
if (!packageJson.scripts || packageJson.scripts['validate:supabase-local-staging'] !== 'node scripts/validate-supabase-local-staging.js --execute') {
  failures.push('package.json missing validate:supabase-local-staging script.');
}
if (!packageJson.scripts || packageJson.scripts['validate:supabase-local-staging:dry-run'] !== 'node scripts/validate-supabase-local-staging.js') {
  failures.push('package.json missing validate:supabase-local-staging:dry-run script.');
}

if (failures.length) {
  console.error('audit:supabase-local-staging-execution failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:supabase-local-staging-execution passed');
