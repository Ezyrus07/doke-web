'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'rep-a04-canonical-reputation-projection-v1';
const PROJECTION_STATES = Object.freeze({
  AUTHORITATIVE: 'authoritative',
  STALE: 'stale',
  UNAVAILABLE: 'unavailable'
});
const DISPOSITIONS = Object.freeze({
  ELIGIBLE: 'eligible',
  QUARANTINED: 'quarantined',
  EXCLUDED: 'excluded'
});
const DISPUTE_IMPACTS = Object.freeze({
  ELIGIBLE: 'eligible',
  QUARANTINED: 'quarantined',
  EXCLUDED: 'excluded'
});
const FORBIDDEN_KEYS = Object.freeze([
  'reviewBody', 'comment', 'rawEvidence', 'rawPayload', 'privateMessage',
  'sessionCredential', 'paymentInstrument', 'bankDestination', 'identityDocument'
]);

const text = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
const status = (value) => text(value).toLowerCase().replace(/[\s-]+/g, '_');
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
const sortValue = (value) => {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = sortValue(value[key]);
    return out;
  }, {});
};
const stableJson = (value) => JSON.stringify(sortValue(value));
const sha256 = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');

function containsForbiddenRawData(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenRawData);
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.includes(key) || containsForbiddenRawData(value[key]));
}

function parseIso(value, field) {
  const raw = text(value);
  const time = Date.parse(raw);
  if (!raw || !Number.isFinite(time)) throw new Error(`invalid_timestamp:${field}`);
  return new Date(time).toISOString();
}

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new Error('invalid_rating');
  return rating;
}

function normalizeReview(raw, professionalId) {
  if (!raw || typeof raw !== 'object' || containsForbiddenRawData(raw)) throw new Error('invalid_review_projection_input');
  const item = {
    reviewId: text(raw.reviewId),
    orderId: text(raw.orderId),
    reviewerIdHash: text(raw.reviewerIdHash),
    professionalId: text(raw.professionalId),
    rating: normalizeRating(raw.rating),
    reviewState: status(raw.reviewState),
    moderationCaseState: status(raw.moderationCaseState),
    moderationRevision: text(raw.moderationRevision),
    moderationEventHash: text(raw.moderationEventHash),
    fraudDisposition: status(raw.fraudDisposition),
    fraudPolicyVersion: text(raw.fraudPolicyVersion),
    fraudDecisionHash: text(raw.fraudDecisionHash),
    disputeImpact: status(raw.disputeImpact),
    disputeRevision: text(raw.disputeRevision),
    disputeDecisionHash: text(raw.disputeDecisionHash),
    uniquenessKey: text(raw.uniquenessKey),
    updatedAt: parseIso(raw.updatedAt, 'review.updatedAt')
  };
  ['reviewId', 'orderId', 'professionalId'].forEach((key) => {
    if (!uuid(item[key])) throw new Error(`invalid_uuid:${key}`);
  });
  if (item.professionalId !== professionalId) throw new Error('professional_mismatch');
  if (!/^[a-f0-9]{64}$/i.test(item.reviewerIdHash)) throw new Error('invalid_reviewer_hash');
  if (!item.uniquenessKey.startsWith('review_subject_v1_')) throw new Error('invalid_uniqueness_key');
  if (!['published', 'hidden', 'removed', 'pending_moderation'].includes(item.reviewState)) {
    throw new Error('unsupported_review_state');
  }
  if (!['none', 'open', 'under_review', 'resolved', 'appeal_pending', 'appeal_resolved'].includes(item.moderationCaseState)) {
    throw new Error('unsupported_moderation_case_state');
  }
  if (!Object.values(DISPOSITIONS).includes(item.fraudDisposition)) throw new Error('unsupported_fraud_disposition');
  if (!Object.values(DISPUTE_IMPACTS).includes(item.disputeImpact)) throw new Error('unsupported_dispute_impact');
  if (!item.moderationRevision || !/^[a-f0-9]{64}$/i.test(item.moderationEventHash)) {
    throw new Error('missing_moderation_provenance');
  }
  if (!item.fraudPolicyVersion || !/^[a-f0-9]{64}$/i.test(item.fraudDecisionHash)) {
    throw new Error('missing_fraud_provenance');
  }
  if (!item.disputeRevision || !/^[a-f0-9]{64}$/i.test(item.disputeDecisionHash)) {
    throw new Error('missing_dispute_provenance');
  }
  return Object.freeze(item);
}

function classifyReview(item) {
  if (item.reviewState !== 'published') return Object.freeze({ disposition: DISPOSITIONS.EXCLUDED, reason: 'not_published' });
  if (['open', 'under_review', 'appeal_pending'].includes(item.moderationCaseState)) {
    return Object.freeze({ disposition: DISPOSITIONS.QUARANTINED, reason: 'moderation_case_active' });
  }
  if (item.fraudDisposition === DISPOSITIONS.EXCLUDED) {
    return Object.freeze({ disposition: DISPOSITIONS.EXCLUDED, reason: 'authoritative_fraud_exclusion' });
  }
  if (item.fraudDisposition === DISPOSITIONS.QUARANTINED) {
    return Object.freeze({ disposition: DISPOSITIONS.QUARANTINED, reason: 'authoritative_fraud_quarantine' });
  }
  if (item.disputeImpact === DISPUTE_IMPACTS.EXCLUDED) {
    return Object.freeze({ disposition: DISPOSITIONS.EXCLUDED, reason: 'authoritative_dispute_exclusion' });
  }
  if (item.disputeImpact === DISPUTE_IMPACTS.QUARANTINED) {
    return Object.freeze({ disposition: DISPOSITIONS.QUARANTINED, reason: 'authoritative_dispute_quarantine' });
  }
  return Object.freeze({ disposition: DISPOSITIONS.ELIGIBLE, reason: 'eligible' });
}

function normalizeSnapshot(raw) {
  if (!raw || typeof raw !== 'object' || containsForbiddenRawData(raw)) throw new Error('invalid_snapshot');
  const source = status(raw.source);
  const authoritative = raw.authoritative === true;
  if (source !== 'canonical_server' || !authoritative) throw new Error('non_canonical_snapshot');
  const snapshot = {
    source,
    authoritative,
    professionalId: text(raw.professionalId),
    projectionRevision: text(raw.projectionRevision),
    policyVersion: text(raw.policyVersion),
    moderationLedgerHead: text(raw.moderationLedgerHead),
    fraudLedgerHead: text(raw.fraudLedgerHead),
    disputeLedgerHead: text(raw.disputeLedgerHead),
    generatedAt: parseIso(raw.generatedAt, 'generatedAt'),
    reviews: Array.isArray(raw.reviews) ? raw.reviews : []
  };
  if (!uuid(snapshot.professionalId)) throw new Error('invalid_uuid:professionalId');
  ['projectionRevision', 'policyVersion'].forEach((key) => {
    if (!snapshot[key]) throw new Error(`missing_${key}`);
  });
  ['moderationLedgerHead', 'fraudLedgerHead', 'disputeLedgerHead'].forEach((key) => {
    if (!/^[a-f0-9]{64}$/i.test(snapshot[key])) throw new Error(`invalid_${key}`);
  });
  return snapshot;
}

function buildProjection(rawSnapshot) {
  let snapshot;
  try { snapshot = normalizeSnapshot(rawSnapshot); }
  catch (error) {
    return Object.freeze({
      contractId: CONTRACT_ID,
      state: PROJECTION_STATES.UNAVAILABLE,
      reason: error.message,
      publicRankingEligible: false,
      reputationAuthority: false
    });
  }

  const seenReviewIds = new Set();
  const seenUniqueness = new Set();
  const histogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const reasons = {};
  let ratingTotal = 0;
  let eligibleCount = 0;
  let quarantinedCount = 0;
  let excludedCount = 0;
  let latestReviewAt = '';

  try {
    snapshot.reviews.map((raw) => normalizeReview(raw, snapshot.professionalId)).forEach((item) => {
      if (seenReviewIds.has(item.reviewId)) throw new Error('duplicate_review_id');
      if (seenUniqueness.has(item.uniquenessKey)) throw new Error('duplicate_uniqueness_subject');
      seenReviewIds.add(item.reviewId);
      seenUniqueness.add(item.uniquenessKey);
      const classification = classifyReview(item);
      reasons[classification.reason] = (reasons[classification.reason] || 0) + 1;
      latestReviewAt = item.updatedAt > latestReviewAt ? item.updatedAt : latestReviewAt;
      if (classification.disposition === DISPOSITIONS.ELIGIBLE) {
        eligibleCount += 1;
        ratingTotal += item.rating;
        histogram[item.rating] += 1;
      } else if (classification.disposition === DISPOSITIONS.QUARANTINED) {
        quarantinedCount += 1;
      } else {
        excludedCount += 1;
      }
    });
  } catch (error) {
    return Object.freeze({
      contractId: CONTRACT_ID,
      state: PROJECTION_STATES.UNAVAILABLE,
      reason: error.message,
      professionalId: snapshot.professionalId,
      projectionRevision: snapshot.projectionRevision,
      publicRankingEligible: false,
      reputationAuthority: false
    });
  }

  const averageRating = eligibleCount ? Math.round((ratingTotal / eligibleCount) * 100) / 100 : null;
  const payload = {
    contractId: CONTRACT_ID,
    version: 1,
    state: PROJECTION_STATES.AUTHORITATIVE,
    professionalId: snapshot.professionalId,
    projectionRevision: snapshot.projectionRevision,
    policyVersion: snapshot.policyVersion,
    moderationLedgerHead: snapshot.moderationLedgerHead,
    fraudLedgerHead: snapshot.fraudLedgerHead,
    disputeLedgerHead: snapshot.disputeLedgerHead,
    generatedAt: snapshot.generatedAt,
    latestReviewAt: latestReviewAt || null,
    eligibleReviewCount: eligibleCount,
    quarantinedReviewCount: quarantinedCount,
    excludedReviewCount: excludedCount,
    ratingTotal,
    averageRating,
    histogram,
    classificationReasons: reasons,
    emptyAuthoritative: eligibleCount === 0,
    publicRankingEligible: eligibleCount > 0 && quarantinedCount === 0,
    reputationAuthority: true,
    runtimeAuthority: false
  };
  return Object.freeze({
    ...payload,
    projectionFingerprint: sha256(stableJson(payload))
  });
}

function resolveProjection(rawSnapshot, cachedProjection, options) {
  const projection = buildProjection(rawSnapshot);
  if (projection.state === PROJECTION_STATES.AUTHORITATIVE) return projection;
  const now = Date.parse(options && options.now);
  const maxAgeMs = Number(options && options.maxAgeMs);
  const cachedTime = Date.parse(cachedProjection && cachedProjection.generatedAt);
  const cacheValid = cachedProjection
    && cachedProjection.contractId === CONTRACT_ID
    && cachedProjection.state === PROJECTION_STATES.AUTHORITATIVE
    && cachedProjection.reputationAuthority === true
    && Number.isFinite(now) && Number.isFinite(maxAgeMs) && maxAgeMs >= 0
    && Number.isFinite(cachedTime) && now >= cachedTime && now - cachedTime <= maxAgeMs;
  if (!cacheValid) return projection;
  return Object.freeze({
    ...cachedProjection,
    state: PROJECTION_STATES.STALE,
    staleReason: projection.reason,
    publicRankingEligible: false,
    reputationAuthority: false,
    runtimeAuthority: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID, PROJECTION_STATES, DISPOSITIONS, DISPUTE_IMPACTS, FORBIDDEN_KEYS,
  buildProjection, resolveProjection, classifyReview, containsForbiddenRawData,
  stableJson, sha256
});
