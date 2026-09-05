#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3h = require('../backend/modules/communities/community-realtime-private-auth-r3h');
const config = require('../config/com-b03c-r3h-single-use-staging-diagnostic-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3H-SINGLE-USE-STAGING-DIAGNOSTIC-READINESS.json');

let checks = 0;
function ok(value, message) { assert.equal(value, true, message); checks += 1; }
function eq(actual, expected, message) { assert.deepEqual(actual, expected, message); checks += 1; }

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: r3h.PREDECESSOR_VALIDATION_ID,
    predecessorStatus: r3h.PREDECESSOR_STATUS,
    predecessorEvidenceHead: r3h.PREDECESSOR_EVIDENCE_HEAD,
    predecessorRecertRun: r3h.PREDECESSOR_RECERT_RUN,
    predecessorRecertJob: r3h.PREDECESSOR_RECERT_JOB,
    predecessorRecertSuccess: true,
    r3gContractId: r3g.CONTRACT_ID,
    scope: [...r3h.REQUIRED_SCOPE],
    caseIds: [...r3h.CASE_IDS],
    policySnapshotColumns: [...r3h.POLICY_SNAPSHOT_COLUMNS],
    snapshotPhases: [...r3h.SNAPSHOT_PHASES],
    freshAuthorizationPhraseDefined: true,
    singleUseTriggerContractDefined: true,
    executableWorkflowPrepared: true,
    authorizeJobPrepared: true,
    stagingCanaryJobPrepared: true,
    runAttemptOneRequired: true,
    triggerParentContinuityRequired: true,
    triggerOnlyCommitRequired: true,
    prOpenDraftUnmergedPreflightRequired: true,
    projectIdentityPreflightRequired: true,
    singleSyntheticIdentityRequired: true,
    sameIdentityTokenTopicAcrossCasesRequired: true,
    temporaryPolicyPairPerCaseRequired: true,
    fullCatalogSnapshotsRequired: true,
    preSubscribeStructuralGateRequired: true,
    negativeControlRequired: true,
    perCaseCleanupRequired: true,
    finalZeroResidueRequired: true,
    sanitizedEvidenceRequired: true,
    independentEvidenceVerifierRequired: true,
    artifactUploadRequired: true,
    noCommunityPostsExecutionRequired: true,
    noChannelMessagesExecutionRequired: true,
    noPublicationMutationRequired: true,
    noRuntimeDeployRequired: true,
    noProductionRequired: true,
    noMergeRequired: true,
    authorizationReceived: false,
    authorizationConsumed: false,
    executionAttempted: false,
    triggerExists: false,
    stagingAccessExecuted: false,
    remoteCredentialReadExecuted: false,
    remoteDependencyLoadExecuted: false,
    authIdentityMutationExecuted: false,
    syntheticAccountMaterializationExecuted: false,
    realtimePolicyMutationExecuted: false,
    realtimeSubscriptionExecuted: false,
    generalDomainMutationExecuted: false,
    publicationMutationExecuted: false,
    runtimeDeployExecuted: false,
    productionExecuted: false,
    mergeExecuted: false,
    ...overrides
  };
}

function authInput(overrides = {}) {
  return {
    authorizationPhrase: r3h.REQUIRED_AUTHORIZATION_PHRASE,
    targetEnvironment: 'staging',
    projectId: r3h.REQUIRED_PROJECT_ID,
    branch: r3h.REQUIRED_BRANCH,
    pullRequest: r3h.REQUIRED_PULL_REQUEST,
    runAttempt: 1,
    authorizationConsumed: false,
    executionAttempted: false,
    predecessorAuthorizationReusable: false,
    scope: [...r3h.REQUIRED_SCOPE],
    caseCount: r3h.CASE_IDS.length,
    syntheticAuthUserLimit: 1,
    concurrentTemporaryPolicyLimit: 2,
    ephemeralAuthIdentityAllowed: true,
    syntheticAccountMaterializationAllowed: true,
    temporaryRealtimePolicyLifecycleAllowed: true,
    privatePresenceSubscriptionAllowed: true,
    completeCaseTimePolicySnapshotsRequired: true,
    preSubscribeStructuralGateRequired: true,
    sameIdentityTokenTopicRequired: true,
    negativeControlRequired: true,
    perCaseCleanupRequired: true,
    finalZeroResidueRequired: true,
    sanitizedDiagnosticsRequired: true,
    noCommunityPostsExecutionRequired: true,
    noChannelMessagesExecutionRequired: true,
    noPublicationMutationRequired: true,
    noRuntimeDeployRequired: true,
    noProductionRequired: true,
    noMergeRequired: true,
    singleUse: true,
    reusableAfterFailure: false,
    ...overrides
  };
}

eq(r3h.CONTRACT_ID, config.contractId, 'contract id');
eq(r3h.PREDECESSOR_VALIDATION_ID, config.predecessor.validationId, 'predecessor validation');
eq(r3h.PREDECESSOR_STATUS, config.predecessor.status, 'predecessor status');
eq(r3h.PREDECESSOR_EVIDENCE_HEAD, config.predecessor.evidenceHead, 'predecessor head');
eq(r3h.PREDECESSOR_RECERT_RUN, config.predecessor.recertificationRun, 'predecessor run');
eq(r3h.PREDECESSOR_RECERT_JOB, config.predecessor.recertificationJob, 'predecessor job');
eq(r3h.REQUIRED_AUTHORIZATION_PHRASE, config.futureAuthorization.phrase, 'future phrase');
eq(r3h.TRIGGER_CONTRACT_ID, config.futureTrigger.contractId, 'trigger contract');
eq(r3h.TRIGGER_PATH, config.futureTrigger.path, 'trigger path');
eq([...r3h.REQUIRED_SCOPE], config.scope, 'scope');
eq(r3h.CASE_IDS.length, 9, 'case count');
eq(r3h.LIMITS.syntheticAuthUsers, 1, 'user limit');
eq(r3h.LIMITS.concurrentTemporaryPolicies, 2, 'policy limit');
ok(config.futureAuthorization.defined === true, 'phrase defined');
ok(config.futureAuthorization.received === false, 'not received');
ok(config.futureAuthorization.consumed === false, 'not consumed');
ok(config.futureAuthorization.executionAttempted === false, 'not attempted');
ok(config.futureAuthorization.triggerExists === false, 'trigger absent');
ok(config.authority.stagingReadAuthority === false, 'no staging read');
ok(config.authority.stagingMutationAuthority === false, 'no staging mutation');
ok(config.authority.triggerCreationAuthority === false, 'no trigger authority');
ok(config.effects.stagingAccessExecuted === false, 'no staging effect');
ok(config.effects.remoteCredentialReadExecuted === false, 'no credential read');
ok(config.effects.remoteDependencyLoadExecuted === false, 'no dep load');

const ready = r3h.evaluateRepositoryReadiness(readinessInput());
eq(ready.decision, 'repository_single_use_staging_diagnostic_boundary_ready_new_authorization_required', 'ready decision');
eq(ready.requiredAuthorizationPhrase, r3h.REQUIRED_AUTHORIZATION_PHRASE, 'ready phrase');
eq(ready.triggerPath, r3h.TRIGGER_PATH, 'ready trigger path');
ok(ready.triggerCreationAuthority === false, 'ready no trigger authority');
ok(ready.stagingReadAuthority === false, 'ready no staging read');
ok(ready.stagingMutationAuthority === false, 'ready no staging mutation');
ok(ready.exactRootCauseProven === false, 'root cause false');

for (const [name, value] of [
  ['predecessorValidationId', 'wrong'],
  ['predecessorStatus', 'wrong'],
  ['predecessorEvidenceHead', '0'.repeat(40)],
  ['predecessorRecertSuccess', false],
  ['r3gContractId', 'wrong'],
  ['authorizationReceived', true],
  ['authorizationConsumed', true],
  ['executionAttempted', true],
  ['triggerExists', true],
  ['stagingAccessExecuted', true],
  ['remoteCredentialReadExecuted', true],
  ['remoteDependencyLoadExecuted', true]
]) {
  ok(r3h.evaluateRepositoryReadiness(readinessInput({ [name]: value })).decision === 'blocked', `readiness blocks ${name}`);
}

const auth = r3h.evaluateStagingAuthorization(authInput());
eq(auth.decision, 'authorized_for_single_bounded_ephemeral_policy_identity_presence_diagnostic', 'auth decision');
ok(auth.triggerCreationAuthority === true, 'authorized trigger');
ok(auth.stagingReadAuthority === true, 'authorized read');
ok(auth.stagingMutationAuthority === true, 'authorized mutation');
ok(auth.authIdentityLifecycleAuthority === true, 'authorized identity');
ok(auth.syntheticAccountMaterializationAuthority === true, 'authorized synthetic account');
ok(auth.realtimePolicyLifecycleAuthority === true, 'authorized policy lifecycle');
ok(auth.realtimeSubscriptionAuthority === true, 'authorized subscription');
ok(auth.domainMutationAuthority === false, 'no general domain mutation');
ok(auth.publicationMutationAuthority === false, 'no publication');
ok(auth.runtimeDeployAuthority === false, 'no runtime deploy');
ok(auth.productionAuthority === false, 'no production');
ok(auth.pullRequestMergeAuthority === false, 'no merge');

for (const [name, value] of [
  ['authorizationPhrase', 'I_EXPLICITLY_AUTHORIZE_COM_B03C_R3C_ATTEMPT_2_READ_ONLY_REALTIME_MESSAGES_POLICY_CATALOG_INSPECTION_ON_DOKE_STAGING'],
  ['targetEnvironment', 'production'],
  ['projectId', 'wrong'],
  ['branch', 'MAIN'],
  ['pullRequest', 999],
  ['runAttempt', 2],
  ['authorizationConsumed', true],
  ['executionAttempted', true],
  ['predecessorAuthorizationReusable', true],
  ['caseCount', 8],
  ['syntheticAuthUserLimit', 2],
  ['concurrentTemporaryPolicyLimit', 3],
  ['reusableAfterFailure', true]
]) {
  ok(r3h.evaluateStagingAuthorization(authInput({ [name]: value })).decision === 'blocked', `authorization blocks ${name}`);
}

ok(evidence.authority.stagingReadAuthority === false, 'evidence no staging read');
ok(evidence.authority.stagingMutationAuthority === false, 'evidence no staging mutation');
ok(evidence.exactRootCauseProven === false, 'evidence root cause false');

process.stdout.write(`COM-B03C-R3H readiness checks passed: ${checks}/${checks}\n`);
