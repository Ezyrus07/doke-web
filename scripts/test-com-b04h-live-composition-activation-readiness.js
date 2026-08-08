#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const readiness = require('../backend/modules/communities/community-moderation-live-composition-activation-readiness');
const composition = require('../backend/modules/communities/community-moderation-runtime-composition');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const { findRouteByName } = require('../backend/shared/http/route-registry');
const { getHandler } = require('../backend/shared/http/module-route-loader');
const config = require('../config/com-b04h-live-composition-activation-readiness.json');
const matrix = require('../config/domain-completion-matrix.json');

let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

function validPacket() {
  return {
    predecessorContractId: readiness.PREDECESSOR_CONTRACT_ID,
    compositionContractId: readiness.COMPOSITION_CONTRACT_ID,
    routeName: readiness.CANDIDATE_ROUTE_NAME,
    routePath: readiness.CANDIDATE_ROUTE_PATH,
    currentHandlerFailureCode: readiness.CURRENT_HANDLER_FAILURE_CODE,
    currentActivationMode: readiness.CURRENT_ACTIVATION_MODE,
    candidateActivationMode: readiness.CANDIDATE_ACTIVATION_MODE,
    boundBlobs: { ...readiness.REQUIRED_BLOBS },
    sessionVerifier: {
      authority: 'server_verified_session_boundary', method: 'verify', source: 'supabase_auth_get_user',
      serverOnly: true, actorOverrideAllowed: false, rawTokenLoggingAllowed: false
    },
    contextLoader: {
      authority: 'canonical_server_context_loader', method: 'load', source: 'canonical_server_context',
      approvedPolicyRequired: true, persistedCaseBindingRequired: true, clientOverrideAllowed: false
    },
    clock: {
      authority: 'server_utc_clock', method: 'now', source: 'server_utc_clock', clientTimestampTrusted: false
    },
    executor: {
      authority: 'server_service_role', method: 'rpc', environment: 'staging', serverOnly: true,
      arbitraryRpcAllowed: false, directTableAccessAllowed: false, serviceRoleKeyExposureAllowed: false,
      rpcAllowlist: [...readiness.REQUIRED_RPC_ALLOWLIST]
    },
    auditStorage: {
      authority: 'immutable_moderation_audit_storage', source: 'com_moderation_commit_case_command_v1',
      appendOnly: true, transactionBound: true, immutableLedgerRequired: true
    },
    policyApproval: {
      authority: 'approved_moderation_policy_boundary', status: 'approved',
      fingerprintRequired: true, institutionalApprovalRecorded: true
    },
    requestBoundary: {
      idempotencyRequired: true, auditRequired: true, requestFreshnessRequired: true,
      rlsValidationRequired: true, clientAuthorityOverrideAllowed: false
    },
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
  };
}

async function main() {
  equal(readiness.CONTRACT_ID, 'com-b04h-live-composition-activation-readiness-v1', 'contract id');
  equal(readiness.PREDECESSOR_CONTRACT_ID, 'com-b04g-route-registry-module-loader-wiring-authorization-v1', 'predecessor');
  equal(readiness.COMPOSITION_CONTRACT_ID, composition.CONTRACT_ID, 'composition contract');
  equal(readiness.CANDIDATE_ROUTE_NAME, 'communities.moderation.command', 'route name');
  equal(readiness.CANDIDATE_ROUTE_PATH, '/communities/:communityId/moderation/commands', 'route path');
  equal(readiness.CURRENT_HANDLER_FAILURE_CODE, routeHandlers.FAILURE_CODE, 'failure code');
  equal(readiness.CURRENT_ACTIVATION_MODE, 'disabled', 'current mode');
  equal(readiness.CANDIDATE_ACTIVATION_MODE, 'staging_authenticated_server_runtime', 'candidate mode');
  equal(readiness.REQUIRED_RPC_ALLOWLIST, ['com_moderation_load_case_v1', 'com_moderation_commit_case_command_v1'], 'RPC allowlist');
  ok(Object.isFrozen(readiness.REQUIRED_RPC_ALLOWLIST), 'allowlist frozen');
  ok(Object.isFrozen(readiness.REQUIRED_BLOBS), 'blobs frozen');

  const route = findRouteByName(readiness.CANDIDATE_ROUTE_NAME);
  ok(route, 'route present');
  equal(route.path, readiness.CANDIDATE_ROUTE_PATH, 'route path bound');
  equal(route.handler, 'executeModerationCommand', 'route handler');
  equal(route.idempotencyRequired, true, 'route idempotency');
  equal(route.auditRequired, true, 'route audit');
  equal(route.serviceRoleRequired, true, 'route service role');
  equal(route.requestFreshnessRequired, true, 'route freshness');
  equal(route.rlsValidationRequired, true, 'route RLS');
  equal(getHandler('communities', route.handler), routeHandlers.executeModerationCommand, 'loader resolution');

  checks += 1;
  await assert.rejects(
    () => routeHandlers.executeModerationCommand({}),
    (error) => error && error.code === readiness.CURRENT_HANDLER_FAILURE_CODE && error.status === 503,
    'handler remains fail closed'
  );
  equal(composition.ACTIVATION_MODES, ['disabled', 'local_test_double'], 'no live mode added');

  const result = readiness.evaluateLiveCompositionActivationReadiness(validPacket());
  equal(result.ready, true, 'valid packet ready');
  equal(result.decision, 'ready_for_separate_com_b04i_activation_authorization', 'readiness decision');
  equal(result.blockers, [], 'no blockers');
  equal(result.repositoryReadinessAuthority, true, 'repository readiness only');
  equal(result.nextAuthorizationPhrase, readiness.NEXT_AUTHORIZATION_PHRASE, 'next phrase');
  for (const key of [
    'liveCompositionAuthority', 'stagingReadAuthority', 'stagingMutationAuthority',
    'stagingDeploymentAuthority', 'stagingTrafficAuthority', 'realModerationAuthority',
    'realSanctionAuthority', 'realAppealAuthority', 'realMediaDispositionAuthority',
    'productionAuthority', 'pullRequestMergeAuthority'
  ]) equal(result[key], false, `${key} false`);

  const mutations = [
    ['predecessorContractId', 'bad', 'COM_B04G_PREDECESSOR_REQUIRED'],
    ['compositionContractId', 'bad', 'COM_B04D_COMPOSITION_REQUIRED'],
    ['routeName', 'bad', 'CANONICAL_MODERATION_ROUTE_REQUIRED'],
    ['routePath', 'bad', 'CANONICAL_MODERATION_ROUTE_PATH_REQUIRED'],
    ['currentHandlerFailureCode', 'bad', 'FAIL_CLOSED_HANDLER_REQUIRED'],
    ['currentActivationMode', 'live', 'DISABLED_ACTIVATION_MODE_REQUIRED'],
    ['candidateActivationMode', 'production', 'CANDIDATE_ACTIVATION_MODE_REQUIRED'],
    ['liveCompositionAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:liveCompositionAuthority'],
    ['stagingDeploymentAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:stagingDeploymentAuthority'],
    ['stagingTrafficAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:stagingTrafficAuthority'],
    ['realModerationAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:realModerationAuthority'],
    ['productionAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:productionAuthority'],
    ['pullRequestMergeAuthority', true, 'PROHIBITED_AUTHORITY_MUST_BE_FALSE:pullRequestMergeAuthority']
  ];
  for (const [key, value, blocker] of mutations) {
    const packet = validPacket();
    packet[key] = value;
    const blocked = readiness.evaluateLiveCompositionActivationReadiness(packet);
    equal(blocked.ready, false, `${key} blocks`);
    ok(blocked.blockers.includes(blocker), `${key} blocker code`);
    equal(blocked.liveCompositionAuthority, false, `${key} cannot grant live authority`);
  }

  for (const [key, blocker] of [
    ['sessionVerifier', 'SERVER_VERIFIED_SESSION_PROOF_REQUIRED'],
    ['contextLoader', 'CANONICAL_CONTEXT_PROOF_REQUIRED'],
    ['clock', 'SERVER_CLOCK_PROOF_REQUIRED'],
    ['executor', 'SERVICE_ROLE_EXECUTOR_PROOF_REQUIRED'],
    ['auditStorage', 'IMMUTABLE_AUDIT_STORAGE_PROOF_REQUIRED'],
    ['policyApproval', 'APPROVED_POLICY_PROOF_REQUIRED'],
    ['requestBoundary', 'REQUEST_SECURITY_BOUNDARY_PROOF_REQUIRED']
  ]) {
    const packet = validPacket();
    packet[key] = null;
    const blocked = readiness.evaluateLiveCompositionActivationReadiness(packet);
    equal(blocked.ready, false, `${key} required`);
    ok(blocked.blockers.includes(blocker), `${key} blocker`);
  }

  const expandedRpc = validPacket();
  expandedRpc.executor.rpcAllowlist.push('arbitrary_rpc');
  const rpcBlocked = readiness.evaluateLiveCompositionActivationReadiness(expandedRpc);
  equal(rpcBlocked.ready, false, 'expanded RPC list blocked');
  ok(rpcBlocked.blockers.includes('EXACT_RPC_ALLOWLIST_REQUIRED'), 'RPC allowlist blocker');

  const drifted = validPacket();
  drifted.boundBlobs.blockedRouteHandler = '0000000000000000000000000000000000000000';
  const driftBlocked = readiness.evaluateLiveCompositionActivationReadiness(drifted);
  equal(driftBlocked.ready, false, 'blob drift blocked');
  ok(driftBlocked.blockers.includes('BOUND_BLOB_REQUIRED:blockedRouteHandler'), 'blob blocker');

  ok([
    'repository_readiness_prepared_live_activation_blocked',
    'repository_readiness_certified_live_activation_blocked'
  ].includes(config.status), 'config lifecycle status');
  equal(config.currentState.handlerHttpStatus, 503, 'config HTTP status');
  equal(config.currentState.liveCompositionActivated, false, 'config live false');
  equal(config.effects.routeHandlerChanged, false, 'handler unchanged');
  equal(config.effects.compositionChanged, false, 'composition unchanged');
  equal(config.effects.databaseAccessed, false, 'database untouched');
  equal(config.effects.stagingChanged, false, 'staging untouched');
  equal(config.effects.runtimeActivated, false, 'runtime inactive');
  equal(config.effects.trafficEnabled, false, 'traffic inactive');
  equal(config.effects.productionChanged, false, 'production untouched');
  equal(config.effects.pullRequestMerged, false, 'merge false');
  equal(config.matrix.maturityAfterReadiness, 3, 'maturity unchanged');
  equal(config.matrix.promotionAllowed, false, 'promotion false');
  ok(['1.3.112', '1.3.113'].includes(matrix.version), 'canonical matrix version continuity');
  const com = matrix.domains.find((entry) => entry.id === 'COM-001');
  ok(com, 'COM-001 matrix entry');
  equal(com.maturity, 3, 'matrix maturity unchanged');
  equal(com.serverAuthority, 'partial', 'matrix server authority partial');
  equal(com.productionGate, 'blocked', 'matrix production blocked');

  if (config.status === 'repository_readiness_certified_live_activation_blocked') {
    equal(config.matrix.version, '1.3.112', 'certified config matrix version');
    ok(/^[a-f0-9]{40}$/.test(config.matrix.canonicalCommit), 'canonical matrix commit');
    ok(Number.isInteger(config.matrix.syncRun) && config.matrix.syncRun > 0, 'matrix sync run');
    ok(Number.isInteger(config.matrix.syncJob) && config.matrix.syncJob > 0, 'matrix sync job');
    ok(/^[a-f0-9]{40}$/.test(config.certification.head), 'certified head');
    ok(Number.isInteger(config.certification.run) && config.certification.run > 0, 'certification run');
    ok(Number.isInteger(config.certification.job) && config.certification.job > 0, 'certification job');
    equal(config.certification.result, 'success', 'certification result');
  }

  console.log(`COM-B04H live composition activation readiness passed: ${checks}/${checks}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
