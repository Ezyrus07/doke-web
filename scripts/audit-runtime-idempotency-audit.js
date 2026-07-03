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

const store = requireJs('backend/shared/security/persistent-idempotency-store.js');
if (store) {
  [
    'claimIdempotencyEntry',
    'completeIdempotencyEntry',
    'failIdempotencyEntry',
    'buildIdempotencyDebugPayload'
  ].forEach((name) => {
    if (typeof store[name] !== 'function') failures.push(`persistent idempotency store missing function: ${name}`);
  });
}

const contract = requireJs('backend/shared/security/idempotency-contract.js');
if (contract) {
  if (typeof contract.buildRequestHash !== 'function') failures.push('idempotency contract missing buildRequestHash');
  if (typeof contract.stableStringify !== 'function') failures.push('idempotency contract missing stableStringify');
}

[
  'claimIdempotencyEntry(route, requestContext, actor, idempotencyKey)',
  'idempotencyClaim.replay',
  'completeIdempotencyEntry(requestContext, idempotencyClaim, result)',
  'failIdempotencyEntry(requestContext, idempotencyClaim, error)',
  'recordDefaultAuditEvent',
  'DOKE_AUDIT_STORE_UNAVAILABLE'
].forEach((snippet) => requireSnippet('backend/shared/http/create-action-handler.js', snippet));

[
  'route.idempotencyRequired',
  'route.auditRequired',
  'DOKE_SERVICE_ROLE_UNAVAILABLE',
  'routeRequiresServiceStore'
].forEach((snippet) => requireSnippet('backend/runtime/staging/staging-api-runtime.js', snippet));

[
  'DOKE_IDEMPOTENCY_CONFLICT',
  'DOKE_IDEMPOTENCY_IN_PROGRESS',
  'DOKE_IDEMPOTENCY_STORE_UNAVAILABLE',
  'api_idempotency_keys',
  'request_hash',
  'response_body'
].forEach((snippet) => requireSnippet('backend/shared/security/persistent-idempotency-store.js', snippet));

[
  'complete_idempotency_key',
  'fail_idempotency_key',
  'Idempotency key conflict',
  'idx_idempotency_key_hash'
].forEach((snippet) => requireSnippet('supabase/migrations/006_runtime_idempotency_audit_foundation.sql', snippet));

[
  'runtime_idempotency_audit',
  'response_body is not null',
  'request_hash',
  'admin_audit_events'
].forEach((snippet) => requireSnippet('supabase/tests/005_runtime_idempotency_audit_replay_validation.sql', snippet));

[
  'idempotency.replay_same_payload',
  'idempotency.reject_payload_drift',
  'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
].forEach((snippet) => requireSnippet('backend/shared/testing/staging-e2e-scenarios.js', snippet));

[
  'quoteKey',
  'idempotency.replay_same_payload',
  'idempotency.reject_payload_drift',
  'expectedStatuses: [409]'
].forEach((snippet) => requireSnippet('scripts/validate-staging-e2e.js', snippet));

[
  'Sprint 23',
  'persistent idempotency',
  'DOKE_IDEMPOTENCY_CONFLICT',
  'audit:runtime-idempotency-audit'
].forEach((snippet) => requireSnippet('docs/STAGING-E2E-VALIDATION.md', snippet));

[
  'Sprint 23',
  'persistent idempotency',
  'service-role client',
  'DOKE_AUDIT_STORE_UNAVAILABLE'
].forEach((snippet) => requireSnippet('docs/STAGING-API-RUNTIME.md', snippet));

const packageJson = JSON.parse(read('package.json') || '{}');
if (!packageJson.scripts || packageJson.scripts['audit:runtime-idempotency-audit'] !== 'node scripts/audit-runtime-idempotency-audit.js') {
  failures.push('package.json missing audit:runtime-idempotency-audit script.');
}

if (failures.length) {
  console.error('audit:runtime-idempotency-audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('audit:runtime-idempotency-audit passed');
