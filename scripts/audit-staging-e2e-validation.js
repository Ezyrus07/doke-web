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

const scenarios = requireJs('backend/shared/testing/staging-e2e-scenarios.js');
if (scenarios) {
  const names = scenarios.listScenarioNames();
  [
    'identity.client',
    'identity.professional_profile',
    'orders.client_list',
    'orders.accept_requires_idempotency',
    'orders.client_accept_denied',
    'idempotency.replay_same_payload',
    'idempotency.reject_payload_drift',
    'messaging.list',
    'messaging.send_message',
    'notifications.list',
    'notifications.support_create',
    'wallet.summary',
    'withdrawals.request',
    'withdrawals.client_denied',
    'disputes.list',
    'receipts.list',
    'audit.support_list',
    'audit.client_denied'
  ].forEach((name) => {
    if (!names.includes(name)) failures.push(`staging e2e scenario missing: ${name}`);
  });

  [
    'DOKE_STAGING_API_URL',
    'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
    'DOKE_STAGING_CLIENT_EMAIL',
    'DOKE_STAGING_PROFESSIONAL_EMAIL',
    'DOKE_STAGING_SUPPORT_EMAIL',
    'DOKE_STAGING_ADMIN_EMAIL'
  ].forEach((envName) => {
    const values = Object.values(scenarios.STAGING_E2E_ENVIRONMENT || {});
    if (!values.includes(envName)) failures.push(`staging e2e environment missing ${envName}`);
  });

  [
    'supabase/tests/001_rls_matrix_validation.sql',
    'supabase/tests/002_idempotency_and_audit_validation.sql',
    'supabase/tests/003_policy_negative_cases.sql',
    'supabase/tests/004_runtime_e2e_postconditions.sql',
    'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
  ].forEach((file) => {
    if (!scenarios.STAGING_E2E_REQUIRED_SQL_TESTS.includes(file)) failures.push(`required SQL validation missing from scenario contract: ${file}`);
  });
}

[
  'fetch(`${context.baseUrl}${path}`',
  'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  'x-idempotency-key',
  'client_accept_denied',
  'idempotency.replay_same_payload',
  'idempotency.reject_payload_drift',
  'withdrawals.client_denied',
  '--dry-run'
].forEach((snippet) => requireSnippet('scripts/validate-staging-e2e.js', snippet));

[
  'runtime_e2e_postconditions',
  'admin_audit_events',
  'api_idempotency_keys',
  'receipts',
  'withdrawals',
  'payment_disputes'
].forEach((snippet) => requireSnippet('supabase/tests/004_runtime_e2e_postconditions.sql', snippet));

[
  'runtime_idempotency_audit',
  "status = 'succeeded'",
  'response_body is not null',
  'request_hash',
  'admin_audit_events'
].forEach((snippet) => requireSnippet('supabase/tests/005_runtime_idempotency_audit_replay_validation.sql', snippet));

[
  'Sprint 22',
  'validate:staging-e2e',
  'DOKE_STAGING_API_URL',
  'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  'supabase/tests/004_runtime_e2e_postconditions.sql',
  'Do not enable frontend API provider'
].forEach((snippet) => requireSnippet('docs/STAGING-E2E-VALIDATION.md', snippet));

requireSnippet('docs/STAGING-API-RUNTIME.md', 'Sprint 22');
requireSnippet('docs/SUPABASE-LOCAL-STAGING-VALIDATION.md', 'validate:staging-e2e');
requireSnippet('docs/API-ENDPOINT-READINESS.md', 'audit:staging-e2e-validation');
requireSnippet('docs/BACKEND-INTEGRATION-PLAN.md', 'Sprint 22');
requireSnippet('docs/DATA-READY-CONTRACTS.md', 'audit:staging-e2e-validation');
requireSnippet('docs/ACTIVE-CONTRACTS-INDEX.md', 'audit:staging-e2e-validation');
requireSnippet('docs/VALIDATION.md', 'validate:staging-e2e');
requireSnippet('backend/README.md', 'Sprint 22 staging E2E validation');

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:staging-e2e-validation'] !== 'node scripts/audit-staging-e2e-validation.js') {
  failures.push('package.json missing audit:staging-e2e-validation script.');
}
if (!packageJson.scripts || packageJson.scripts['validate:staging-e2e'] !== 'node scripts/validate-staging-e2e.js') {
  failures.push('package.json missing validate:staging-e2e script.');
}
if (!packageJson.scripts || packageJson.scripts['validate:staging-e2e:dry-run'] !== 'node scripts/validate-staging-e2e.js --dry-run') {
  failures.push('package.json missing validate:staging-e2e:dry-run script.');
}

if (failures.length) {
  console.error('audit:staging-e2e-validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:staging-e2e-validation passed');
