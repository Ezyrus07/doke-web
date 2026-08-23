'use strict';

const assert = require('node:assert/strict');
const boundary = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-execution');
const config = require('../config/com-b02cd-repository-only-deterministic-synthetic-continuation-state-register-execution.json');

const result = boundary.executeRepositoryOnlyDeterministicSyntheticRegister();

assert.equal(result.contractId, boundary.CONTRACT_ID);
assert.equal(result.boundaryId, 'COM-B02CD');
assert.equal(result.predecessorContractId, boundary.PREDECESSOR_CONTRACT_ID);
assert.equal(result.predecessorHead, boundary.PREDECESSOR_HEAD);
assert.equal(result.predecessorTree, boundary.PREDECESSOR_TREE);
assert.equal(result.decision, 'repository_only_deterministic_synthetic_continuation_state_registered');
assert.equal(result.registerOperationInvoked, true);
assert.equal(result.preparedRegisterMethodValidated, true);
assert.equal(result.continuationStateStored, true);
assert.equal(result.registryOperationInvoked, true);
assert.equal(result.registryRegisterExecuted, true);
assert.equal(result.registryLookupExecuted, false);
assert.equal(result.registryReleaseExecuted, false);
assert.equal(result.entryCountAfterRegister, 1);
assert.equal(result.storedStateMatchesExpected, true);
assert.equal(result.processLocalOnly, true);
assert.equal(result.ephemeralRegistry, true);
assert.equal(result.stateEscapesExecutionProcess, false);

for (const key of [
  'rawStateSerialized', 'rawStateExported', 'executableReferencesSerialized',
  'executableReferencesExported', 'resumeSurfaceInvoked', 'activeExecuteHandlerInvoked',
  'repositoryOperationInvoked', 'credentialReadExecuted', 'rpcExecuted', 'networkExecuted',
  'stagingReadExecuted', 'stagingMutationExecuted', 'migrationApplied', 'runtimeActivated',
  'productionChanged'
]) assert.equal(result[key], false, key);

assert.equal(result.nextAction,
  'stop_and_require_fresh_explicit_authorization_before_any_registry_lookup_resolve_release_additional_state_storage_or_sensitive_scope');

const certification = boundary.evaluateBoundaryCertification({
  predecessorContractId: boundary.PREDECESSOR_CONTRACT_ID,
  predecessorHead: boundary.PREDECESSOR_HEAD,
  predecessorTree: boundary.PREDECESSOR_TREE,
  b02ccCertificationRunId: boundary.PREDECESSOR_CERTIFICATION_RUN_ID,
  b02ccCertificationJobId: boundary.PREDECESSOR_CERTIFICATION_JOB_ID,
  registerOperationInvoked: result.registerOperationInvoked,
  preparedRegisterMethodValidated: result.preparedRegisterMethodValidated,
  continuationStateStored: result.continuationStateStored,
  registryOperationInvoked: result.registryOperationInvoked,
  registryRegisterExecuted: result.registryRegisterExecuted,
  registryLookupExecuted: result.registryLookupExecuted,
  registryReleaseExecuted: result.registryReleaseExecuted,
  entryCountAfterRegister: result.entryCountAfterRegister,
  storedStateMatchesExpected: result.storedStateMatchesExpected,
  processLocalOnly: result.processLocalOnly,
  ephemeralRegistry: result.ephemeralRegistry,
  stateEscapesExecutionProcess: result.stateEscapesExecutionProcess,
  rawStateSerialized: result.rawStateSerialized,
  rawStateExported: result.rawStateExported,
  executableReferencesSerialized: result.executableReferencesSerialized,
  executableReferencesExported: result.executableReferencesExported,
  resumeSurfaceInvoked: result.resumeSurfaceInvoked,
  activeExecuteHandlerInvoked: result.activeExecuteHandlerInvoked,
  repositoryOperationInvoked: result.repositoryOperationInvoked,
  credentialReadExecuted: result.credentialReadExecuted,
  rpcExecuted: result.rpcExecuted,
  networkExecuted: result.networkExecuted,
  stagingReadExecuted: result.stagingReadExecuted,
  stagingMutationExecuted: result.stagingMutationExecuted,
  migrationApplied: result.migrationApplied,
  runtimeActivated: result.runtimeActivated,
  productionChanged: result.productionChanged,
  routeRegistryChanged: false,
  moduleRouteLoaderChanged: false,
  routeHandlersChanged: false,
  authority: config.authorization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.continuationStateStored, true);
assert.equal(certification.registryOperationInvoked, true);
assert.equal(certification.registryRegisterExecuted, true);
assert.equal(certification.registryLookupExecuted, false);
assert.equal(certification.registryReleaseExecuted, false);
assert.equal(certification.networkExecuted, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.productionChanged, false);
assert.equal(certification.r5iCreationAuthority, false);
assert.equal(certification.nextAction, config.nextAction);

assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.continuationStateStorageAuthority, true);
assert.equal(config.authorization.registryOperationInvocationAuthority, true);
assert.equal(config.authorization.registryRegisterAuthority, true);
assert.equal(config.authorization.registryLookupAuthority, false);
assert.equal(config.authorization.registryReleaseAuthority, false);
assert.equal(config.authorization.networkAuthority, false);
assert.equal(config.authorization.stagingDeploymentAuthority, false);
assert.equal(config.authorization.runtimeActivationAuthority, false);
assert.equal(config.authorization.productionAuthority, false);
assert.equal(config.authorization.pullRequestMergeAuthority, false);
assert.equal(config.authorization.readyForReviewAuthority, false);
assert.equal(config.authorization.r5iCreationAuthority, false);

console.log('COM-B02CD deterministic synthetic continuation-state register: PASS');
