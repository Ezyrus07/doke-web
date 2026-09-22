'use strict';

const readiness = require(
  './community-command-post-idempotency-rate-limit-policy-snapshot-authority-readiness'
);

const IMPLEMENTATION_ID =
  'com-b02cy-canonical-rate-limit-snapshot-read-port-binding-v1';
const SOURCE_CONTRACT_ID = readiness.CONTRACT_ID;
const SOURCE_BOUNDARY_ID = readiness.BOUNDARY_ID;
const PORT_ID = readiness.RATE_LIMIT_READ_PORT_ID;

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function sourceContractMatchesAuthorizedBinding() {
  const contract = readiness.SNAPSHOT_READINESS_CONTRACT;
  return Boolean(
    contract &&
    SOURCE_BOUNDARY_ID === 'COM-B02CY' &&
    PORT_ID === 'canonical_rate_limit_snapshot_read' &&
    contract.portId === PORT_ID &&
    contract.authorityClass === 'canonical_server_rate_limit_authority' &&
    Array.isArray(contract.selectorFields) &&
    JSON.stringify(contract.selectorFields) === JSON.stringify(['actorId', 'communityId', 'command']) &&
    contract.sideEffectFreeReadRequired === true &&
    contract.atomicConsumeRequiredSeparately === true &&
    contract.readPortInvocationImplemented === false &&
    contract.rateLimitConsumeImplemented === false
  );
}

function baseState() {
  const contract = readiness.SNAPSHOT_READINESS_CONTRACT;
  return {
    implementationId: IMPLEMENTATION_ID,
    sourceContractId: SOURCE_CONTRACT_ID,
    sourceBoundaryId: SOURCE_BOUNDARY_ID,
    portId: PORT_ID,
    authorityClass: contract.authorityClass,
    selectorFields: clone(contract.selectorFields),
    expectedResultEnvelope: clone(contract.expectedResultEnvelope),
    sideEffectFreeReadRequired: true,
    atomicConsumeRequiredSeparately: true,
    policyValuesEmbedded: false,
    policyValueSelectionAuthority: false,
    readPortBindingImplemented: true,
    readPortInvocationImplemented: false,
    rateLimitConsumeImplemented: false,
    readPortInvoked: false,
    rateLimitConsumed: false,
    handlerChanged: false,
    runtimeChanged: false,
    repositoryOperationInvoked: false,
    credentialSourceBound: false,
    credentialReadExecuted: false,
    rpcBound: false,
    rpcExecuted: false,
    networkExecuted: false,
    supabaseBound: false,
    supabaseOperationExecuted: false,
    stagingMutationExecuted: false,
    migrationPrepared: false,
    migrationApplied: false,
    productionChanged: false,
    pullRequestMergeAuthority: false,
    readyForReviewAuthority: false
  };
}

function blocked(reason) {
  return freeze({
    ...baseState(),
    decision: 'blocked_repository_only',
    reason,
    readPortBindingImplemented: false,
    readPortBound: false
  });
}

function bindCanonicalRateLimitSnapshotReadPort(readPort) {
  if (!sourceContractMatchesAuthorizedBinding()) {
    return blocked('B02CY_SNAPSHOT_READINESS_CONTRACT_MISMATCH');
  }
  if (typeof readPort !== 'function') {
    return blocked('CANONICAL_RATE_LIMIT_SNAPSHOT_READ_PORT_FUNCTION_REQUIRED');
  }

  return freeze({
    ...baseState(),
    decision: 'repository_only_canonical_rate_limit_snapshot_read_port_bound',
    readPort,
    readPortBound: true,
    invocationAuthorized: false
  });
}

function inspectBindingMaterialization() {
  if (!sourceContractMatchesAuthorizedBinding()) {
    return blocked('B02CY_SNAPSHOT_READINESS_CONTRACT_MISMATCH');
  }

  return freeze({
    ...baseState(),
    decision: 'repository_only_canonical_rate_limit_snapshot_read_port_binding_materialized',
    bindingImplementationMaterialized: true,
    readPortBound: false,
    invocationAuthorized: false,
    b01Changed: false,
    b02cxChanged: false,
    b02cyChanged: false
  });
}

module.exports = freeze({
  IMPLEMENTATION_ID,
  SOURCE_CONTRACT_ID,
  SOURCE_BOUNDARY_ID,
  PORT_ID,
  bindCanonicalRateLimitSnapshotReadPort,
  inspectBindingMaterialization
});
