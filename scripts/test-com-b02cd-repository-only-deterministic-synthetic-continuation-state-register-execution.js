'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-execution');
const config = require('../config/com-b02cd-repository-only-deterministic-synthetic-continuation-state-register-execution.json');

assert.equal(typeof boundary.evaluateGovernanceRecovery, 'function');
assert.equal(boundary.executeRepositoryOnlyDeterministicSyntheticRegister, undefined);

const recovery = boundary.evaluateGovernanceRecovery({
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02ccCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02ccCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  historicalProofHead: boundary.HISTORICAL_PROOF_HEAD,
  historicalProofTree: boundary.HISTORICAL_PROOF_TREE,
  historicalProofRunId: boundary.HISTORICAL_PROOF_RUN_ID,
  historicalProofJobId: boundary.HISTORICAL_PROOF_JOB_ID,
  historicalTechnicalEffectObserved: config.historicalProof.technicalEffectObserved,
  historicalContinuationStateStored: config.historicalProof.continuationStateStored,
  historicalRegistryOperationInvoked: config.historicalProof.registryOperationInvoked,
  historicalRegistryRegisterExecuted: config.historicalProof.registryRegisterExecuted,
  historicalProofAcceptedAsAuthorizedBoundary: config.historicalProof.acceptedAsAuthorizedBoundary,
  authorityMismatchDetected: config.historicalProof.authorityMismatchDetected,
  quarantined: true,
  boundaryRepositoryCertified: false,
  originalAuthorization: config.originalAuthorization,
  recoveryAuthorization: config.recoveryAuthorization,
  newOperationMethodInvocation: false,
  newContinuationStateStorage: false,
  newRegistryOperationInvocation: false,
  newRegistryRegisterExecution: false,
  newRegistryLookupExecution: false,
  newRegistryReleaseExecution: false,
  activeExecuteHandlerInvoked: false,
  repositoryOperationInvoked: false,
  credentialReadExecuted: false,
  rpcExecuted: false,
  networkExecuted: false,
  stagingReadExecuted: false,
  stagingMutationExecuted: false,
  migrationApplied: false,
  runtimeActivated: false,
  productionChanged: false,
  pullRequestMerged: false,
  readyForReviewChanged: false,
  r5iCreated: false
});

assert.equal(recovery.recovered, true);
assert.equal(recovery.quarantined, true);
assert.equal(recovery.boundaryRepositoryCertified, false);
assert.equal(recovery.historicalProofPreserved, true);
assert.equal(recovery.historicalProofAcceptedAsAuthorizedBoundary, false);
assert.deepEqual(recovery.blockers, []);
assert.equal(recovery.classification, 'technical_effect_observed_authority_mismatch_quarantined');
assert.equal(recovery.nextAction, config.nextAction);
assert.equal(config.status, 'QUARANTINED_NOT_REPOSITORY_CERTIFIED');
assert.equal(config.originalAuthorization.continuationStateStorageAuthority, true);
assert.equal(config.originalAuthorization.operationMethodInvocationAuthority, false);
assert.equal(config.originalAuthorization.registryOperationInvocationAuthority, false);
assert.equal(config.originalAuthorization.registryRegisterAuthority, false);
assert.equal(config.historicalProof.runId, 32652016270);
assert.equal(config.historicalProof.jobId, 97224998719);
assert.equal(config.historicalProof.acceptedAsTechnicalEvidence, true);
assert.equal(config.historicalProof.acceptedAsAuthorizedBoundary, false);
assert.equal(config.historicalProof.authorityMismatchDetected, true);
assert.equal(config.recoveryAuthorization.governanceRecoveryAuthority, true);
for (const key of ['operationMethodInvocationAuthority','continuationStateStorageAuthority','registryOperationInvocationAuthority','registryRegisterAuthority','registryLookupAuthority','registryReleaseAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','migrationApplicationAuthority','runtimeActivationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority']) {
  assert.equal(config.recoveryAuthorization[key], false, key);
}

console.log('COM-B02CD governance recovery quarantine: PASS');
