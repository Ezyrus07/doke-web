#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fixtures = require('../tests/fixtures/com-b02d-community-composition-root-cases.json');
const composition = require('../backend/runtime/staging/community-composition-root');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function buildAuthorizationPacket(mutation) {
  if (mutation === 'missing') return null;
  const packet = clone(fixtures.validAuthorizationPacket);
  if (mutation === 'phrase') packet.authorizationPhrase = 'WRONG';
  if (mutation === 'environment') packet.targetEnvironment = 'production';
  if (mutation === 'project') packet.projectId = 'other-project';
  if (mutation === 'migration') packet.migrationVersion = '0';
  if (mutation === 'readOnly') packet.mutationAllowed = true;
  if (mutation === 'consumed') packet.authorizationConsumed = true;
  if (mutation === 'attempted') packet.executionAttempted = true;
  return packet;
}

async function main() {
  const calls = [];
  const serviceSupabase = {
    async rpc(name, args) {
      calls.push({ name, args });
      return { data: null, error: null };
    }
  };

  const root = composition.createCommunityStagingCompositionRoot({ runtime: 'staging', serviceSupabase });
  const result = await root.probeCanonicalState({ actor: fixtures.validActor });
  assert.strictEqual(result.readOnly, true);
  assert.strictEqual(result.mutationAuthority, false);
  assert.strictEqual(result.found, false);
  assert.strictEqual(result.state, null);
  assert.strictEqual(calls.length, fixtures.expected.repositoryRpcCalls);
  assert.strictEqual(calls[0].name, 'com_load_canonical_state_v1');
  assert.deepStrictEqual(calls[0].args, { p_community_id: composition.PROBE_COMMUNITY_ID });
  assert.strictEqual(root.commitEventAndProjection, undefined);
  assert.strictEqual(root.claimIdempotencyKey, undefined);
  assert.strictEqual(root.repository, undefined);

  await assert.rejects(
    root.probeCanonicalState({ actor: { id: fixtures.validActor.id, authenticated: false } }),
    /COM_AUTHENTICATED_ACTOR_REQUIRED/
  );
  assert.throws(
    () => composition.createCommunityStagingCompositionRoot({ runtime: 'production', serviceSupabase }),
    /COM_STAGING_RUNTIME_REQUIRED/
  );
  assert.throws(
    () => composition.createCommunityStagingCompositionRoot({ runtime: 'staging' }),
    /COM_SERVICE_ROLE_CLIENT_REQUIRED/
  );
  const executor = composition.createReadOnlyServiceRoleExecutor(serviceSupabase);
  await assert.rejects(
    executor.rpc('com_commit_event_projection_v1', {}),
    /COM_MUTATING_RPC_BLOCKED/
  );

  let authorized = 0;
  let blocked = 0;
  for (const item of fixtures.authorizationCases) {
    const decision = composition.evaluateAuthenticatedCanaryAuthorization(buildAuthorizationPacket(item.mutation));
    assert.strictEqual(decision.decision, item.expectedDecision, item.name);
    assert.strictEqual(decision.stagingMutationAuthority, false, `${item.name}: staging mutation`);
    assert.strictEqual(decision.productionAuthority, false, `${item.name}: production`);
    if (decision.decision === 'authorized_for_single_authenticated_read_only_canary') authorized += 1;
    else blocked += 1;
  }
  assert.strictEqual(authorized, fixtures.expected.authorized);
  assert.strictEqual(blocked, fixtures.expected.blocked);
  console.log(`COM-B02D conformance passed: ${fixtures.authorizationCases.length + 8}/${fixtures.authorizationCases.length + 8}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
