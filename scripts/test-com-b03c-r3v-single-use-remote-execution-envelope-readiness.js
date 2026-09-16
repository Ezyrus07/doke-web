#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const r3v = require('../backend/modules/communities/community-realtime-private-auth-r3v');
const r3u = require('../backend/modules/communities/community-realtime-private-auth-r3u');
const r3t = require('../backend/modules/communities/community-realtime-private-auth-r3t');
const r3s = require('../backend/modules/communities/community-realtime-private-auth-r3s');
const r3q = require('../backend/modules/communities/community-realtime-private-auth-r3q');
const r3g = require('../backend/modules/communities/community-realtime-private-auth-r3g');
const r3k = require('../backend/modules/communities/community-realtime-private-auth-r3k');
const executor = require('./execute-com-b03c-r3v-single-use-remote-execution-envelope');
const config = require('../config/com-b03c-r3v-single-use-remote-execution-envelope-readiness.json');
const evidence = require('../docs/validation/COM-B03C-R3V-SINGLE-USE-REMOTE-EXECUTION-ENVELOPE-READINESS.json');

function readinessInput(overrides = {}) {
  return {
    predecessorValidationId: config.predecessor.validationId,
    predecessorStatus: config.predecessor.status,
    predecessorHead: config.predecessor.head,
    predecessorRecertRun: config.predecessor.recertRun,
    predecessorRecertJob: config.predecessor.recertJob,
    predecessorRecertSuccess: config.predecessor.recertSuccess,
    predecessorMatrixRecertRun: config.predecessor.matrixRecertRun,
    predecessorMatrixRecertJob: config.predecessor.matrixRecertJob,
    predecessorMatrixRecertSuccess: config.predecessor.matrixRecertSuccess,
    matrixVersion: config.matrixVersion,
    maturity: config.maturity,
    productionGate: config.productionGate,
    r3uContractId: config.continuity.r3uContractId,
    r3tContractId: config.continuity.r3tContractId,
    r3sContractId: config.continuity.r3sContractId,
    r3qContractId: config.continuity.r3qContractId,
    r3gContractId: config.continuity.r3gContractId,
    r3kContractId: config.continuity.r3kContractId,
    futureTriggerPath: config.continuity.futureTriggerPath,
    executionPhases: [...config.continuity.executionPhases],
    adapterMethods: [...config.continuity.adapterMethods],
    bridgeControls: [...config.continuity.bridgeControls],
    credentialNames: [...config.continuity.credentialNames],
    remoteDependencies: [...config.continuity.remoteDependencies],
    ...config.controls,
    ...config.prohibitedPreparation,
    ...overrides
  };
}

async function main() {
  assert.equal(config.continuity.r3uContractId, r3u.CONTRACT_ID);
  assert.equal(config.continuity.r3tContractId, r3t.CONTRACT_ID);
  assert.equal(config.continuity.r3sContractId, r3s.CONTRACT_ID);
  assert.equal(config.continuity.r3qContractId, r3q.CONTRACT_ID);
  assert.equal(config.continuity.r3gContractId, r3g.CONTRACT_ID);
  assert.equal(config.continuity.r3kContractId, r3k.CONTRACT_ID);
  assert.deepEqual(config.continuity.adapterMethods, [...r3q.ADAPTER_METHODS]);
  assert.deepEqual(config.continuity.credentialNames, [...r3k.CREDENTIAL_NAMES]);
  assert.deepEqual(config.continuity.remoteDependencies, [...r3k.REMOTE_DEPENDENCIES]);

  const decision = r3v.evaluateRepositoryReadiness(readinessInput());
  assert.equal(decision.decision, 'repository_single_use_remote_execution_envelope_ready_no_remote_authority');
  assert.equal(decision.repositoryRemoteEnvelopeAuthority, true);
  for (const key of [
    'remoteExecutionAuthority', 'remoteAdapterActivationAuthority', 'triggerCreationAuthority',
    'stagingReadAuthority', 'stagingMutationAuthority', 'remoteCredentialReadAuthority',
    'remoteDependencyLoadAuthority', 'networkAuthority', 'realtimeSubscriptionAuthority',
    'authIdentityLifecycleAuthority', 'runtimeChangeAuthority', 'productionAuthority',
    'pullRequestMergeAuthority', 'exactRootCauseProven', 'causalPromotionAllowed'
  ]) assert.equal(decision[key], false, key);

  for (const field of Object.keys(config.controls)) {
    assert.equal(r3v.evaluateRepositoryReadiness(readinessInput({ [field]: false })).decision, 'blocked_repository_only', field);
  }
  for (const field of Object.keys(config.prohibitedPreparation)) {
    assert.equal(r3v.evaluateRepositoryReadiness(readinessInput({ [field]: true })).decision, 'blocked_repository_only', field);
  }

  const completeness = r3v.inspectBindingCompleteness();
  assert.equal(completeness.fullyBound, true);
  assert.equal(completeness.methodCount, 9);
  assert.equal(completeness.boundMethodCount, 9);
  assert.equal(completeness.unboundMethodCount, 0);

  const rawOwnershipToken = 'r3v_test_owner_001';
  const plan = r3v.buildSingleUseExecutionPlan({ ownershipToken: rawOwnershipToken });
  assert.equal(plan.statementCount, 21);
  assert.match(plan.statementFingerprint, /^[a-f0-9]{64}$/);
  assert.equal(plan.authorizationPhraseDefined, false);
  assert.equal(plan.remoteExecutionAuthority, false);
  assert.equal(plan.rawOwnershipTokenPersisted, false);
  assert.equal(JSON.stringify(plan).includes(rawOwnershipToken), false);
  assert.equal(plan.singleUse, true);
  assert.equal(plan.reusableAfterFailure, false);
  assert.equal(plan.predecessorAuthorizationReusable, false);
  assert.equal(plan.runAttemptMustBeOneWhenAuthorized, true);
  assert.deepEqual([...plan.executionPhases], [...r3v.EXECUTION_PHASES]);

  const harness = await executor.buildRepositoryHarness();
  assert.equal(typeof harness.db.query, 'undefined');
  assert.equal(typeof harness.adapter.query, 'undefined');
  assert.equal(typeof harness.adapter.connect, 'undefined');
  assert.equal(typeof harness.adapter.loadCredentials, 'undefined');
  const selfTest = await executor.repositorySelfTest();
  assert.equal(selfTest.contractId, r3v.CONTRACT_ID);
  assert.equal(selfTest.statementCount, 21);
  assert.equal(selfTest.adapterMethodCount, 9);
  assert.equal(selfTest.classification, 'hosted_runtime_observation_matches_pinned_presence_path');
  assert.equal(selfTest.presenceStateObservationBridgeVerified, true);
  assert.equal(selfTest.afterCleanupTerminalCounterCarryForwardVerified, true);
  assert.equal(selfTest.failureCleanupVerified, true);
  assert.equal(selfTest.zeroResidueProven, true);
  assert.equal(selfTest.credentialReadsBeforeAuthorization, 0);
  assert.equal(selfTest.dependencyLoadsBeforeAuthorization, 0);
  assert.equal(selfTest.stagingAccess, false);
  assert.equal(selfTest.networkAccess, false);
  assert.equal(selfTest.databaseQueryAgainstRemote, false);
  assert.equal(selfTest.remoteClientInstantiated, false);
  assert.equal(selfTest.exactRootCauseProven, false);
  assert.equal(selfTest.causalPromotionAllowed, false);

  let sideEffects = 0;
  assert.throws(() => {
    r3v.assertRemoteExecutionBoundaryAbsent();
    sideEffects += 1;
  }, (error) => error?.code === r3v.REMOTE_EXECUTION_BLOCK_CODE);
  assert.equal(sideEffects, 0);

  assert.equal(fs.existsSync(path.resolve(config.continuity.futureTriggerPath)), false);
  const moduleSource = fs.readFileSync(path.resolve(__dirname, '../backend/modules/communities/community-realtime-private-auth-r3v.js'), 'utf8');
  const executorSource = fs.readFileSync(path.resolve(__dirname, 'execute-com-b03c-r3v-single-use-remote-execution-envelope.js'), 'utf8');
  for (const source of [moduleSource, executorSource]) {
    assert.doesNotMatch(source, /process\.env/);
    assert.doesNotMatch(source, /require\(['"]pg['"]\)/);
    assert.doesNotMatch(source, /@supabase\/supabase-js['"]\)/);
  }

  assert.equal(evidence.contractId, r3v.CONTRACT_ID);
  const certified = Boolean(evidence.certificationHistory);
  assert.equal(
    evidence.status,
    certified
      ? 'repository_single_use_remote_execution_envelope_certified_no_remote_authority'
      : 'repository_single_use_remote_execution_envelope_prepared_no_remote_authority'
  );
  assert.equal(evidence.authority.remoteExecution, false);
  assert.equal(evidence.authority.triggerCreation, false);
  assert.equal(evidence.effects.stagingAccessExecuted, false);
  assert.equal(evidence.effects.remoteCredentialReadExecuted, false);
  assert.equal(evidence.effects.remoteDependencyLoadExecuted, false);
  assert.equal(evidence.effects.databaseQueryAgainstRemoteExecuted, false);
  assert.equal(evidence.effects.realtimeSubscriptionExecuted, false);
  assert.equal(evidence.exactRootCauseProven, false);
  assert.equal(evidence.causalPromotionAllowed, false);
  if (certified) {
    assert.match(evidence.initialBoundaryCommit, /^[a-f0-9]{40}$/);
    assert.equal(evidence.certificationHistory.initialFailClosed.failedStep, 'Domain Completion Matrix');
    assert.equal(evidence.certificationHistory.canonicalMatrixReconciliation.workflowRestoredBlob, '299108d86dc097ba090392ebe9f218f6849e74ad');
    assert.equal(evidence.certificationHistory.normalHeadCertification.r3vConclusion, 'success');
    assert.equal(evidence.certificationHistory.normalHeadCertification.matrixConclusion, 'success');
  }

  process.stdout.write(`${JSON.stringify({
    contractId: r3v.CONTRACT_ID,
    decision: decision.decision,
    evidenceStatus: evidence.status,
    statementCount: selfTest.statementCount,
    statementFingerprint: selfTest.statementFingerprint,
    classification: selfTest.classification,
    remoteExecutionAuthority: decision.remoteExecutionAuthority,
    exactRootCauseProven: decision.exactRootCauseProven
  })}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
