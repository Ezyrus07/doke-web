#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (message) => { console.error('[CAT-A03] ' + message); process.exitCode = 1; };
const assert = (condition, message) => { if (!condition) fail(message); };

const files = {
  operations: 'supabase/functions/self-service-operations/operations.mjs',
  migration: 'supabase/migrations/149_service_lifecycle_authority.sql',
  sqlTest: 'supabase/tests/018_service_lifecycle_authority_validation.sql',
  repository: 'assets/js/repositories/services-repository.js',
  service: 'assets/js/services/services-service.js',
  runtime: 'scripts/test-service-lifecycle-authority-runtime.js',
  catA02: 'docs/validation/CAT-001-A02-SERVICE-AUTHORITY-RETIREMENT.json',
  evidenceJson: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.json',
  evidenceMarkdown: 'docs/validation/CAT-001-A03-SERVICE-LIFECYCLE-AUTHORITY.md',
  quality: '.github/workflows/quality.yml'
};
Object.values(files).forEach((file) => assert(exists(file), 'required file missing: ' + file));

const operations = read(files.operations);
assert(operations.includes("'transition_owned_service_lifecycle'"), 'self-service allowlist missing lifecycle operation');

const migration = read(files.migration);
[
  'create or replace function public.transition_owned_service_lifecycle',
  "v_action not in ('pause', 'reactivate', 'archive')",
  'SERVICE_OWNERSHIP_REQUIRED',
  'SERVICE_REACTIVATE_TRANSITION_INVALID',
  'approved_version_id is null',
  'revoke all on function public.transition_owned_service_lifecycle',
  'to service_role',
  'revoke insert, update, delete on table public.services from anon, authenticated',
  "when 'transition_owned_service_lifecycle' then",
  'execute_self_service_operation_internal_pre_cat_a03'
].forEach((marker) => assert(migration.includes(marker), 'migration marker missing: ' + marker));
assert(!/grant\s+execute\s+on\s+function\s+public\.transition_owned_service_lifecycle[\s\S]*?\s+to\s+(?:anon|authenticated)\b/i.test(migration), 'browser roles cannot execute lifecycle function directly');

const repository = read(files.repository);
[
  "invokeSelfService('transition_owned_service_lifecycle'",
  'DOKE_SERVICE_DIRECT_MUTATION_FORBIDDEN',
  'transitionOwnedLifecycle: transitionOwnedLifecycle'
].forEach((marker) => assert(repository.includes(marker), 'repository marker missing: ' + marker));
[
  'function saveRemote(service)',
  "upsert(payload, { onConflict: 'external_id' })"
].forEach((marker) => assert(!repository.includes(marker), 'direct catalog mutation remains: ' + marker));

const service = read(files.service);
[
  'repository.transitionOwnedLifecycle',
  'repository.submitForReview(candidate',
  'DOKE_SERVICE_MUTATION_SPLIT_REQUIRED',
  'DOKE_SERVICE_ARCHIVED'
].forEach((marker) => assert(service.includes(marker), 'service marker missing: ' + marker));
assert(!service.includes('return repository.update(serviceId, patch || {})'), 'generic remote edit path remains');

const runtime = read(files.runtime);
[
  "['pause', 'reactivate', 'archive']",
  'generic remote table mutation is fail-closed',
  'submitForReview'
].forEach((marker) => assert(runtime.includes(marker), 'runtime marker missing: ' + marker));

const sqlTest = read(files.sqlTest);
[
  'CAT_A03_DIRECT_BROWSER_GRANT',
  'CAT_A03_SERVICE_ROLE_GRANT_MISSING',
  'CAT_A03_DIRECT_SERVICE_WRITE_GRANT',
  'CAT_A03_DISPATCHER_ROUTE_MISSING',
  'rollback;'
].forEach((marker) => assert(sqlTest.includes(marker), 'SQL validation marker missing: ' + marker));

const catA02 = JSON.parse(read(files.catA02));
assert(catA02.status === 'done' && catA02.validation.finalEvidence === 'success', 'CAT-A02 must remain done before CAT-A03');

const evidence = JSON.parse(read(files.evidenceJson));
assert(evidence.domain === 'CAT-001' && evidence.sublot === 'CAT-A03', 'CAT-A03 evidence identity invalid');
assert(['implementation_in_progress', 'validation_pending', 'done'].includes(evidence.status), 'CAT-A03 status invalid');
assert(evidence.safety.productionChanged === false, 'CAT-A03 cannot change production');
assert(evidence.safety.realAccountChanged === false, 'CAT-A03 cannot change real accounts');
if (evidence.status === 'done') {
  ['staticAudit','runtimeAuthority','sqlValidation','quality','blockingE2E','visualStructuralGuards','stagingCanary','diagnostic','finalEvidence'].forEach((field) => {
    assert(evidence.validation[field] === 'success', 'DONE requires validation.' + field + '=success');
  });
  assert(evidence.safety.temporaryWorkflowRemaining === false, 'DONE cannot leave temporary workflow');
  assert(evidence.safety.temporaryCodemodRemaining === false, 'DONE cannot leave temporary codemod');
  assert(read(files.evidenceMarkdown).includes('DONE'), 'DONE human evidence marker missing');
}

const quality = read(files.quality);
[
  'Audit CAT-A03 service lifecycle authority',
  'node scripts/audit-service-lifecycle-authority.js',
  'Test CAT-A03 service lifecycle authority runtime',
  'node scripts/test-service-lifecycle-authority-runtime.js'
].forEach((marker) => assert(quality.includes(marker), 'Quality marker missing: ' + marker));

if (!process.exitCode) {
  console.log('[CAT-A03] edits use versioned moderation instead of generic table updates.');
  console.log('[CAT-A03] lifecycle transitions use one owner-only server authority.');
  console.log('[CAT-A03] browser roles lost direct services write grants.');
}
