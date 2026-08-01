#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-a04-server-command-runtime.json';
const DOC_PATH = 'docs/SCHED-001-A04-SERVER-COMMAND-RUNTIME.md';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-A04-SERVER-COMMAND-RUNTIME.json';
const SERVICE_PATH = 'backend/modules/scheduling/scheduling-service.js';
const HANDLERS_PATH = 'backend/modules/scheduling/scheduling-command-handlers.js';
const PORT_PATH = 'backend/modules/scheduling/scheduling-repository-port.js';
const TIMEZONE_PATH = 'backend/modules/scheduling/scheduling-timezone.js';
const NORMALIZATION_PATH = 'backend/modules/scheduling/scheduling-normalization.js';
const ERRORS_PATH = 'backend/modules/scheduling/scheduling-errors.js';
const TEST_PATH = 'scripts/test-sched-001-a04-scheduling-service-runtime.js';
const COMPAT_MIGRATION_PATH = 'supabase/migrations/20260731151000_sched_a04_dst_local_projection_compatibility.sql';
const WORKFLOW_PATH = '.github/workflows/sched-001-a04-server-command-runtime.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';
const PACKAGE_PATH = 'package.json';

const REQUIRED_PATHS = [
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  SERVICE_PATH,
  HANDLERS_PATH,
  PORT_PATH,
  TIMEZONE_PATH,
  NORMALIZATION_PATH,
  ERRORS_PATH,
  TEST_PATH,
  COMPAT_MIGRATION_PATH,
  WORKFLOW_PATH
];

[...REQUIRED_PATHS, MATRIX_PATH, PACKAGE_PATH]
  .forEach((file) => assert(fs.existsSync(file), `Missing SCHED-A04 asset: ${file}`));

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const service = fs.readFileSync(SERVICE_PATH, 'utf8');
const handlers = fs.readFileSync(HANDLERS_PATH, 'utf8');
const port = fs.readFileSync(PORT_PATH, 'utf8');
const timezone = fs.readFileSync(TIMEZONE_PATH, 'utf8');
const normalization = fs.readFileSync(NORMALIZATION_PATH, 'utf8');
const errors = fs.readFileSync(ERRORS_PATH, 'utf8');
const test = fs.readFileSync(TEST_PATH, 'utf8');
const compatibilityMigration = fs.readFileSync(COMPAT_MIGRATION_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');

const compareVersions = (left, right) => {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
};

assert.strictEqual(config.contractVersion, 'sched-a04-server-command-runtime-v1');
assert.strictEqual(config.status, 'repository_server_command_runtime_complete_transactional_adapter_and_staging_pending');
assert.strictEqual(config.domain, 'SCHED-001');
assert.strictEqual(config.scope, 'repository_only_server_command_runtime');
assert.strictEqual(config.authority.browserCommandExecutionAllowed, false);
assert.strictEqual(config.authority.professionalDirectBookingAllowed, false);
assert.strictEqual(config.authority.orderParallelSchedulingAuthorityAllowed, false);
assert.strictEqual(config.commands.count, 6);
assert.deepStrictEqual(config.commands.names, [
  'upsert_availability_rule',
  'create_schedule_hold',
  'confirm_schedule_reservation',
  'reschedule_reservation',
  'cancel_schedule_reservation',
  'expire_schedule_holds'
]);
assert.strictEqual(config.commands.allUseOneRepositoryTransaction, true);
assert.strictEqual(config.commands.allRequireIdempotencyKey, true);
assert.strictEqual(config.repositoryPort.supabaseClientCoupled, false);
assert.strictEqual(config.repositoryPort.networkCoupled, false);
assert.strictEqual(config.repositoryPort.transactionCallbackRequired, true);
assert.strictEqual(config.repositoryPort.requiredMethods.length, 15);
assert.strictEqual(config.idempotency.sameKeyDifferentPayload, 'DOKE_SCHEDULE_IDEMPOTENCY_CONFLICT');
assert.strictEqual(config.idempotency.sameKeyInProgress, 'DOKE_SCHEDULE_IDEMPOTENCY_IN_PROGRESS');
assert.strictEqual(config.idempotency.claimAndCompletionInsideCommandTransaction, true);
assert.strictEqual(config.idempotency.failedCommandRollsBackClaim, true);
assert.strictEqual(config.time.canonicalRange, 'UTC starts_at/ends_at');
assert.strictEqual(config.time.rangeConvention, '[start,end)');
assert.strictEqual(config.time.nonexistentLocalTimeRejected, true);
assert.strictEqual(config.time.ambiguousLocalTimeAcceptedOnlyWithMatchingUtcAndOffset, true);
assert.strictEqual(config.time.dstFallbackLocalOrderingIsAuthority, false);
assert.strictEqual(config.compatibilityMigration.applied, false);
assert.strictEqual(config.compatibilityMigration.stagingAuthorized, false);
assert.strictEqual(config.transactionality.rollbackOnAnyFailure, true);
assert.strictEqual(config.conflict.adjacentRangesAllowed, true);
assert.strictEqual(config.conflict.postgresExclusionSqlState, '23P01');
assert.strictEqual(config.orderIntegration.scheduledAtRemainsReadProjection, true);
assert.strictEqual(config.orderIntegration.ordersRuntimeWired, false);
assert.deepStrictEqual(config.blockerDisposition, {
  'SCHED-B02': 'command_runtime_implemented_transactional_persistence_adapter_and_activation_pending',
  'SCHED-B03': 'local_conflict_runtime_and_sqlstate_mapping_proven_application_and_remote_concurrency_pending',
  'SCHED-B04': 'order_projection_port_implemented_schema_application_and_orders_wiring_pending',
  'SCHED-B05': 'server_actor_boundary_implemented_legacy_policy_hardening_application_pending'
});
Object.values(config.forbidden).forEach((value) => assert.strictEqual(value, true));
Object.entries(config.evidence).forEach(([key, value]) => {
  if (key === 'productionChanged' || key === 'pullRequestMerged') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.runtime.commandCount, 6);
assert.strictEqual(evidence.runtime.transactionalRepositoryPort, true);
assert.strictEqual(evidence.runtime.supabaseCoupled, false);
assert.strictEqual(evidence.proof.allCommandsCovered, true);
assert.strictEqual(evidence.proof.eventFailureRollbackCovered, true);
assert.strictEqual(evidence.timezone.nonexistentLocalTimeRejected, true);
assert.strictEqual(evidence.timezone.dstFallbackCrossingCovered, true);
assert.strictEqual(evidence.compatibilityMigration.generated, true);
assert.strictEqual(evidence.compatibilityMigration.applied, false);
assert.strictEqual(evidence.compatibilityMigration.dropsInvalidConstraint, 'schedule_reservations_local_range');
assert.strictEqual(evidence.transactionality.failureRollsBackAll, true);
assert.deepStrictEqual(evidence.blockers.closed, []);
assert.deepStrictEqual(evidence.blockers.remainingOpen, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsApplied, 0);

[
  'repository.transaction',
  'claimIdempotency',
  'completeIdempotency',
  "execute('upsert_availability_rule'",
  "execute('create_schedule_hold'",
  "execute('confirm_schedule_reservation'",
  "execute('reschedule_reservation'",
  "execute('cancel_schedule_reservation'",
  "execute('expire_schedule_holds'"
].forEach((fragment) => assert(service.includes(fragment), `Service missing ${fragment}`));

[
  'async function upsertAvailabilityRule',
  'async function createScheduleHold',
  'async function confirmScheduleReservation',
  'async function rescheduleReservation',
  'async function cancelScheduleReservation',
  'async function expireScheduleHolds',
  'tx.projectOrderSchedule',
  'tx.clearOrderSchedule',
  'tx.insertEvent',
  'contract.assertNoActiveConflict',
  'contract.assertExpectedVersion',
  'contract.isHoldExpired'
].forEach((fragment) => assert(handlers.includes(fragment), `Handlers missing ${fragment}`));

config.repositoryPort.requiredMethods.forEach((method) => {
  assert(port.includes(`'${method}'`), `Repository port missing ${method}`);
});
assert(port.includes("code === '23P01'"));
assert(port.includes('schedule_reservations_no_active_overlap'));
assert(port.includes('DOKE_SCHEDULE_CONFLICT') || port.includes('contract.ERROR_CODES.conflict'));

[
  "new Intl.DateTimeFormat('en-US'",
  "new Intl.DateTimeFormat('en-CA'",
  'expectedLocalStart',
  'expectedLocalEnd',
  'expectedOffsetMinutes',
  'endOffsetMinutes'
].forEach((fragment) => assert(timezone.includes(fragment), `Timezone module missing ${fragment}`));

[
  "crypto.createHash('sha256')",
  'stableStringify',
  'normalizeCommandPayload',
  'Object.keys(value).sort()',
  'freezeResult'
].forEach((fragment) => assert(normalization.includes(fragment), `Normalization missing ${fragment}`));

[
  'DOKE_SCHEDULE_IDEMPOTENCY_IN_PROGRESS',
  'DOKE_SCHEDULE_TIMEZONE_INVALID',
  'DOKE_SCHEDULE_TIMEZONE_RESOLUTION_MISMATCH'
].forEach((fragment) => assert(errors.includes(fragment), `Errors missing ${fragment}`));

const runtimeSources = [service, handlers, port, timezone, normalization, errors].join('\n');
[
  'fetch(',
  'supabase.',
  "require('@supabase",
  'process.env',
  'window.',
  'document.',
  'localStorage',
  'sessionStorage'
].forEach((fragment) => assert(!runtimeSources.includes(fragment), `Runtime external coupling detected: ${fragment}`));

[
  'hold-overlap',
  'hold-adjacent',
  'rule-create-1',
  'confirm-expired',
  'synthetic event failure',
  'hold-ambiguous-early',
  'hold-ambiguous-late',
  'hold-bad-timezone',
  'hold-unavailable',
  'hold-terminal-order',
  '23P01'
].forEach((fragment) => assert(test.includes(fragment), `Runtime test missing ${fragment}`));

const normalizedMigration = compatibilityMigration.toLowerCase();
assert(normalizedMigration.includes('begin;'));
assert(normalizedMigration.includes('set local search_path = pg_catalog, public, private, extensions'));
assert(normalizedMigration.includes('drop constraint if exists schedule_reservations_local_range'));
assert(normalizedMigration.includes('utc starts_at/ends_at are the canonical ordered range'));
assert(normalizedMigration.includes('commit;'));
assert(!normalizedMigration.includes('supabase db push'));
assert(!normalizedMigration.includes('apply_migration'));
assert(!normalizedMigration.includes('cron.'));
assert(!normalizedMigration.includes('net.http'));

[
  'transaction-capable repository port',
  'same key and different payload',
  'DOKE_SCHEDULE_IDEMPOTENCY_IN_PROGRESS',
  'UTC `starts_at` and `ends_at` remain the only ordering authority',
  'daylight-saving fall-back',
  'schedule_reservations_local_range',
  'synthetic event failure',
  'SCHED-A05 — Transactional Persistence Adapter and Staging Migration Readiness, Rollback and Compatibility Gate',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing ${fragment}`));

assert(compareVersions(matrix.version, '1.3.47') >= 0, `Matrix version ${matrix.version} predates SCHED-A04.`);
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord, 'ORD-001 or SCHED-001 missing from matrix.');
assert(['contract_only', 'partial'].includes(sched.serverAuthority));
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert(config.orderedNextActions[0].includes('SCHED-A05'));
const postB04Closure = compareVersions(matrix.version, '1.3.70') >= 0 && sched.maturity >= 3;
const postB02B = compareVersions(matrix.version, '1.3.63') >= 0 && sched.maturity >= 3;
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postB04Closure) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), []);
  assert(sched.nextActions[0].includes('frontend'));
  assert(ord.evidence.some((item) => item.includes('run 30716088197')));
} else if (postB02B) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-B04') || sched.nextActions[0].includes('ORD-001'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  if (Number(String(matrix.version).split('.')[2] || 0) >= 51) {
    assert(sched.nextActions[0].includes('authenticated staging composition canary'));
  } else {
    assert(sched.nextActions[0].includes('trusted server composition root'));
  }
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}
REQUIRED_PATHS.forEach((path) => {
  assert(sched.requiredPaths.includes(path), `SCHED matrix missing ${path}`);
  assert(ord.requiredPaths.includes(path), `ORD matrix missing ${path}`);
});
assert(sched.tests.includes('audit:sched-001-a04-server-command-runtime'));
assert(sched.tests.includes('test:sched-001-a04-scheduling-service-runtime'));
assert(ord.tests.includes('audit:sched-001-a04-server-command-runtime'));
assert.strictEqual(
  pkg.scripts['audit:sched-001-a04-server-command-runtime'],
  'node scripts/audit-sched-001-a04-server-command-runtime.js'
);
assert.strictEqual(
  pkg.scripts['test:sched-001-a04-scheduling-service-runtime'],
  'node scripts/test-sched-001-a04-scheduling-service-runtime.js'
);

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-a04-server-command-runtime.js'));
assert(workflow.includes('node scripts/test-sched-001-a04-scheduling-service-runtime.js'));
assert(workflow.includes('node scripts/audit-sched-001-a03-reservation-migration-local-contract.js'));
assert(workflow.includes('node scripts/test-sched-001-a03-reservation-migration-static.js'));
assert(workflow.includes('node scripts/audit-domain-completion-matrix.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('apply_migration'));
assert(!workflow.includes('--execute'));

console.log('SCHED-A04 server scheduling command runtime audit passed.');
