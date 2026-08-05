'use strict';

const crypto = require('crypto');

const CONTRACT_ID = 'rep-a03-review-moderation-lifecycle-v1';

const REVIEW_STATES = Object.freeze({
  PENDING: 'pending_moderation',
  PUBLISHED: 'published',
  HIDDEN: 'hidden',
  REMOVED: 'removed'
});

const CASE_STATES = Object.freeze({
  NONE: 'none',
  OPEN: 'open',
  UNDER_REVIEW: 'under_review',
  RESOLVED: 'resolved',
  APPEAL_PENDING: 'appeal_pending',
  APPEAL_RESOLVED: 'appeal_resolved'
});

const ACTIONS = Object.freeze({
  PUBLISH: 'publish',
  REPORT: 'report',
  TRIAGE: 'triage',
  HIDE: 'hide',
  REMOVE: 'remove',
  DISMISS_REPORT: 'dismiss_report',
  APPEAL: 'appeal',
  RESTORE: 'restore',
  DENY_APPEAL: 'deny_appeal'
});

const DECISIONS = Object.freeze({
  ACCEPT: 'accept',
  REPLAY: 'replay',
  REJECT: 'reject',
  CONFLICT: 'conflict',
  UNAVAILABLE: 'unavailable'
});

const MODERATOR_ROLES = Object.freeze(['moderator', 'senior_moderator']);
const SENIOR_ROLES = Object.freeze(['senior_moderator']);
const REPORTER_ROLES = Object.freeze(['authenticated_user', 'trust_system']);
const FORBIDDEN_KEYS = Object.freeze([
  'rawEvidence', 'rawPayload', 'identityDocument', 'paymentInstrument',
  'bankDestination', 'sessionCredential', 'privateMessageBody'
]);

const text = (value) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
const slug = (value) => text(value).toLowerCase().replace(/[\s-]+/g, '_');
const uuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value));
const sha256 = (value) => crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
const sorted = (value) => {
  if (Array.isArray(value)) return value.map(sorted);
  if (!value || typeof value !== 'object') return value;
  return Object.keys(value).sort().reduce((out, key) => {
    out[key] = sorted(value[key]);
    return out;
  }, {});
};
const stableJson = (value) => JSON.stringify(sorted(value));

function containsForbiddenRawData(value) {
  if (Array.isArray(value)) return value.some(containsForbiddenRawData);
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => FORBIDDEN_KEYS.includes(key) || containsForbiddenRawData(value[key]));
}

function refs(value) {
  const result = [...new Set((Array.isArray(value) ? value : []).map(text).filter(Boolean))].sort();
  if (result.length > 24 || result.some((item) => item.length > 240)) throw new Error('invalid_evidence_references');
  return result;
}

function buildModerationCommand(input) {
  if (!input || typeof input !== 'object' || containsForbiddenRawData(input)) throw new Error('invalid_command');
  const command = {
    contractId: CONTRACT_ID,
    version: 1,
    action: slug(input.action),
    clientRequestId: text(input.clientRequestId),
    actorId: text(input.actorId),
    actorRole: slug(input.actorRole),
    reviewId: text(input.reviewId),
    caseId: text(input.caseId),
    expectedReviewRevision: text(input.expectedReviewRevision),
    expectedCaseRevision: text(input.expectedCaseRevision),
    reasonCode: slug(input.reasonCode),
    reasonSummary: text(input.reasonSummary).slice(0, 500),
    evidenceRefs: refs(input.evidenceRefs),
    priorDecisionEventId: text(input.priorDecisionEventId)
  };

  if (!Object.values(ACTIONS).includes(command.action)) throw new Error('unsupported_action');
  ['clientRequestId', 'actorId', 'reviewId', 'caseId'].forEach((key) => {
    if (!uuid(command[key])) throw new Error(`invalid_uuid:${key}`);
  });
  if (!command.expectedReviewRevision || !command.expectedCaseRevision) throw new Error('missing_expected_revision');
  if (!command.reasonCode) throw new Error('missing_reason_code');

  const subject = {
    reviewId: command.reviewId,
    caseId: command.caseId,
    action: command.action,
    priorDecisionEventId: command.priorDecisionEventId
  };
  const intent = {
    ...subject,
    actorId: command.actorId,
    actorRole: command.actorRole,
    expectedReviewRevision: command.expectedReviewRevision,
    expectedCaseRevision: command.expectedCaseRevision,
    reasonCode: command.reasonCode,
    reasonSummary: command.reasonSummary,
    evidenceRefs: command.evidenceRefs
  };

  return Object.freeze({
    ...command,
    idempotencyKey: `review_moderation_command_v1_${sha256(stableJson({ clientRequestId: command.clientRequestId, ...subject }))}`,
    intentFingerprint: sha256(stableJson(intent)),
    deterministicEventId: `review_moderation_event_${sha256(stableJson({ clientRequestId: command.clientRequestId, ...subject })).slice(0, 32)}`
  });
}

function normalizeSnapshot(snapshot) {
  snapshot = snapshot || {};
  return {
    source: slug(snapshot.source),
    authoritative: snapshot.authoritative === true,
    review: {
      id: text(snapshot.review && snapshot.review.id),
      authorId: text(snapshot.review && snapshot.review.authorId),
      reviewedUserId: text(snapshot.review && snapshot.review.reviewedUserId),
      state: slug(snapshot.review && snapshot.review.state),
      revision: text(snapshot.review && snapshot.review.revision)
    },
    moderationCase: {
      id: text(snapshot.moderationCase && snapshot.moderationCase.id),
      state: slug(snapshot.moderationCase && snapshot.moderationCase.state || CASE_STATES.NONE),
      revision: text(snapshot.moderationCase && snapshot.moderationCase.revision),
      openedById: text(snapshot.moderationCase && snapshot.moderationCase.openedById),
      lastDecisionActorId: text(snapshot.moderationCase && snapshot.moderationCase.lastDecisionActorId),
      lastDecisionEventId: text(snapshot.moderationCase && snapshot.moderationCase.lastDecisionEventId),
      stateBeforeAction: slug(snapshot.moderationCase && snapshot.moderationCase.stateBeforeAction)
    },
    actor: {
      id: text(snapshot.actor && snapshot.actor.id),
      role: slug(snapshot.actor && snapshot.actor.role),
      active: Boolean(snapshot.actor && snapshot.actor.active)
    },
    ledger: snapshot.ledger || null,
    previousEventHash: text(snapshot.previousEventHash)
  };
}

function outcome(decision, reason, command, extra) {
  return Object.freeze({ decision, reason, command, ...(extra || {}) });
}

function roleAllowed(command, snapshot) {
  const role = snapshot.actor.role;
  if (command.action === ACTIONS.REPORT) return REPORTER_ROLES.includes(role);
  if (command.action === ACTIONS.APPEAL) return role === 'review_author';
  if ([ACTIONS.RESTORE, ACTIONS.DENY_APPEAL].includes(command.action)) return SENIOR_ROLES.includes(role);
  return MODERATOR_ROLES.includes(role);
}

function nextState(command, snapshot) {
  const review = snapshot.review.state;
  const caseState = snapshot.moderationCase.state;

  if (command.action === ACTIONS.PUBLISH && review === REVIEW_STATES.PENDING && caseState === CASE_STATES.NONE) {
    return { reviewState: REVIEW_STATES.PUBLISHED, caseState: CASE_STATES.NONE, publicVisibility: true };
  }
  if (command.action === ACTIONS.REPORT && review === REVIEW_STATES.PUBLISHED && [CASE_STATES.NONE, CASE_STATES.RESOLVED, CASE_STATES.APPEAL_RESOLVED].includes(caseState)) {
    return { reviewState: REVIEW_STATES.PUBLISHED, caseState: CASE_STATES.OPEN, publicVisibility: true };
  }
  if (command.action === ACTIONS.TRIAGE && caseState === CASE_STATES.OPEN) {
    return { reviewState: review, caseState: CASE_STATES.UNDER_REVIEW, publicVisibility: review === REVIEW_STATES.PUBLISHED };
  }
  if (command.action === ACTIONS.HIDE && caseState === CASE_STATES.UNDER_REVIEW && review === REVIEW_STATES.PUBLISHED) {
    return { reviewState: REVIEW_STATES.HIDDEN, caseState: CASE_STATES.RESOLVED, publicVisibility: false };
  }
  if (command.action === ACTIONS.REMOVE && caseState === CASE_STATES.UNDER_REVIEW && [REVIEW_STATES.PUBLISHED, REVIEW_STATES.HIDDEN, REVIEW_STATES.PENDING].includes(review)) {
    return { reviewState: REVIEW_STATES.REMOVED, caseState: CASE_STATES.RESOLVED, publicVisibility: false };
  }
  if (command.action === ACTIONS.DISMISS_REPORT && caseState === CASE_STATES.UNDER_REVIEW && review === REVIEW_STATES.PUBLISHED) {
    return { reviewState: REVIEW_STATES.PUBLISHED, caseState: CASE_STATES.RESOLVED, publicVisibility: true };
  }
  if (command.action === ACTIONS.APPEAL && caseState === CASE_STATES.RESOLVED && [REVIEW_STATES.HIDDEN, REVIEW_STATES.REMOVED].includes(review)) {
    return { reviewState: review, caseState: CASE_STATES.APPEAL_PENDING, publicVisibility: false };
  }
  if (command.action === ACTIONS.RESTORE && caseState === CASE_STATES.APPEAL_PENDING && [REVIEW_STATES.HIDDEN, REVIEW_STATES.REMOVED].includes(review)) {
    return { reviewState: REVIEW_STATES.PUBLISHED, caseState: CASE_STATES.APPEAL_RESOLVED, publicVisibility: true };
  }
  if (command.action === ACTIONS.DENY_APPEAL && caseState === CASE_STATES.APPEAL_PENDING && [REVIEW_STATES.HIDDEN, REVIEW_STATES.REMOVED].includes(review)) {
    return { reviewState: review, caseState: CASE_STATES.APPEAL_RESOLVED, publicVisibility: false };
  }
  return null;
}

function evaluateModeration(input, rawSnapshot) {
  let command;
  try { command = buildModerationCommand(input); }
  catch (error) { return outcome(DECISIONS.REJECT, 'invalid_command', null, { error: error.message }); }

  const snapshot = normalizeSnapshot(rawSnapshot);
  if (snapshot.source !== 'canonical_server' || !snapshot.authoritative) {
    return outcome(DECISIONS.UNAVAILABLE, 'non_canonical_snapshot', command);
  }
  if (!snapshot.actor.active) return outcome(DECISIONS.REJECT, 'actor_inactive', command);
  if (snapshot.actor.id !== command.actorId || snapshot.actor.role !== command.actorRole) {
    return outcome(DECISIONS.REJECT, 'actor_context_mismatch', command);
  }
  if (snapshot.review.id !== command.reviewId || snapshot.moderationCase.id !== command.caseId) {
    return outcome(DECISIONS.REJECT, 'subject_mismatch', command);
  }
  if (snapshot.review.revision !== command.expectedReviewRevision || snapshot.moderationCase.revision !== command.expectedCaseRevision) {
    return outcome(DECISIONS.CONFLICT, 'revision_mismatch', command);
  }
  if (!roleAllowed(command, snapshot)) return outcome(DECISIONS.REJECT, 'role_not_allowed', command);

  if (MODERATOR_ROLES.includes(snapshot.actor.role)
      && [snapshot.review.authorId, snapshot.review.reviewedUserId, snapshot.moderationCase.openedById].includes(snapshot.actor.id)) {
    return outcome(DECISIONS.REJECT, 'moderator_conflict_of_interest', command);
  }
  if ([ACTIONS.RESTORE, ACTIONS.DENY_APPEAL].includes(command.action)) {
    if (!command.priorDecisionEventId || command.priorDecisionEventId !== snapshot.moderationCase.lastDecisionEventId) {
      return outcome(DECISIONS.CONFLICT, 'prior_decision_mismatch', command);
    }
    if (snapshot.actor.id === snapshot.moderationCase.lastDecisionActorId) {
      return outcome(DECISIONS.REJECT, 'appeal_independence_required', command);
    }
  }
  if (command.action === ACTIONS.APPEAL && snapshot.actor.id !== snapshot.review.authorId) {
    return outcome(DECISIONS.REJECT, 'only_review_author_may_appeal', command);
  }

  const ledger = snapshot.ledger;
  if (ledger && text(ledger.idempotencyKey) === command.idempotencyKey) {
    if (text(ledger.intentFingerprint) !== command.intentFingerprint) {
      return outcome(DECISIONS.CONFLICT, 'idempotency_payload_conflict', command);
    }
    const state = slug(ledger.state);
    if (state === 'resolution_required') return outcome(DECISIONS.UNAVAILABLE, 'ledger_resolution_required', command);
    if (['accepted', 'committed', 'rejected'].includes(state)) {
      return outcome(DECISIONS.REPLAY, 'replay_same_outcome', command, {
        eventId: text(ledger.eventId) || command.deterministicEventId,
        outcomeFingerprint: text(ledger.outcomeFingerprint),
        priorState: state
      });
    }
  }

  const transition = nextState(command, snapshot);
  if (!transition) return outcome(DECISIONS.REJECT, 'invalid_state_transition', command);

  return outcome(DECISIONS.ACCEPT, 'transition_allowed', command, {
    eventId: command.deterministicEventId,
    previousEventHash: snapshot.previousEventHash,
    ...transition,
    reputationMutationAuthority: false,
    runtimeAuthority: false
  });
}

function buildEventEnvelope(result, snapshot, recordedAt) {
  if (!result || result.decision !== DECISIONS.ACCEPT || !result.command) throw new Error('accepted_result_required');
  const previousEventHash = text(result.previousEventHash || (snapshot && snapshot.previousEventHash));
  const event = {
    contractId: CONTRACT_ID,
    eventId: result.eventId,
    reviewId: result.command.reviewId,
    caseId: result.command.caseId,
    action: result.command.action,
    actorId: result.command.actorId,
    actorRole: result.command.actorRole,
    reasonCode: result.command.reasonCode,
    evidenceRefs: result.command.evidenceRefs,
    priorDecisionEventId: result.command.priorDecisionEventId,
    reviewState: result.reviewState,
    caseState: result.caseState,
    publicVisibility: result.publicVisibility,
    previousEventHash,
    recordedAt: text(recordedAt)
  };
  if (!event.recordedAt) throw new Error('recorded_at_required');
  return Object.freeze({ ...event, eventHash: sha256(stableJson(event)) });
}

function buildOutcomeFingerprint(result) {
  return sha256(stableJson({
    contractId: CONTRACT_ID,
    decision: result && result.decision,
    reason: result && result.reason,
    eventId: result && result.eventId,
    reviewState: result && result.reviewState,
    caseState: result && result.caseState,
    publicVisibility: result && result.publicVisibility
  }));
}

module.exports = Object.freeze({
  CONTRACT_ID, REVIEW_STATES, CASE_STATES, ACTIONS, DECISIONS,
  MODERATOR_ROLES, SENIOR_ROLES, REPORTER_ROLES, FORBIDDEN_KEYS,
  buildModerationCommand, evaluateModeration, buildEventEnvelope,
  buildOutcomeFingerprint, containsForbiddenRawData, stableJson, sha256
});
