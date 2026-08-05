'use strict';

const fs = require('fs');
const path = require('path');
const authority = require('../backend/modules/reputation/canonical-reputation-projection');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'rep-a04-canonical-reputation-projection.json'), 'utf8'));
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'rep-a04-reputation-projection-cases.json'), 'utf8'));
const checks = [];

function check(name, condition) { checks.push({ name, passed: Boolean(condition) }); }
function equals(name, actual, expected) { check(name, actual === expected); }
function includes(name, list, value) { check(name, Array.isArray(list) && list.includes(value)); }
function fileContains(file, snippets) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  snippets.forEach((snippet) => check(`${file} contains ${snippet}`, content.includes(snippet)));
}

equals('contract id', contract.contractId, authority.CONTRACT_ID);
equals('domain', contract.domain, 'REP-001');
equals('scope', contract.scope, 'repository_only');
equals('runtime disabled', contract.runtimeIntegrated, false);
equals('migration not prepared', contract.migrationPrepared, false);
equals('migration not applied', contract.migrationApplied, false);
equals('staging not validated', contract.stagingValidated, false);

['authoritative', 'stale', 'unavailable'].forEach((state) => includes(`projection state ${state}`, contract.projectionStates, state));
['eligible', 'quarantined', 'excluded'].forEach((value) => includes(`review disposition ${value}`, contract.reviewDispositions, value));

[
  'only canonical server snapshots can establish public reputation',
  'published review state is necessary but not sufficient for inclusion',
  'active moderation cases quarantine published reviews',
  'fraud signals alone cannot exclude or down-rank a review',
  'duplicate review IDs fail closed',
  'duplicate REP-A02 uniqueness subjects fail closed',
  'an authoritative empty projection uses null average rather than synthetic zero stars',
  'stale cache may be displayed with warning but never used for public ranking',
  'unavailable authority never synthesizes a numeric reputation',
  'raw review bodies, credentials, payment data and private messages are prohibited'
].forEach((invariant) => includes(`invariant ${invariant}`, contract.mandatoryInvariants, invariant));

Object.entries(contract.authority).forEach(([key, value]) => {
  if (['contractAuthority', 'reputationProjectionContractAuthority', 'fraudImpactContractAuthority', 'disputeImpactContractAuthority'].includes(key)) {
    equals(`authority ${key}`, value, true);
  } else {
    equals(`authority ${key}`, value, false);
  }
});
Object.entries(contract.prohibitedEffects).forEach(([key, value]) => equals(`prohibited effect ${key}`, value, false));
['REP-B02','REP-B03','REP-B04','DSP-B01','DSP-B03','DSP-B04','PAY-B01','PAY-B03','PAY-B04']
  .forEach((blocker) => includes(`blocker ${blocker}`, contract.preservedBlockers, blocker));

[
  'backend/modules/reputation/canonical-reputation-projection.js',
  'config/rep-a04-canonical-reputation-projection.json',
  'tests/fixtures/rep-a04-reputation-projection-cases.json',
  'docs/REP-A04-CANONICAL-REPUTATION-PROJECTION.md',
  'scripts/audit-rep-a04-canonical-reputation-projection.js',
  'scripts/test-rep-a04-canonical-reputation-projection.js',
  '.github/workflows/rep-a04-canonical-reputation-projection.yml'
].forEach((file) => check(`file ${file}`, fs.existsSync(path.join(root, file))));

fileContains('backend/modules/reputation/canonical-reputation-projection.js', [
  'canonical_server', 'averageRating', 'emptyAuthoritative',
  'publicRankingEligible', 'reputationAuthority', 'duplicate_review_id',
  'duplicate_uniqueness_subject', 'moderationLedgerHead', 'fraudLedgerHead',
  'disputeLedgerHead', 'authoritative_fraud_quarantine',
  'authoritative_dispute_exclusion', 'review_subject_v1_',
  'staleReason', 'runtimeAuthority: false'
]);
fileContains('docs/REP-A04-CANONICAL-REPUTATION-PROJECTION.md', [
  'Projection states', 'Published is necessary but not sufficient',
  'Fraud boundary', 'Dispute boundary', 'authoritative empty projection',
  'Raw review text', 'Explicit non-effects'
]);
fileContains('.github/workflows/rep-a04-canonical-reputation-projection.yml', [
  'permissions:', 'contents: read', 'Audit canonical reputation projection',
  'REP-A03 regression', 'REP-A02 regression', 'REP-A01 regression',
  'DSP-A05 predecessor regression', 'git diff --check'
]);

const repository = fs.readFileSync(path.join(root, 'assets/js/repositories/reviews-repository.js'), 'utf8');
check('legacy local reputation remains inventoried', repository.includes('getProfessionalReputation'));
check('legacy local storage remains inventoried', repository.includes('doke.reviews.local.v1'));
check('legacy browser average remains inventoried', repository.includes('averageRating'));
check('legacy browser verified filter remains inventoried', repository.includes('review.verified !== false'));

const base = authority.buildProjection(fixtures.baseSnapshot);
equals('base state', base.state, 'authoritative');
equals('base eligible count', base.eligibleReviewCount, 1);
equals('base average', base.averageRating, 5);
equals('base rating total', base.ratingTotal, 5);
equals('base histogram five', base.histogram[5], 1);
equals('base quarantined count', base.quarantinedReviewCount, 0);
equals('base excluded count', base.excludedReviewCount, 0);
equals('base empty false', base.emptyAuthoritative, false);
equals('base ranking true', base.publicRankingEligible, true);
equals('base reputation authority', base.reputationAuthority, true);
equals('base runtime false', base.runtimeAuthority, false);
equals('projection fingerprint length', base.projectionFingerprint.length, 64);
check('projection frozen', Object.isFrozen(base));

const empty = authority.buildProjection(fixtures.emptySnapshot);
equals('empty authoritative', empty.state, 'authoritative');
equals('empty count', empty.eligibleReviewCount, 0);
equals('empty average null', empty.averageRating, null);
equals('empty ranking false', empty.publicRankingEligible, false);
equals('empty flag', empty.emptyAuthoritative, true);

authority.FORBIDDEN_KEYS.forEach((key) => {
  check(`forbidden key ${key}`, authority.containsForbiddenRawData({ nested: { [key]: 'x' } }));
});

const total = checks.length;
const failedChecks = checks.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  sourceHead: contract.sourceHead,
  total,
  passed: total - failedChecks.length,
  failed: failedChecks.length,
  status: failedChecks.length ? 'failed' : 'passed',
  failedChecks,
  effects: contract.prohibitedEffects
};
console.log(JSON.stringify(result, null, 2));
if (failedChecks.length) process.exitCode = 1;
