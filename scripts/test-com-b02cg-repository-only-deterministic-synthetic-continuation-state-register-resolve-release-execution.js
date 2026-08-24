'use strict';

const assert = require('node:assert/strict');
const target = require('../backend/shared/http/repository-only-route-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-continuation-state-register-resolve-release-execution');
const config = require('../config/com-b02cg-repository-only-deterministic-synthetic-continuation-state-register-resolve-release-execution.json');

assert.equal(target.CONTRACT_ID, config.contractId);
assert.equal(target.BOUNDARY_ID, config.boundaryId);
assert.equal(target.PREDECESSOR_CONTRACT_ID, config.predecessor.contractId);
assert.equal(target.PREDECESSOR_HEAD, config.predecessor.head);
assert.equal(target.PREDECESSOR_TREE, config.predecessor.tree);
assert.equal(target.PREDECESSOR_CERTIFICATION_RUN_ID, config.predecessor.certificationRunId);
assert.equal(target.PREDECESSOR_CERTIFICATION_JOB_ID, config.predecessor.certificationJobId);
assert.equal(target.AUTHORIZATION_KIND, config.authorization.kind);
assert.equal(target.AUTHORIZATION_SOURCE, config.authorization.source);
assert.equal(target.NEXT_ACTION, config.nextAction);
assert.equal(config.status, 'AUTHORIZED_SINGLE_USE_EXECUTION_PENDING');
assert.equal(config.authorization.singleUse, true);
assert.equal(config.authorization.reusable, false);
assert.equal(config.authorization.registryReleaseAuthority, true);
assert.equal(config.authorization.resumeSurfaceInvocationAuthority, false);

if (!process.argv.includes('--execute')) {
  console.log('COM-B02CG static contract assertions passed without execution.');
  process.exit(0);
}

const result = target.executeRepositoryOnlyDeterministicSyntheticRegisterResolveRelease();
assert.equal(result.decision, 'repository_only_deterministic_synthetic_continuation_state_registered_resolved_and_released');
for (const key of [
  'registerOperationInvoked', 'resolveOperationInvoked', 'releaseOperationInvoked',
  'preparedRegisterMethodValidated', 'preparedResolveMethodValidated', 'preparedReleaseMethodValidated',
  'continuationStateStored', 'registryOperationInvoked', 'registryRegisterExecuted',
  'registryLookupExecuted', 'registryResolveExecuted', 'registryReleaseExecuted',
  'storedStateMatchesExpected', 'resolvedStatePresent', 'resolvedStateMatchesExpected',
  'entryRetainedAfterResolve', 'entryAbsentAfterRelease', 'processLocalOnly', 'ephemeralRegistry'
]) assert.equal(result[key], true, `${key} must be true`);

assert.equal(result.entryCountAfterRegister, 1);
assert.equal(result.entryCountAfterResolve, 1);
assert.equal(result.entryCountAfterRelease, 0);
for (const key of [
  'stateEscapesExecutionProcess', 'rawStateSerialized', 'rawStateExported',
  'executableReferencesSerialized', 'executableReferencesExported', 'resumeSurfaceInvoked',
  'activeExecuteHandlerInvoked', 'repositoryOperationInvoked', 'credentialReadExecuted',
  'rpcExecuted', 'networkExecuted', 'stagingReadExecuted', 'stagingMutationExecuted',
  'migrationApplied', 'runtimeActivated', 'productionChanged', 'routeRegistryChanged',
  'moduleRouteLoaderChanged', 'routeHandlersChanged'
]) assert.equal(result[key], false, `${key} must be false`);

const certification = target.evaluateBoundaryCertification({
  ...result,
  b02cfCertificationRunId: config.predecessor.certificationRunId,
  b02cfCertificationJobId: config.predecessor.certificationJobId,
  authority: config.authorization
});

assert.equal(certification.ready, true);
assert.deepEqual(certification.blockers, []);
assert.equal(certification.registryReleaseExecuted, true);
assert.equal(certification.entryCountAfterRelease, 0);
assert.equal(certification.networkExecuted, false);
assert.equal(certification.runtimeActivated, false);
assert.equal(certification.productionChanged, false);
assert.equal(certification.r5iCreationAuthority, false);

console.log('COM-B02CG authorized single-use register-resolve-release assertions passed.');
