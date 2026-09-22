#!/usr/bin/env node
'use strict';

const assert = require('node:assert');
const moderation = require('../backend/modules/communities/community-moderation-case-authority');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const {
  CONTRACT_ID,
  ACTIVATION_MODE,
  REQUIRED_AUTHORIZATION_PHRASE,
  REQUIRED_AUTHORIZATION_SOURCE_HEAD,
  REQUIRED_RPC_ALLOWLIST,
  createModerationStagingLiveRouteCanary
} = require('../backend/runtime/staging/community-moderation-live-route-canary');

let checks = 0;
const equal = (actual, expected, label) => { checks += 1; assert.deepStrictEqual(actual, expected, label); };
const ok = (value, label) => { checks += 1; assert.ok(value, label); };

const actorId = 'b0410000-0000-4000-8000-000000000010';
const communityId = 'b0410000-0000-4000-8000-000000000011';
const targetId = 'b0410000-0000-4000-8000-000000000012';
const clientRequestId = 'b0410000-0000-4000-8000-000000000013';
let committed = null;
let transactionChecks = 0;

const executor = Object.freeze({
  authority: 'server_service_role',
  environment: 'staging_rollback_route_canary',
  rpcAllowlist: REQUIRED_RPC_ALLOWLIST,
  async rpc(name, args) {
    if (name === 'com_moderation_load_case_v1') {
      if (!committed) return { data: null, error: null };
      return { data: {
        caseId: committed.caseId,
        revision: committed.revision,
        ledgerHeadHash: committed.eventHash
      }, error: null };
    }
    if (name !== 'com_moderation_commit_case_command_v1') throw new Error('UNEXPECTED_RPC');
    committed = {
      caseId: args.p_case_id,
      revision: 1,
      eventHash: args.p_event_hash,
      replay: false
    };
    return { data: committed, error: null };
  }
});

const runtime = createModerationStagingLiveRouteCanary({
  authorization: Object.freeze({
    phrase: REQUIRED_AUTHORIZATION_PHRASE,
    received: true,
    consumed: true,
    singleUse: true,
    reusableAfterFailure: false,
    sourceHead: REQUIRED_AUTHORIZATION_SOURCE_HEAD
  }),
  transactionGuard: Object.freeze({
    authority: 'staging_outer_transaction_guard',
    environment: 'staging',
    isolation: 'serializable',
    rollbackOnly: true,
    publicTrafficEnabled: false,
    async assertActive() { transactionChecks += 1; return true; }
  }),
  executor,
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
          status: 'approved', version: '2026.08.06-com-b04i-test',
          fingerprint: moderation.sha256('com-b04i-approved-test-policy'),
          automaticEnforcementAllowed: false,
          reportCountCreatesSanction: false,
          scanResultCreatesFinalDecision: false
        }),
        target: Object.freeze({ id: targetId, communityId, ownerId: actorId, type: 'community_post', state: 'published', source: 'canonical_server', complete: true, revision: 1 })
      });
    }
  }),
  clock: Object.freeze({ authority: 'server_utc_clock', async now() { return '2026-08-06T20:25:00.000Z'; } })
});

async function main() {
  equal(runtime.contractId, CONTRACT_ID, 'runtime contract');
  equal(runtime.activationMode, ACTIVATION_MODE, 'live staging activation mode');
  equal(runtime.environment, 'staging', 'staging only');
  equal(runtime.rollbackOnly, true, 'rollback only');
  equal(runtime.syntheticOnly, true, 'synthetic only');
  equal(runtime.publicTrafficEnabled, false, 'no public traffic');
  equal(runtime.persistentRuntimeAuthority, false, 'no persistent runtime authority');
  equal(runtime.productionAuthority, false, 'no production authority');
  equal(runtime.pullRequestMergeAuthority, false, 'no merge authority');

  checks += 1;
  await assert.rejects(
    () => routeHandlers.executeModerationCommand({}),
    (error) => error && error.code === 'COM_B04G_ROUTE_NOT_DEPLOYED_OR_ACTIVATED' && error.status === 503,
    'default route remains fail closed'
  );

  const handler = routeHandlers.createStagingCanaryModerationCommandHandler({ runtime });
  equal(typeof handler, 'function', 'canary handler created');
  ok(Object.isFrozen(handler), 'canary handler frozen');

  const response = await handler({
    headers: Object.freeze({}),
    requestId: 'com-b04i-attempt-2-local-conformance',
    envelope: Object.freeze({
      command: 'open_case',
      clientRequestId,
      expectedRevision: 0,
      payload: Object.freeze({
        kind: 'content_report',
        initialEvidenceKind: 'report_statement',
        initialEvidenceRef: 'opaque:com-b04i:local-test',
        initialEvidenceDigest: moderation.sha256('com-b04i-local-test-evidence')
      })
    })
  });

  equal(response.status, 200, 'route status');
  equal(response.body.contractId, CONTRACT_ID, 'response contract');
  equal(response.body.routeName, 'communities.moderation.command', 'route name');
  equal(response.body.activationMode, ACTIVATION_MODE, 'response mode');
  equal(response.body.authenticatedSessionVerified, true, 'session verified');
  equal(response.body.decision, 'accept', 'domain accepted');
  equal(response.body.revision, 1, 'revision');
  equal(response.body.replay, false, 'not replay');
  ok(/^[a-f0-9]{64}$/.test(response.body.caseIdSha256), 'case hash only');
  equal(response.body.rawIdentifiersExposed, false, 'no raw identifiers');
  equal(response.body.transactionRolledBackByCaller, true, 'caller rollback contract');
  equal(response.body.publicTrafficEnabled, false, 'no traffic');
  equal(response.body.productionAuthority, false, 'no production');
  ok(transactionChecks >= 3, 'transaction guard checked');

  checks += 1;
  await assert.rejects(() => handler({}), /COM_B04I_ONE_SHOT_ROUTE_CANARY_ALREADY_EXECUTED/, 'one shot enforced');

  assert.throws(
    () => routeHandlers.createStagingCanaryModerationCommandHandler({ runtime: { contractId: CONTRACT_ID } }),
    /COM_B04I_VALID_SERVER_BOUND_STAGING_RUNTIME_REQUIRED/
  );
  checks += 1;

  console.log(`COM-B04I staging live composition route canary passed: ${checks}/${checks}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
