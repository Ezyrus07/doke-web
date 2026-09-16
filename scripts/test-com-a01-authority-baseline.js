'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config', 'com-a01-authority-baseline.json'), 'utf8'));
const cases = [];

function test(name, condition) { cases.push({ name, passed: Boolean(condition) }); }

function discoveryReadiness(input) {
  const reasons = [];
  if (!input.canonicalProjection) reasons.push('CANONICAL_PROJECTION_REQUIRED');
  if (!['public', 'member', 'owner', 'operator'].includes(input.viewerScope)) reasons.push('VIEWER_SCOPE_REQUIRED');
  if (input.privateEnumerableToNonmember) reasons.push('PRIVATE_ENUMERATION_FORBIDDEN');
  if (!input.unavailableStateDefined) reasons.push('UNAVAILABLE_STATE_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

function membershipReadiness(input) {
  const reasons = [];
  if (!input.serverCommand) reasons.push('SERVER_COMMAND_REQUIRED');
  if (!input.stableRequestId) reasons.push('STABLE_REQUEST_ID_REQUIRED');
  if (!input.canonicalActorId) reasons.push('CANONICAL_ACTOR_REQUIRED');
  if (!input.communityRevision) reasons.push('COMMUNITY_REVISION_REQUIRED');
  if (input.privateCommunity && !input.invitationOrApprovedRequest) reasons.push('PRIVATE_MEMBERSHIP_PROOF_REQUIRED');
  if (!input.idempotentDecision) reasons.push('IDEMPOTENT_DECISION_REQUIRED');
  if (!input.auditEvent) reasons.push('AUDIT_EVENT_REQUIRED');
  if (!input.ownerInvariant) reasons.push('OWNER_INVARIANT_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

function roleDisciplineReadiness(input) {
  const reasons = [];
  if (!input.serverRoleVersion) reasons.push('SERVER_ROLE_VERSION_REQUIRED');
  if (!input.actorPermissionSnapshot) reasons.push('ACTOR_PERMISSION_REQUIRED');
  if (input.selfPromotion) reasons.push('SELF_PROMOTION_FORBIDDEN');
  if (input.grantsUnknownPermission) reasons.push('UNKNOWN_PERMISSION_FORBIDDEN');
  if (!input.caseId) reasons.push('DISCIPLINE_CASE_REQUIRED');
  if (!input.reason) reasons.push('DISCIPLINE_REASON_REQUIRED');
  if (!input.actorId) reasons.push('DISCIPLINE_ACTOR_REQUIRED');
  if (!input.revision) reasons.push('DISCIPLINE_REVISION_REQUIRED');
  if (!input.auditChain) reasons.push('AUDIT_CHAIN_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

function contentRealtimeReadiness(input) {
  const reasons = [];
  if (!input.serverContentCommand) reasons.push('CONTENT_COMMAND_REQUIRED');
  if (!input.contentLifecycle) reasons.push('CONTENT_LIFECYCLE_REQUIRED');
  if (!input.channelAccessProjection) reasons.push('CHANNEL_ACCESS_REQUIRED');
  if (!input.subscriptionAuthorization) reasons.push('SUBSCRIPTION_AUTHORIZATION_REQUIRED');
  if (!input.rateLimit) reasons.push('RATE_LIMIT_REQUIRED');
  if (!input.lostResponseReplay) reasons.push('LOST_RESPONSE_REPLAY_REQUIRED');
  if (input.clientSelectedPublished) reasons.push('CLIENT_PUBLICATION_FORBIDDEN');
  return { ready: reasons.length === 0, reasons };
}

function moderationMediaReadiness(input) {
  const reasons = [];
  if (!input.validTarget) reasons.push('VALID_TARGET_REQUIRED');
  if (!input.moderationCase) reasons.push('MODERATION_CASE_REQUIRED');
  if (!input.appendOnlyEvents) reasons.push('APPEND_ONLY_EVENTS_REQUIRED');
  if (!input.appealBoundary) reasons.push('APPEAL_BOUNDARY_REQUIRED');
  if (!input.operatorSeparation) reasons.push('OPERATOR_SEPARATION_REQUIRED');
  if (!input.uploadValidation) reasons.push('UPLOAD_VALIDATION_REQUIRED');
  if (!input.malwareScan) reasons.push('MALWARE_SCAN_REQUIRED');
  if (!input.retentionPolicy) reasons.push('RETENTION_POLICY_REQUIRED');
  return { ready: reasons.length === 0, reasons };
}

const validDiscovery = {
  canonicalProjection: true,
  viewerScope: 'member',
  privateEnumerableToNonmember: false,
  unavailableStateDefined: true
};
test('valid discovery readiness', discoveryReadiness(validDiscovery).ready);
[
  ['mock projection rejected', { canonicalProjection: false }, 'CANONICAL_PROJECTION_REQUIRED'],
  ['unknown viewer rejected', { viewerScope: 'browser-cache' }, 'VIEWER_SCOPE_REQUIRED'],
  ['private enumeration rejected', { privateEnumerableToNonmember: true }, 'PRIVATE_ENUMERATION_FORBIDDEN'],
  ['missing unavailable state rejected', { unavailableStateDefined: false }, 'UNAVAILABLE_STATE_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = discoveryReadiness({ ...validDiscovery, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validMembership = {
  serverCommand: true,
  stableRequestId: true,
  canonicalActorId: true,
  communityRevision: 'community-revision-v1',
  privateCommunity: true,
  invitationOrApprovedRequest: true,
  idempotentDecision: true,
  auditEvent: true,
  ownerInvariant: true
};
test('valid membership readiness', membershipReadiness(validMembership).ready);
[
  ['direct DML rejected', { serverCommand: false }, 'SERVER_COMMAND_REQUIRED'],
  ['unstable request rejected', { stableRequestId: false }, 'STABLE_REQUEST_ID_REQUIRED'],
  ['browser alias rejected', { canonicalActorId: false }, 'CANONICAL_ACTOR_REQUIRED'],
  ['missing revision rejected', { communityRevision: '' }, 'COMMUNITY_REVISION_REQUIRED'],
  ['private self join rejected', { invitationOrApprovedRequest: false }, 'PRIVATE_MEMBERSHIP_PROOF_REQUIRED'],
  ['non-idempotent decision rejected', { idempotentDecision: false }, 'IDEMPOTENT_DECISION_REQUIRED'],
  ['missing audit rejected', { auditEvent: false }, 'AUDIT_EVENT_REQUIRED'],
  ['owner invariant missing rejected', { ownerInvariant: false }, 'OWNER_INVARIANT_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = membershipReadiness({ ...validMembership, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validRole = {
  serverRoleVersion: 'roles-v1',
  actorPermissionSnapshot: true,
  selfPromotion: false,
  grantsUnknownPermission: false,
  caseId: 'case-1',
  reason: 'Repeated spam',
  actorId: 'operator-1',
  revision: 'revision-1',
  auditChain: true
};
test('valid role and discipline readiness', roleDisciplineReadiness(validRole).ready);
[
  ['browser role rejected', { serverRoleVersion: '' }, 'SERVER_ROLE_VERSION_REQUIRED'],
  ['permissionless actor rejected', { actorPermissionSnapshot: false }, 'ACTOR_PERMISSION_REQUIRED'],
  ['self promotion rejected', { selfPromotion: true }, 'SELF_PROMOTION_FORBIDDEN'],
  ['unknown permission rejected', { grantsUnknownPermission: true }, 'UNKNOWN_PERMISSION_FORBIDDEN'],
  ['caseless sanction rejected', { caseId: '' }, 'DISCIPLINE_CASE_REQUIRED'],
  ['reasonless sanction rejected', { reason: '' }, 'DISCIPLINE_REASON_REQUIRED'],
  ['anonymous moderator rejected', { actorId: '' }, 'DISCIPLINE_ACTOR_REQUIRED'],
  ['unversioned sanction rejected', { revision: '' }, 'DISCIPLINE_REVISION_REQUIRED'],
  ['mutable audit rejected', { auditChain: false }, 'AUDIT_CHAIN_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = roleDisciplineReadiness({ ...validRole, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validContent = {
  serverContentCommand: true,
  contentLifecycle: true,
  channelAccessProjection: true,
  subscriptionAuthorization: true,
  rateLimit: true,
  lostResponseReplay: true,
  clientSelectedPublished: false
};
test('valid content and realtime readiness', contentRealtimeReadiness(validContent).ready);
[
  ['local content rejected', { serverContentCommand: false }, 'CONTENT_COMMAND_REQUIRED'],
  ['instant publication rejected', { contentLifecycle: false }, 'CONTENT_LIFECYCLE_REQUIRED'],
  ['missing channel access rejected', { channelAccessProjection: false }, 'CHANNEL_ACCESS_REQUIRED'],
  ['open subscription rejected', { subscriptionAuthorization: false }, 'SUBSCRIPTION_AUTHORIZATION_REQUIRED'],
  ['missing rate limit rejected', { rateLimit: false }, 'RATE_LIMIT_REQUIRED'],
  ['lost-response duplication rejected', { lostResponseReplay: false }, 'LOST_RESPONSE_REPLAY_REQUIRED'],
  ['client-published status rejected', { clientSelectedPublished: true }, 'CLIENT_PUBLICATION_FORBIDDEN']
].forEach(([name, patch, reason]) => {
  const result = contentRealtimeReadiness({ ...validContent, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

const validModeration = {
  validTarget: true,
  moderationCase: true,
  appendOnlyEvents: true,
  appealBoundary: true,
  operatorSeparation: true,
  uploadValidation: true,
  malwareScan: true,
  retentionPolicy: true
};
test('valid moderation and media readiness', moderationMediaReadiness(validModeration).ready);
[
  ['unknown target rejected', { validTarget: false }, 'VALID_TARGET_REQUIRED'],
  ['direct sanction rejected', { moderationCase: false }, 'MODERATION_CASE_REQUIRED'],
  ['mutable events rejected', { appendOnlyEvents: false }, 'APPEND_ONLY_EVENTS_REQUIRED'],
  ['appealless removal rejected', { appealBoundary: false }, 'APPEAL_BOUNDARY_REQUIRED'],
  ['same operator review rejected', { operatorSeparation: false }, 'OPERATOR_SEPARATION_REQUIRED'],
  ['unchecked upload rejected', { uploadValidation: false }, 'UPLOAD_VALIDATION_REQUIRED'],
  ['unscanned media rejected', { malwareScan: false }, 'MALWARE_SCAN_REQUIRED'],
  ['undefined retention rejected', { retentionPolicy: false }, 'RETENTION_POLICY_REQUIRED']
].forEach(([name, patch, reason]) => {
  const result = moderationMediaReadiness({ ...validModeration, ...patch });
  test(name, !result.ready && result.reasons.includes(reason));
});

[
  'communityCommandAuthority',
  'membershipAuthority',
  'roleAuthority',
  'disciplineAuthority',
  'postPublicationAuthority',
  'communityRealtimeAuthority',
  'moderationAuthority',
  'mediaAuthority',
  'runtimeMutationAuthority',
  'stagingAuthority',
  'productionAuthority'
].forEach((key) => test(`contract has no ${key}`, contract.authority[key] === false));

Object.entries(contract.prohibitedEffects).forEach(([key, value]) => test(`effect ${key} remains false`, value === false));
contract.preservedBlockers.forEach((blocker) => test(`blocker ${blocker} remains preserved`, typeof blocker === 'string' && blocker.length > 4));
contract.nextSublots.forEach((sublot) => test(`next sublot documented: ${sublot}`, typeof sublot === 'string' && sublot.startsWith('COM-A0')));

const failedCases = cases.filter((item) => !item.passed).map((item) => item.name);
const result = {
  contractId: contract.contractId,
  total: cases.length,
  passed: cases.length - failedCases.length,
  failed: failedCases.length,
  status: failedCases.length ? 'failed' : 'passed',
  failedCases
};
console.log(JSON.stringify(result, null, 2));
if (failedCases.length) process.exit(1);
