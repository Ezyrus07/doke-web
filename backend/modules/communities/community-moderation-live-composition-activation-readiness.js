'use strict';

const CONTRACT_ID = 'com-b04h-live-composition-activation-readiness-v1';
const PREDECESSOR_CONTRACT_ID = 'com-b04g-route-registry-module-loader-wiring-authorization-v1';
const COMPOSITION_CONTRACT_ID = 'com-b04d-moderation-runtime-composition-readiness-v1';
const CANDIDATE_ROUTE_NAME = 'communities.moderation.command';
const CANDIDATE_ROUTE_PATH = '/communities/:communityId/moderation/commands';
const CURRENT_HANDLER_FAILURE_CODE = 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';
const CURRENT_ACTIVATION_MODE = 'disabled';
const CANDIDATE_ACTIVATION_MODE = 'staging_authenticated_server_runtime';
const NEXT_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B04I_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY';
const REQUIRED_RPC_ALLOWLIST = Object.freeze([
  'com_moderation_load_case_v1',
  'com_moderation_commit_case_command_v1'
]);
const REQUIRED_BLOBS = Object.freeze({
  composition: '83c56aab710cc1bc5e0b18d6e9e659d5f671f478',
  routeRegistry: 'cda8292ce3669a2b76b70ed2d2aae9a017973254',
  moduleRouteLoader: '7b3c897c0bf20069b733632c0b424b8664eb8cf5',
  blockedRouteHandler: '4c35c1df8f622505c5a206bb3824f9973088538c'
});

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function exactArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function proof(value, expected) {
  if (!isObject(value)) return false;
  return Object.entries(expected).every(([key, required]) => value[key] === required);
}

function evaluateLiveCompositionActivationReadiness(packet) {
  const input = isObject(packet) ? packet : {};
  const blockers = [];
  const requireValue = (condition, code) => {
    if (!condition) blockers.push(code);
  };

  requireValue(input.predecessorContractId === PREDECESSOR_CONTRACT_ID, 'COM_B04G_PREDECESSOR_REQUIRED');
  requireValue(input.compositionContractId === COMPOSITION_CONTRACT_ID, 'COM_B04D_COMPOSITION_REQUIRED');
  requireValue(input.routeName === CANDIDATE_ROUTE_NAME, 'CANONICAL_MODERATION_ROUTE_REQUIRED');
  requireValue(input.routePath === CANDIDATE_ROUTE_PATH, 'CANONICAL_MODERATION_ROUTE_PATH_REQUIRED');
  requireValue(input.currentHandlerFailureCode === CURRENT_HANDLER_FAILURE_CODE, 'FAIL_CLOSED_HANDLER_REQUIRED');
  requireValue(input.currentActivationMode === CURRENT_ACTIVATION_MODE, 'DISABLED_ACTIVATION_MODE_REQUIRED');
  requireValue(input.candidateActivationMode === CANDIDATE_ACTIVATION_MODE, 'CANDIDATE_ACTIVATION_MODE_REQUIRED');

  for (const [key, sha] of Object.entries(REQUIRED_BLOBS)) {
    requireValue(input.boundBlobs && input.boundBlobs[key] === sha, `BOUND_BLOB_REQUIRED:${key}`);
  }

  requireValue(proof(input.sessionVerifier, {
    authority: 'server_verified_session_boundary',
    method: 'verify',
    source: 'supabase_auth_get_user',
    serverOnly: true,
    actorOverrideAllowed: false,
    rawTokenLoggingAllowed: false
  }), 'SERVER_VERIFIED_SESSION_PROOF_REQUIRED');

  requireValue(proof(input.contextLoader, {
    authority: 'canonical_server_context_loader',
    method: 'load',
    source: 'canonical_server_context',
    approvedPolicyRequired: true,
    persistedCaseBindingRequired: true,
    clientOverrideAllowed: false
  }), 'CANONICAL_CONTEXT_PROOF_REQUIRED');

  requireValue(proof(input.clock, {
    authority: 'server_utc_clock',
    method: 'now',
    source: 'server_utc_clock',
    clientTimestampTrusted: false
  }), 'SERVER_CLOCK_PROOF_REQUIRED');

  requireValue(proof(input.executor, {
    authority: 'server_service_role',
    method: 'rpc',
    environment: 'staging',
    serverOnly: true,
    arbitraryRpcAllowed: false,
    directTableAccessAllowed: false,
    serviceRoleKeyExposureAllowed: false
  }), 'SERVICE_ROLE_EXECUTOR_PROOF_REQUIRED');
  requireValue(exactArray(input.executor && input.executor.rpcAllowlist, REQUIRED_RPC_ALLOWLIST), 'EXACT_RPC_ALLOWLIST_REQUIRED');

  requireValue(proof(input.auditStorage, {
    authority: 'immutable_moderation_audit_storage',
    source: 'com_moderation_commit_case_command_v1',
    appendOnly: true,
    transactionBound: true,
    immutableLedgerRequired: true
  }), 'IMMUTABLE_AUDIT_STORAGE_PROOF_REQUIRED');

  requireValue(proof(input.policyApproval, {
    authority: 'approved_moderation_policy_boundary',
    status: 'approved',
    fingerprintRequired: true,
    institutionalApprovalRecorded: true
  }), 'APPROVED_POLICY_PROOF_REQUIRED');

  requireValue(proof(input.requestBoundary, {
    idempotencyRequired: true,
    auditRequired: true,
    requestFreshnessRequired: true,
    rlsValidationRequired: true,
    clientAuthorityOverrideAllowed: false
  }), 'REQUEST_SECURITY_BOUNDARY_PROOF_REQUIRED');

  const prohibited = [
    'liveCompositionAuthority',
    'stagingReadAuthority',
    'stagingMutationAuthority',
    'stagingDeploymentAuthority',
    'stagingTrafficAuthority',
    'realModerationAuthority',
    'realSanctionAuthority',
    'realAppealAuthority',
    'realMediaDispositionAuthority',
    'productionAuthority',
    'pullRequestMergeAuthority'
  ];
  for (const key of prohibited) {
    requireValue(input[key] === false, `PROHIBITED_AUTHORITY_MUST_BE_FALSE:${key}`);
  }

  const ready = blockers.length === 0;
  return freeze({
    contractId: CONTRACT_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    compositionContractId: COMPOSITION_CONTRACT_ID,
    decision: ready
      ? 'ready_for_separate_com_b04i_activation_authorization'
      : 'live_composition_activation_blocked',
    ready,
    blockers,
    currentHandlerFailureCode: CURRENT_HANDLER_FAILURE_CODE,
    currentActivationMode: CURRENT_ACTIVATION_MODE,
    candidateActivationMode: CANDIDATE_ACTIVATION_MODE,
    requiredRpcAllowlist: REQUIRED_RPC_ALLOWLIST,
    nextAuthorizationPhrase: NEXT_AUTHORIZATION_PHRASE,
    repositoryReadinessAuthority: ready,
    liveCompositionAuthority: false,
    stagingReadAuthority: false,
    stagingMutationAuthority: false,
    stagingDeploymentAuthority: false,
    stagingTrafficAuthority: false,
    realModerationAuthority: false,
    realSanctionAuthority: false,
    realAppealAuthority: false,
    realMediaDispositionAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false
  });
}

module.exports = freeze({
  CONTRACT_ID,
  PREDECESSOR_CONTRACT_ID,
  COMPOSITION_CONTRACT_ID,
  CANDIDATE_ROUTE_NAME,
  CANDIDATE_ROUTE_PATH,
  CURRENT_HANDLER_FAILURE_CODE,
  CURRENT_ACTIVATION_MODE,
  CANDIDATE_ACTIVATION_MODE,
  NEXT_AUTHORIZATION_PHRASE,
  REQUIRED_RPC_ALLOWLIST,
  REQUIRED_BLOBS,
  evaluateLiveCompositionActivationReadiness
});
