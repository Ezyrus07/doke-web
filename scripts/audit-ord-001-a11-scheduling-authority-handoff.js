#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG_PATH = 'config/ord-001-a11-scheduling-authority-handoff.json';
const DOC_PATH = 'docs/ORD-001-A11-SCHEDULING-AUTHORITY-HANDOFF.md';
const EVIDENCE_PATH = 'docs/validation/ORD-001-A11-SCHEDULING-AUTHORITY-HANDOFF.json';
const WORKFLOW_PATH = '.github/workflows/ord-001-a11-scheduling-authority-handoff.yml';
const MATRIX_PATH = 'config/domain-completion-matrix.json';
const RLS_PATH = 'supabase/migrations/113_availability_reviews_authority.sql';
const POLICY_PATH = 'supabase/migrations/119_public_policy_role_separation.sql';
const ORDER_SERVICE_PATH = 'backend/modules/orders/orders-service.js';
const ORDER_REPOSITORY_PATH = 'assets/js/repositories/orders-repository.js';
const SCHED_PLACEHOLDER_PATH = 'backend/modules/scheduling/.gitkeep';

[
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  WORKFLOW_PATH,
  MATRIX_PATH,
  RLS_PATH,
  POLICY_PATH,
  ORDER_SERVICE_PATH,
  ORDER_REPOSITORY_PATH,
  SCHED_PLACEHOLDER_PATH,
  'package.json'
].forEach((file) => assert(fs.existsSync(file), `Missing ORD-A11 asset: ${file}`));

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const docs = fs.readFileSync(DOC_PATH, 'utf8');
const workflow = fs.readFileSync(WORKFLOW_PATH, 'utf8');
const rls = fs.readFileSync(RLS_PATH, 'utf8');
const policies = fs.readFileSync(POLICY_PATH, 'utf8');
const orderService = fs.readFileSync(ORDER_SERVICE_PATH, 'utf8');
const orderRepository = fs.readFileSync(ORDER_REPOSITORY_PATH, 'utf8');

assert.strictEqual(config.contractVersion, 'ord-a11-scheduling-authority-handoff-v1');
assert.strictEqual(config.status, 'repository_handoff_complete_sched_implementation_pending');
assert.strictEqual(config.sourceDomain, 'ORD-001');
assert.strictEqual(config.targetDomain, 'SCHED-001');
assert.strictEqual(config.sourceBlocker, 'ORD-B04');
assert.strictEqual(config.scope, 'repository_only');
assert.strictEqual(config.decision.blockerClosed, false);
assert.strictEqual(config.decision.orderDomainMayOwnParallelSchedule, false);
assert.strictEqual(config.decision.schedulingDomainOwnsCanonicalTimeAuthority, true);
assert.strictEqual(config.decision.genericContinuationAuthorizesLiveChanges, false);
assert.strictEqual(config.observedRepositoryState.availabilityRlsEnablementMigrationExists, true);
assert.strictEqual(config.observedRepositoryState.roleSeparatedAvailabilityReadPoliciesExist, true);
assert.strictEqual(config.observedRepositoryState.stagingRlsVerificationRecordedForSched, true);
assert.strictEqual(config.observedRepositoryState.schedulingBackendModuleImplemented, false);
assert.strictEqual(config.observedRepositoryState.databaseAntiDoubleBookingContractExists, false);
assert.strictEqual(config.observedRepositoryState.ordersAcceptRawScheduledAt, true);
assert.strictEqual(config.observedRepositoryState.orderReservationReferenceExists, false);
assert.strictEqual(config.orderedNextActions.length, 4);
assert(config.orderedNextActions[0].includes('SCHED-A03'));
assert.strictEqual(config.targetModel.scheduleReservations.requiredDatabaseRule, 'active held or confirmed ranges for one professional must not overlap');
assert(config.targetModel.scheduleReservations.preferredPostgresPrimitive.includes('GiST exclusion constraint'));
assert.strictEqual(config.timePolicy.canonicalInstantStorage, 'UTC timestamptz');
assert.strictEqual(config.timePolicy.rangeConvention, 'half-open [start,end)');
Object.values(config.forbidden).forEach((value) => assert.strictEqual(value, true));
Object.entries(config.evidence).forEach(([key, value]) => {
  if (key === 'productionChanged' || key === 'pullRequestMerged') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert.strictEqual(evidence.contractVersion, config.contractVersion);
assert.strictEqual(evidence.status, config.status);
assert.strictEqual(evidence.handoff.canonicalOwner, 'SCHED-001');
assert.strictEqual(evidence.handoff.orderDomainParallelAuthorityForbidden, true);
assert.strictEqual(evidence.handoff.blockerClosed, false);
assert.strictEqual(evidence.handoff.domainCompletionClaimed, false);
assert.strictEqual(evidence.execution.networkRequestsPerformed, 0);
assert.strictEqual(evidence.execution.stagingReadsPerformed, 0);
assert.strictEqual(evidence.execution.stagingMutationsPerformed, 0);
assert.strictEqual(evidence.execution.migrationsApplied, 0);
assert.strictEqual(evidence.execution.deploymentsPerformed, 0);
assert.strictEqual(evidence.execution.productionChanged, false);
assert.strictEqual(evidence.execution.pullRequestMerged, false);

assert(rls.includes('alter table public.availability_slots enable row level security'));
assert(rls.includes('availability_slots_owner_insert'));
assert(rls.includes('availability_slots_owner_update'));
assert(rls.includes('availability_slots_owner_delete'));
assert(policies.includes('availability_slots_anon_select'));
assert(policies.includes('availability_slots_authenticated_select'));
assert(orderService.includes('p_scheduled_at: body.scheduledAt || body.scheduled_at || null'));
assert(orderRepository.includes('serviceAvailabilitySchedule'));
assert(orderRepository.includes('desiredDate'));
assert(orderRepository.includes("shift: raw.shift || 'Flexível'"));
assert(fs.existsSync('backend/modules/scheduling/scheduling-service.js'));
assert(!fs.existsSync('supabase/migrations/174_sched_reservations.sql'));

const compareVersions = (left, right) => {
  const a = String(left).split('.').map(Number);
  const b = String(right).split('.').map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const delta = (a[index] || 0) - (b[index] || 0);
    if (delta !== 0) return delta;
  }
  return 0;
};
assert(compareVersions(matrix.version, '1.3.46') >= 0, `Matrix version ${matrix.version} predates SCHED-A03.`);
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
assert(ord, 'ORD-001 missing from completion matrix');
assert(sched, 'SCHED-001 missing from completion matrix');
const ordB04 = ord.blockers.find((blocker) => blocker.id === 'ORD-B04');
assert(ordB04, 'ORD-B04 missing from completion matrix');
assert(ordB04.description.includes('SCHED-001'));
assert(ordB04.description.includes('canonical reservation reference'));
assert(sched.maturity >= 1);
assert(['none', 'contract_only', 'partial', 'canonical'].includes(sched.serverAuthority));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B01'));
assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));
if (compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}

[
  CONFIG_PATH,
  DOC_PATH,
  EVIDENCE_PATH,
  'scripts/audit-ord-001-a11-scheduling-authority-handoff.js',
  WORKFLOW_PATH
].forEach((path) => {
  assert(ord.requiredPaths.includes(path), `ORD requiredPaths missing ${path}`);
  assert(sched.requiredPaths.includes(path), `SCHED requiredPaths missing ${path}`);
});
assert(ord.tests.includes('audit:ord-001-a11-scheduling-authority-handoff'));
assert(sched.tests.includes('audit:ord-001-a11-scheduling-authority-handoff'));
assert.strictEqual(pkg.scripts['audit:ord-001-a11-scheduling-authority-handoff'], 'node scripts/audit-ord-001-a11-scheduling-authority-handoff.js');

[
  'Corrected baseline',
  '`SCHED-001` owns',
  '`ORD-001` owns',
  'GiST exclusion constraint',
  'schedule_reservation_id',
  '`ORD-B04` remains open',
  'Generic continuation does not authorize'
].forEach((fragment) => assert(docs.includes(fragment), `Documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-ord-001-a11-scheduling-authority-handoff.js'));
assert(!workflow.includes('contents: write'));
assert(!workflow.includes('curl '));
assert(!workflow.includes('supabase '));
assert(!workflow.includes('--execute'));

console.log('ORD-A11 scheduling authority handoff audit passed.');
