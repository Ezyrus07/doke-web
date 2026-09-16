'use strict';

const assert = require('assert');
const moduleRouteLoader = require('../backend/shared/http/module-route-loader');
const routeHandlers = require('../backend/modules/communities/route-handlers');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');

const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUESTS = Object.freeze({
  membership: '55555555-5555-4555-8555-555555555551',
  governance: '55555555-5555-4555-8555-555555555552',
  content: '55555555-5555-4555-8555-555555555553'
});
const NOW = '2026-08-29T14:05:00-03:00';

const CASES = Object.freeze([
  Object.freeze({
    domain: 'membership',
    routeName: 'communities.membership.command',
    surfaceName: 'composeMembershipCommandRepositoryOnly',
    composerExportName: 'composeMembershipCommandRepositoryOnly'
  }),
  Object.freeze({
    domain: 'governance',
    routeName: 'communities.governance.command',
    surfaceName: 'composeGovernanceCommandRepositoryOnly',
    composerExportName: 'composeGovernanceCommandRepositoryOnly'
  }),
  Object.freeze({
    domain: 'content',
    routeName: 'communities.content.command',
    surfaceName: 'composeContentCommandRepositoryOnly',
    composerExportName: 'composeContentCommandRepositoryOnly'
  })
]);

const EXPECTED_SURFACES = Object.freeze([
  'composeContentCommandRepositoryOnly',
  'composeGovernanceCommandRepositoryOnly',
  'composeMembershipCommandRepositoryOnly',
  'resumeCommandRepositoryOnlySurface'
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
      command: `${domain}_loader_repository_only_parity_probe`,
      clientRequestId: REQUESTS[domain],
      expectedRevision: 9,
      payload: {
        source: 'b02cr_module_route_loader_parity',
        domain,
        nested: { proof: true }
      },
      now: NOW
    },
    trustedDomainContext: {
      proofContext: {
        boundary: 'COM-B02CR',
        repositoryOnly: true,
        domain
      }
    }
  };
}

function options(domain) {
  return {
    proofBoundary: 'COM-B02CR',
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
  const resolved = moduleRouteLoader.getRepositoryOnlySurface('communities', entry.surfaceName);
  const directComposer = routeHandlers[entry.composerExportName];

  assert.strictEqual(typeof resolved, 'function', entry.surfaceName);
  assert.strictEqual(resolved, directComposer, `${entry.surfaceName} identity`);

  const resolvedResult = resolved(packet(entry.domain), options(entry.domain));
  const directComposerResult = directComposer(packet(entry.domain), options(entry.domain));
  const directB02tResult = orchestration.beginRepositoryOnlyCommandHandlerOrchestration(
    entry.routeName,
    packet(entry.domain),
    options(entry.domain)
  );

  assert.deepStrictEqual(semanticShape(resolvedResult), semanticShape(directComposerResult));
  assert.deepStrictEqual(semanticShape(resolvedResult), semanticShape(directB02tResult));
  assert.strictEqual(resolvedResult.contractId, orchestration.CONTRACT_ID);
  assert.strictEqual(resolvedResult.boundaryId, orchestration.BOUNDARY_ID);
  assert.strictEqual(
    resolvedResult.decision,
    'repository_only_command_handler_repository_orchestration_awaiting_external_result'
  );
  assert.strictEqual(resolvedResult.routeName, entry.routeName);
  assert.strictEqual(resolvedResult.awaitingExternalRepositoryResult, true);
  assert.strictEqual(resolvedResult.repositoryOrchestrationMaterialized, true);
  assert.deepStrictEqual(resolvedResult.repositoryOnlyResumeOptions, options(entry.domain));
  assertRemoteInert(resolvedResult);

  assert.ok(resolvedResult.b02sSurface);
  assert.strictEqual(resolvedResult.b02sSurface.routeName, entry.routeName);
  assertRemoteInert(resolvedResult.b02sSurface);

  const mapped = resolvedResult.b02sSurface.b02rState.integrationState.adapterState.mappedRequest;
  assert.ok(mapped);
  assert.strictEqual(mapped.routeName, entry.routeName);
  assert.strictEqual(mapped.actor.id, USER);
  assert.strictEqual(mapped.runtimeActorSource, 'server_verified_authenticated_session');
  assert.strictEqual(mapped.actor.source, 'server_verified_session');
  assert.strictEqual(mapped.request.clientRequestId, REQUESTS[entry.domain]);
  assert.strictEqual(mapped.request.command, `${entry.domain}_loader_repository_only_parity_probe`);
  assert.strictEqual(mapped.communityId, COMMUNITY);
  assert.strictEqual(mapped.runtimeHandlerBound, false);
  assert.strictEqual(mapped.repositoryExecutorBound, false);
  assert.strictEqual(mapped.runtimeActivated, false);
  assert.strictEqual(mapped.repositoryRemoteExecutionAuthority, false);
  assert.strictEqual(mapped.rpcExecutionAuthority, false);
  assert.strictEqual(mapped.networkAuthority, false);
  assert.strictEqual(mapped.credentialReadAuthority, false);
  assert.strictEqual(mapped.migrationApplicationAuthority, false);

  const descriptor = resolvedResult.nextRepositoryOperation;
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
  assert.ok(Object.isFrozen(moduleRouteLoader.repositoryOnlySurfaces));
  assert.ok(Object.isFrozen(moduleRouteLoader.repositoryOnlySurfaces.communities));
  assert.deepStrictEqual(
    Object.keys(moduleRouteLoader.repositoryOnlySurfaces.communities).sort(),
    EXPECTED_SURFACES
  );

  const resumeSurface = moduleRouteLoader.getRepositoryOnlySurface(
    'communities',
    'resumeCommandRepositoryOnlySurface'
  );
  assert.strictEqual(resumeSurface, routeHandlers.resumeCommandRepositoryOnlySurface);

  assert.strictEqual(
    moduleRouteLoader.getRepositoryOnlySurface('unknown-module', 'composeMembershipCommandRepositoryOnly'),
    null
  );
  assert.strictEqual(
    moduleRouteLoader.getRepositoryOnlySurface('communities', 'unknown-surface'),
    null
  );

  for (const entry of CASES) certifyCase(entry);

  console.log('COM-B02CR repository-only module-route-loader composer to B02T parity proof: PASS');
}

main();
