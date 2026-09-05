'use strict';

const assert = require('assert');
const orchestration = require('../backend/modules/communities/community-command-handler-repository-orchestration');

const USER = '22222222-2222-4222-8222-222222222222';
const COMMUNITY = '33333333-3333-4333-8333-333333333333';
const REQUEST = '44444444-4444-4444-8444-444444444444';
const NOW = '2026-08-28T20:00:00-03:00';
const ROUTE_NAME = 'communities.membership.command';

function packet() {
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
      command: 'join_public',
      clientRequestId: REQUEST,
      expectedRevision: 1,
      payload: {
        source: 'b02cp_repository_only_shape_parity',
        nested: { proof: true }
      },
      now: NOW
    },
    trustedDomainContext: {
      proofContext: {
        boundary: 'COM-B02CP',
        repositoryOnly: true
      }
    }
  };
}

function assertRemoteInert(value) {
  for (const key of [
    'credentialSourceBound',
    'credentialReadImplemented',
    'repositoryOperationInvoked',
    'rpcExecuted',
    'networkExecuted',
    'migrationApplied',
    'runtimeActivated',
    'productionChanged'
  ]) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      assert.strictEqual(value[key], false, key);
    }
  }
}

function main() {
  const input = packet();
  const expectedRequest = JSON.parse(JSON.stringify(input.request));
  const expectedDomainContext = JSON.parse(JSON.stringify(input.trustedDomainContext));

  const started = orchestration.beginRepositoryOnlyCommandHandlerOrchestration(
    ROUTE_NAME,
    input
  );

  assert.strictEqual(orchestration.BOUNDARY_ID, 'COM-B02T');
  assert.strictEqual(started.contractId, orchestration.CONTRACT_ID);
  assert.strictEqual(started.boundaryId, orchestration.BOUNDARY_ID);
  assert.strictEqual(
    started.decision,
    'repository_only_command_handler_repository_orchestration_awaiting_external_result'
  );
  assert.strictEqual(started.routeName, ROUTE_NAME);
  assert.strictEqual(started.awaitingExternalRepositoryResult, true);
  assert.strictEqual(started.repositoryOrchestrationMaterialized, true);
  assertRemoteInert(started);

  const b02sSurface = started.b02sSurface;
  assert.ok(b02sSurface);
  assert.strictEqual(
    b02sSurface.decision,
    'repository_only_command_handler_surface_bound_to_b02r'
  );
  assert.strictEqual(b02sSurface.routeName, ROUTE_NAME);
  assertRemoteInert(b02sSurface);

  const b02rState = b02sSurface.b02rState;
  assert.ok(b02rState);
  assert.strictEqual(
    b02rState.decision,
    'repository_only_b02p_b02q_composition_awaiting_repository_result'
  );
  assert.strictEqual(b02rState.routeName, ROUTE_NAME);
  assert.strictEqual(b02rState.repositoryOperation, 'loadCanonicalState');
  assert.deepStrictEqual(b02rState.repositoryInput, { communityId: COMMUNITY });
  assertRemoteInert(b02rState);

  const integrationState = b02rState.integrationState;
  assert.ok(integrationState);
  assert.strictEqual(
    integrationState.decision,
    'repository_only_runtime_binding_integration_awaiting_input'
  );
  assert.strictEqual(integrationState.routeName, ROUTE_NAME);
  assertRemoteInert(integrationState);

  const adapterState = integrationState.adapterState;
  assert.ok(adapterState);
  assert.strictEqual(
    adapterState.decision,
    'repository_only_adapter_awaiting_input'
  );
  assertRemoteInert(adapterState);

  const mapped = adapterState.mappedRequest;
  assert.ok(mapped);
  assert.strictEqual(mapped.decision, 'runtime_request_mapped_repository_only');
  assert.strictEqual(mapped.routeName, ROUTE_NAME);
  assert.strictEqual(mapped.communityId, COMMUNITY);
  assert.strictEqual(
    mapped.runtimeActorSource,
    'server_verified_authenticated_session'
  );

  assert.strictEqual(mapped.actor.id, input.runtimeActor.id);
  assert.strictEqual(mapped.actor.authenticated, input.runtimeActor.authenticated);
  assert.strictEqual(mapped.actor.status, input.runtimeActor.status);
  assert.strictEqual(mapped.actor.source, 'server_verified_session');

  assert.deepStrictEqual(mapped.request, expectedRequest);
  assert.notStrictEqual(mapped.request, input.request);
  assert.notStrictEqual(mapped.request.payload, input.request.payload);
  assert.notStrictEqual(mapped.request.payload.nested, input.request.payload.nested);
  assert.strictEqual(mapped.request.command, 'join_public');
  assert.strictEqual(mapped.request.clientRequestId, REQUEST);
  assert.strictEqual(mapped.request.expectedRevision, 1);
  assert.strictEqual(mapped.request.now, NOW);

  assert.deepStrictEqual(mapped.domainContext, expectedDomainContext);
  assert.notStrictEqual(mapped.domainContext, input.trustedDomainContext);
  assert.notStrictEqual(
    mapped.domainContext.proofContext,
    input.trustedDomainContext.proofContext
  );

  assert.strictEqual(mapped.runtimeHandlerBound, false);
  assert.strictEqual(mapped.repositoryExecutorBound, false);
  assert.strictEqual(mapped.runtimeActivated, false);
  assert.strictEqual(mapped.adapterImplementationAuthority, false);
  assert.strictEqual(mapped.repositoryRemoteExecutionAuthority, false);
  assert.strictEqual(mapped.rpcExecutionAuthority, false);
  assert.strictEqual(mapped.networkAuthority, false);
  assert.strictEqual(mapped.credentialReadAuthority, false);
  assert.strictEqual(mapped.migrationApplicationAuthority, false);

  const descriptor = started.nextRepositoryOperation;
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
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(descriptor, 'executor'),
    false
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(descriptor, 'repository'),
    false
  );
  assert.strictEqual(
    Object.prototype.hasOwnProperty.call(descriptor, 'serviceRoleProvider'),
    false
  );

  input.runtimeActor.id = '55555555-5555-4555-8555-555555555555';
  input.request.command = 'tampered_after_mapping';
  input.request.payload.source = 'tampered';
  input.request.payload.nested.proof = false;
  input.trustedDomainContext.proofContext.repositoryOnly = false;

  assert.strictEqual(mapped.actor.id, USER);
  assert.deepStrictEqual(mapped.request, expectedRequest);
  assert.deepStrictEqual(mapped.domainContext, expectedDomainContext);

  console.log('COM-B02CP repository-only request/actor to B02T shape parity proof: PASS');
}

main();
