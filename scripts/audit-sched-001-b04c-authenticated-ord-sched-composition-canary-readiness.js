#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.json',
  docs: 'docs/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-READINESS.md',
  evidence: 'docs/validation/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-READINESS.json',
  audit: 'scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js',
  test: 'scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js',
  workflow: '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.yml',
  b04bAuthority: 'backend/modules/orders/order-scheduling-authority.js',
  orders: 'backend/modules/orders/orders-service.js',
  schedulingHandlers: 'backend/modules/scheduling/scheduling-command-handlers.js',
  schedulingRepository: 'backend/modules/scheduling/scheduling-postgres-repository.js',
  matrix: 'config/domain-completion-matrix.json',
  package: 'package.json'
});

Object.values(PATHS).forEach((file) => assert(fs.existsSync(file), `Missing B04C readiness asset: ${file}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PATHS.package, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');
const authority = fs.readFileSync(PATHS.b04bAuthority, 'utf8');
const orders = fs.readFileSync(PATHS.orders, 'utf8');
const handlers = fs.readFileSync(PATHS.schedulingHandlers, 'utf8');
const repository = fs.readFileSync(PATHS.schedulingRepository, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-b04c-authenticated-ord-sched-composition-canary-readiness-v1');
assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(config.scope, 'repository_only_authenticated_ord_sched_composition_canary_readiness');
assert.strictEqual(config.environment, 'doke-web-staging');
assert.strictEqual(config.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.authorization.requiredExactPhrase, 'I_EXPLICITLY_AUTHORIZE_SCHED_B04C_AUTHENTICATED_ORD_SCHED_COMPOSITION_CANARIES_ON_DOKE_STAGING');
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.runtimeGate.failClosed, true);
assert.strictEqual(config.runtimeGate.poolMustBeInjected, true);
assert.strictEqual(config.runtimeGate.browserExecutionForbidden, true);
assert.strictEqual(config.syntheticFixture.transactionScopedOnly, true);
assert.strictEqual(config.syntheticFixture.realUserDataAllowed, false);
assert.strictEqual(config.syntheticFixture.persistentRowsAllowed, 0);
assert.strictEqual(config.transaction.isolation, 'SERIALIZABLE');
assert.strictEqual(config.transaction.finalStatement, 'ROLLBACK');
assert.strictEqual(config.transaction.commitForbidden, true);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.databaseMutationAvailable, false);
assert.deepStrictEqual(config.blockers.remainingOpen, ['SCHED-B04', 'ORD-B04']);
assert.deepStrictEqual(evidence.blockers.remainingOpen, config.blockers.remainingOpen);
assert.strictEqual(evidence.effects.stagingReads, 0);
assert.strictEqual(evidence.effects.stagingMutations, 0);
assert.strictEqual(evidence.effects.productionAccess, 0);
assert.strictEqual(evidence.effects.mergePerformed, false);

const requiredAssertions = new Set(config.crossDomainAssertions);
[
  'raw_scheduled_at_never_grants_authority',
  'hold_does_not_schedule_order',
  'confirmed_reservation_sets_reference_time_and_scheduled_status',
  'reschedule_keeps_same_reservation_id_and_updates_time',
  'reservation_cancel_clears_reference_time_and_restores_accepted',
  'start_requires_confirmed_matching_reservation',
  'partial_projection_rolls_back',
  'transaction_rolled_back',
  'zero_canary_residue'
].forEach((item) => assert(requiredAssertions.has(item), `Missing B04C assertion: ${item}`));

[
  'I_EXPLICITLY_AUTHORIZE_SCHED_B04C_AUTHENTICATED_ORD_SCHED_COMPOSITION_CANARIES_ON_DOKE_STAGING',
  'SERIALIZABLE',
  'savepoint',
  'ROLLBACK',
  'Dados reais de usuários são proibidos',
  '`SCHED-B04` e `ORD-B04` permanecem abertos'
].forEach((fragment) => assert(docs.includes(fragment), `B04C documentation missing: ${fragment}`));

[
  'scheduleReservationId',
  'hasCanonicalSchedule',
  'incomplete_projection'
].forEach((fragment) => assert(authority.includes(fragment) || orders.includes(fragment), `B04B authority prerequisite missing: ${fragment}`));
assert(orders.includes('p_scheduled_at: null'));
assert(handlers.includes('projectOrderSchedule'));
assert(handlers.includes('clearOrderSchedule'));

const delegatesProjectionToB04D =
  repository.includes('private.apply_order_schedule_projection')
  && repository.includes('private.clear_order_schedule_projection');
if (delegatesProjectionToB04D) {
  assert(repository.includes('/* sched-a05:project-order-schedule */'));
  assert(repository.includes('private.apply_order_schedule_projection'));
  assert(repository.includes('/* sched-a05:clear-order-schedule */'));
  assert(repository.includes('private.clear_order_schedule_projection'));
  const projectStart = repository.indexOf('async projectOrderSchedule(');
  const clearStart = repository.indexOf('async clearOrderSchedule(', projectStart + 1);
  const expiredStart = repository.indexOf('async listExpiredHolds(', clearStart + 1);
  assert(projectStart >= 0 && clearStart > projectStart && expiredStart > clearStart);
  assert(!repository.slice(projectStart, clearStart).includes('update public.orders'));
  assert(!repository.slice(clearStart, expiredStart).includes('update public.orders'));
} else {
  assert(repository.includes("status = 'scheduled'"));
  assert(repository.includes("status = case when status = 'scheduled' then 'accepted' else status end"));
}

assert.strictEqual(pkg.scripts['audit:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'], 'node scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js');
assert.strictEqual(pkg.scripts['test:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'], 'node scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-readiness.js');

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord, 'SCHED-001 or ORD-001 missing from matrix');
assert(sched.requiredPaths.includes(PATHS.config));
assert(sched.requiredPaths.includes(PATHS.evidence));
assert(ord.requiredPaths.includes(PATHS.config));
assert(sched.tests.includes('audit:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'));
assert(ord.tests.includes('test:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
assert(ord.blockers.some((blocker) => blocker.id === 'ORD-B04'));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('npm run audit:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'));
assert(workflow.includes('npm run test:sched-001-b04c-authenticated-ord-sched-composition-canary-readiness'));
[
  'contents: write',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'DATABASE_URL',
  'psql ',
  'supabase ',
  'curl ',
  'git push',
  '--execute'
].forEach((fragment) => assert(!workflow.includes(fragment), `Readiness workflow contains forbidden fragment: ${fragment}`));

console.log('SCHED-B04C authenticated ORD/SCHED composition canary readiness audit passed.');
