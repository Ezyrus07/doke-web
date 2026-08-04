'use strict';

const assert = require('node:assert/strict');
const {
  REQUIRED_EVALUATION_DIMENSIONS,
  REQUIRED_APPROVAL_ROLES,
  REQUIRED_POLICY_DECISIONS,
  SELECTION_PHRASE,
  STAGING_PHRASE,
  buildDecisionPacket,
  evaluateDecisionPacket,
  buildSelectionChallenge,
  validateSelectionAuthorization,
  buildStagingAuthorizationChallenge,
  validateStagingAuthorization,
  sha256
} = require('../backend/modules/payments/payment-provider-selection-handoff');

const NOW = '2026-08-03T16:30:00.000Z';
const HEAD = 'e0ee2c0bd1a97fec8dc1c2aeea574cbed4b2ebd6';

function createEvaluation() {
  return Object.fromEntries(REQUIRED_EVALUATION_DIMENSIONS.map((dimension, index) => [dimension, {
    status: index === 8 ? 'conditional' : 'supported',
    evidenceRef: `evidence://${dimension}`,
    mitigation: index === 8 ? 'Named escalation owner and contractual response window required before staging.' : undefined
  }]));
}

function createPolicies() {
  return Object.fromEntries(REQUIRED_POLICY_DECISIONS.map((policy) => [policy, {
    status: 'approved',
    decisionRef: `decision://${policy}`
  }]));
}

function createApprovals() {
  const approvers = ['legal-owner', 'accounting-owner', 'finance-owner', 'security-owner', 'operations-owner'];
  return Object.fromEntries(REQUIRED_APPROVAL_ROLES.map((role, index) => [role, {
    status: 'approved',
    approverId: approvers[index],
    rationale: `Qualified approval for ${role}`,
    approvedAt: '2026-08-03T15:00:00.000Z',
    expiresAt: '2026-08-10T15:00:00.000Z'
  }]));
}

function createPacket(overrides = {}) {
  return buildDecisionPacket({
    packetVersion: 'pay-psp-decision-v1',
    candidateId: 'psp-candidate-alpha',
    exactGitHead: HEAD,
    createdAt: '2026-08-03T15:00:00.000Z',
    expiresAt: '2026-08-10T15:00:00.000Z',
    evaluation: createEvaluation(),
    policyDecisions: createPolicies(),
    approvals: createApprovals(),
    unresolvedBlockers: [],
    advisoryScore: 91,
    ...overrides
  });
}

function expectCode(fn, code) {
  assert.throws(fn, (error) => error && error.code === code, `Expected ${code}`);
}

const packet = createPacket();
const readiness = evaluateDecisionPacket(packet, { now: NOW });
assert.equal(readiness.readyForExplicitSelection, true);
assert.equal(readiness.selected, false);
assert.equal(readiness.automaticSelectionAllowed, false);
assert.equal(readiness.scoreMaySelectProvider, false);
assert.deepEqual(readiness.blockingReasons, []);

const noApprovalsPacket = createPacket({ approvals: {} });
const noApprovals = evaluateDecisionPacket(noApprovalsPacket, { now: NOW });
assert.equal(noApprovals.readyForExplicitSelection, false);
assert(noApprovals.blockingReasons.includes('approval_missing:legal'));
assert.equal(noApprovals.advisoryScore, 91);
assert.equal(noApprovals.scoreMaySelectProvider, false);
expectCode(() => buildSelectionChallenge(noApprovalsPacket, { now: NOW }), 'DOKE_PAYMENT_PROVIDER_SELECTION_BLOCKED');

const unsupportedEvaluation = createEvaluation();
unsupportedEvaluation.signed_webhooks_idempotency_and_event_query = {
  status: 'unsupported',
  evidenceRef: 'evidence://unsupported'
};
const unsupportedPacket = createPacket({ evaluation: unsupportedEvaluation });
assert.equal(evaluateDecisionPacket(unsupportedPacket, { now: NOW }).readyForExplicitSelection, false);

const staleApprovals = createApprovals();
staleApprovals.legal.expiresAt = '2026-08-03T16:00:00.000Z';
const stalePacket = createPacket({ approvals: staleApprovals });
assert(evaluateDecisionPacket(stalePacket, { now: NOW }).blockingReasons.includes('approval_expired:legal'));

const unresolvedPacket = createPacket({ unresolvedBlockers: ['legal_opinion_pending'] });
assert(evaluateDecisionPacket(unresolvedPacket, { now: NOW }).blockingReasons.includes('unresolved_blockers_present'));

const driftedPacket = { ...packet, advisoryScore: 99 };
assert(evaluateDecisionPacket(driftedPacket, { now: NOW }).blockingReasons.includes('packet_fingerprint_drift'));

const selectionChallenge = buildSelectionChallenge(packet, { now: NOW });
assert.equal(selectionChallenge.phrase, SELECTION_PHRASE);
assert.equal(selectionChallenge.remoteActionsAllowedByThisContract, false);
assert(selectionChallenge.prohibitedEffects.includes('provider_account_creation'));
assert(selectionChallenge.prohibitedEffects.includes('deployment'));
assert(selectionChallenge.prohibitedEffects.includes('production_change'));

function selectionAuthorization(overrides = {}) {
  return {
    phrase: SELECTION_PHRASE,
    scope: selectionChallenge.scope,
    candidateId: selectionChallenge.candidateId,
    packetFingerprint: selectionChallenge.packetFingerprint,
    exactGitHead: selectionChallenge.exactGitHead,
    issuedAt: '2026-08-03T16:25:00.000Z',
    expiresAt: '2026-08-03T16:35:00.000Z',
    nonce: 'selection-once-001',
    oneShot: true,
    productionAllowed: false,
    ...overrides
  };
}

expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization({ phrase: 'Próximo' }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization({ exactGitHead: '0'.repeat(40) }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization({ packetFingerprint: 'f'.repeat(64) }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization({ expiresAt: '2026-08-03T16:29:00.000Z' }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization({ productionAllowed: true }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_SELECTION_AUTHORIZATION_INVALID'
);

const selectionLedger = new Set();
const selection = validateSelectionAuthorization(selectionChallenge, selectionAuthorization(), {
  now: NOW,
  consumedNonces: selectionLedger
});
assert.equal(selection.authorized, true);
assert.equal(selection.scope, 'provider_specific_adapter_preparation_only');
assert.equal(selection.remoteActionsAllowedByThisContract, false);
assert.equal(selection.requiresSeparateOperationalAuthorizations, true);
assert.equal(selection.productionAllowed, false);
assert.deepEqual(selection.allowedEffects, [
  'create_provider_specific_adapter_source_without_secrets',
  'define_environment_variable_names_without_values',
  'run_local_adapter_tests_without_network'
]);
expectCode(
  () => validateSelectionAuthorization(selectionChallenge, selectionAuthorization(), { now: NOW, consumedNonces: selectionLedger }),
  'DOKE_PAYMENT_PROVIDER_AUTHORIZATION_REPLAYED'
);

const stagingChallenge = buildStagingAuthorizationChallenge(selection, {
  adapterVersion: 'pay-adapter-1.0.0',
  stagingProjectId: 'staging-doke-payments',
  readinessEvidenceHash: sha256('sanitized-readiness-evidence'),
  sandboxMode: true,
  maximumBudgetMinor: 0,
  productionExplicitlyDenied: true
});
assert.equal(stagingChallenge.phrase, STAGING_PHRASE);
assert.equal(stagingChallenge.remoteActionsAllowedByThisContract, false);
assert.equal(stagingChallenge.requiresExternalAuthorizedExecutor, true);

function stagingAuthorization(overrides = {}) {
  return {
    phrase: stagingChallenge.phrase,
    scope: stagingChallenge.scope,
    candidateId: stagingChallenge.candidateId,
    packetFingerprint: stagingChallenge.packetFingerprint,
    exactGitHead: stagingChallenge.exactGitHead,
    adapterVersion: stagingChallenge.adapterVersion,
    stagingProjectId: stagingChallenge.stagingProjectId,
    readinessEvidenceHash: stagingChallenge.readinessEvidenceHash,
    sandboxMode: stagingChallenge.sandboxMode,
    maximumBudgetMinor: stagingChallenge.maximumBudgetMinor,
    issuedAt: '2026-08-03T16:25:00.000Z',
    expiresAt: '2026-08-03T16:35:00.000Z',
    nonce: 'staging-once-001',
    oneShot: true,
    productionAllowed: false,
    ...overrides
  };
}

expectCode(
  () => validateStagingAuthorization(stagingChallenge, stagingAuthorization({ adapterVersion: 'pay-adapter-2.0.0' }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateStagingAuthorization(stagingChallenge, stagingAuthorization({ stagingProjectId: 'production-doke' }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID'
);
expectCode(
  () => validateStagingAuthorization(stagingChallenge, stagingAuthorization({ maximumBudgetMinor: 1 }), { now: NOW, consumedNonces: new Set() }),
  'DOKE_PAYMENT_PROVIDER_STAGING_AUTHORIZATION_INVALID'
);

const stagingLedger = new Set();
const stagingAuthorizationResult = validateStagingAuthorization(stagingChallenge, stagingAuthorization(), {
  now: NOW,
  consumedNonces: stagingLedger
});
assert.equal(stagingAuthorizationResult.authorizationValidated, true);
assert.equal(stagingAuthorizationResult.repositoryExecutionPerformed, false);
assert.equal(stagingAuthorizationResult.remoteActionsAllowedByThisContract, false);
assert.equal(stagingAuthorizationResult.requiresExternalAuthorizedExecutor, true);
assert.equal(stagingAuthorizationResult.productionAllowed, false);
expectCode(
  () => validateStagingAuthorization(stagingChallenge, stagingAuthorization(), { now: NOW, consumedNonces: stagingLedger }),
  'DOKE_PAYMENT_PROVIDER_AUTHORIZATION_REPLAYED'
);

assert.equal(packet.networkAccess, false);
assert.equal(packet.remoteMutationAuthority, 'none');
assert.equal(packet.productionAllowed, false);

console.log('PAY-A06 provider selection and legal/accounting handoff runtime test passed.');
