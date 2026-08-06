'use strict';

const crypto = require('crypto');
const {
  createModerationRuntimeComposition
} = require('../../modules/communities/community-moderation-runtime-composition');
const {
  createModerationSupabaseRepository
} = require('../../modules/communities/community-moderation-supabase-repository-adapter');

const CONTRACT_ID = 'com-b04e-authenticated-rollback-only-moderation-runtime-composition-canary-v1';
const REQUIRED_AUTHORIZATION_PHRASE = 'I_EXPLICITLY_AUTHORIZE_COM_B04E_AUTHENTICATED_ROLLBACK_ONLY_MODERATION_RUNTIME_COMPOSITION_CANARY_ON_DOKE_STAGING';
const REQUIRED_PROJECT_ID = 'zwkczgewzbsorbrjuzpb';
const REQUIRED_ENVIRONMENT = 'staging';
const REQUIRED_TRANSACTION_BOUNDARY = 'single_security_definer_rpc';

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

function assertAuthorization(authorization) {
  if (!authorization || typeof authorization !== 'object') {
    throw new Error('COM_B04E_AUTHORIZATION_PACKET_REQUIRED');
  }
  exact(authorization.phrase, REQUIRED_AUTHORIZATION_PHRASE, 'COM_B04E_AUTHORIZATION_PHRASE_MISMATCH');
  exact(authorization.received, true, 'COM_B04E_EXPLICIT_AUTHORIZATION_REQUIRED');
  exact(authorization.singleUse, true, 'COM_B04E_SINGLE_USE_AUTHORIZATION_REQUIRED');
  exact(authorization.consumed, false, 'COM_B04E_AUTHORIZATION_ALREADY_CONSUMED');
  exact(authorization.reusableAfterFailure, false, 'COM_B04E_AUTHORIZATION_REUSE_PROHIBITED');
  return authorization;
}

function assertTransactionGuard(guard) {
  if (!guard || typeof guard.assertActive !== 'function') {
    throw new Error('COM_B04E_OUTER_TRANSACTION_GUARD_REQUIRED');
  }
  exact(guard.authority, 'staging_outer_transaction_guard', 'COM_B04E_TRANSACTION_GUARD_AUTHORITY_REQUIRED');
  exact(guard.environment, REQUIRED_ENVIRONMENT, 'COM_B04E_STAGING_TRANSACTION_REQUIRED');
  exact(String(guard.isolation || '').toLowerCase(), 'serializable', 'COM_B04E_SERIALIZABLE_TRANSACTION_REQUIRED');
  exact(guard.rollbackOnly, true, 'COM_B04E_ROLLBACK_ONLY_TRANSACTION_REQUIRED');
  exact(guard.mutationScope, 'synthetic_moderation_canary', 'COM_B04E_SYNTHETIC_SCOPE_REQUIRED');
  return guard;
}

function assertExecutor(executor) {
  if (!executor || executor.authority !== 'server_service_role' || typeof executor.rpc !== 'function') {
    throw new Error('COM_B04E_SERVER_SERVICE_ROLE_EXECUTOR_REQUIRED');
  }
  exact(executor.environment, 'staging_rollback_canary', 'COM_B04E_STAGING_CANARY_EXECUTOR_REQUIRED');
  return executor;
}

function assertPrepared(prepared) {
  if (!prepared || !prepared.decision || prepared.decision.decision !== 'accept' || !prepared.preparedCommit) {
    throw new Error('COM_B04E_ACCEPTED_PREPARED_COMMAND_REQUIRED');
  }
  exact(prepared.activationMode, 'disabled', 'COM_B04E_CORE_COMPOSITION_MUST_REMAIN_DISABLED');
  exact(prepared.runtimeMutationAuthority, false, 'COM_B04E_CORE_RUNTIME_AUTHORITY_MUST_REMAIN_FALSE');
  exact(prepared.stagingAuthority, false, 'COM_B04E_CORE_STAGING_AUTHORITY_MUST_REMAIN_FALSE');
  exact(prepared.productionAuthority, false, 'COM_B04E_CORE_PRODUCTION_AUTHORITY_MUST_REMAIN_FALSE');
  return prepared;
}

function createModerationRollbackCanary(options) {
  const input = options || {};
  const authorization = assertAuthorization(input.authorization);
  const transactionGuard = assertTransactionGuard(input.transactionGuard);
  const executor = assertExecutor(input.executor);
  const repository = createModerationSupabaseRepository(executor);
  exact(repository.transactionBoundary, REQUIRED_TRANSACTION_BOUNDARY, 'COM_B04E_ATOMIC_RPC_BOUNDARY_REQUIRED');

  const composition = createModerationRuntimeComposition({
    sessionVerifier: input.sessionVerifier,
    contextLoader: input.contextLoader,
    clock: input.clock,
    executor,
    activationMode: 'disabled'
  });
  exact(composition.activationMode, 'disabled', 'COM_B04E_CORE_COMPOSITION_MUST_REMAIN_DISABLED');
  exact(composition.routeRegistered, false, 'COM_B04E_ROUTE_REGISTRATION_PROHIBITED');

  let attempted = false;

  async function execute(request) {
    if (attempted) throw new Error('COM_B04E_AUTHORIZATION_ALREADY_CONSUMED');
    attempted = true;

    await transactionGuard.assertActive();
    const prepared = assertPrepared(await composition.prepareCommand(request));

    let livePathBlocked = false;
    try {
      await composition.invokePreparedCommand(prepared);
    } catch (error) {
      if (error && error.message === 'COM_B04D_LIVE_INVOCATION_NOT_AUTHORIZED') {
        livePathBlocked = true;
      } else {
        throw error;
      }
    }
    exact(livePathBlocked, true, 'COM_B04E_CORE_LIVE_PATH_MUST_REMAIN_BLOCKED');

    const before = await repository.loadCanonicalCase({ caseId: prepared.preparedCommit.caseId });
    exact(before, null, 'COM_B04E_SYNTHETIC_CASE_MUST_BE_ABSENT');

    await transactionGuard.assertActive();
    const committed = await repository.commitCaseCommand(prepared.preparedCommit);
    if (!committed || committed.replay === true || committed.revision !== 1 ||
        committed.eventHash !== prepared.preparedCommit.eventHash) {
      throw new Error('COM_B04E_ATOMIC_COMMIT_RESULT_INVALID');
    }

    const loaded = await repository.loadCanonicalCase({ caseId: prepared.preparedCommit.caseId });
    if (!loaded || loaded.caseId !== prepared.preparedCommit.caseId || loaded.revision !== 1 ||
        loaded.ledgerHeadHash !== prepared.preparedCommit.eventHash) {
      throw new Error('COM_B04E_CANONICAL_READ_AFTER_WRITE_INVALID');
    }

    await transactionGuard.assertActive();
    return freeze({
      contractId: CONTRACT_ID,
      authorizationConsumed: true,
      authorizationPhraseSha256: hash(authorization.phrase),
      coreCompositionActivationMode: composition.activationMode,
      coreLivePathBlocked: livePathBlocked,
      routeRegistered: composition.routeRegistered,
      transactionBoundary: repository.transactionBoundary,
      decision: prepared.decision.decision,
      reason: prepared.decision.reason,
      caseIdSha256: hash(prepared.preparedCommit.caseId),
      eventHash: prepared.preparedCommit.eventHash,
      revision: committed.revision,
      replay: committed.replay === true,
      initialEvidenceMaterialized: Boolean(prepared.preparedCommit.evidenceRecord),
      rawIdentifiersExposed: false,
      runtimeActivated: false,
      productionAuthority: false,
      pullRequestMergeAuthority: false
    });
  }

  return freeze({
    contractId: CONTRACT_ID,
    projectId: REQUIRED_PROJECT_ID,
    environment: REQUIRED_ENVIRONMENT,
    rollbackOnly: true,
    syntheticOnly: true,
    routeRegistered: false,
    runtimeActivated: false,
    productionAuthority: false,
    pullRequestMergeAuthority: false,
    execute
  });
}

module.exports = freeze({
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_PROJECT_ID,
  REQUIRED_ENVIRONMENT,
  REQUIRED_TRANSACTION_BOUNDARY,
  createModerationRollbackCanary
});
