'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contractPath = path.join(root, 'config', 'rep-a01-authority-baseline.json');
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
const checks = [];

function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

function equals(name, actual, expected) {
  check(name, actual === expected);
}

function includes(name, collection, expected) {
  check(name, Array.isArray(collection) && collection.includes(expected));
}

function unique(name, collection) {
  check(name, Array.isArray(collection) && new Set(collection).size === collection.length);
}

equals('contract id', contract.contractId, 'rep-a01-authority-baseline-v1');
equals('domain', contract.domain, 'REP-001');
equals('source head', contract.sourceHead, '43789d4059542deb51ce31ac47e11d9cca144f69');
equals('scope', contract.scope, 'repository_only');
equals('status', contract.status, 'baseline_frozen_followup_required');

[
  'runtimeIntegrated',
  'migrationPrepared',
  'migrationApplied',
  'stagingValidated',
  'approvedReputationPolicyPresent',
  'moderationWorkflowConfigured',
  'canonicalReputationProjectionConfigured',
  'fraudDetectionConfigured',
  'rehireFlowConfigured'
].forEach((key) => equals(`${key} false`, contract[key], false));

const expectedCurrentAuthority = {
  reviewSubmission: 'hybrid_browser_local_and_direct_authenticated_table_insert',
  reviewEligibility: 'browser_orchestration_plus_static_rls_completed_order_check',
  reviewUniqueness: 'local_get_by_order_guard_plus_database_unique_order_reviewer_constraint',
  reviewPublication: 'authenticated_insert_defaults_to_published',
  reviewModeration: 'service_role_table_update_without_domain_case_contract',
  reputationAggregation: 'browser_local_storage_projection',
  disputeImpact: 'browser_blocks_active_dispute_but_remote_insert_policy_does_not',
  reviewSideEffects: 'non_atomic_browser_updates_across_review_order_conversation_notification',
  rehire: 'absent'
};
Object.entries(expectedCurrentAuthority).forEach(([key, value]) => equals(`current authority ${key}`, contract.currentAuthority[key], value));

const expectedSurfaces = [
  'assets/js/repositories/reviews-repository.js',
  'assets/js/services/review-service.js',
  'assets/js/pages/avaliacao-profissional.js',
  'assets/js/pages/profile-reviews.js',
  'supabase/migrations/002_marketplace_core.sql',
  'supabase/migrations/113_availability_reviews_authority.sql',
  'scripts/test-order-transaction-cycle-contract.js'
];
expectedSurfaces.forEach((surface) => includes(`observed ${surface}`, contract.observedSurfaces, surface));
unique('observed surfaces unique', contract.observedSurfaces);

check('ten baseline findings', Array.isArray(contract.baselineFindings) && contract.baselineFindings.length === 10);
unique('finding ids unique', contract.baselineFindings.map((finding) => finding.id));
[
  ['REP-A01-F01', 'critical', 'browser_authority'],
  ['REP-A01-F02', 'critical', 'direct_dml'],
  ['REP-A01-F03', 'high', 'eligibility_gap'],
  ['REP-A01-F04', 'high', 'idempotency_concurrency'],
  ['REP-A01-F05', 'high', 'moderation'],
  ['REP-A01-F06', 'critical', 'reputation_model'],
  ['REP-A01-F07', 'high', 'atomicity'],
  ['REP-A01-F08', 'high', 'fraud_privacy'],
  ['REP-A01-F09', 'medium', 'role_model'],
  ['REP-A01-F10', 'medium', 'retention']
].forEach(([id, severity, category]) => {
  const finding = contract.baselineFindings.find((item) => item.id === id);
  check(`${id} exists`, finding);
  equals(`${id} severity`, finding && finding.severity, severity);
  equals(`${id} category`, finding && finding.category, category);
  check(`${id} finding text`, finding && typeof finding.finding === 'string' && finding.finding.length > 40);
  check(`${id} blocker`, finding && typeof finding.blockedBy === 'string' && finding.blockedBy.length > 5);
});

check('sixteen invariants', Array.isArray(contract.mandatoryInvariants) && contract.mandatoryInvariants.length === 16);
unique('invariants unique', contract.mandatoryInvariants);
[
  'authenticated UUID sessions never create authoritative reviews in localStorage',
  'review submission uses a server-owned command and stable client request identity',
  'one review per configured actor and completed order is concurrency-safe',
  'lost-response retries return the same review identity and outcome',
  'new reviews enter an explicit moderation state rather than client-selected publication',
  'reputation is recalculated server-side from eligible canonical review revisions',
  'dispute outcomes change reputation only through an approved versioned policy',
  'review creation and transaction side effects are atomic or outbox-backed',
  'rehire creates a new Doke order linked to prior transaction history and current service authority',
  'local fixtures and caches never create production reputation authority'
].forEach((invariant) => includes(`invariant ${invariant}`, contract.mandatoryInvariants, invariant));

const expectedAuthority = {
  contractAuthority: true,
  baselineAuthority: true,
  reviewCommandAuthority: false,
  reviewPublicationAuthority: false,
  moderationAuthority: false,
  reputationProjectionAuthority: false,
  fraudDecisionAuthority: false,
  rehireAuthority: false,
  runtimeMutationAuthority: false,
  stagingAuthority: false,
  productionAuthority: false
};
Object.entries(expectedAuthority).forEach(([key, value]) => equals(`authority ${key}`, contract.authority[key], value));

[
  'REP-B02', 'REP-B03', 'REP-B04',
  'DSP-B01', 'DSP-B03', 'DSP-B04',
  'PAY-B01', 'PAY-B03', 'PAY-B04'
].forEach((blocker) => includes(`preserved blocker ${blocker}`, contract.preservedBlockers, blocker));
unique('preserved blockers unique', contract.preservedBlockers);

const expectedEffects = [
  'networkRequests',
  'databaseConnections',
  'stagingReads',
  'stagingMutations',
  'migrations',
  'deployments',
  'providerContact',
  'credentialsConfigured',
  'realReviewCreated',
  'realReviewModerated',
  'realReputationChanged',
  'realRehireCreated',
  'realUserDataChanged',
  'realMoneyMovement',
  'productionChanges'
];
expectedEffects.forEach((effect) => equals(`prohibited effect ${effect}`, contract.prohibitedEffects[effect], false));
equals('prohibited effect count', Object.keys(contract.prohibitedEffects).length, expectedEffects.length);

const expectedSublots = [
  'REP-A02 server-owned eligibility, uniqueness and idempotent review command',
  'REP-A03 moderation, reporting, restoration and appeal lifecycle',
  'REP-A04 canonical reputation projection, fraud resistance and dispute impact',
  'REP-A05 rehire transaction-linkage and retention readiness'
];
equals('next sublot count', contract.nextSublots.length, expectedSublots.length);
expectedSublots.forEach((sublot) => includes(`next sublot ${sublot}`, contract.nextSublots, sublot));

const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total: checks.length,
  passed: checks.length - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: contract.prohibitedEffects
};
console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exit(1);
