#!/usr/bin/env node
'use strict';

const assert = require('assert');
const moderation = require('../backend/modules/communities/community-moderation-case-authority');
const {
  CONTRACT_ID,
  REQUIRED_AUTHORIZATION_PHRASE,
  createModerationRollbackCanary
} = require('../backend/runtime/staging/community-moderation-rollback-canary');

let checks = 0;
const equal = (actual, expected, message) => { checks += 1; assert.deepStrictEqual(actual, expected, message); };
const ok = (value, message) => { checks += 1; assert.ok(value, message); };

const ids = Object.freeze({
  actor: '11111111-1111-4111-8111-111111111111',
  community: '22222222-2222-4222-8222-222222222222',
  target: '33333333-3333-4333-8333-333333333333',
  owner: '44444444-4444-4444-8444-444444444444',
  request: '55555555-5555-4555-8555-555555555555'
});

function authorization(overrides = {}) {
  return {
    phrase: REQUIRED_AUTHORIZATION_PHRASE,
    received: true,
    singleUse: true,
    consumed: false,
    reusableAfterFailure: false,
    ...overrides
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  const state = new Map();
  let guardChecks = 0;
  const transactionGuard = {
    authority: 'staging_outer_transaction_guard',
    environment: 'staging',
    isolation: 'serializable',
    rollbackOnly: true,
    mutationScope: 'synthetic_moderation_canary',
    async assertActive() { guardChecks += 1; return true; }
  };
  const executor = {
    authority: 'server_service_role',
    environment: 'staging_rollback_canary',
    async rpc(name, args) {
      calls.push({ name, args });
      if (name === 'com_moderation_load_case_v1') {
        return { data: state.get(args.p_case_id) || null };
      }
      if (name !== 'com_moderation_commit_case_command_v1') {
        return { error: { code: 'RPC_NOT_ALLOWED' } };
      }
      const loaded = {
        caseId: args.p_case_id,
        communityId: args.p_community_id,
        kind: args.p_case_kind,
        state: args.p_case_state,
        reporterId: args.p_reporter_id,
        targetType: args.p_target_type,
        targetId: args.p_target_id,
        revision: 1,
        ledgerHeadHash: args.p_event_hash,
        projection: args.p_projection,
        updatedAt: args.p_occurred_at
      };
      state.set(args.p_case_id, loaded);
      return {
        data: {
          caseId: args.p_case_id,
          revision: 1,
          eventHash: args.p_event_hash,
          replay: false
        }
      };
    }
  };
  const sessionVerifier = {
    authority: 'server_verified_session_boundary',
    async verify() {
      return {
        verified: true,
        source: 'server_verified_session',
        userId: ids.actor,
        role: 'client',
        status: 'active',
        aal: 'aal1'
      };
    }
  };
  const contextLoader = {
    authority: 'canonical_server_context_loader',
    async load({ actorId }) {
      return {
        source: 'canonical_server_context',
        complete: true,
        community: {
          id: ids.community,
          status: 'active',
          source: 'canonical_server',
          complete: true,
          revision: 1
        },
        authorization: {
          actorId,
          source: 'canonical_server',
          complete: true,
          revision: 1,
          capabilities: {}
        },
        policy: {
          status: 'approved',
          version: '2026.08.05-canary',
          fingerprint: moderation.sha256('com-b04e-policy'),
          automaticEnforcementAllowed: false,
          reportCountCreatesSanction: false,
          scanResultCreatesFinalDecision: false
        },
        target: {
          id: ids.target,
          communityId: ids.community,
          ownerId: ids.owner,
          type: 'community_post',
          state: 'published',
          source: 'canonical_server',
          complete: true,
          revision: 1
        }
      };
    }
  };
  const clock = {
    authority: 'server_utc_clock',
    async now() { return '2026-08-06T01:54:00.000Z'; }
  };
  return {
    authorization: authorization(),
    transactionGuard,
    executor,
    sessionVerifier,
    contextLoader,
    clock,
    calls,
    guardChecks: () => guardChecks,
    ...overrides
  };
}

function request() {
  return {
    headers: { authorization: 'Bearer private-token-never-persisted' },
    requestId: 'com-b04e-local-conformance',
    envelope: {
      command: 'open_case',
      clientRequestId: ids.request,
      expectedRevision: 0,
      payload: {
        kind: 'content_report',
        initialEvidenceKind: 'report_statement',
        initialEvidenceRef: 'opaque:moderation:canary:b04e:report',
        initialEvidenceDigest: moderation.sha256('com-b04e-initial-evidence')
      }
    }
  };
}

(async () => {
  const deps = dependencies();
  const canary = createModerationRollbackCanary(deps);
  equal(canary.contractId, CONTRACT_ID, 'contract id');
  equal(canary.environment, 'staging', 'staging only');
  equal(canary.rollbackOnly, true, 'rollback only');
  equal(canary.syntheticOnly, true, 'synthetic only');

  const result = await canary.execute(request());
  equal(result.decision, 'accept', 'open decision accepted');
  equal(result.reason, 'MODERATION_CASE_OPEN_ACCEPTED', 'domain reason');
  equal(result.coreCompositionActivationMode, 'disabled', 'core remains disabled');
  equal(result.coreLivePathBlocked, true, 'core live path blocked');
  equal(result.routeRegistered, false, 'route unregistered');
  equal(result.transactionBoundary, 'single_security_definer_rpc', 'atomic RPC boundary');
  equal(result.revision, 1, 'revision one');
  equal(result.replay, false, 'not replay');
  equal(result.initialEvidenceMaterialized, true, 'initial evidence materialized');
  equal(result.rawIdentifiersExposed, false, 'raw identifiers not exposed');
  equal(result.runtimeActivated, false, 'runtime not activated');
  equal(result.productionAuthority, false, 'production authority false');
  equal(result.pullRequestMergeAuthority, false, 'merge authority false');
  equal(deps.calls.map((call) => call.name), [
    'com_moderation_load_case_v1',
    'com_moderation_commit_case_command_v1',
    'com_moderation_load_case_v1'
  ], 'load commit load order');

  const commit = deps.calls[1].args;
  equal(commit.p_evidence_record.kind, 'report_statement', 'evidence kind');
  equal(commit.p_evidence_record.reference, 'opaque:moderation:canary:b04e:report', 'opaque evidence reference');
  equal(commit.p_projection.state, 'open', 'projection state');
  equal(commit.p_actor_id, ids.actor, 'verified actor mapped');
  equal(commit.p_expected_revision, 0, 'zero revision mapped');
  equal(commit.p_event_hash, result.eventHash, 'event hash preserved');
  ok(/^[a-f0-9]{64}$/.test(result.authorizationPhraseSha256), 'authorization hash only');
  ok(/^[a-f0-9]{64}$/.test(result.caseIdSha256), 'case id hash only');
  equal(JSON.stringify(result).includes('private-token-never-persisted'), false, 'token not retained');
  equal(JSON.stringify(result).includes('service_role_key'), false, 'service key not retained');
  ok(deps.guardChecks() >= 3, 'transaction guard checked throughout');

  await assert.rejects(canary.execute(request()), /COM_B04E_AUTHORIZATION_ALREADY_CONSUMED/); checks += 1;
  assert.throws(() => createModerationRollbackCanary(dependencies({
    authorization: authorization({ phrase: 'wrong' })
  })), /COM_B04E_AUTHORIZATION_PHRASE_MISMATCH/); checks += 1;
  assert.throws(() => createModerationRollbackCanary(dependencies({
    authorization: authorization({ consumed: true })
  })), /COM_B04E_AUTHORIZATION_ALREADY_CONSUMED/); checks += 1;
  assert.throws(() => createModerationRollbackCanary(dependencies({
    transactionGuard: { ...dependencies().transactionGuard, environment: 'production' }
  })), /COM_B04E_STAGING_TRANSACTION_REQUIRED/); checks += 1;
  assert.throws(() => createModerationRollbackCanary(dependencies({
    executor: { ...dependencies().executor, environment: 'staging_live' }
  })), /COM_B04E_STAGING_CANARY_EXECUTOR_REQUIRED/); checks += 1;
  assert.throws(() => createModerationRollbackCanary(dependencies({
    transactionGuard: { ...dependencies().transactionGuard, rollbackOnly: false }
  })), /COM_B04E_ROLLBACK_ONLY_TRANSACTION_REQUIRED/); checks += 1;

  equal(checks, 35, 'deterministic check count');
  console.log(`COM-B04E conformance passed: ${checks}/${checks}`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
