'use strict';

const assert = require('assert');
const contract = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-resolve-execution');
const config = require('../config/com-b02cf-repository-only-deterministic-synthetic-continuation-state-register-resolve-execution.json');

function staticChecks() {
  assert.strictEqual(contract.CONTRACT_ID, config.contractId);
  assert.strictEqual(contract.BOUNDARY_ID, 'COM-B02CF');
  assert.strictEqual(contract.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
  assert.strictEqual(contract.PREDECESSOR_HEAD, config.predecessor.head);
  assert.strictEqual(contract.PREDECESSOR_TREE, config.predecessor.tree);
  assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
  assert.strictEqual(contract.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
  assert.strictEqual(config.predecessor.repositoryCertified, true);
  assert.strictEqual(config.authorization.singleUse, true);
  assert.strictEqual(config.authorization.reusable, false);
  assert.strictEqual(config.authorization.operationMethodInvocationAuthority, true);
  assert.strictEqual(config.authorization.continuationStateStorageAuthority, true);
  assert.strictEqual(config.authorization.registryOperationInvocationAuthority, true);
  assert.strictEqual(config.authorization.registryRegisterAuthority, true);
  assert.strictEqual(config.authorization.registryLookupAuthority, true);
  assert.strictEqual(config.authorization.registryResolveAuthority, true);
  assert.strictEqual(config.authorization.registryReleaseAuthority, false);
  assert.strictEqual(config.executionIntent.singleProcessOnly, true);
  assert.strictEqual(config.executionIntent.registerThenResolveSameEntry, true);
  assert.strictEqual(config.executionIntent.resolveConsumesEntry, false);
  assert.strictEqual(config.executionIntent.releaseExcluded, true);
  assert.strictEqual(config.executionIntent.historicalB02ceStateReuseAttempted, false);
  assert.strictEqual(config.executionIntent.newSyntheticStateRequiredBecauseB02ceWasEphemeral, true);
  assert.strictEqual(typeof contract.executeRepositoryOnlyDeterministicSyntheticRegisterResolve, 'function');
  assert.strictEqual(typeof contract.evaluateBoundaryCertification, 'function');
}

function executeExactlyOnce() {
  const proof = contract.executeRepositoryOnlyDeterministicSyntheticRegisterResolve();
  assert.strictEqual(proof.decision, 'repository_only_deterministic_synthetic_continuation_state_registered_and_resolved');
  for (const key of [
    'registerOperationInvoked', 'resolveOperationInvoked',
    'preparedRegisterMethodValidated', 'preparedResolveMethodValidated',
    'continuationStateStored', 'registryOperationInvoked',
    'registryRegisterExecuted', 'registryLookupExecuted', 'registryResolveExecuted',
    'storedStateMatchesExpected', 'resolvedStatePresent',
    'resolvedStateMatchesExpected', 'entryRetainedAfterResolve',
    'processLocalOnly', 'ephemeralRegistry'
  ]) assert.strictEqual(proof[key], true, key);

  assert.strictEqual(proof.registryReleaseExecuted, false);
  assert.strictEqual(proof.entryCountAfterRegister, 1);
  assert.strictEqual(proof.entryCountAfterResolve, 1);
  assert.strictEqual(proof.stateEscapesExecutionProcess, false);

  for (const key of [
    'rawStateSerialized', 'rawStateExported',
    'executableReferencesSerialized', 'executableReferencesExported',
    'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked', 'repositoryOperationInvoked',
    'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
    'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied',
    'runtimeActivated', 'productionChanged'
  ]) assert.strictEqual(proof[key], false, key);

  const certification = contract.evaluateBoundaryCertification({
    predecessorContractId: config.predecessor.contractId,
    predecessorHead: config.predecessor.head,
    predecessorTree: config.predecessor.tree,
    b02ceCertificationRunId: config.predecessor.certificationRunId,
    b02ceCertificationJobId: config.predecessor.certificationJobId,
    ...proof,
    authority: config.authorization,
    routeRegistryChanged: false,
    moduleRouteLoaderChanged: false,
    routeHandlersChanged: false
  });

  assert.strictEqual(certification.ready, true);
  assert.deepStrictEqual(certification.blockers, []);
  assert.strictEqual(certification.registryReleaseExecuted, false);
  assert.strictEqual(certification.networkExecuted, false);
  assert.strictEqual(certification.runtimeActivated, false);
  assert.strictEqual(certification.productionChanged, false);

  console.log(JSON.stringify({
    contractId: proof.contractId,
    boundaryId: proof.boundaryId,
    decision: proof.decision,
    registerOperationInvoked: proof.registerOperationInvoked,
    resolveOperationInvoked: proof.resolveOperationInvoked,
    continuationStateStored: proof.continuationStateStored,
    registryRegisterExecuted: proof.registryRegisterExecuted,
    registryLookupExecuted: proof.registryLookupExecuted,
    registryResolveExecuted: proof.registryResolveExecuted,
    registryReleaseExecuted: proof.registryReleaseExecuted,
    entryCountAfterRegister: proof.entryCountAfterRegister,
    entryCountAfterResolve: proof.entryCountAfterResolve,
    resolvedStateMatchesExpected: proof.resolvedStateMatchesExpected,
    processLocalOnly: proof.processLocalOnly,
    ephemeralRegistry: proof.ephemeralRegistry,
    stateEscapesExecutionProcess: proof.stateEscapesExecutionProcess,
    networkExecuted: proof.networkExecuted,
    runtimeActivated: proof.runtimeActivated,
    productionChanged: proof.productionChanged,
    certificationReady: certification.ready
  }, null, 2));
}

staticChecks();

if (process.argv.includes('--execute')) {
  executeExactlyOnce();
} else {
  console.log('COM-B02CF static contract checks passed; execution not invoked.');
}
