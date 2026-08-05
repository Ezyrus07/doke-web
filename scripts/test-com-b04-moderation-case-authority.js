'use strict';

const assert = require('assert');
const contract = require('../backend/modules/communities/community-moderation-case-authority');

let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.strictEqual(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

const ids = {
  actor: '11111111-1111-4111-8111-111111111111',
  reviewer: '22222222-2222-4222-8222-222222222222',
  approver: '33333333-3333-4333-8333-333333333333',
  targetOwner: '44444444-4444-4444-8444-444444444444',
  reporter: '55555555-5555-4555-8555-555555555555',
  community: '66666666-6666-4666-8666-666666666666',
  target: '77777777-7777-4777-8777-777777777777',
  case: '88888888-8888-4888-8888-888888888888',
  evidence: '99999999-9999-4999-8999-999999999999',
  request: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  appeal: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  sanction: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
};
const digest = contract.sha256('digest');
const policy = {
  status: 'approved',
  version: '2026.08.05',
  fingerprint: contract.sha256('policy'),
  automaticEnforcementAllowed: false,
  reportCountCreatesSanction: false,
  scanResultCreatesFinalDecision: false
};
const community = { id: ids.community, source: 'canonical_server', complete: true, revision: 12, status: 'active' };
const actor = (id, role = 'moderator') => ({
  id, role, status: 'active', authenticated: true,
  source: 'server_verified_authenticated_session', aal: 'aal1'
});
const authz = (id, enabled = {}) => ({
  actorId: id,
  source: 'canonical_server',
  complete: true,
  revision: 5,
  capabilities: enabled
});
const target = {
  id: ids.target,
  communityId: ids.community,
  ownerId: ids.targetOwner,
  type: 'community_post',
  state: 'published',
  source: 'canonical_server',
  complete: true,
  revision: 7
};
const evidence = {
  id: ids.evidence,
  kind: 'content_snapshot',
  reference: 'opaque:moderation:evidence:001',
  digest,
  collectedAt: '2026-08-05T20:00:00-03:00',
  retentionClass: 'standard',
  rawPayloadIncluded: false
};
const baseCase = (overrides = {}) => ({
  id: ids.case,
  communityId: ids.community,
  kind: 'content_report',
  state: 'evidence_collection',
  reporterId: ids.reporter,
  target,
  evidence: [evidence],
  recommendations: [],
  approvals: [],
  ledgerHead: { revision: 3, eventHash: contract.sha256('head') },
  source: 'canonical_server',
  complete: true,
  revision: 3,
  ...overrides
});
const input = (command, actorId, capabilities, overrides = {}) => ({
  command,
  actor: actor(actorId),
  authorization: authz(actorId, capabilities),
  clientRequestId: ids.request,
  community,
  case: baseCase(),
  expectedRevision: 3,
  policy,
  now: '2026-08-05T20:05:00-03:00',
  payload: {},
  ...overrides
});

equal(contract.CONTRACT_ID, 'com-b04-moderation-case-authority-v1', 'contract id');
equal(contract.COMMANDS.length, 10, 'command count');
equal(contract.CASE_KINDS.length, 3, 'case kinds');
equal(contract.REPOSITORY_METHODS.length, 8, 'repository methods');
ok(Object.isFrozen(contract.COMMANDS), 'commands frozen');
ok(Object.isFrozen(contract.REPOSITORY_METHODS), 'repository methods frozen');

const opened = contract.evaluateCommand({
  ...input('open_case', ids.actor, {}, { case: null, expectedRevision: 0, target }),
  payload: {
    kind: 'content_report',
    initialEvidenceKind: 'report_statement',
    initialEvidenceRef: 'opaque:moderation:statement:001',
    initialEvidenceDigest: contract.sha256('statement')
  }
});
equal(opened.decision, 'accept', 'open accepted');
equal(opened.initialState, 'open', 'open state');
equal(opened.visibilityChanged, false, 'no visibility change');
equal(opened.transactionPlan.isolation, 'serializable', 'serializable');
equal(opened.transactionPlan.commitAuthority, false, 'no commit authority');
ok(Object.isFrozen(opened), 'result frozen');

const sensitive = contract.evaluateCommand({
  ...input('open_case', ids.actor, {}, { case: null, expectedRevision: 0, target }),
  payload: { kind: 'content_report', initialEvidenceKind: 'report_statement', initialEvidenceRef: 'opaque:valid:statement', initialEvidenceDigest: digest, email: 'x@y.z' }
});
equal(sensitive.reason, 'RAW_SENSITIVE_DATA_PROHIBITED', 'sensitive rejected');
const clientAuthz = contract.evaluateCommand({
  ...input('attach_evidence', ids.reviewer, { reviewEvidence: true }),
  authorization: { ...authz(ids.reviewer, { reviewEvidence: true }), source: 'browser_claim' },
  payload: { evidence }
});
equal(clientAuthz.reason, 'CANONICAL_AUTHORIZATION_REQUIRED', 'browser auth rejected');

const newEvidence = { ...evidence, id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', digest: contract.sha256('new'), reference: 'opaque:moderation:evidence:002' };
const attached = contract.evaluateCommand({
  ...input('attach_evidence', ids.reviewer, { reviewEvidence: true }),
  payload: { evidence: newEvidence }
});
equal(attached.decision, 'accept', 'evidence accepted');
equal(attached.transactionPlan.projectionPatch.state, 'evidence_collection', 'evidence state');
const duplicateEvidence = contract.evaluateCommand({
  ...input('attach_evidence', ids.reviewer, { reviewEvidence: true }),
  payload: { evidence }
});
equal(duplicateEvidence.decision, 'replay', 'evidence replay');

const recommendationResult = contract.evaluateCommand({
  ...input('recommend_decision', ids.reviewer, { recommendDecisions: true }),
  payload: { outcome: 'mute_member', expiresAt: '2026-08-10T20:05:00-03:00', automatic: false }
});
equal(recommendationResult.decision, 'accept', 'recommendation accepted');
equal(recommendationResult.recommendation.outcome, 'mute_member', 'outcome');
equal(recommendationResult.recommendation.sanction.type, 'mute', 'sanction type');
equal(recommendationResult.targetMutationApplied, false, 'no target mutation');
equal(recommendationResult.transactionPlan.sequence.includes('insertDecisionRecord'), true, 'decision record planned');
const automatic = contract.evaluateCommand({
  ...input('recommend_decision', ids.reviewer, { recommendDecisions: true }),
  payload: { outcome: 'hide_content', automatic: true }
});
equal(automatic.reason, 'AUTOMATIC_FINAL_DECISION_PROHIBITED', 'automatic prohibited');
const tooLong = contract.evaluateCommand({
  ...input('recommend_decision', ids.reviewer, { recommendDecisions: true }),
  payload: { outcome: 'mute_member', expiresAt: '2027-08-10T20:05:00-03:00' }
});
equal(tooLong.reason, 'SANCTION_DURATION_EXCEEDS_POLICY', 'duration bounded');

const approvalCase = baseCase({ state: 'decision_pending_approval', revision: 4 });
const selfApproval = contract.evaluateCommand({
  ...input('approve_decision', ids.reviewer, { approveDecisions: true }, { case: approvalCase, expectedRevision: 4 }),
  payload: { recommendation: recommendationResult.recommendation }
});
equal(selfApproval.reason, 'RECOMMENDER_CANNOT_SELF_APPROVE', 'self approval rejected');
const approved = contract.evaluateCommand({
  ...input('approve_decision', ids.approver, { approveDecisions: true }, { case: approvalCase, expectedRevision: 4 }),
  payload: { recommendation: recommendationResult.recommendation }
});
equal(approved.decision, 'accept', 'approval accepted');
equal(approved.dualControlSatisfied, true, 'dual control');
equal(approved.runtimeApplied, false, 'runtime still blocked');
equal(approved.actionDraft.outcome, 'mute_member', 'action drafted');
equal(approved.transactionPlan.sequence.includes('appendSanctionEvent'), true, 'sanction event planned');

const mediaTarget = { ...target, type: 'media_asset', contentDigest: contract.sha256('media') };
const mediaCase = baseCase({ kind: 'media_review', target: mediaTarget });
const scan = {
  result: 'clean',
  contentDigest: mediaTarget.contentDigest,
  scannerIdHash: contract.sha256('scanner'),
  engineVersion: 'scanner-1',
  scannedAt: '2026-08-05T20:01:00-03:00'
};
const scanned = contract.evaluateCommand({
  ...input('record_media_scan', ids.actor, { operateMedia: true }, { case: mediaCase, actor: actor(ids.actor, 'system_worker') }),
  payload: { scan }
});
equal(scanned.decision, 'accept', 'scan accepted');
equal(scanned.automaticDisposition, false, 'scan not final');
equal(scanned.transactionPlan.sequence.includes('appendMediaReviewEvent'), true, 'media event planned');

const originalDecision = {
  outcome: 'hide_content',
  recommenderId: ids.reviewer,
  approverId: ids.approver,
  decisionHash: contract.sha256('decision'),
  decidedAt: '2026-08-04T20:00:00-03:00',
  sanctionType: null
};
const appealCase = baseCase({ state: 'resolved', revision: 8, originalDecision });
const appealOpened = contract.evaluateCommand({
  ...input('open_appeal', ids.targetOwner, {}, { case: appealCase, expectedRevision: 8 }),
  payload: { statementRef: 'opaque:moderation:appeal:001', statementDigest: contract.sha256('appeal') }
});
equal(appealOpened.decision, 'accept', 'appeal opened');
equal(appealOpened.priorDecisionImmutable, true, 'prior immutable');
const foreignAppeal = contract.evaluateCommand({
  ...input('open_appeal', ids.actor, {}, { case: appealCase, expectedRevision: 8 }),
  payload: { statementRef: 'opaque:moderation:appeal:001', statementDigest: contract.sha256('appeal') }
});
equal(foreignAppeal.reason, 'ONLY_AFFECTED_SUBJECT_MAY_APPEAL', 'foreign appeal rejected');

const appealReviewCase = baseCase({
  state: 'appeal_review',
  revision: 9,
  originalDecision,
  appeal: { id: ids.appeal, appellantId: ids.targetOwner, state: 'under_review' }
});
const appealRecommendation = contract.evaluateCommand({
  ...input('recommend_appeal_decision', ids.actor, { reviewAppeals: true }, { case: appealReviewCase, expectedRevision: 9 }),
  payload: { outcome: 'overturn' }
});
equal(appealRecommendation.decision, 'accept', 'appeal recommendation accepted');
const appealApprovalCase = { ...appealReviewCase, state: 'appeal_pending_approval', revision: 10 };
const appealApproved = contract.evaluateCommand({
  ...input('approve_appeal_decision', ids.approver, { approveAppeals: true }, { case: appealApprovalCase, expectedRevision: 10 }),
  payload: { recommendation: appealRecommendation.recommendation }
});
equal(appealApproved.decision, 'reject', 'original approver cannot approve appeal');
equal(appealApproved.reason, 'INDEPENDENT_APPEAL_APPROVER_REQUIRED', 'appeal independence');

const independentAppealApprover = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const appealApprovedIndependent = contract.evaluateCommand({
  ...input('approve_appeal_decision', independentAppealApprover, { approveAppeals: true }, { case: appealApprovalCase, expectedRevision: 10 }),
  payload: { recommendation: appealRecommendation.recommendation }
});
equal(appealApprovedIndependent.decision, 'accept', 'appeal independently approved');
equal(appealApprovedIndependent.remediationDraft.action, 'reverse_prior_outcome', 'reversal drafted');
equal(appealApprovedIndependent.remediationDraft.runtimeApplied, false, 'appeal runtime blocked');

const expired = contract.evaluateCommand({
  ...input('expire_sanction', ids.actor, {}, { actor: actor(ids.actor, 'system_worker') }),
  payload: { sanction: { id: ids.sanction, type: 'mute', state: 'active', expiresAt: '2026-08-05T19:00:00-03:00' } }
});
equal(expired.decision, 'accept', 'expiry accepted');
equal(expired.transactionPlan.sequence.includes('appendSanctionEvent'), true, 'expiry event planned');
const closed = contract.evaluateCommand({
  ...input('close_case', ids.approver, { closeCases: true }, { case: baseCase({ state: 'resolved' }) }),
  payload: {}
});
equal(closed.decision, 'accept', 'close accepted');
equal(closed.transactionPlan.projectionPatch.state, 'closed', 'closed state');

const blocked = contract.assessReadiness({});
equal(blocked.structurallyReady, false, 'readiness blocked');
ok(blocked.reasons.includes('APPROVED_POLICY_REQUIRED'), 'policy blocker');
const ready = contract.assessReadiness({
  approvedPolicy: true,
  serverVerifiedSession: true,
  canonicalAuthorizationProjection: true,
  immutableCaseStore: true,
  idempotencyLedger: true,
  appendOnlyEventLedger: true,
  dualControlQueue: true,
  independentAppealQueue: true,
  mediaQuarantineStore: true,
  authenticatedScanner: true,
  retentionSchedule: true,
  stagingValidated: true
});
equal(ready.structurallyReady, true, 'structural readiness');
equal(ready.repositoryWriteAuthority, false, 'no repository write authority');
equal(ready.productionAuthority, false, 'no production authority');

console.log(`COM-B04 conformance passed: ${checks}/${checks}`);
