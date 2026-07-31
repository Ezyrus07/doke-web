#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/sched-001-a01-repository-baseline-staging-security-preflight.json';
const DOC_PATH = 'docs/SCHED-001-A01-REPOSITORY-BASELINE-STAGING-SECURITY-PREFLIGHT.md';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-A01-REPOSITORY-BASELINE-STAGING-SECURITY-PREFLIGHT.json';
const WORKFLOW_PATH = '.github/workflows/sched-001-a01-repository-baseline-staging-security-preflight.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';
const RLS_PATH = 'supabase/migrations/113_availability_reviews_authority.sql';
const ROLE_PATH = 'supabase/migrations/119_public_policy_role_separation.sql';
const ORDER_SERVICE_PATH = 'backend/modules/orders/orders-service.js';

[
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  WORKFLOW_PATH,
  MATRIX_PATH,
  RLS_PATH,
  ROLE_PATH,
  ORDER_SERVICE_PATH,
  'package.json'
].forEach((file) => assert(fs.existsSync(file), `Missing SCHED-A01 asset: ${file}`));

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const rls = fs.readFileSync(RLS_PATH, 'utf8');
const roleSeparation = fs.readFileSync(ROLE_PATH, 'utf8');
const orderService = fs.readFileSync(ORDER_SERVICE_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'sched-a01-repository-baseline-staging-security-preflight-v1');
assert.strictEqual(config.status, 'read_only_staging_security_preflight_complete_foundational_authority_incomplete');
assert.strictEqual(config.domain, 'SCHED-001');
assert.strictEqual(config.sourceHandoff, 'ORD-A11');
assert.strictEqual(config.staging.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(config.staging.readOnly, true);
assert.strictEqual(config.authorizationBoundary.genericContinuationAuthorizedReadOnlyInspection, true);
[
  'genericContinuationAuthorizesDdl',
  'genericContinuationAuthorizesDml',
  'genericContinuationAuthorizesMigrationApplication',
  'genericContinuationAuthorizesDeployment',
  'genericContinuationAuthorizesProduction',
  'genericContinuationAuthorizesMerge'
].forEach((key) => assert.strictEqual(config.authorizationBoundary[key], false));

assert.strictEqual(config.stagingFindings.table.exists, true);
assert.strictEqual(config.stagingFindings.table.rlsEnabled, true);
assert.strictEqual(config.stagingFindings.table.forceRls, false);
assert.strictEqual(config.stagingFindings.table.rowCount, 0);
assert.deepStrictEqual(config.stagingFindings.appliedMigrations, [
  { version: '20260722161200', name: 'availability_reviews_authority' },
  { version: '20260722162204', name: 'public_policy_role_separation' }
]);
assert.deepStrictEqual(config.stagingFindings.policies, [
  'availability_slots_anon_select',
  'availability_slots_authenticated_select',
  'availability_slots_owner_insert',
  'availability_slots_owner_update',
  'availability_slots_owner_delete'
]);
assert.deepStrictEqual(config.stagingFindings.grants.anon, ['SELECT']);
assert.deepStrictEqual(config.stagingFindings.grants.authenticated, ['SELECT', 'INSERT', 'UPDATE', 'DELETE']);
assert.strictEqual(config.confirmedSecurityState.publicTableGrantAbsent, true);
assert.strictEqual(config.confirmedSecurityState.invalidRangeCheckPresent, true);

const gaps = config.authorityAndConcurrencyGaps;
assert.strictEqual(gaps.availabilityAndReservationConflated, true);
assert.strictEqual(gaps.ownerUpdatePolicyCanSetBooked, true);
assert.strictEqual(gaps.statusTransitionTriggerExists, false);
assert.strictEqual(gaps.canonicalReservationTableExists, false);
assert.strictEqual(gaps.canonicalHoldTableExists, false);
assert.strictEqual(gaps.activeRangeExclusionConstraintExists, false);
assert.strictEqual(gaps.btreeGistExtensionInstalled, false);
assert.strictEqual(gaps.timezoneColumnExists, false);
assert.strictEqual(gaps.orderIdColumnExists, false);
assert.strictEqual(gaps.expiresAtColumnExists, false);
assert.strictEqual(gaps.idempotencyKeyColumnExists, false);
assert.strictEqual(gaps.updatedAtColumnExists, false);
assert.strictEqual(gaps.optimisticVersionColumnExists, false);
assert.strictEqual(gaps.ordersScheduleReservationIdExists, false);

assert.strictEqual(config.blockerDisposition['SCHED-B01'].status, 'closed_by_read_only_staging_verification');
assert.strictEqual(config.blockerDisposition['SCHED-B02'].status, 'open');
assert.strictEqual(config.blockerDisposition['SCHED-B03'].status, 'open');
assert.strictEqual(config.blockerDisposition['SCHED-B04'].status, 'open');
assert.strictEqual(config.blockerDisposition['SCHED-B05'].status, 'open_new');
assert.strictEqual(config.orderedNextActions.length, 4);
assert.strictEqual(config.evidence.readOnlySqlQueriesExecuted, 2);
assert.strictEqual(config.evidence.stagingReadsPerformed, 2);
assert.strictEqual(config.evidence.stagingMutationsPerformed, 0);
assert.strictEqual(config.evidence.migrationsApplied, 0);
assert.strictEqual(config.evidence.deploymentsPerformed, 0);
assert.strictEqual(config.evidence.productionChanged, false);
assert.strictEqual(config.evidence.pullRequestMerged, false);

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.schema.rlsEnabled, true);
assert.strictEqual(evidence.policies.count, 5);
assert.strictEqual(evidence.policies.ownerUpdateCanSetBooked, true);
assert.strictEqual(evidence.grants.publicGrantPresent, false);
assert.deepStrictEqual(evidence.blockers.closed, ['SCHED-B01']);
assert.deepStrictEqual(evidence.blockers.open, ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);
assert.deepStrictEqual(evidence.blockers.new, ['SCHED-B05']);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsApplied, 0);

assert(rls.includes('alter table public.availability_slots enable row level security'));
assert(rls.includes('availability_slots_owner_insert'));
assert(rls.includes('availability_slots_owner_update'));
assert(rls.includes('availability_slots_owner_delete'));
assert(roleSeparation.includes('availability_slots_anon_select'));
assert(roleSeparation.includes('availability_slots_authenticated_select'));
assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));

assert.strictEqual(matrix.version, '1.3.44');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
assert(ord, 'ORD-001 missing from matrix');
assert(sched, 'SCHED-001 missing from matrix');
assert.strictEqual(sched.maturity, 1);
assert.strictEqual(sched.serverAuthority, 'none');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B05' && blocker.category === 'reservation_status_authority'));
assert.deepStrictEqual(sched.nextActions, config.orderedNextActions);
assert(ord.nextActions[0].includes('SCHED-A02'));

[
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  'scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js',
  WORKFLOW_PATH
].forEach((path) => {
  assert(sched.requiredPaths.includes(path), `SCHED requiredPaths missing ${path}`);
  assert(ord.requiredPaths.includes(path), `ORD requiredPaths missing ${path}`);
});
assert(sched.tests.includes('audit:sched-001-a01-repository-baseline-staging-security-preflight'));
assert(ord.tests.includes('audit:sched-001-a01-repository-baseline-staging-security-preflight'));
assert.strictEqual(
  pkg.scripts['audit:sched-001-a01-repository-baseline-staging-security-preflight'],
  'node scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js'
);

[
  'RLS is enabled',
  'SCHED-B01 — closed',
  'SCHED-B05 — new and open',
  'owner update policy does not restrict the new `status`',
  'btree_gist',
  'SCHED-A02 — Command, Event, Timezone and Conflict Contract Freeze',
  'staging mutations: 0'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('curl '));
assert(!workflow.includes('--execute'));
assert(!workflow.includes('apply_migration'));

console.log('SCHED-A01 repository baseline and staging security preflight audit passed.');
