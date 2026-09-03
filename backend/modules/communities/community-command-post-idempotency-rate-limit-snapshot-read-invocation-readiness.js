'use strict';

const readiness = require(
  './community-command-post-idempotency-rate-limit-policy-snapshot-authority-readiness'
);
const binding = require(
  './community-command-post-idempotency-rate-limit-snapshot-read-port-binding'
);
const policyGateConfig = require(
  '../../../config/com-b01-policy-operational-integration-gate.json'
);

const IMPLEMENTATION_ID =
  'com-b02cy-canonical-rate-limit-snapshot-read-invocation-readiness-v1';
const SOURCE_CONTRACT_ID = readiness.CONTRACT_ID;
const SOURCE_BOUNDARY_ID = readiness.BOUNDARY_ID;
const BINDING_IMPLEMENTATION_ID = binding.IMPLEMENTATION_ID;
const PORT_ID = binding.PORT_ID;

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function baseState() {
  const bindingInspection = binding.inspectBindingMaterialization();
  return {
    implementationId: IMPLEMENTATION_ID,
    sourceContractId: SOURCE_CONTRACT_ID,
    sourceBoundaryId: SOURCE_BOUNDARY_ID,
    bindingImplementationId: BINDING_IMPLEMENTATION_ID,
    portId: PORT_ID,
    bindingMaterialized:
      bindingInspection.bindingImplementationMaterialized === true,
    bindingDecision: bindingInspection.decision || null,
    readPortBindingImplemented:
      bindingInspection.readPortBindingImplemented === true,
    invocationReadinessMaterialized: true,
    calls: 0,
    readPortInvoked: false,
    invocationAuthorized: false,
    readPortInvocationImplemented: false,
    rateLimitConsumeImplemented: false,
    rateLimitConsumed: false,
    policyApprovalPresent: policyGateConfig.approvedPolicyPresent === true,
    policyValuesRemainExternal: true,
    policyValuesMaterialized: false,
    policyValueSelectionAuthority: false,
    b01FailClosed: policyGateConfig.approvedPolicyPresent !== true,
    handlerInvoked: false,
    runtimeActivated: false,
    repositoryOperationInvoked: false,
    credentialReadExecuted: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseOperationExecuted: false,
    realtimeActivated: false,
    stagingExecuted: false,
    migrationApplied: false,
    productionChanged: false,
    pullRequestMerged: false,
    readyForReviewChanged: false,
    handlerInvocationAuthority: false,
    runtimeActivationAuthority: false,
    repositoryOperationInvocationAuthority: false,
    credentialReadAuthority: false,
    rpcExecutionAuthority: false,
    networkAuthority: false,
    supabaseAuthority: false,
    realtimeActivationAuthority: false,
    stagingAuthority: false,
    migrationApplicationAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false
  };
}

function inspectInvocationReadiness() {
  const state = baseState();
  const reasons = [];

  if (SOURCE_BOUNDARY_ID !== 'COM-B02CY') {
    reasons.push('SOURCE_BOUNDARY_MUST_REMAIN_COM_B02CY');
  }
  if (PORT_ID !== 'canonical_rate_limit_snapshot_read') {
    reasons.push('CANONICAL_RATE_LIMIT_SNAPSHOT_READ_PORT_REQUIRED');
  }
  if (state.bindingMaterialized !== true) {
    reasons.push('SNAPSHOT_READ_BINDING_MATERIALIZATION_REQUIRED');
  }
  if (state.readPortBindingImplemented !== true) {
    reasons.push('SNAPSHOT_READ_BINDING_IMPLEMENTATION_REQUIRED');
  }
  if (policyGateConfig.status !== 'policy_gate_defined_approval_pending') {
    reasons.push('B01_POLICY_GATE_PENDING_STATUS_REQUIRED');
  }
  if (policyGateConfig.approvedPolicyPresent !== false) {
    reasons.push('B01_APPROVED_POLICY_MUST_REMAIN_ABSENT_FOR_THIS_CANDIDATE');
  } else {
    reasons.push('B01_APPROVED_POLICY_NOT_PRESENT');
  }

  return freeze({
    ...state,
    decision: 'blocked_repository_only_snapshot_read_invocation_readiness',
    failClosed: true,
    readyForInvocationAuthorization: false,
    reasons,
    nextAction:
      'stop_and_require_fresh_explicit_authorization_after_policy_approval_before_snapshot_read_invocation_or_rate_limit_consume'
  });
}

module.exports = freeze({
  IMPLEMENTATION_ID,
  SOURCE_CONTRACT_ID,
  SOURCE_BOUNDARY_ID,
  BINDING_IMPLEMENTATION_ID,
  PORT_ID,
  inspectInvocationReadiness
});
