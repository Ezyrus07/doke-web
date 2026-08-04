'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'rep-a02-review-command-authority-v1';
const REVIEW_SCOPE = 'client_to_professional';
const DECISIONS = Object.freeze({
  ACCEPT: 'accept', REPLAY: 'replay', REJECT: 'reject',
  CONFLICT: 'conflict', UNAVAILABLE: 'unavailable'
});
const FORBIDDEN_KEYS = Object.freeze([
  'sessionCredential', 'paymentInstrument', 'bankDestination',
  'identityDocument', 'rawEvidence', 'rawPayload'
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

function rating(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 5) throw new Error('invalid_rating');
  return parsed;
}

function tags(value) {
  const result = [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))].sort();
  if (result.length > 12) throw new Error('too_many_tags');
  return result;
}

function criteria(value) {
  const entries = Array.isArray(value) ? value : [];
  if (entries.length > 12) throw new Error('too_many_criteria');
  const result = entries.map((entry) => ({ key: status(entry && entry.key), rating: rating(entry && entry.rating) }))
    .filter((entry) => entry.key).sort((a, b) => a.key.localeCompare(b.key));
  if (new Set(result.map((entry) => entry.key)).size !== result.length) throw new Error('duplicate_criterion');
  return result;
}

function buildReviewCommand(input) {
  if (!input || typeof input !== 'object' || containsForbiddenRawData(input)) throw new Error('invalid_command');
  const command = {
    contractId: CONTRACT_ID,
    version: 1,
    scope: status(input.scope || REVIEW_SCOPE),
    clientRequestId: text(input.clientRequestId),
    actorId: text(input.actorId),
    orderId: text(input.orderId),
    reviewedUserId: text(input.reviewedUserId),
    rating: rating(input.rating),
    comment: text(input.comment).slice(0, 2000),
    tags: tags(input.tags),
    criteria: criteria(input.criteria),
    expectedOrderRevision: text(input.expectedOrderRevision),
    expectedPaymentRevision: text(input.expectedPaymentRevision),
    expectedDisputeRevision: text(input.expectedDisputeRevision)
  };
  if (command.scope !== REVIEW_SCOPE) throw new Error('unsupported_review_scope');
  ['clientRequestId', 'actorId', 'orderId', 'reviewedUserId'].forEach((key) => {
    if (!uuid(command[key])) throw new Error(`invalid_uuid:${key}`);
  });
  if (!command.expectedOrderRevision || !command.expectedPaymentRevision || !command.expectedDisputeRevision) {
    throw new Error('missing_expected_revision');
  }
  const subject = { scope: command.scope, actorId: command.actorId, orderId: command.orderId };
  const intent = {
    ...subject,
    reviewedUserId: command.reviewedUserId,
    rating: command.rating,
    comment: command.comment,
    tags: command.tags,
    criteria: command.criteria,
    expectedOrderRevision: command.expectedOrderRevision,
    expectedPaymentRevision: command.expectedPaymentRevision,
    expectedDisputeRevision: command.expectedDisputeRevision
  };
  return Object.freeze({
    ...command,
    uniquenessKey: `review_subject_v1_${sha256(stableJson(subject))}`,
    idempotencyKey: `review_command_v1_${sha256(stableJson({ clientRequestId: command.clientRequestId, ...subject }))}`,
    intentFingerprint: sha256(stableJson(intent)),
    deterministicReviewId: `review_${sha256(stableJson(subject)).slice(0, 32)}`
  });
}

function normalizeSnapshot(snapshot) {
  snapshot = snapshot || {};
  return {
    source: status(snapshot.source),
    authoritative: snapshot.authoritative === true,
    actor: {
      id: text(snapshot.actor && snapshot.actor.id),
      role: status(snapshot.actor && snapshot.actor.role),
      active: Boolean(snapshot.actor && snapshot.actor.active)
    },
    order: {
      id: text(snapshot.order && snapshot.order.id),
      status: status(snapshot.order && snapshot.order.status),
      clientId: text(snapshot.order && snapshot.order.clientId),
      professionalId: text(snapshot.order && snapshot.order.professionalId),
      revision: text(snapshot.order && snapshot.order.revision)
    },
    payment: {
      status: status(snapshot.payment && snapshot.payment.status),
      revision: text(snapshot.payment && snapshot.payment.revision)
    },
    dispute: {
      reviewBlocked: Boolean(snapshot.dispute && snapshot.dispute.reviewBlocked),
      revision: text(snapshot.dispute && snapshot.dispute.revision)
    },
    existingReview: snapshot.existingReview || null
  };
}

function outcome(decision, reason, command, extra) {
  return Object.freeze({ decision, reason, command, ...(extra || {}) });
}

function evaluateEligibility(input, rawSnapshot) {
  let command;
  try { command = buildReviewCommand(input); }
  catch (error) { return outcome(DECISIONS.REJECT, 'invalid_command', null, { error: error.message }); }

  const snapshot = normalizeSnapshot(rawSnapshot);
  if (snapshot.source !== 'canonical_server' || !snapshot.authoritative) {
    return outcome(DECISIONS.UNAVAILABLE, 'non_canonical_snapshot', command);
  }
  if (!snapshot.actor.active) return outcome(DECISIONS.REJECT, 'actor_inactive', command);
  if (snapshot.actor.role !== 'client') return outcome(DECISIONS.REJECT, 'role_not_allowed', command);
  if (snapshot.actor.id !== command.actorId || snapshot.order.clientId !== command.actorId) {
    return outcome(DECISIONS.REJECT, 'actor_not_order_client', command);
  }
  if (snapshot.order.id !== command.orderId || snapshot.order.professionalId !== command.reviewedUserId) {
    return outcome(DECISIONS.REJECT, 'reviewed_user_not_order_professional', command);
  }
  if (snapshot.order.status !== 'completed') return outcome(DECISIONS.REJECT, 'order_not_completed', command);
  if (snapshot.payment.status !== 'released') return outcome(DECISIONS.REJECT, 'payment_not_released', command);
  if (snapshot.dispute.reviewBlocked) return outcome(DECISIONS.REJECT, 'dispute_blocks_review', command);
  if (snapshot.order.revision !== command.expectedOrderRevision
      || snapshot.payment.revision !== command.expectedPaymentRevision
      || snapshot.dispute.revision !== command.expectedDisputeRevision) {
    return outcome(DECISIONS.CONFLICT, 'revision_mismatch', command);
  }

  const existing = snapshot.existingReview;
  if (existing) {
    if (text(existing.uniquenessKey) !== command.uniquenessKey) {
      return outcome(DECISIONS.CONFLICT, 'uniqueness_conflict', command, { existing });
    }
    if (text(existing.idempotencyKey) === command.idempotencyKey
        && text(existing.intentFingerprint) === command.intentFingerprint) {
      return outcome(DECISIONS.REPLAY, 'existing_review_replay', command, {
        reviewId: text(existing.reviewId) || command.deterministicReviewId,
        outcomeFingerprint: text(existing.outcomeFingerprint)
      });
    }
    return outcome(DECISIONS.CONFLICT, 'existing_review_conflict', command, { existing });
  }

  return outcome(DECISIONS.ACCEPT, 'eligible', command, {
    reviewId: command.deterministicReviewId,
    initialModerationState: 'pending_moderation',
    publicVisibility: false,
    runtimeAuthority: false
  });
}

function resolveCommand(input, snapshot, ledger) {
  const eligible = evaluateEligibility(input, snapshot);
  if (!eligible.command || !ledger) return eligible;
  const command = eligible.command;
  if (text(ledger.idempotencyKey) !== command.idempotencyKey) return eligible;
  if (text(ledger.intentFingerprint) !== command.intentFingerprint) {
    return outcome(DECISIONS.CONFLICT, 'idempotency_payload_conflict', command);
  }
  const ledgerState = status(ledger.state);
  if (ledgerState === 'resolution_required') {
    return outcome(DECISIONS.UNAVAILABLE, 'ledger_resolution_required', command);
  }
  if (['accepted', 'committed', 'rejected'].includes(ledgerState)) {
    return outcome(DECISIONS.REPLAY, 'replay_same_outcome', command, {
      reviewId: text(ledger.reviewId) || command.deterministicReviewId,
      outcomeFingerprint: text(ledger.outcomeFingerprint),
      priorState: ledgerState
    });
  }
  return eligible;
}

function buildOutcomeFingerprint(result) {
  return sha256(stableJson({
    contractId: CONTRACT_ID,
    decision: result && result.decision,
    reason: result && result.reason,
    reviewId: result && result.reviewId,
    initialModerationState: result && result.initialModerationState,
    publicVisibility: result && result.publicVisibility
  }));
}

module.exports = Object.freeze({
  CONTRACT_ID, REVIEW_SCOPE, DECISIONS, FORBIDDEN_KEYS,
  buildReviewCommand, evaluateEligibility, resolveCommand,
  buildOutcomeFingerprint, containsForbiddenRawData, stableJson, sha256
});
