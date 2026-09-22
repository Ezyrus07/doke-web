'use strict';

const assert = require('assert');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');

const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUESTS = Object.freeze({
  membership: '44444444-4444-4444-8444-444444444441',
  governance: '44444444-4444-4444-8444-444444444442',
  content: '44444444-4444-4444-8444-444444444443'
});
const NOW = '2026-08-28T21:30:00-03:00';

const CASES = Object.freeze([
  Object.freeze({
    domain: 'membership',
    routeName: 'communities.membership.command',
    composerExportName: 'composeMembershipCommandRepositoryOnly'
  }),
  Object.freeze({
    domain: 'governance',
    routeName: 'communities.governance.command',
    composerExportName: 'composeGovernanceCommandRepositoryOnly'
  }),
  Object.freeze({
    domain: 'content',
    routeName: 'communities.content.command',
    composerExportName: 'composeContentCommandRepositoryOnly'
  })
]);

function packet(domain) {
  return {
    runtimeActor: {
      id: USER,
      authenticated: true,
      status: 'active',
      source: 'server_verified_authenticated_session'
    },
    routeParams: {
      communityId: COMMUNITY
    },
    request: {
      command: `${domain}_repository_only_parity_probe`,
      clientRequestId: REQUESTS[domain],
      expectedRevision: 7,
      payload: {
        source: 'b02cq_route_handler_composer_parity',
        domain,
        nested: { proof: true }
      },
      now: NOW
    },
    trustedDomainContext: {
      proofContext: {
        boundary: 'COM-B02CQ',
        repositoryOnly: true,
        domain
      }
    }
  };
}

function options(domain) {
  return {
    proofBoundary: 'COM-B02CQ',
    repositoryOnly: true,
    domain,
    nested: { passThrough: true }
  };
}

function semanticShape(value) {
  if (typeof value === 'function') {
    return `[Function:${value.name || 'anonymous'}]`;
  }

  if (Array.isArray(value)) {
    return value.map(semanticShape);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, semanticShape(value[key])])
    );
  }

  return value;
}

function assertRemoteInert(value) {
  for (const key of [
    'credentialSourceBound',
    'credentialReadImplemented',
    'repositoryOperationInvoked',
    'rpcExecuted',
    'networkExecuted',
    'stagingReadExecuted',
    'stagingMutationExecuted',
    'migrationApplied',
    'runtimeActivated',
    'productionChanged'
  ]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      assert.strictEqual(value[key], false, key);
    }
  }
}

function certifyCase(entry) {
  const composer = routeHandlers[entry.composerExportName];
  assert.strictEqual(typeof composer, 'function', entry.composerExportName);

  const actual = composer(packet(entry.domain), options(entry.domain));
  const expected = orchestration.beginRepositoryOnlyCommandHandlerOrchestration(
    entry.routeName,
    packet(entry.domain),
    options(entry.domain)
  );

  assert.deepStrictEqual(semanticShape(actual), semanticShape(expected));
  assert.strictEqual(actual.contractId, orchestration.CONTRACT_ID);
  assert.strictEqual(actual.boundaryId, orchestration.BOUNDARY_ID);
  assert.strictEqual(
    actual.decision,
    'repository_only_command_handler_repository_orchestration_awaiting_external_result'
  );
  assert.strictEqual(actual.routeName, entry.routeName);
  assert.strictEqual(actual.awaitingExternalRepositoryResult, true);
  assert.strictEqual(actual.repositoryOrchestrationMaterialized, true);
  assert.deepStrictEqual(actual.repositoryOnlyResumeOptions, options(entry.domain));
  assertRemoteInert(actual);

  assert.ok(actual.b02sSurface);
  assert.strictEqual(actual.b02sSurface.routeName, entry.routeName);
  assertRemoteInert(actual.b02sSurface);

  const mapped = actual.b02sSurface.b02rState.integrationState.adapterState.mappedRequest;
  assert.ok(mapped);
  assert.strictEqual(mapped.routeName, entry.routeName);
  assert.strictEqual(mapped.actor.id, USER);
  assert.strictEqual(mapped.runtimeActorSource, 'server_verified_authenticated_session');
  assert.strictEqual(mapped.actor.source, 'server_verified_session');
  assert.strictEqual(mapped.request.clientRequestId, REQUESTS[entry.domain]);
  assert.strictEqual(mapped.request.command, `${entry.domain}_repository_only_parity_probe`);
  assert.strictEqual(mapped.communityId, COMMUNITY);
  assert.strictEqual(mapped.runtimeHandlerBound, false);
  assert.strictEqual(mapped.repositoryExecutorBound, false);
  assert.strictEqual(mapped.runtimeActivated, false);
  assert.strictEqual(mapped.repositoryRemoteExecutionAuthority, false);
  assert.strictEqual(mapped.rpcExecutionAuthority, false);
  assert.strictEqual(mapped.networkAuthority, false);
  assert.strictEqual(mapped.credentialReadAuthority, false);
  assert.strictEqual(mapped.migrationApplicationAuthority, false);

  const descriptor = actual.nextRepositoryOperation;
  assert.ok(descriptor);
  assert.strictEqual(descriptor.repositoryOperation, 'loadCanonicalState');
  assert.deepStrictEqual(descriptor.repositoryInput, { communityId: COMMUNITY });
  assert.strictEqual(descriptor.repositoryExecutorBound, true);
  assert.strictEqual(descriptor.serviceRoleProviderBound, true);
  assert.strictEqual(descriptor.executableReferencesExposed, false);
  assert.strictEqual(descriptor.executionAuthorized, false);
  assert.strictEqual(descriptor.repositoryOperationInvoked, false);
  assert.strictEqual(descriptor.rpcExecuted, false);
  assert.strictEqual(descriptor.networkExecuted, false);
  assert.strictEqual(descriptor.runtimeActivated, false);
  assert.strictEqual(descriptor.migrationApplied, false);
  assert.strictEqual(descriptor.realCommunityMutationExecuted, false);
  assert.strictEqual(descriptor.productionChanged, false);
}

function main() {
  assert.deepStrictEqual(
    routeHandlers.B02F_ROUTE_NAMES,
    CASES.map((entry) => entry.routeName)
  );

  for (const entry of CASES) certifyCase(entry);

  console.log('COM-B02CQ repository-only route-handler composer to B02T begin parity proof: PASS');
}

main();
