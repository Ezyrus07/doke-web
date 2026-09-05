'use strict';

const adapterContract = require('./community-command-runtime-binding-adapter-contract');

const CONTRACT_ID = 'com-b02m-command-runtime-binding-adapter-implementation-v1';
const BOUNDARY_ID = 'COM-B02M';
const PREDECESSOR_CONTRACT_ID = 'com-b02l-command-runtime-binding-adapter-contract-v1';
const PREDECESSOR_HEAD = 'c5dca9ed3f797d0d062d113ea9417645d2016bf3';
const PREDECESSOR_CERTIFICATION_RUN_ID = 31985514343;
const PREDECESSOR_CERTIFICATION_JOB_ID = 95259746097;

const STAGES = Object.freeze({
  AWAITING_CANONICAL_STATE: 'awaiting_canonical_state_result',
  AWAITING_IDEMPOTENCY_CLAIM: 'awaiting_idempotency_claim_result',
  AWAITING_REPOSITORY_WRITE: 'awaiting_repository_write_result',
  COMPLETED_TERMINAL: 'completed_terminal_without_write',
  COMPLETED_WRITE_RESULT: 'completed_repository_write_result'
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: clone(details),
    repositoryOnlyAdapterImplementationAuthority: true,
    runtimeHandlerMutationAuthority: false,
    moduleRouteLoaderMutationAuthority: false,
    repositoryExecutorBindingAuthority: false,
    runtimeActivationAuthority: false,
    repositoryRemoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    realtimeActivationAuthority: false,
    credentialReadAuthority: false,
    identityLifecycleRemoteAuthority: false,
    realCommunityMutationAuthority: false,
    migrationApplicationAuthority: false,
    triggerCreationAuthority: false,
    receiptCreationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    r5iCreationAuthority: false
  });
}

function operationDescriptor(source) {
  return freeze({
    repositoryContractId: source.repositoryContractId,
    repositoryOperation: source.repositoryOperation,
    rpc: source.rpc || null,
    repositoryInput: clone(source.repositoryInput),
    execute: false,
    executorBound: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false
  });
}

function beginRuntimeBindingAdapter(packet) {
  const mappedRequest = adapterContract.mapAuthenticatedRuntimeRequest(packet);
  if (!isObject(mappedRequest) || mappedRequest.decision === 'blocked_repository_only') {
    return blocked('B02L_RUNTIME_REQUEST_MAPPING_BLOCKED', {
      adapterReason: mappedRequest && mappedRequest.reason ? mappedRequest.reason : null
    });
  }

  const read = adapterContract.describeCanonicalStateRead(mappedRequest);
  if (!isObject(read) || read.decision === 'blocked_repository_only') {
    return blocked('B02L_CANONICAL_STATE_READ_DESCRIPTION_BLOCKED', {
      adapterReason: read && read.reason ? read.reason : null
    });
  }

  if (read.decision === 'canonical_state_read_required') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_adapter_awaiting_input',
      stage: STAGES.AWAITING_CANONICAL_STATE,
      mappedRequest: clone(mappedRequest),
      preparedClaim: null,
      repositoryPlan: null,
      nextOperation: operationDescriptor(read),
      portInvoked: false,
      executorBound: false,
      runtimeHandlerBound: false,
      runtimeActivated: false,
      rpcExecuted: false,
      networkExecuted: false,
      migrationApplied: false
    });
  }

  if (read.decision !== 'canonical_state_read_not_required') {
    return blocked('B02L_CANONICAL_STATE_READ_DECISION_REQUIRED');
  }

  const preparedClaim = adapterContract.prepareIdempotencyClaim({ mappedRequest });
  if (!isObject(preparedClaim) || preparedClaim.decision === 'blocked_repository_only') {
    return blocked('B02L_IDEMPOTENCY_CLAIM_PREPARATION_BLOCKED', {
      adapterReason: preparedClaim && preparedClaim.reason ? preparedClaim.reason : null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_adapter_awaiting_input',
    stage: STAGES.AWAITING_IDEMPOTENCY_CLAIM,
    mappedRequest: clone(mappedRequest),
    preparedClaim: clone(preparedClaim),
    repositoryPlan: null,
    nextOperation: operationDescriptor(preparedClaim),
    portInvoked: false,
    executorBound: false,
    runtimeHandlerBound: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false
  });
}

function resumeWithCanonicalState(state, stateEnvelope) {
  if (!isObject(state) || state.contractId !== CONTRACT_ID ||
      state.stage !== STAGES.AWAITING_CANONICAL_STATE || !isObject(state.mappedRequest)) {
    return blocked('AWAITING_CANONICAL_STATE_ADAPTER_STATE_REQUIRED');
  }

  const preparedClaim = adapterContract.prepareIdempotencyClaim({
    mappedRequest: state.mappedRequest,
    stateEnvelope
  });
  if (!isObject(preparedClaim) || preparedClaim.decision === 'blocked_repository_only') {
    return blocked('B02L_IDEMPOTENCY_CLAIM_PREPARATION_BLOCKED', {
      adapterReason: preparedClaim && preparedClaim.reason ? preparedClaim.reason : null
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_adapter_awaiting_input',
    stage: STAGES.AWAITING_IDEMPOTENCY_CLAIM,
    mappedRequest: clone(state.mappedRequest),
    preparedClaim: clone(preparedClaim),
    repositoryPlan: null,
    nextOperation: operationDescriptor(preparedClaim),
    suppliedCanonicalState: true,
    portInvoked: false,
    executorBound: false,
    runtimeHandlerBound: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    migrationApplied: false
  });
}

function resumeWithIdempotencyClaim(state, idempotencyClaimResult, options = {}) {
  if (!isObject(state) || state.contractId !== CONTRACT_ID ||
      state.stage !== STAGES.AWAITING_IDEMPOTENCY_CLAIM || !isObject(state.preparedClaim)) {
    return blocked('AWAITING_IDEMPOTENCY_CLAIM_ADAPTER_STATE_REQUIRED');
  }

  const plan = adapterContract.composeRepositoryExecutionPlan({
    preparedClaim: state.preparedClaim,
    idempotencyClaimResult
  }, options);

  if (!isObject(plan) || plan.decision === 'blocked_repository_only') {
    return blocked('B02L_REPOSITORY_EXECUTION_PLAN_COMPOSITION_BLOCKED', {
      adapterReason: plan && plan.reason ? plan.reason : null
    });
  }

  if (plan.decision === 'runtime_binding_terminal_plan_composed') {
    return freeze({
      contractId: CONTRACT_ID,
      boundaryId: BOUNDARY_ID,
      decision: 'repository_only_adapter_completed',
      stage: STAGES.COMPLETED_TERMINAL,
      mappedRequest: clone(state.mappedRequest),
      preparedClaim: clone(state.preparedClaim),
      repositoryPlan: clone(plan),
      nextOperation: null,
      result: {
        compositionDecision: plan.compositionDecision,
        evaluatorResult: clone(plan.evaluatorResult)
      },
      persistenceMayContinue: false,
      portInvoked: false,
      executorBound: false,
      runtimeHandlerBound: false,
      runtimeActivated: false,
      rpcExecuted: false,
      networkExecuted: false,
      realCommunityMutationExecuted: false,
      migrationApplied: false
    });
  }

  if (plan.decision !== 'runtime_binding_repository_plan_composed') {
    return blocked('B02L_CANONICAL_REPOSITORY_PLAN_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_adapter_awaiting_input',
    stage: STAGES.AWAITING_REPOSITORY_WRITE,
    mappedRequest: clone(state.mappedRequest),
    preparedClaim: clone(state.preparedClaim),
    repositoryPlan: clone(plan),
    nextOperation: operationDescriptor(plan),
    persistenceMayContinue: true,
    portInvoked: false,
    executorBound: false,
    runtimeHandlerBound: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false
  });
}

function resumeWithRepositoryWrite(state, repositoryWriteResult) {
  if (!isObject(state) || state.contractId !== CONTRACT_ID ||
      state.stage !== STAGES.AWAITING_REPOSITORY_WRITE || !isObject(state.repositoryPlan)) {
    return blocked('AWAITING_REPOSITORY_WRITE_ADAPTER_STATE_REQUIRED');
  }
  if (!isObject(repositoryWriteResult) || repositoryWriteResult.error) {
    return blocked('CANONICAL_REPOSITORY_WRITE_RESULT_REQUIRED');
  }

  const repositoryInput = state.repositoryPlan.repositoryInput;
  const outcome = isObject(repositoryInput) && isObject(repositoryInput.outcome)
    ? repositoryInput.outcome
    : null;
  const expectedRevision = outcome && Number.isSafeInteger(outcome.nextRevision)
    ? outcome.nextRevision
    : null;
  if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
    return blocked('EXPECTED_REPOSITORY_RESULT_REVISION_REQUIRED');
  }
  if (repositoryWriteResult.revision !== expectedRevision) {
    return blocked('REPOSITORY_RESULT_REVISION_MISMATCH', {
      expectedRevision,
      actualRevision: repositoryWriteResult.revision
    });
  }
  if (repositoryWriteResult.eventHash !== repositoryInput.eventHash) {
    return blocked('REPOSITORY_RESULT_EVENT_HASH_MISMATCH');
  }
  if (repositoryWriteResult.outcomeRecorded !== true) {
    return blocked('REPOSITORY_RESULT_OUTCOME_RECORD_REQUIRED');
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_adapter_completed',
    stage: STAGES.COMPLETED_WRITE_RESULT,
    mappedRequest: clone(state.mappedRequest),
    repositoryPlan: clone(state.repositoryPlan),
    nextOperation: null,
    result: clone(repositoryWriteResult),
    resultValidated: true,
    executionClaimedByAdapter: false,
    portInvoked: false,
    executorBound: false,
    runtimeHandlerBound: false,
    runtimeActivated: false,
    rpcExecuted: false,
    networkExecuted: false,
    realCommunityMutationExecuted: false,
    migrationApplied: false,
    repositoryRemoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'B02L_PREDECESSOR_CONTRACT_REQUIRED');
  requireValue(input.predecessorHead === PREDECESSOR_HEAD, 'B02L_CERTIFIED_HEAD_REQUIRED');
  requireValue(input.b02lCertificationRunId === PREDECESSOR_CERTIFICATION_RUN_ID, 'B02L_CERTIFICATION_RUN_REQUIRED');
  requireValue(input.b02lCertificationJobId === PREDECESSOR_CERTIFICATION_JOB_ID, 'B02L_CERTIFICATION_JOB_REQUIRED');
  requireValue(input.adapterImplementationMaterialized === true, 'B02M_ADAPTER_IMPLEMENTATION_REQUIRED');
  requireValue(input.stepwiseOrchestrationImplemented === true, 'B02M_STEPWISE_ORCHESTRATION_REQUIRED');
  requireValue(input.operationDescriptorsOnly === true, 'B02M_OPERATION_DESCRIPTORS_ONLY_REQUIRED');
  requireValue(input.portInvocationImplemented === false, 'B02M_PORT_INVOCATION_MUST_REMAIN_ABSENT');
  requireValue(input.b02lContractChanged === false, 'B02L_CONTRACT_MUST_REMAIN_FROZEN');
  requireValue(input.b02jCompositionChanged === false, 'B02J_COMPOSITION_MUST_REMAIN_FROZEN');
  requireValue(input.routeHandlersChanged === false, 'ROUTE_HANDLERS_MUST_REMAIN_FROZEN');
  requireValue(input.moduleRouteLoaderChanged === false, 'MODULE_ROUTE_LOADER_MUST_REMAIN_FROZEN');
  requireValue(input.repositoryV2ExecutorBound === false, 'B02I_V2_EXECUTOR_MUST_REMAIN_UNBOUND');
  requireValue(input.repositoryV2SqlApplied === false, 'B02I_V2_SQL_MUST_REMAIN_UNAPPLIED');
  requireValue(input.runtimeHandlerBound === false, 'RUNTIME_HANDLER_MUST_REMAIN_UNBOUND');
  requireValue(input.runtimeActivated === false, 'RUNTIME_MUST_REMAIN_INACTIVE');
  requireValue(input.rpcExecuted === false, 'B02M_RPC_EXECUTION_PROHIBITED');
  requireValue(input.networkExecuted === false, 'B02M_NETWORK_EXECUTION_PROHIBITED');
  requireValue(input.credentialReadExecuted === false, 'B02M_CREDENTIAL_READ_PROHIBITED');
  requireValue(input.remoteIdentityMutationExecuted === false, 'B02M_REMOTE_IDENTITY_MUTATION_PROHIBITED');
  requireValue(input.realCommunityMutationExecuted === false, 'B02M_REAL_COMMUNITY_MUTATION_PROHIBITED');
  requireValue(input.migrationApplied === false, 'B02M_MIGRATION_APPLICATION_PROHIBITED');

  const authority = input.authority;
  requireValue(isObject(authority) && authority.repositoryOnlyAdapterImplementationAuthority === true,
    'REPOSITORY_ONLY_ADAPTER_IMPLEMENTATION_AUTHORITY_REQUIRED');
  for (const key of [
    'runtimeHandlerMutationAuthority',
    'moduleRouteLoaderMutationAuthority',
    'repositoryExecutorBindingAuthority',
    'runtimeActivationAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'realtimeActivationAuthority',
    'credentialReadAuthority',
    'identityLifecycleRemoteAuthority',
    'realCommunityMutationAuthority',
    'migrationApplicationAuthority',
    'triggerCreationAuthority',
    'receiptCreationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority',
    'r5iCreationAuthority'
  ]) {
    requireValue(isObject(authority) && authority[key] === false,
      `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_runtime_binding_adapter_implementation_certifiable'
      : 'repository_only_runtime_binding_adapter_implementation_blocked',
    ready,
    blockers,
    stepwiseOrchestrationImplemented: ready,
    operationDescriptorsOnly: ready,
    portInvocationImplemented: false,
    repositoryExecutorBound: false,
    runtimeHandlerBound: false,
    repositoryV2SqlApplied: false,
    runtimeActivated: false,
    remoteExecutionAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    credentialReadAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    r5iCreationAuthority: false,
    nextAction: 'advance_under_standing_repository_only_authority_to_b02n_runtime_binding_integration_readiness_without_activation_remote_execution_or_migration_application'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_CERTIFICATION_RUN_ID,
  PREDECESSOR_CERTIFICATION_JOB_ID,
  STAGES,
  beginRuntimeBindingAdapter,
  resumeWithCanonicalState,
  resumeWithIdempotencyClaim,
  resumeWithRepositoryWrite,
  evaluateBoundaryCertification
});
