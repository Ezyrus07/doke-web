'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const contract = require('../backend/modules/communities/community-moderation-media-contract');
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '../tests/fixtures/com-a05-moderation-media-cases.json'), 'utf8'));

let checks = 0;
function check(value, message) {
  checks += 1;
  assert.ok(value, message);
}
function equal(actual, expected, message) {
  checks += 1;
  assert.strictEqual(actual, expected, message);
}
function deepMerge(base, patch) {
  if (patch === null || typeof patch !== 'object' || Array.isArray(patch)) return patch;
  const out = { ...(base && typeof base === 'object' && !Array.isArray(base) ? base : {}) };
  for (const [key, value] of Object.entries(patch)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = deepMerge(out[key], value);
    else out[key] = value;
  }
  return out;
}

equal(contract.CONTRACT_ID, 'com-a05-moderation-appeal-media-readiness-v1', 'contract id');
equal(contract.DECISIONS.length, 5, 'decision count');
equal(contract.COMMANDS.length, 14, 'command count');
equal(contract.TARGET_TYPES.length, 4, 'target type count');
equal(contract.REPORT_REASONS.length, 11, 'reason count');
equal(contract.REPORT_STATES.length, 10, 'report state count');
equal(contract.CONTENT_STATES.length, 5, 'content state count');
equal(contract.APPEAL_STATES.length, 5, 'appeal state count');
equal(contract.MEDIA_STATES.length, 9, 'media state count');
equal(contract.SCAN_RESULTS.length, 4, 'scan result count');
equal(contract.SANCTION_TYPES.length, 3, 'sanction count');
equal(contract.ALLOWED_MEDIA_TYPES.length, 5, 'media type count');
check(Object.isFrozen(contract.COMMANDS), 'commands frozen');
check(Object.isFrozen(contract.MAX_MEDIA_BYTES), 'max bytes frozen');
check(contract.containsSensitive({ nested: { token: 'x' } }), 'nested sensitive detected');
check(contract.containsSensitive({ raw_payload: 'x' }), 'raw payload detected');
check(!contract.containsSensitive({ contentDigest: 'a'.repeat(64) }), 'digest not sensitive');
check(contract.opaqueRefReady('opaque:community-media:item-1'), 'opaque ref accepted');
check(!contract.opaqueRefReady('https://example.com/item'), 'url rejected');
check(!contract.opaqueRefReady('opaque:item?token=x'), 'query rejected');
equal(contract.sha256('abc').length, 64, 'sha length');
equal(contract.sha256({ b: 2, a: 1 }), contract.sha256({ a: 1, b: 2 }), 'stable hash');

for (const item of fixture.cases) {
  const input = deepMerge(fixture.baseInput, item.patch);
  const outcome = contract.evaluateCommand(input);
  equal(outcome.decision, item.expectedDecision, `${item.name}: decision`);
  if (item.expectedReason) equal(outcome.reason, item.expectedReason, `${item.name}: reason`);
  equal(outcome.reportWriteAuthority, false, `${item.name}: report authority`);
  equal(outcome.moderationWriteAuthority, false, `${item.name}: moderation authority`);
  equal(outcome.disciplineWriteAuthority, false, `${item.name}: discipline authority`);
  equal(outcome.appealWriteAuthority, false, `${item.name}: appeal authority`);
  equal(outcome.mediaWriteAuthority, false, `${item.name}: media authority`);
  equal(outcome.storageAuthority, false, `${item.name}: storage authority`);
  equal(outcome.runtimeMutationAuthority, false, `${item.name}: runtime authority`);
  equal(outcome.stagingAuthority, false, `${item.name}: staging authority`);
  equal(outcome.productionAuthority, false, `${item.name}: production authority`);
  check(Object.isFrozen(outcome), `${item.name}: frozen outcome`);
  if (outcome.eventDraft) {
    equal(outcome.eventDraft.contractId, contract.CONTRACT_ID, `${item.name}: event contract`);
    equal(outcome.eventDraft.communityId, fixture.ids.community, `${item.name}: event community`);
    equal(outcome.eventDraft.intentFingerprint, outcome.identity.intentFingerprint, `${item.name}: event intent`);
    equal(outcome.eventDraft.eventHash.length, 64, `${item.name}: event hash`);
    check(Object.isFrozen(outcome.eventDraft), `${item.name}: frozen event`);
  }
}

const createAccepted = contract.evaluateCommand(fixture.baseInput);
check(createAccepted.identity.idempotencyKey.length === 64, 'identity key sha');
check(createAccepted.identity.intentFingerprint.length === 64, 'intent sha');
check(createAccepted.identity.subjectKey.length === 64, 'subject sha');
check(/^00000000-0000-4000-8000-[0-9a-f]{12}$/.test(createAccepted.reportId), 'deterministic report id');
equal(createAccepted.targetVisibilityChanged, false, 'report non destructive');

const replay = contract.evaluateCommand({
  ...fixture.baseInput,
  idempotencyRecord: {
    idempotencyKey: createAccepted.identity.idempotencyKey,
    intentFingerprint: createAccepted.identity.intentFingerprint,
    outcome: { reportId: createAccepted.reportId }
  }
});
equal(replay.decision, 'replay', 'idempotent replay');
equal(replay.reason, 'IDEMPOTENT_REPLAY', 'replay reason');

const conflict = contract.evaluateCommand({
  ...fixture.baseInput,
  payload: { reason: 'spam', summary: 'Changed summary' },
  idempotencyRecord: {
    idempotencyKey: createAccepted.identity.idempotencyKey,
    intentFingerprint: createAccepted.identity.intentFingerprint
  }
});
equal(conflict.decision, 'conflict', 'idempotency mutation conflict');

const event1 = contract.buildEventDraft(fixture.baseInput, createAccepted.identity, 'report_created');
const event2 = contract.buildEventDraft(
  { ...fixture.baseInput, ledgerHead: { revision: event1.revision, eventHash: event1.eventHash } },
  createAccepted.identity,
  'report_triaged'
);
equal(event1.revision, 1, 'first event revision');
equal(event1.previousEventHash, null, 'first event head');
equal(event2.revision, 2, 'second event revision');
equal(event2.previousEventHash, event1.eventHash, 'event chain');
check(event2.eventHash !== event1.eventHash, 'event hash changes');

for (const type of contract.ALLOWED_MEDIA_TYPES) {
  check(Number.isInteger(contract.MAX_MEDIA_BYTES[type]), `max bytes for ${type}`);
  check(contract.MAX_MEDIA_BYTES[type] > 0, `positive max bytes for ${type}`);
}
for (const command of contract.COMMANDS) check(typeof command === 'string' && command.length > 2, `valid command ${command}`);
for (const reason of contract.REPORT_REASONS) check(typeof reason === 'string' && reason.length > 2, `valid reason ${reason}`);
for (const state of contract.REPORT_STATES) check(typeof state === 'string' && state.length > 2, `valid report state ${state}`);
for (const state of contract.MEDIA_STATES) check(typeof state === 'string' && state.length > 2, `valid media state ${state}`);

const blocked = contract.assessReadiness({});
equal(blocked.structurallyReady, false, 'readiness blocked');
equal(blocked.reasons.length, 10, 'all readiness reasons');
equal(blocked.moderationWriteAuthority, false, 'readiness moderation blocked');
equal(blocked.disciplineWriteAuthority, false, 'readiness discipline blocked');
equal(blocked.mediaWriteAuthority, false, 'readiness media blocked');
equal(blocked.runtimeMutationAuthority, false, 'readiness runtime blocked');
equal(blocked.productionAuthority, false, 'readiness production blocked');

const structurallyReady = contract.assessReadiness({
  approvedPolicy: true,
  serverCommandHandler: true,
  canonicalMembershipProjection: true,
  canonicalGovernanceProjection: true,
  appendOnlyAuditLedger: true,
  mediaQuarantineStorage: true,
  authenticatedScanner: true,
  independentAppealQueue: true,
  rateLimitAuthority: true,
  stagingValidated: true
});
equal(structurallyReady.structurallyReady, true, 'structurally ready');
equal(structurallyReady.reasons.length, 0, 'no readiness reasons');
equal(structurallyReady.runtimeMutationAuthority, false, 'structural readiness no runtime authority');
equal(structurallyReady.productionAuthority, false, 'structural readiness no production authority');

console.log(`COM-A05 conformance passed: ${checks}/${checks}`);
