'use strict';

const assert = require('assert');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-resolve-execution');
const config = require('../config/com-b02cf-repository-only-deterministic-synthetic-continuation-state-register-resolve-execution.json');

assert.strictEqual(contract.CONTRACT_ID, config.contractId);
assert.strictEqual(contract.BOUNDARY_ID, 'COM-B02CF');
assert.strictEqual(contract.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.strictEqual(contract.PREDECESSOR_HEAD, config.predecessor.head);
assert.strictEqual(contract.PREDECESSOR_TREE, config.predecessor.tree);
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.strictEqual(contract.EXECUTION_PROOF_HEAD, config.executionProof.head);
assert.strictEqual(contract.EXECUTION_PROOF_TREE, config.executionProof.tree);
assert.strictEqual(contract.EXECUTION_PROOF_RUN_ID, config.executionProof.runId);
assert.strictEqual(contract.EXECUTION_PROOF_JOB_ID, config.executionProof.jobId);
assert.strictEqual(contract.AUTHORIZATION_KIND, config.authorization.kind);
assert.strictEqual(contract.AUTHORIZATION_SOURCE, config.authorization.source);
assert.strictEqual(config.status, 'EXECUTION_PROVEN_REPOSITORY_CERTIFICATION_CANDIDATE');
assert.strictEqual(config.executionProof.authorizationConsumed, true);
assert.strictEqual(config.executionProof.executionEffectAcceptedAsAuthorizedBoundary, true);
assert.strictEqual(config.executionProof.registryRegisterExecuted, true);
assert.strictEqual(config.executionProof.registryLookupExecuted, true);
assert.strictEqual(config.executionProof.registryResolveExecuted, true);
assert.strictEqual(config.executionProof.registryReleaseExecuted, false);
assert.strictEqual(config.executionProof.entryCountAfterRegister, 1);
assert.strictEqual(config.executionProof.entryCountAfterResolve, 1);
assert.strictEqual(config.executionProof.resolvedStateMatchesExpected, true);
assert.strictEqual(config.executionProof.processLocalOnly, true);
assert.strictEqual(config.executionProof.ephemeralRegistry, true);
assert.strictEqual(config.executionProof.stateEscapesExecutionProcess, false);
assert.strictEqual(config.finalization.executableSurfaceRemoved, true);
assert.strictEqual(config.finalization.singleUseExecutorRemoved, true);
assert.strictEqual(config.finalization.matrixExporterRemoved, true);
assert.strictEqual(config.finalization.matrixPromoterRemoved, true);
assert.strictEqual(config.finalization.reexecutionAllowed, false);
assert.strictEqual(typeof contract.evaluateRepositoryCertification, 'function');
assert.strictEqual(contract.executeRepositoryOnlyDeterministicSyntheticRegisterResolve, undefined);

const certification = contract.evaluateRepositoryCertification({
  predecessorContractId: config.predecessor.contractId,
  predecessorHead: config.predecessor.head,
  predecessorTree: config.predecessor.tree,
  predecessorCertificationRunId: config.predecessor.certificationRunId,
  predecessorCertificationJobId: config.predecessor.certificationJobId,
  predecessorRepositoryCertified: config.predecessor.repositoryCertified,
  executionProofHead: config.executionProof.head,
  executionProofTree: config.executionProof.tree,
  executionProofRunId: config.executionProof.runId,
  executionProofJobId: config.executionProof.jobId,
  executionStepConclusion: config.executionProof.executionStepConclusion,
  authorizationConsumed: config.executionProof.authorizationConsumed,
  executionEffectAcceptedAsAuthorizedBoundary: config.executionProof.executionEffectAcceptedAsAuthorizedBoundary,
  registerOperationInvoked: config.executionProof.registerOperationInvoked,
  resolveOperationInvoked: config.executionProof.resolveOperationInvoked,
  preparedRegisterMethodValidated: config.executionProof.preparedRegisterMethodValidated,
  preparedResolveMethodValidated: config.executionProof.preparedResolveMethodValidated,
  continuationStateStored: config.executionProof.continuationStateStored,
  registryOperationInvoked: config.executionProof.registryOperationInvoked,
  registryRegisterExecuted: config.executionProof.registryRegisterExecuted,
  registryLookupExecuted: config.executionProof.registryLookupExecuted,
  registryResolveExecuted: config.executionProof.registryResolveExecuted,
  registryReleaseExecuted: config.executionProof.registryReleaseExecuted,
  entryCountAfterRegister: config.executionProof.entryCountAfterRegister,
  entryCountAfterResolve: config.executionProof.entryCountAfterResolve,
  storedStateMatchesExpected: config.executionProof.storedStateMatchesExpected,
  resolvedStatePresent: config.executionProof.resolvedStatePresent,
  resolvedStateMatchesExpected: config.executionProof.resolvedStateMatchesExpected,
  entryRetainedAfterResolve: config.executionProof.entryRetainedAfterResolve,
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
  authority: config.authorization,
  executableSurfaceRemoved: config.finalization.executableSurfaceRemoved,
  singleUseExecutorRemoved: config.finalization.singleUseExecutorRemoved,
  matrixExporterRemoved: config.finalization.matrixExporterRemoved,
  matrixPromoterRemoved: config.finalization.matrixPromoterRemoved,
  historicalExecutionProofPreserved: config.finalization.historicalExecutionProofPreserved,
  historicalExecutionAcceptedAsAuthorizedBoundary: config.finalization.historicalExecutionAcceptedAsAuthorizedBoundary,
  reexecutionAllowed: config.finalization.reexecutionAllowed
});

assert.strictEqual(certification.ready, true);
assert.deepStrictEqual(certification.blockers, []);
assert.strictEqual(certification.registryRegisterExecuted, true);
assert.strictEqual(certification.registryLookupExecuted, true);
assert.strictEqual(certification.registryResolveExecuted, true);
assert.strictEqual(certification.registryReleaseExecuted, false);
assert.strictEqual(certification.networkExecuted, false);
assert.strictEqual(certification.runtimeActivated, false);
assert.strictEqual(certification.productionChanged, false);
assert.strictEqual(certification.reexecutionAllowed, false);
assert.strictEqual(certification.nextAction, config.nextAction);

console.log('COM-B02CF static repository certification proof passed; no execution surface remains.');
