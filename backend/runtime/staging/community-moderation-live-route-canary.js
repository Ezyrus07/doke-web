'use strict';

const crypto = require('crypto');
const {
  createModerationRuntimeComposition
} = require('../../modules/communities/community-moderation-runtime-composition');
const {
  createModerationSupabaseRepository
} = require('../../modules/communities/community-moderation-supabase-repository-adapter');

const CONTRACT_ID = 'com-b04i-staging-live-composition-route-canary-v1';
const READINESS_CONTRACT_ID = 'com-b04i-attempt-2-readiness-v1';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B04I_ATTEMPT_2_STAGING_LIVE_COMPOSITION_ACTIVATION_AND_ROLLBACK_ONLY_ROUTE_CANARY';
const REQUIRED_AUTHORIZATION_SOURCE_HEAD = 'baa531e6672fbd752038e7f9b35d436aa6efa486';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const ACTIVATION_MODE = 'staging_authenticated_server_runtime';
const ROUTE_NAME = 'communities.moderation.command';
const ROUTE_PATH = '/communities/:communityId/moderation/commands';
const REQUIRED_RPC_ALLOWLIST = Object.freeze([
  'com_moderation_load_case_v1',
  'com_moderation_commit_case_command_v1'
]);

function freeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.values(value).forEach(freeze);
  return Object.freeze(value);
}

function hash(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function exact(actual, expected, code) {
  if (actual !== expected) throw new Error(code);
}

function assertAuthorization(packet) {
  if (!packet || typeof packet !== 'object') throw new Error('COM_B04I_AUTHORIZATION_PACKET_REQUIRED');
  exact(packet.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'COM_B04I_AUTHORIZATION_PHRASE_MISMATCH');
  exact(packet.received, true, 'COM_B04I_EXPLICIT_AUTHORIZATION_REQUIRED');
  exact(packet.consumed, true, 'COM_B04I_AUTHORIZATION_MUST_BE_CONSUMED');
  exact(packet.singleUse, true, 'COM_B04I_SINGLE_USE_AUTHORIZATION_REQUIRED');
  exact(packet.reusableAfterFailure, false, 'COM_B04I_AUTHORIZATION_REUSE_PROHIBITED');
  exact(packet.sourceHead, REQUIRED_AUTHORIZATION_SOURCE_HEAD, 'COM_B04I_SOURCE_HEAD_MISMATCH');
  return packet;
}

function assertTransactionGuard(guard) {
  if (!guard || typeof guard.assertActive !== 'function') throw new Error('COM_B04I_TRANSACTION_GUARD_REQUIRED');
  exact(guard.authority, 'staging_outer_transaction_guard', 'COM_B04I_TRANSACTION_GUARD_AUTHORITY_REQUIRED');
  exact(guard.environment, 'staging', 'COM_B04I_STAGING_TRANSACTION_REQUIRED');
  exact(String(guard.isolation || '').toLowerCase(), 'serializable', 'COM_B04I_SERIALIZABLE_TRANSACTION_REQUIRED');
  exact(guard.rollbackOnly, true, 'COM_B04I_ROLLBACK_ONLY_REQUIRED');
  exact(guard.publicTrafficEnabled, false, 'COM_B04I_PUBLIC_TRAFFIC_PROHIBITED');
  return guard;
}

function assertExecutor(executor) {
  if (!executor || executor.authority !== 'server_service_role' || typeof executor.rpc !== 'function') {
    throw new Error('COM_B04I_SERVER_SERVICE_ROLE_EXECUTOR_REQUIRED');
  }
  exact(executor.environment, 'staging_rollback_route_canary', 'COM_B04I_STAGING_EXECUTOR_REQUIRED');
  if (!Array.isArray(executor.rpcAllowlist) ||
      executor.rpcAllowlist.length !== REQUIRED_RPC_ALLOWLIST.length ||
      !REQUIRED_RPC_ALLOWLIST.every((name, index) => executor.rpcAllowlist[index] === name)) {
    throw new Error('COM_B04I_EXACT_RPC_ALLOWLIST_REQUIRED');
  }
  return executor;
}

function createModerationStagingLiveRouteCanary(options) {
  const input = options || {};
  const authorization = assertAuthorization(input.authorization);
  const transactionGuard = assertTransactionGuard(input.transactionGuard);
  const executor = assertExecutor(input.executor);
  const repository = createModerationSupabaseRepository(executor);
  const core = createModerationRuntimeComposition({
    sessionVerifier: input.sessionVerifier,
    contextLoader: input.contextLoader,
    clock: input.clock,
    executor,
    activationMode: 'disabled'
  });

  exact(core.activationMode, 'disabled', 'COM_B04I_CORE_COMPOSITION_MUST_REMAIN_DISABLED');
  exact(core.routeRegistered, false, 'COM_B04I_CORE_ROUTE_REGISTRATION_PROHIBITED');
  exact(repository.transactionBoundary, 'single_security_definer_rpc', 'COM_B04I_ATOMIC_RPC_BOUNDARY_REQUIRED');

  let attempted = false;

  async function executeRoute(request) {
    if (attempted) throw new Error('COM_B04I_ONE_SHOT_ROUTE_CANARY_ALREADY_EXECUTED');
    attempted = true;
    await transactionGuard.assertActive();

    const prepared = await core.prepareCommand(request);
    if (!prepared || prepared.decision?.decision !== 'accept' || !prepared.preparedCommit) {
      throw new Error('COM_B04I_ACCEPTED_PREPARED_COMMAND_REQUIRED');
    }

    await transactionGuard.assertActive();
    const committed = await repository.commitCaseCommand(prepared.preparedCommit);
    if (!committed || committed.replay === true || committed.revision !== 1 ||
        committed.eventHash !== prepared.preparedCommit.eventHash) {
      throw new Error('COM_B04I_ATOMIC_COMMIT_RESULT_INVALID');
    }

    const loaded = await repository.loadCanonicalCase({ caseId: prepared.preparedCommit.caseId });
    if (!loaded || loaded.caseId !== prepared.preparedCommit.caseId || loaded.revision !== 1 ||
        loaded.ledgerHeadHash !== prepared.preparedCommit.eventHash) {
      throw new Error('COM_B04I_CANONICAL_READ_AFTER_WRITE_INVALID');
    }

    await transactionGuard.assertActive();
    return freeze({
      status: 200,
      body: {
        contractId: CONTRACT_ID,
        routeName: ROUTE_NAME,
        activationMode: ACTIVATION_MODE,
        authorizationPhraseSha256: hash(authorization.phrase),
        authenticatedSessionVerified: true,
        decision: prepared.decision.decision,
        reason: prepared.decision.reason,
        caseIdSha256: hash(prepared.preparedCommit.caseId),
        eventHash: committed.eventHash,
        revision: committed.revision,
        replay: committed.replay === true,
        transactionBoundary: repository.transactionBoundary,
        transactionRolledBackByCaller: true,
        rawIdentifiersExposed: false,
        persistentRuntimeAuthority: false,
        publicTrafficEnabled: false,
        productionAuthority: false,
        pullRequestMergeAuthority: false
      }
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    readinessContractId: READINESS_CONTRACT_ID,
    projectId: REQUIRED_PROJECT_ID,
    environment: 'staging',
    activationMode: ACTIVATION_MODE,
    routeName: ROUTE_NAME,
    routePath: ROUTE_PATH,
    serverBound: true,
    rollbackOnly: true,
    syntheticOnly: true,
    stagingCanaryAuthority: true,
    publicTrafficEnabled: false,
    persistentRuntimeAuthority: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    executeRoute
  });
}

module.exports = freeze({
  CONTRACT_ID,
  READINESS_CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_AUTHORIZATION_SOURCE_HEAD,
  REQUIRED_PROJECT_ID,
  ACTIVATION_MODE,
  ROUTE_NAME,
  ROUTE_PATH,
  REQUIRED_RPC_ALLOWLIST,
  createModerationStagingLiveRouteCanary
});
