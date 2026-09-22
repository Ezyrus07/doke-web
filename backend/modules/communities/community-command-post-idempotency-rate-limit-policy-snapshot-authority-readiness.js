'use strict';

const projectionImplementation = require(
  './community-command-post-idempotency-external-authority-projection-implementation'
);
const policyGate = require('./community-policy-operational-integration-gate');

const CONTRACT_ID =
  'com-b02cy-repository-only-post-idempotency-rate-limit-policy-snapshot-authority-readiness-v1';
const BOUNDARY_ID = 'COM-B02CY';
const PREDECESSOR_CONTRACT_ID = projectionImplementation.CONTRACT_ID;
const PREDECESSOR_BOUNDARY_ID = projectionImplementation.BOUNDARY_ID;
const PREDECESSOR_HEAD = '6bb9608ce4b1b5a01ffb249030e3eb8cd71e88ca';
const PREDECESSOR_TREE = 'e18f83d4e78f077af933b922124531840a23a8c1';
const POLICY_GATE_CONTRACT_ID = policyGate.CONTRACT_ID;
const POLICY_DOMAIN = 'content_realtime_rate_limits';
const RATE_LIMIT_READ_PORT_ID = 'canonical_rate_limit_snapshot_read';
const RATE_LIMIT_COMMANDS = Object.freeze(['send_message', 'publish_post']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
}

function isSemanticVersion(value) {
  return typeof value === 'string' && /^\d+\.\d+\.\d+$/.test(value);
}

function isExplicitUtc(value) {
  return typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value);
}

function blocked(reason, details = {}) {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'blocked_repository_only',
    reason,
    details: clone(details),
    repositoryOnlyRateLimitPolicySnapshotReadinessAuthority: true,
    policyApprovalAuthority: false,
    policyValueSelectionAuthority: false,
    rateLimitSnapshotReadPortBindingAuthority: false,
    rateLimitSnapshotReadInvocationAuthority: false,
    rateLimitMutationAuthority: false,
    handlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    supabaseAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    runtimeActivationAuthority: false,
    realtimeActivationAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false
  });
}

const POLICY_PROJECTION_CONTRACT = freeze({
  source: 'canonical_server',
  complete: true,
  policyDomain: POLICY_DOMAIN,
  requiredMetadata: ['policyVersion', 'policyHash', 'effectiveAt'],
  requiredCommands: RATE_LIMIT_COMMANDS.slice(),
  commandPolicyFields: ['limit', 'windowSeconds'],
  approvalEvidenceAuthority: POLICY_GATE_CONTRACT_ID,
  approvedPolicyRequired: true,
  policyValuesEmbeddedInBoundary: false,
  clientPolicyAuthorityAllowed: false
});

const SNAPSHOT_READINESS_CONTRACT = freeze({
  portId: RATE_LIMIT_READ_PORT_ID,
  authorityClass: 'canonical_server_rate_limit_authority',
  selectorFields: ['actorId', 'communityId', 'command'],
  commands: RATE_LIMIT_COMMANDS.slice(),
  expectedResultEnvelope: {
    requiredFields: ['source', 'complete', 'limit', 'used', 'resetAt'],
    requiredConstants: {
      source: 'canonical_server',
      complete: true
    }
  },
  policyProjectionRequired: true,
  missingActiveBucketUsed: 0,
  sideEffectFreeReadRequired: true,
  resetAtMustUseApprovedPolicyWindow: true,
  snapshotReadIsFinalEnforcementAuthority: false,
  atomicConsumeRequiredSeparately: true,
  readPortBindingImplemented: false,
  readPortInvocationImplemented: false,
  rateLimitConsumeImplemented: false
});

function validatePolicyProjection(packet) {
  if (!isObject(packet)) return blocked('CANONICAL_RATE_LIMIT_POLICY_PROJECTION_REQUIRED');
  if (packet.source !== POLICY_PROJECTION_CONTRACT.source) {
    return blocked('CANONICAL_RATE_LIMIT_POLICY_SOURCE_REQUIRED');
  }
  if (packet.complete !== POLICY_PROJECTION_CONTRACT.complete) {
    return blocked('COMPLETE_RATE_LIMIT_POLICY_PROJECTION_REQUIRED');
  }
  if (packet.policyDomain !== POLICY_DOMAIN) {
    return blocked('RATE_LIMIT_POLICY_DOMAIN_MISMATCH');
  }
  if (!isSemanticVersion(packet.policyVersion)) {
    return blocked('SEMANTIC_RATE_LIMIT_POLICY_VERSION_REQUIRED');
  }
  if (!isSha256(packet.policyHash)) {
    return blocked('RATE_LIMIT_POLICY_SHA256_REQUIRED');
  }
  if (!isExplicitUtc(packet.effectiveAt)) {
    return blocked('EXPLICIT_RATE_LIMIT_POLICY_EFFECTIVE_AT_UTC_REQUIRED');
  }
  if (!isObject(packet.approval)) {
    return blocked('B01_POLICY_APPROVAL_EVIDENCE_REQUIRED');
  }

  const approval = policyGate.evaluatePolicyApproval(packet.approval);
  if (!approval || approval.approvedPolicyPresent !== true) {
    return blocked('B01_APPROVED_POLICY_REQUIRED', {
      policyDecision: approval && approval.decision ? approval.decision : null
    });
  }
  if (approval.policyVersion !== packet.policyVersion) {
    return blocked('RATE_LIMIT_POLICY_VERSION_APPROVAL_MISMATCH');
  }
  if (approval.policyHash !== packet.policyHash) {
    return blocked('RATE_LIMIT_POLICY_HASH_APPROVAL_MISMATCH');
  }
  if (packet.approval.effectiveAt !== packet.effectiveAt) {
    return blocked('RATE_LIMIT_POLICY_EFFECTIVE_AT_APPROVAL_MISMATCH');
  }

  if (!isObject(packet.commandPolicies)) {
    return blocked('RATE_LIMIT_COMMAND_POLICIES_REQUIRED');
  }
  const commands = Object.keys(packet.commandPolicies).sort();
  const expectedCommands = RATE_LIMIT_COMMANDS.slice().sort();
  if (JSON.stringify(commands) !== JSON.stringify(expectedCommands)) {
    return blocked('RATE_LIMIT_COMMAND_POLICY_SET_MUST_BE_EXACT', {
      expectedCommands,
      commands
    });
  }

  const commandPolicies = {};
  for (const command of RATE_LIMIT_COMMANDS) {
    const policy = packet.commandPolicies[command];
    if (!isObject(policy)) {
      return blocked('RATE_LIMIT_COMMAND_POLICY_REQUIRED', { command });
    }
    if (!Number.isSafeInteger(policy.limit) || policy.limit < 1) {
      return blocked('RATE_LIMIT_POLICY_LIMIT_INTEGER_GTE_1_REQUIRED', { command });
    }
    if (!Number.isSafeInteger(policy.windowSeconds) || policy.windowSeconds < 1) {
      return blocked('RATE_LIMIT_POLICY_WINDOW_SECONDS_INTEGER_GTE_1_REQUIRED', { command });
    }
    commandPolicies[command] = {
      limit: policy.limit,
      windowSeconds: policy.windowSeconds
    };
  }

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_canonical_rate_limit_policy_projection_validated',
    valid: true,
    source: packet.source,
    complete: packet.complete,
    policyDomain: packet.policyDomain,
    policyVersion: packet.policyVersion,
    policyHash: packet.policyHash,
    effectiveAt: packet.effectiveAt,
    commandPolicies,
    approvalDecision: approval.decision,
    clientPolicyAuthorityAccepted: false,
    policyValueSelectionAuthority: false,
    runtimeAuthority: false
  });
}

function describeSnapshotReadiness(input) {
  if (!isObject(input)) return blocked('RATE_LIMIT_SNAPSHOT_READINESS_INPUT_REQUIRED');
  if (!RATE_LIMIT_COMMANDS.includes(input.command)) {
    return blocked('RATE_LIMIT_COMMAND_UNSUPPORTED', { command: input.command || null });
  }
  if (!nonEmptyString(input.actorId)) {
    return blocked('RATE_LIMIT_ACTOR_SELECTOR_REQUIRED');
  }
  if (!nonEmptyString(input.communityId)) {
    return blocked('RATE_LIMIT_COMMUNITY_SELECTOR_REQUIRED');
  }

  const policy = validatePolicyProjection(input.policyProjection);
  if (policy.valid !== true) return policy;
  const commandPolicy = policy.commandPolicies[input.command];

  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_rate_limit_snapshot_readiness_described',
    portId: RATE_LIMIT_READ_PORT_ID,
    authorityClass: SNAPSHOT_READINESS_CONTRACT.authorityClass,
    selector: {
      actorId: input.actorId.trim(),
      communityId: input.communityId.trim(),
      command: input.command
    },
    policy: {
      policyVersion: policy.policyVersion,
      policyHash: policy.policyHash,
      effectiveAt: policy.effectiveAt,
      limit: commandPolicy.limit,
      windowSeconds: commandPolicy.windowSeconds
    },
    expectedResultEnvelope: clone(SNAPSHOT_READINESS_CONTRACT.expectedResultEnvelope),
    missingActiveBucketUsed: 0,
    sideEffectFreeReadRequired: true,
    resetAtMustUseApprovedPolicyWindow: true,
    snapshotReadIsFinalEnforcementAuthority: false,
    atomicConsumeRequiredSeparately: true,
    invoke: false,
    readPortBound: false,
    readPortInvoked: false,
    rateLimitConsumed: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseOperationExecuted: false,
    runtimeActivated: false,
    realtimeActivated: false,
    migrationApplied: false,
    productionChanged: false
  });
}

function describeBoundary() {
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorBoundaryId: PREDECESSOR_BOUNDARY_ID,
    predecessorHead: PREDECESSOR_HEAD,
    predecessorTree: PREDECESSOR_TREE,
    policyGateContractId: POLICY_GATE_CONTRACT_ID,
    policyDomain: POLICY_DOMAIN,
    rateLimitCommands: RATE_LIMIT_COMMANDS.slice(),
    policyProjectionContract: clone(POLICY_PROJECTION_CONTRACT),
    snapshotReadinessContract: clone(SNAPSHOT_READINESS_CONTRACT),
    policyValuesEmbeddedInBoundary: false,
    approvedPolicyRequired: true,
    clientPolicyAuthorityAllowed: false,
    canonicalSnapshotReadAuthorityMaterialized: false,
    rateLimitConsumeMaterialized: false,
    b02cxChanged: false,
    b02cwChanged: false,
    b01Changed: false,
    a04Changed: false,
    matrixSourceChanged: false,
    matrixDerivativesRefreshed: true,
    handlerChanged: false,
    runtimeChanged: false,
    migrationPrepared: false,
    migrationApplied: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseOperationExecuted: false,
    stagingMutationExecuted: false,
    productionChanged: false,
    repositoryOnlyRateLimitPolicySnapshotReadinessAuthority: true,
    policyApprovalAuthority: false,
    policyValueSelectionAuthority: false,
    rateLimitSnapshotReadPortBindingAuthority: false,
    rateLimitSnapshotReadInvocationAuthority: false,
    rateLimitMutationAuthority: false,
    handlerInvocationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    supabaseAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    runtimeActivationAuthority: false,
    realtimeActivationAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_policy_materialization_snapshot_read_binding_or_rate_limit_consume'
  });
}

function evaluateBoundaryCertification(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const req = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  req(input.predecessorContractId === PREDECESSOR_CONTRACT_ID,
    'B02CX_PREDECESSOR_CONTRACT_REQUIRED');
  req(input.predecessorBoundaryId === PREDECESSOR_BOUNDARY_ID,
    'B02CX_PREDECESSOR_BOUNDARY_REQUIRED');
  req(input.predecessorHead === PREDECESSOR_HEAD,
    'B02CX_CERTIFIED_HEAD_REQUIRED');
  req(input.predecessorTree === PREDECESSOR_TREE,
    'B02CX_CERTIFIED_TREE_REQUIRED');

  for (const [key, code] of [
    ['sourceMaterialized', 'B02CY_SOURCE_REQUIRED'],
    ['rateLimitCommandsExact', 'B02CY_RATE_LIMIT_COMMANDS_MUST_BE_EXACT'],
    ['policyApprovalDependencyDefined', 'B02CY_POLICY_APPROVAL_DEPENDENCY_REQUIRED'],
    ['policyValuesRemainExternal', 'B02CY_POLICY_VALUES_MUST_REMAIN_EXTERNAL'],
    ['policyProjectionFailClosed', 'B02CY_POLICY_PROJECTION_FAIL_CLOSED_REQUIRED'],
    ['snapshotSelectorsExact', 'B02CY_SNAPSHOT_SELECTORS_MUST_BE_EXACT'],
    ['sideEffectFreeSnapshotRequired', 'B02CY_SIDE_EFFECT_FREE_SNAPSHOT_REQUIRED'],
    ['missingBucketMeansZeroUsed', 'B02CY_MISSING_BUCKET_ZERO_USED_REQUIRED'],
    ['approvedWindowResetRequired', 'B02CY_APPROVED_WINDOW_RESET_REQUIRED'],
    ['atomicConsumeSeparated', 'B02CY_ATOMIC_CONSUME_SEPARATION_REQUIRED'],
    ['matrixDerivativesRefreshed', 'B02CY_MATRIX_DERIVATIVES_REQUIRED']
  ]) {
    req(input[key] === true, code);
  }

  for (const [key, code] of [
    ['b02cxChanged', 'B02CX_MUST_REMAIN_FROZEN'],
    ['b02cwChanged', 'B02CW_MUST_REMAIN_FROZEN'],
    ['b01Changed', 'B01_POLICY_GATE_MUST_REMAIN_FROZEN'],
    ['a04Changed', 'A04_RATE_LIMIT_CONTRACT_MUST_REMAIN_FROZEN'],
    ['matrixSourceChanged', 'MATRIX_SOURCE_MUST_REMAIN_FROZEN'],
    ['handlerChanged', 'HANDLERS_MUST_REMAIN_FROZEN'],
    ['runtimeChanged', 'RUNTIME_MUST_REMAIN_FROZEN'],
    ['migrationPrepared', 'MIGRATION_PREPARATION_PROHIBITED'],
    ['migrationApplied', 'MIGRATION_APPLICATION_PROHIBITED'],
    ['canonicalSnapshotReadAuthorityMaterialized', 'SNAPSHOT_AUTHORITY_MATERIALIZATION_PROHIBITED'],
    ['rateLimitConsumeMaterialized', 'RATE_LIMIT_CONSUME_MATERIALIZATION_PROHIBITED'],
    ['repositoryOperationInvoked', 'REPOSITORY_OPERATION_INVOCATION_PROHIBITED'],
    ['credentialReadExecuted', 'CREDENTIAL_READ_PROHIBITED'],
    ['rpcExecuted', 'RPC_EXECUTION_PROHIBITED'],
    ['networkExecuted', 'NETWORK_EXECUTION_PROHIBITED'],
    ['supabaseOperationExecuted', 'SUPABASE_OPERATION_PROHIBITED'],
    ['stagingMutationExecuted', 'STAGING_MUTATION_PROHIBITED'],
    ['productionChanged', 'PRODUCTION_CHANGE_PROHIBITED']
  ]) {
    req(input[key] === false, code);
  }

  const authority = input.authority;
  req(
    authority && authority.repositoryOnlyRateLimitPolicySnapshotReadinessAuthority === true,
    'B02CY_REPOSITORY_ONLY_READINESS_AUTHORITY_REQUIRED'
  );
  for (const key of [
    'policyApprovalAuthority',
    'policyValueSelectionAuthority',
    'rateLimitSnapshotReadPortBindingAuthority',
    'rateLimitSnapshotReadInvocationAuthority',
    'rateLimitMutationAuthority',
    'handlerInvocationAuthority',
    'repositoryOperationInvocationAuthority',
    'credentialReadAuthority',
    'rpcExecutionAuthority',
    'networkAuthority',
    'supabaseAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'runtimeActivationAuthority',
    'realtimeActivationAuthority',
    'migrationApplicationAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority',
    'readyForReviewAuthority'
  ]) {
    req(authority && authority[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    decision: ready
      ? 'repository_only_rate_limit_policy_snapshot_authority_readiness_certifiable'
      : 'repository_only_rate_limit_policy_snapshot_authority_readiness_blocked',
    ready,
    blockers,
    policyValuesEmbeddedInBoundary: false,
    canonicalSnapshotReadAuthorityMaterialized: false,
    rateLimitConsumeMaterialized: false,
    runtimeAuthority: false,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_before_policy_materialization_snapshot_read_binding_or_rate_limit_consume'
  });
}

module.exports = freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_BOUNDARY_ID,
  PREDECESSOR_HEAD,
  PREDECESSOR_TREE,
  POLICY_GATE_CONTRACT_ID,
  POLICY_DOMAIN,
  RATE_LIMIT_READ_PORT_ID,
  RATE_LIMIT_COMMANDS,
  POLICY_PROJECTION_CONTRACT,
  SNAPSHOT_READINESS_CONTRACT,
  validatePolicyProjection,
  describeSnapshotReadiness,
  describeBoundary,
  evaluateBoundaryCertification
});
