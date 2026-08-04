'use strict';

const fs = require('fs');
const path = require('path');
const authority = require('../backend/modules/reputation/canonical-reputation-projection');

const root = path.resolve(__dirname, '..');
const fixtures = JSON.parse(fs.readFileSync(path.join(root, 'tests', 'fixtures', 'rep-a04-reputation-projection-cases.json'), 'utf8'));
const checks = [];
const clone = (value) => JSON.parse(JSON.stringify(value));
const check = (name, condition) => checks.push({ name, passed: Boolean(condition) });
const equals = (name, actual, expected) => check(name, actual === expected);

function projectionWith(mutator) {
  const value = clone(fixtures.baseSnapshot);
  mutator(value);
  return authority.buildProjection(value);
}

const base = authority.buildProjection(fixtures.baseSnapshot);
equals('base authoritative', base.state, 'authoritative');
equals('base count', base.eligibleReviewCount, 1);
equals('base average', base.averageRating, 5);
equals('base fingerprint deterministic', authority.buildProjection(fixtures.baseSnapshot).projectionFingerprint, base.projectionFingerprint);

const combined = clone(fixtures.baseSnapshot);
combined.projectionRevision = 'rep-proj-combined';
combined.reviews = [
  fixtures.baseSnapshot.reviews[0],
  fixtures.secondReview,
  fixtures.quarantinedFraudReview,
  fixtures.excludedDisputeReview,
  fixtures.activeModerationReview
];
const mixed = authority.buildProjection(combined);
equals('mixed authoritative', mixed.state, 'authoritative');
equals('mixed eligible count', mixed.eligibleReviewCount, 2);
equals('mixed quarantine count', mixed.quarantinedReviewCount, 2);
equals('mixed excluded count', mixed.excludedReviewCount, 1);
equals('mixed total', mixed.ratingTotal, 8);
equals('mixed average', mixed.averageRating, 4);
equals('mixed histogram 5', mixed.histogram[5], 1);
equals('mixed histogram 3', mixed.histogram[3], 1);
equals('mixed ranking blocked by quarantine', mixed.publicRankingEligible, false);
equals('mixed reason fraud quarantine', mixed.classificationReasons.authoritative_fraud_quarantine, 1);
equals('mixed reason dispute exclusion', mixed.classificationReasons.authoritative_dispute_exclusion, 1);
equals('mixed reason active moderation', mixed.classificationReasons.moderation_case_active, 1);

[
  ['source local', (s) => { s.source = 'local_cache'; }, 'non_canonical_snapshot'],
  ['authority false', (s) => { s.authoritative = false; }, 'non_canonical_snapshot'],
  ['professional invalid', (s) => { s.professionalId = 'x'; }, 'invalid_uuid:professionalId'],
  ['missing revision', (s) => { s.projectionRevision = ''; }, 'missing_projectionRevision'],
  ['missing policy', (s) => { s.policyVersion = ''; }, 'missing_policyVersion'],
  ['bad moderation head', (s) => { s.moderationLedgerHead = 'x'; }, 'invalid_moderationLedgerHead'],
  ['bad fraud head', (s) => { s.fraudLedgerHead = 'x'; }, 'invalid_fraudLedgerHead'],
  ['bad dispute head', (s) => { s.disputeLedgerHead = 'x'; }, 'invalid_disputeLedgerHead'],
  ['bad generated at', (s) => { s.generatedAt = 'x'; }, 'invalid_timestamp:generatedAt'],
  ['raw comment forbidden', (s) => { s.reviews[0].comment = 'raw'; }, 'invalid_snapshot'],
  ['raw payload forbidden', (s) => { s.rawPayload = {}; }, 'invalid_snapshot']
].forEach(([name, mutate, reason]) => {
  const result = projectionWith(mutate);
  equals(`${name} unavailable`, result.state, 'unavailable');
  equals(`${name} reason`, result.reason, reason);
  equals(`${name} ranking false`, result.publicRankingEligible, false);
  equals(`${name} authority false`, result.reputationAuthority, false);
});

[
  ['review id invalid', (r) => { r.reviewId = 'x'; }, 'invalid_uuid:reviewId'],
  ['order id invalid', (r) => { r.orderId = 'x'; }, 'invalid_uuid:orderId'],
  ['professional id invalid', (r) => { r.professionalId = 'x'; }, 'invalid_uuid:professionalId'],
  ['professional mismatch', (r) => { r.professionalId = '44444444-4444-4444-8444-444444444444'; }, 'professional_mismatch'],
  ['reviewer hash invalid', (r) => { r.reviewerIdHash = 'x'; }, 'invalid_reviewer_hash'],
  ['uniqueness invalid', (r) => { r.uniquenessKey = 'x'; }, 'invalid_uniqueness_key'],
  ['rating zero', (r) => { r.rating = 0; }, 'invalid_rating'],
  ['rating six', (r) => { r.rating = 6; }, 'invalid_rating'],
  ['rating decimal', (r) => { r.rating = 4.5; }, 'invalid_rating'],
  ['review state invalid', (r) => { r.reviewState = 'draft'; }, 'unsupported_review_state'],
  ['case state invalid', (r) => { r.moderationCaseState = 'unknown'; }, 'unsupported_moderation_case_state'],
  ['fraud invalid', (r) => { r.fraudDisposition = 'suspected'; }, 'unsupported_fraud_disposition'],
  ['dispute invalid', (r) => { r.disputeImpact = 'active'; }, 'unsupported_dispute_impact'],
  ['moderation revision missing', (r) => { r.moderationRevision = ''; }, 'missing_moderation_provenance'],
  ['moderation hash invalid', (r) => { r.moderationEventHash = 'x'; }, 'missing_moderation_provenance'],
  ['fraud policy missing', (r) => { r.fraudPolicyVersion = ''; }, 'missing_fraud_provenance'],
  ['fraud hash invalid', (r) => { r.fraudDecisionHash = 'x'; }, 'missing_fraud_provenance'],
  ['dispute revision missing', (r) => { r.disputeRevision = ''; }, 'missing_dispute_provenance'],
  ['dispute hash invalid', (r) => { r.disputeDecisionHash = 'x'; }, 'missing_dispute_provenance'],
  ['updated at invalid', (r) => { r.updatedAt = 'x'; }, 'invalid_timestamp:review.updatedAt']
].forEach(([name, mutate, reason]) => {
  const result = projectionWith((snapshot) => mutate(snapshot.reviews[0]));
  equals(`${name} unavailable`, result.state, 'unavailable');
  equals(`${name} reason`, result.reason, reason);
});

[
  ['pending_moderation', 'none', 'eligible', 'eligible', 'excluded', 'not_published'],
  ['hidden', 'resolved', 'eligible', 'eligible', 'excluded', 'not_published'],
  ['removed', 'appeal_resolved', 'eligible', 'eligible', 'excluded', 'not_published'],
  ['published', 'open', 'eligible', 'eligible', 'quarantined', 'moderation_case_active'],
  ['published', 'under_review', 'eligible', 'eligible', 'quarantined', 'moderation_case_active'],
  ['published', 'appeal_pending', 'eligible', 'eligible', 'quarantined', 'moderation_case_active'],
  ['published', 'resolved', 'quarantined', 'eligible', 'quarantined', 'authoritative_fraud_quarantine'],
  ['published', 'resolved', 'excluded', 'eligible', 'excluded', 'authoritative_fraud_exclusion'],
  ['published', 'resolved', 'eligible', 'quarantined', 'quarantined', 'authoritative_dispute_quarantine'],
  ['published', 'resolved', 'eligible', 'excluded', 'excluded', 'authoritative_dispute_exclusion'],
  ['published', 'resolved', 'eligible', 'eligible', 'eligible', 'eligible'],
  ['published', 'appeal_resolved', 'eligible', 'eligible', 'eligible', 'eligible']
].forEach(([reviewState, caseState, fraud, dispute, disposition, reason], index) => {
  const item = {
    ...fixtures.baseSnapshot.reviews[0],
    reviewState,
    moderationCaseState: caseState,
    fraudDisposition: fraud,
    disputeImpact: dispute
  };
  const result = authority.classifyReview(item);
  equals(`classification ${index} disposition`, result.disposition, disposition);
  equals(`classification ${index} reason`, result.reason, reason);
});

const duplicateId = clone(fixtures.baseSnapshot);
duplicateId.reviews.push({ ...clone(fixtures.secondReview), reviewId: duplicateId.reviews[0].reviewId });
equals('duplicate id unavailable', authority.buildProjection(duplicateId).state, 'unavailable');
equals('duplicate id reason', authority.buildProjection(duplicateId).reason, 'duplicate_review_id');

const duplicateSubject = clone(fixtures.baseSnapshot);
duplicateSubject.reviews.push({ ...clone(fixtures.secondReview), uniquenessKey: duplicateSubject.reviews[0].uniquenessKey });
equals('duplicate subject unavailable', authority.buildProjection(duplicateSubject).state, 'unavailable');
equals('duplicate subject reason', authority.buildProjection(duplicateSubject).reason, 'duplicate_uniqueness_subject');

for (let rating = 1; rating <= 5; rating += 1) {
  const result = projectionWith((snapshot) => { snapshot.reviews[0].rating = rating; });
  equals(`rating ${rating} average`, result.averageRating, rating);
  equals(`rating ${rating} total`, result.ratingTotal, rating);
  equals(`rating ${rating} histogram`, result.histogram[rating], 1);
}

const empty = authority.buildProjection(fixtures.emptySnapshot);
equals('empty authoritative state', empty.state, 'authoritative');
equals('empty average null', empty.averageRating, null);
equals('empty count zero', empty.eligibleReviewCount, 0);
equals('empty total zero', empty.ratingTotal, 0);
equals('empty ranking false', empty.publicRankingEligible, false);
equals('empty authority true', empty.reputationAuthority, true);
equals('empty flag true', empty.emptyAuthoritative, true);

const unavailable = authority.buildProjection(null);
equals('null unavailable', unavailable.state, 'unavailable');
equals('null ranking false', unavailable.publicRankingEligible, false);
equals('null authority false', unavailable.reputationAuthority, false);

const stale = authority.resolveProjection(
  { source: 'cache', authoritative: false },
  base,
  { now: '2026-08-04T22:05:30.000Z', maxAgeMs: 60000 }
);
equals('valid cache becomes stale', stale.state, 'stale');
equals('stale ranking false', stale.publicRankingEligible, false);
equals('stale authority false', stale.reputationAuthority, false);
equals('stale runtime false', stale.runtimeAuthority, false);
equals('stale preserves average', stale.averageRating, base.averageRating);
equals('stale reason', stale.staleReason, 'non_canonical_snapshot');

[
  [{ now: '2026-08-04T22:07:00.000Z', maxAgeMs: 60000 }, 'expired'],
  [{ now: 'x', maxAgeMs: 60000 }, 'bad now'],
  [{ now: '2026-08-04T22:05:30.000Z', maxAgeMs: -1 }, 'negative age'],
  [{ now: '2026-08-04T22:05:30.000Z', maxAgeMs: 'x' }, 'bad age']
].forEach(([options, name]) => {
  equals(`${name} does not use cache`, authority.resolveProjection(null, base, options).state, 'unavailable');
});

const altered = clone(fixtures.baseSnapshot);
altered.projectionRevision = 'rep-proj-r2';
altered.reviews[0].rating = 4;
const alteredProjection = authority.buildProjection(altered);
check('projection fingerprint changes with rating', alteredProjection.projectionFingerprint !== base.projectionFingerprint);
check('projection fingerprint changes with revision', alteredProjection.projectionFingerprint !== base.projectionFingerprint);

authority.FORBIDDEN_KEYS.forEach((key) => {
  check(`forbidden recursive ${key}`, authority.containsForbiddenRawData({ level: [{ nested: { [key]: 'secret' } }] }));
});

const total = checks.length;
const failedCases = checks.filter((item) => !item.passed).map((item) => item.name);
console.log(JSON.stringify({
  contractId: authority.CONTRACT_ID,
  total,
  passed: total - failedCases.length,
  failed: failedCases.length,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
}, null, 2));
if (failedCases.length) process.exitCode = 1;
