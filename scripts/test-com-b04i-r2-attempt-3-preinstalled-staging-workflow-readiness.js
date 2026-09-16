#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const moderation = require('../backend/modules/communities/community-moderation-case-authority');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const {
  HANDLER_CONTRACT_ID,
  ATTEMPT_CONTRACT_ID,
  READINESS_CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_RPC_ALLOWLIST,
  ACTIVATION_MODE,
  createModerationAttempt3StagingLiveRouteCanary
} = require('../backend/runtime/staging/community-moderation-live-route-canary-attempt-3');

let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

const actorId = 'b0430000-0000-4000-8000-000000000010';
const communityId = 'b0430000-0000-4000-8000-000000000011';
const targetId = 'b0430000-0000-4000-8000-000000000012';
const clientRequestId = 'b0430000-0000-4000-8000-000000000013';
const workflowInstallHead = '1111111111111111111111111111111111111111';
const triggerHead = '2222222222222222222222222222222222222222';
let committed = null;
let transactionChecks = 0;

const executor = Object.freeze({
  authority: 'server_service_role',
  environment: 'staging_rollback_route_canary_attempt_3',
  rpcAllowlist: REQUIRED_RPC_ALLOWLIST,
  async rpc(name, args) {
    if (name === 'com_moderation_load_case_v1') {
      if (!committed) return { data: null, error: null };
      return { data: { caseId: committed.caseId, revision: committed.revision, ledgerHeadHash: committed.eventHash }, error: null };
    }
    if (name !== 'com_moderation_commit_case_command_v1') throw new Error('UNEXPECTED_RPC');
    committed = { caseId: args.p_case_id, revision: 1, eventHash: args.p_event_hash, replay: false };
    return { data: committed, error: null };
  }
});

function buildRuntime(overrides = {}) {
  return createModerationAttempt3StagingLiveRouteCanary({
    authorization: Object.freeze({
      phrase: REQUIRED_AUTHORIZATION_PHRASE,
      received: true,
      consumed: true,
      singleUse: true,
      reusableAfterFailure: false,
      executionAttempted: true,
      workflowInstallHead,
      triggerHead,
      ...(overrides.authorization || {})
    }),
    transactionGuard: Object.freeze({
      authority: 'staging_outer_transaction_guard',
      environment: 'staging',
      isolation: 'serializable',
      rollbackOnly: true,
      publicTrafficEnabled: false,
      async assertActive() { transactionChecks += 1; return true; },
      ...(overrides.transactionGuard || {})
    }),
    executor: overrides.executor || executor,
    sessionVerifier: Object.freeze({
      authority: 'server_verified_session_boundary',
      async verify() {
        return Object.freeze({ verified: true, source: 'server_verified_session', userId: actorId, role: 'admin', status: 'active', aal: 'aal2' });
      }
    }),
    contextLoader: Object.freeze({
      authority: 'canonical_server_context_loader',
      async load({ actorId: verifiedActor }) {
        return Object.freeze({
          source: 'canonical_server_context', complete: true,
          community: Object.freeze({ id: communityId, status: 'active', source: 'canonical_server', complete: true, revision: 1 }),
          authorization: Object.freeze({ actorId: verifiedActor, source: 'canonical_server', complete: true, revision: 1, capabilities: Object.freeze({}) }),
          policy: Object.freeze({
            status: 'approved', version: '2026.08.06-com-b04i-r2-attempt3-local',
            fingerprint: moderation.sha256('com-b04i-r2-attempt3-approved-local-policy'),
            automaticEnforcementAllowed: false,
            reportCountCreatesSanction: false,
            scanResultCreatesFinalDecision: false
          }),
          target: Object.freeze({ id: targetId, communityId, ownerId: actorId, type: 'community_post', state: 'published', source: 'canonical_server', complete: true, revision: 1 })
        });
      }
    }),
    clock: Object.freeze({ authority: 'server_utc_clock', async now() { return '2026-08-07T02:30:00.000Z'; } })
  });
}

async function main() {
  const runtime = buildRuntime();
  equal(runtime.contractId, HANDLER_CONTRACT_ID, 'handler-compatible contract');
  equal(runtime.attemptContractId, ATTEMPT_CONTRACT_ID, 'attempt contract');
  equal(runtime.readinessContractId, READINESS_CONTRACT_ID, 'readiness contract');
  equal(runtime.activationMode, ACTIVATION_MODE, 'activation mode');
  equal(runtime.environment, 'staging', 'staging only');
  equal(runtime.serverBound, true, 'server bound');
  equal(runtime.rollbackOnly, true, 'rollback only');
  equal(runtime.syntheticOnly, true, 'synthetic only');
  equal(runtime.stagingCanaryAuthority, true, 'canary authority only');
  equal(runtime.publicTrafficEnabled, false, 'public traffic false');
  equal(runtime.persistentRuntimeAuthority, false, 'persistent runtime false');
  equal(runtime.productionAuthority, false, 'production false');
  equal(runtime.pullRequestMergeAuthority, false, 'merge false');

  checks += 1;
  await assert.rejects(
    () => routeHandlers.executeModerationCommand({}),
    (error) => error && error.code === 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED' && error.status === 503,
    'default handler remains fail closed'
  );

  const handler = routeHandlers.createStagingCanaryModerationCommandHandler({ runtime });
  equal(typeof handler, 'function', 'existing factory accepts attempt3 runtime');
  ok(Object.isFrozen(handler), 'bound handler frozen');

  const response = await handler({
    headers: Object.freeze({}),
    requestId: 'com-b04i-r2-attempt3-local-readiness',
    envelope: Object.freeze({
      command: 'open_case',
      clientRequestId,
      expectedRevision: 0,
      payload: Object.freeze({
        kind: 'content_report',
        initialEvidenceKind: 'report_statement',
        initialEvidenceRef: 'opaque:com-b04i:attempt-3:local-readiness',
        initialEvidenceDigest: moderation.sha256('com-b04i-r2-attempt3-local-evidence')
      })
    })
  });

  equal(response.status, 200, 'route status');
  equal(response.body.contractId, ATTEMPT_CONTRACT_ID, 'response attempt contract');
  equal(response.body.handlerContractId, HANDLER_CONTRACT_ID, 'response handler contract');
  equal(response.body.workflowInstallHead, workflowInstallHead, 'install head bound');
  equal(response.body.triggerHead, triggerHead, 'trigger head bound');
  equal(response.body.authenticatedSessionVerified, true, 'session verified');
  equal(response.body.decision, 'accept', 'domain accepted');
  equal(response.body.revision, 1, 'revision one');
  equal(response.body.replay, false, 'not replay');
  ok(/^[a-f0-9]{64}$/.test(response.body.caseIdSha256), 'hashed case id');
  equal(response.body.rawIdentifiersExposed, false, 'raw ids blocked');
  equal(response.body.transactionRolledBackByCaller, true, 'rollback contract');
  equal(response.body.publicTrafficEnabled, false, 'response traffic false');
  equal(response.body.productionAuthority, false, 'response production false');
  ok(transactionChecks >= 3, 'transaction guard invoked');

  assert.throws(() => buildRuntime({ authorization: { phrase: 'wrong' } }), /AUTHORIZATION_PHRASE_MISMATCH/);
  checks += 1;
  assert.throws(() => buildRuntime({ authorization: { workflowInstallHead: 'bad' } }), /WORKFLOW_INSTALL_HEAD_REQUIRED/);
  checks += 1;
  assert.throws(() => buildRuntime({ authorization: { triggerHead: workflowInstallHead } }), /DISTINCT_TRIGGER_HEAD_REQUIRED/);
  checks += 1;
  assert.throws(() => buildRuntime({ transactionGuard: { rollbackOnly: false } }), /ROLLBACK_ONLY_REQUIRED/);
  checks += 1;
  assert.throws(() => buildRuntime({
    executor: Object.freeze({ authority: 'server_service_role', environment: 'staging_rollback_route_canary_attempt_3', rpcAllowlist: ['other'], async rpc() {} })
  }), /EXACT_RPC_ALLOWLIST_REQUIRED/);
  checks += 1;

  checks += 1;
  await assert.rejects(() => handler({}), /ONE_SHOT_ROUTE_CANARY_ALREADY_EXECUTED/, 'one-shot route enforced');

  console.log(`COM-B04I-R2 attempt-3 preinstalled workflow readiness conformance passed: ${checks}/${checks}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
