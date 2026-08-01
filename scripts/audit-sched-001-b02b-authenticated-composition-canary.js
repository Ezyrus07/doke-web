#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-b02b-authenticated-composition-canary-execution.json',
  attempt: 'config/sched-001-b02b-authenticated-composition-canary-attempt-2.json',
  attempt3: 'config/sched-001-b02b-authenticated-composition-canary-attempt-3.json',
  attempt4: 'config/sched-001-b02b-authenticated-composition-canary-attempt-4.json',
  attempt5: 'config/sched-001-b02b-authenticated-composition-canary-attempt-5.json',
  attempt6: 'config/sched-001-b02b-authenticated-composition-canary-attempt-6.json',
  attempt7: 'config/sched-001-b02b-authenticated-composition-canary-attempt-7.json',
  attempt8: 'config/sched-001-b02b-authenticated-composition-canary-attempt-8.json',
  attempt9: 'config/sched-001-b02b-authenticated-composition-canary-attempt-9.json',
  executor: 'scripts/execute-sched-001-b02b-authenticated-composition-canary.js',
  test: 'scripts/test-sched-001-b02b-authenticated-composition-canary.js',
  workflow: '.github/workflows/sched-001-b02b-authenticated-composition-canary.yml',
  root: 'backend/modules/scheduling/scheduling-composition-root.js'
};
Object.values(paths).forEach((file) => assert(fs.existsSync(file), `Missing B02B canary asset: ${file}`));

const config = JSON.parse(fs.readFileSync(paths.config, 'utf8'));
const executor = fs.readFileSync(paths.executor, 'utf8');
const workflow = fs.readFileSync(paths.workflow, 'utf8');
const root = fs.readFileSync(paths.root, 'utf8');

assert.strictEqual(config.target.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.target.pullRequest, 25);
assert.strictEqual(config.target.branch, 'ord/ord-001-baseline-audit');
assert.strictEqual(config.target.pullRequestMustRemainOpen, true);
assert.strictEqual(config.target.pullRequestMustRemainDraft, true);
assert.strictEqual(config.target.autoMergeMustRemainDisabled, true);
assert.strictEqual(config.transaction.finalStatement, 'rollback');
assert.strictEqual(config.transaction.commitAllowed, false);
assert.strictEqual(config.transaction.persistentCanaryRowsAllowed, 0);
assert.deepStrictEqual(config.allowedSecrets, ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD']);
assert.strictEqual(config.syntheticPersonas.source, 'transaction_scoped_auth_and_public_projections');
assert.strictEqual(config.syntheticPersonas.emailDomain, 'example.invalid');
assert.strictEqual(config.syntheticPersonas.persistentRowsAllowed, 0);
assert.deepStrictEqual(config.syntheticPersonas.roles, {
  client: 'client', professional: 'professional', support: 'support', admin: 'admin'
});

[
  'createSchedulingCompositionRoot',
  'evaluateSchedulingRuntimeActivation',
  "await connection.client.query('begin isolation level serializable')",
  "await connection.client.query('rollback')",
  'createTransactionalCanaryPool',
  'savepoint',
  'release savepoint',
  'rollback to savepoint',
  'verifyPullRequestGate',
  'verifyProjectGate',
  'loadResidueCounts',
  'assertZeroCounts',
  'assertEqualCounts'
].forEach((fragment) => assert(executor.includes(fragment), `Executor missing ${fragment}`));

assert(executor.includes("report.postRollbackVerification = 'passed'"));
assert(executor.includes("report.executionStage = 'transactional_fixture_provisioning'"));
assert(executor.includes("reportProgress('composition_professional')"));
assert(executor.includes("position('pg_catalog.coalesce'"));
assert(executor.includes("'23503': 'foreign_key_violation'"));

assert(executor.includes('provisionTransactionalFixtures'));
assert(executor.includes('insert into auth.users'));
assert(executor.includes('insert into public.service_versions'));
assert(executor.includes("'sched-b02b-canary-%@example.invalid'"));

assert(!executor.includes("connection.client.query('commit')"));
assert(!executor.includes('supabase migration'));
assert(!executor.includes('SUPABASE_SERVICE_ROLE_KEY'));
assert(!executor.includes('production.supabase'));
assert(root.includes("const STAGING_PROJECT_REF = 'zwkczgewzbsorbrjuzpb'"));
assert(root.includes("if (nodeEnvironment === 'production' || environment === 'production')"));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes("branches:\n      - ord/ord-001-baseline-audit"));
assert(workflow.includes('--diff-filter=A'));
assert(workflow.includes('attempt-[0-9]+'));
assert(workflow.includes("needs.authorize.outputs.execute == 'true'"));
assert(workflow.includes('SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}'));
assert(workflow.includes('SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('pull-requests: write'));
assert(!workflow.includes('supabase db push'));
assert(!workflow.includes('supabase migration'));

console.log('SCHED-B02B authenticated composition canary audit passed.');
