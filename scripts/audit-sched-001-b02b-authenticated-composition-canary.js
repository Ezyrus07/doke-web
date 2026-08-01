#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const paths = {
  config: 'config/sched-001-b02b-authenticated-composition-canary-execution.json',
  attempt: 'config/sched-001-b02b-authenticated-composition-canary-attempt-2.json',
  attempt3: 'config/sched-001-b02b-authenticated-composition-canary-attempt-3.json',
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
assert.strictEqual(config.syntheticPersonas.requiredEmailDomain, 'doke.local');
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

assert(executor.includes('from public.users app_user'));
assert(!executor.includes('from auth.users auth_user'));

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
