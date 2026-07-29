'use strict';

const assert = require('assert');
const fs = require('fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const readJson = (file) => JSON.parse(read(file));

const evidence = readJson('docs/validation/ORD-001-A05-CANARY-PREFLIGHT.json');
const a04Evidence = readJson('docs/validation/ORD-001-A04-READ-AUTHORITY.json');
const document = read('docs/ORD-001-A05-CANARY-PREFLIGHT.md');
const stagingScenarios = read('backend/shared/testing/staging-e2e-scenarios.js');
const stagingExecutor = read('scripts/execute-orders-write-canary-staging.js');

assert.strictEqual(evidence.domain, 'ORD-001');
assert.strictEqual(evidence.sublot, 'ORD-A05');
assert.strictEqual(evidence.artifact, 'canary-preflight');

assert.strictEqual(evidence.repository.pullRequest, 25);
assert.strictEqual(evidence.repository.branch, 'ord/ord-001-baseline-audit');
assert.strictEqual(evidence.repository.base, 'search/search-ux02-intent-favorites-clean');
assert.strictEqual(evidence.repository.open, true);
assert.strictEqual(evidence.repository.draft, true);
assert.strictEqual(evidence.repository.mergeable, true);
assert.strictEqual(evidence.repository.merged, false);

for (const predecessor of ['ORD-A01', 'ORD-A02', 'ORD-A03', 'ORD-A04']) {
  assert.strictEqual(evidence.validatedPredecessors[predecessor].status, 'success');
  assert(Number.isInteger(evidence.validatedPredecessors[predecessor].workflowRun));
}

assert.strictEqual(evidence.staging.orders, 0);
assert.strictEqual(evidence.staging.budgets, 0);
assert.strictEqual(evidence.staging.orderStatusHistory, 0);
assert.strictEqual(evidence.staging.domainEvents, 0);
assert.strictEqual(evidence.staging.deliveryAttempts, 0);
assert.deepStrictEqual(evidence.staging.rls, {
  orders: true,
  budgets: true,
  orderStatusHistory: true
});
assert.deepStrictEqual(evidence.staging.authenticatedDirectTablePrivileges, {
  orders: ['SELECT'],
  budgets: ['SELECT'],
  orderStatusHistory: ['SELECT']
});
assert.deepStrictEqual(evidence.staging.authenticatedCommandFunctions.sort(), [
  'public.create_order_command',
  'public.submit_order_quote_command',
  'public.transition_order_status'
].sort());

assert.deepStrictEqual(evidence.canaryIdentityContract.requiredRoles, [
  'client',
  'professional',
  'support',
  'admin'
]);
assert.strictEqual(evidence.canaryIdentityContract.dedicatedAccountsPresent, false);
assert.deepStrictEqual(evidence.canaryIdentityContract.missingRoles, [
  'client',
  'professional',
  'support',
  'admin'
]);
assert.strictEqual(evidence.canaryIdentityContract.credentialsRead, false);
assert.strictEqual(evidence.canaryIdentityContract.accountsCreated, false);
assert.strictEqual(evidence.canaryIdentityContract.accountsModified, false);

assert.strictEqual(evidence.decision.status, 'blocked_missing_dedicated_staging_canary_accounts');
assert.strictEqual(evidence.decision.canExecuteMutations, false);

for (const safetyFlag of [
  'readOnlyInspection',
  'databaseRowsCreated',
  'databaseRowsUpdated',
  'databaseRowsDeleted',
  'authUsersChanged',
  'productionChanged',
  'oauthEnabled',
  'smsEnabled',
  'paidServiceEnabled',
  'frontendWriteActivated',
  'pullRequestMerged',
  'pullRequestMarkedReady'
]) {
  const expected = safetyFlag === 'readOnlyInspection';
  assert.strictEqual(evidence.operationalSafety[safetyFlag], expected, `${safetyFlag} must remain ${expected}`);
}

assert.strictEqual(a04Evidence.authority.stagingReadProvider, 'supabase-read');
assert.strictEqual(a04Evidence.authority.silentReadFallback, false);
assert.strictEqual(a04Evidence.operationalSafety.productionChanged, false);

for (const role of ['client', 'professional', 'support', 'admin']) {
  assert(stagingScenarios.includes(`${role}: Object.freeze(`), `Missing ${role} staging identity contract.`);
}
assert(stagingExecutor.includes("const execute = args.has('--execute');"));
assert(stagingExecutor.includes("allowExecute: 'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE'"));
assert(stagingExecutor.includes('writeActivation: false'));
assert(stagingExecutor.includes('performsMutation: false'));
assert(document.includes('blocked_missing_dedicated_staging_canary_accounts'));
assert(document.includes('nenhuma policy, grant, função ou migration foi alterada'));

console.log('ORD-A05 canary preflight audit passed: mutation remains blocked until dedicated staging identities exist.');
