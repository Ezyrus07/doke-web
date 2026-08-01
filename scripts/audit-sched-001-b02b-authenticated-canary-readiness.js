#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-b02b-authenticated-composition-canary-readiness.json',
  docs: 'docs/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY-READINESS.md',
  evidence: 'docs/validation/SCHED-001-B02B-AUTHENTICATED-COMPOSITION-CANARY-READINESS.json',
  test: 'scripts/test-sched-001-b02b-authenticated-canary-readiness.js',
  root: 'backend/modules/scheduling/scheduling-composition-root.js',
  workflow: '.github/workflows/sched-001-b02b-authenticated-canary-readiness.yml'
};

Object.values(paths).forEach((path) => assert(fs.existsSync(path), `Missing SCHED-B02B asset: ${path}`));

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(paths.evidence, 'utf8'));
const docs = fs.readFileSync(paths.docs, 'utf8');
const root = fs.readFileSync(paths.root, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8').replace(/\r\n/g, '\n');

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.result, 'ready_not_executed');
assert.strictEqual(evidence.stagingReads, 0);
assert.strictEqual(evidence.stagingMutations, 0);
assert.strictEqual(evidence.runtimeActivations, 0);
assert.strictEqual(evidence.authenticatedCanariesExecuted, 0);
assert.strictEqual(evidence.productionAccess, 0);
assert.strictEqual(evidence.deployments, 0);
assert.strictEqual(evidence.mergePerformed, false);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B04']);

[
  'DOKE_SCHEDULING_RUNTIME_ENABLED',
  'DOKE_RUNTIME_ENVIRONMENT',
  'SUPABASE_PROJECT_REF',
  'DOKE_SCHEDULE_RUNTIME_DISABLED'
].forEach((fragment) => assert(root.includes(fragment), `Composition root missing ${fragment}`));

[
  'I_EXPLICITLY_AUTHORIZE_SCHED_B02B_AUTHENTICATED_COMPOSITION_CANARIES_ON_DOKE_STAGING',
  'Um comando genérico como `Próximo` não autoriza',
  'rollback integral',
  'zero resíduos',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-b02b-authenticated-canary-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-b02b-authenticated-canary-readiness.js'));
assert(workflow.includes('node scripts/audit-sched-001-b02-composition-root-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-b02-composition-root-runtime.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('SUPABASE_DB_PASSWORD'));
assert(!workflow.includes('SUPABASE_ACCESS_TOKEN'));
assert(!workflow.includes('service_role'));
assert(!workflow.includes('psql '));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));

console.log('SCHED-B02B authenticated composition canary readiness audit passed.');
