'use strict';

const CONTRACT_ID = 'com-b02cd-governance-recovery-quarantine-v1';
const BOUNDARY_ID = 'COM-B02CD';
const PREDECESSOR_CONTRACT_ID = 'com-b02cc-repository-only-continuation-state-registry-storage-backend-entry-container-instance-deterministic-synthetic-operation-method-invocation-v1';
const PREDECESSOR_HEAD = '0590e64b75a640880ac00485d2a678b6ac3092e7';
const PREDECESSOR_TREE = '3e0122015344206918cf4a06047730d8e92e88e1';
const PREDECESSOR_CERTIFICATION_RUN_ID = 32649147443;
const PREDECESSOR_CERTIFICATION_JOB_ID = 97217923197;
const HISTORICAL_PROOF_HEAD = 'f671d8a93157353bb58b5edf8a4351706461d0ac';
const HISTORICAL_PROOF_TREE = 'fa4fe8ce737e941dcad4944d496e511e37ab1267';
const HISTORICAL_PROOF_RUN_ID = 32652016270;
const HISTORICAL_PROOF_JOB_ID = 97224998719;
const ORIGINAL_AUTHORIZATION_KIND = 'single_use_repository_only_continuation_state_storage';
const ORIGINAL_AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_post_b02cc_continuation_state_storage';
const RECOVERY_AUTHORIZATION_KIND = 'single_use_repository_only_b02cd_governance_recovery';
const RECOVERY_AUTHORIZATION_SOURCE = 'user_explicit_authorization_com_001_b02cd_governance_recovery';
const CLASSIFICATION = 'technical_effect_observed_authority_mismatch_quarantined';
const NEXT_ACTION = 'stop_b02cd_quarantined_and_require_fresh_explicit_authorization_before_any_successor_storage_registry_operation_method_invocation_or_sensitive_scope';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function evaluateGovernanceRecovery(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => { if (!condition) blockers.push(code); };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02CC_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD, 'B02CC_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE, 'B02CC_CERTIFIED_TREE_REQUIRED');
  req(input.b02ccCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02CC_CERTIFICATION_RUN_REQUIRED');
  req(input.b02ccCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02CC_CERTIFICATION_JOB_REQUIRED');
  req(input.historicalProofHead === HISTORICAL_PROOF_HEAD, 'HISTORICAL_PROOF_HEAD_REQUIRED');
  req(input.historicalProofTree === HISTORICAL_PROOF_TREE, 'HISTORICAL_PROOF_TREE_REQUIRED');
  req(input.historicalProofRunId === HISTORICAL_PROOF_RUN_ID, 'HISTORICAL_PROOF_RUN_REQUIRED');
  req(input.historicalProofJobId === HISTORICAL_PROOF_JOB_ID, 'HISTORICAL_PROOF_JOB_REQUIRED');
  req(input.historicalTechnicalEffectObserved === true, 'HISTORICAL_TECHNICAL_EFFECT_OBSERVED_REQUIRED');
  req(input.historicalContinuationStateStored === true, 'HISTORICAL_STORAGE_EFFECT_REQUIRED');
  req(input.historicalRegistryOperationInvoked === true, 'HISTORICAL_REGISTRY_OPERATION_EFFECT_REQUIRED');
  req(input.historicalRegistryRegisterExecuted === true, 'HISTORICAL_REGISTER_EFFECT_REQUIRED');
  req(input.historicalProofAcceptedAsAuthorizedBoundary === false, 'HISTORICAL_PROOF_MUST_NOT_BE_ACCEPTED_AS_AUTHORIZED');
  req(input.authorityMismatchDetected === true, 'AUTHORITY_MISMATCH_REQUIRED');
  req(input.quarantined === true, 'QUARANTINE_REQUIRED');
  req(input.boundaryRepositoryCertified === false, 'B02CD_EXECUTION_MUST_REMAIN_NOT_CERTIFIED');

  const original = input.originalAuthorization;
  req(isObject(original) && original.kind === ORIGINAL_AUTHORIZATION_KIND, 'ORIGINAL_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(original) && original.source === ORIGINAL_AUTHORIZATION_SOURCE, 'ORIGINAL_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(original) && original.singleUse === true, 'ORIGINAL_AUTHORIZATION_SINGLE_USE_REQUIRED');
  req(isObject(original) && original.reusable === false, 'ORIGINAL_AUTHORIZATION_REUSABLE_FALSE_REQUIRED');
  req(isObject(original) && original.continuationStateStorageAuthority === true, 'ORIGINAL_STORAGE_AUTHORITY_REQUIRED');
  for (const key of ['operationMethodInvocationAuthority','registryOperationInvocationAuthority','registryRegisterAuthority','registryLookupAuthority','registryReleaseAuthority','resumeSurfaceInvocationAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','migrationApplicationAuthority','runtimeActivationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority']) {
    req(isObject(original) && original[key] === false, `ORIGINAL_PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const recovery = input.recoveryAuthorization;
  req(isObject(recovery) && recovery.kind === RECOVERY_AUTHORIZATION_KIND, 'RECOVERY_AUTHORIZATION_KIND_REQUIRED');
  req(isObject(recovery) && recovery.source === RECOVERY_AUTHORIZATION_SOURCE, 'RECOVERY_AUTHORIZATION_SOURCE_REQUIRED');
  req(isObject(recovery) && recovery.singleUse === true, 'RECOVERY_AUTHORIZATION_SINGLE_USE_REQUIRED');
  req(isObject(recovery) && recovery.reusable === false, 'RECOVERY_AUTHORIZATION_REUSABLE_FALSE_REQUIRED');
  req(isObject(recovery) && recovery.governanceRecoveryAuthority === true, 'GOVERNANCE_RECOVERY_AUTHORITY_REQUIRED');
  for (const key of ['operationMethodInvocationAuthority','continuationStateStorageAuthority','registryOperationInvocationAuthority','registryRegisterAuthority','registryLookupAuthority','registryReleaseAuthority','resumeSurfaceInvocationAuthority','activeExecuteHandlerInvocationAuthority','repositoryOperationInvocationAuthority','credentialReadAuthority','rpcExecutionAuthority','networkAuthority','stagingDeploymentAuthority','stagingTrafficAuthority','migrationApplicationAuthority','runtimeActivationAuthority','productionAuthority','pullRequestMergeAuthority','readyForReviewAuthority','r5iCreationAuthority']) {
    req(isObject(recovery) && recovery[key] === false, `RECOVERY_PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  for (const key of ['newOperationMethodInvocation','newContinuationStateStorage','newRegistryOperationInvocation','newRegistryRegisterExecution','newRegistryLookupExecution','newRegistryReleaseExecution','activeExecuteHandlerInvoked','repositoryOperationInvoked','credentialReadExecuted','rpcExecuted','networkExecuted','stagingReadExecuted','stagingMutationExecuted','migrationApplied','runtimeActivated','productionChanged','pullRequestMerged','readyForReviewChanged','r5iCreated']) {
    req(input[key] === false, `RECOVERY_EFFECT_MUST_REMAIN_FALSE:${key}`);
  }

  const recovered = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    classification: CLASSIFICATION,
    recovered,
    quarantined: recovered,
    boundaryRepositoryCertified: false,
    historicalProofPreserved: recovered,
    historicalProofAcceptedAsAuthorizedBoundary: false,
    blockers,
    nextAction: NEXT_ACTION
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  HISTORICAL_PROOF_HEAD,
  HISTORICAL_PROOF_TREE,
  HISTORICAL_PROOF_RUN_ID,
  HISTORICAL_PROOF_JOB_ID,
  ORIGINAL_AUTHORIZATION_KIND,
  ORIGINAL_AUTHORIZATION_SOURCE,
  RECOVERY_AUTHORIZATION_KIND,
  RECOVERY_AUTHORIZATION_SOURCE,
  CLASSIFICATION,
  NEXT_ACTION,
  evaluateGovernanceRecovery
});
