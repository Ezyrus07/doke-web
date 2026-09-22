'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-authorized-reexecution');
const config = require('../config/com-b02ce-repository-only-deterministic-synthetic-continuation-state-register-authorized-reexecution.json');

assert.equal(boundary.CONTRACT_ID, config.contractId);
assert.equal(boundary.BOUNDARY_ID, config.boundaryId);
assert.equal(boundary.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.equal(boundary.PREDECESSOR_HEAD, config.predecessor.head);
assert.equal(boundary.PREDECESSOR_TREE, config.predecessor.tree);
assert.equal(boundary.EXECUTION_PROOF_HEAD, config.executionProof.head);
assert.equal(boundary.EXECUTION_PROOF_TREE, config.executionProof.tree);
assert.equal(boundary.EXECUTION_PROOF_RUN_ID, config.executionProof.runId);
assert.equal(boundary.EXECUTION_PROOF_JOB_ID, config.executionProof.jobId);
assert.equal(typeof boundary.executeRepositoryOnlyDeterministicSyntheticRegisterAfterQuarantine, 'undefined');

const certification = boundary.evaluateRepositoryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorRemainsQuarantined: config.finalization.b02cdRemainsQuarantined,
  predecessorBoundaryRepositoryCertified: config.predecessor.boundaryRepositoryCertified,
  executionProofHead: config.executionProof.head,
  executionProofTree: config.executionProof.tree,
  executionProofRunId: config.executionProof.runId,
  executionProofJobId: config.executionProof.jobId,
  executionStepConclusion: config.executionProof.executionStepConclusion,
  authorizationConsumed: config.executionProof.authorizationConsumed,
  executionEffectAcceptedAsAuthorizedBoundary: config.executionProof.executionEffectAcceptedAsAuthorizedBoundary,
  registerOperationMethodInvoked: config.executionProof.registerOperationMethodInvoked,
  preparedRegisterMethodValidated: config.executionProof.preparedRegisterMethodValidated,
  continuationStateStored: config.executionProof.continuationStateStored,
  registryOperationInvoked: config.executionProof.registryOperationInvoked,
  registryRegisterExecuted: config.executionProof.registryRegisterExecuted,
  registryLookupExecuted: config.executionProof.registryLookupExecuted,
  registryReleaseExecuted: config.executionProof.registryReleaseExecuted,
  entryCountAfterRegister: config.executionProof.entryCountAfterRegister,
  storedStateMatchesExpected: config.executionProof.storedStateMatchesExpected,
  processLocalOnly: config.executionProof.processLocalOnly,
  ephemeralRegistry: config.executionProof.ephemeralRegistry,
  stateEscapesExecutionProcess: config.executionProof.stateEscapesExecutionProcess,
  rawStateSerialized: config.executionProof.rawStateSerialized,
  rawStateExported: config.executionProof.rawStateExported,
  executableReferencesSerialized: config.executionProof.executableReferencesSerialized,
  executableReferencesExported: config.executionProof.executableReferencesExported,
  resumeSurfaceInvoked: config.executionProof.resumeSurfaceInvoked,
  activeExecuteHandlerInvoked: config.executionProof.activeExecuteHandlerInvoked,
  repositoryOperationInvoked: config.executionProof.repositoryOperationInvoked,
  credentialReadExecuted: config.executionProof.credentialReadExecuted,
  rpcExecuted: config.executionProof.rpcExecuted,
  networkExecuted: config.executionProof.networkExecuted,
  stagingReadExecuted: config.executionProof.stagingReadExecuted,
  stagingMutationExecuted: config.executionProof.stagingMutationExecuted,
  migrationApplied: config.executionProof.migrationApplied,
  runtimeActivated: config.executionProof.runtimeActivated,
  productionChanged: config.executionProof.productionChanged,
  routeRegistryChanged: config.executionProof.routeRegistryChanged,
  moduleRouteLoaderChanged: config.executionProof.moduleRouteLoaderChanged,
  routeHandlersChanged: config.executionProof.routeHandlersChanged,
  executableSurfaceRemoved: config.finalization.executableSurfaceRemoved,
  singleUseExecutorRemoved: config.finalization.singleUseExecutorRemoved,
  reexecutionAllowed: config.finalization.reexecutionAllowed,
  authority: config.authorization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.decision, 'repository_only_authorized_synthetic_register_execution_proof_certifiable');
assert.equal(certification.predecessorRemainsQuarantined, true);
assert.equal(certification.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(certification.authorizationConsumed, true);
assert.equal(certification.executableSurfaceRemoved, true);
assert.equal(certification.singleUseExecutorRemoved, true);
assert.equal(certification.reexecutionAllowed, false);
assert.equal(certification.registryLookupExecuted, false);
assert.equal(certification.registryReleaseExecuted, false);
assert.equal(certification.networkExecuted, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.productionChanged, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, config.nextAction);

assert.equal(config.status, 'EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');
assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.executionProof.authorizationConsumed, true);
assert.equal(config.executionProof.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.equal(config.finalization.executableSurfaceRemoved, true);
assert.equal(config.finalization.singleUseExecutorRemoved, true);
assert.equal(config.finalization.reexecutionAllowed, false);
assert.equal(config.predecessor.status, 'QUARANTINED_NOT_REPOSITORY_CERTIFIED');
assert.equal(config.predecessor.boundaryRepositoryCertified, false);

console.log('COM-B02CE authorized single-use register execution proof: PASS');
