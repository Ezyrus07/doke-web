'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const config = require(path.join(root, 'config/com-b02ct-repository-only-active-runtime-route-resolution-to-controlled-external-command-binding-readiness.json'));
const routeRegistry = require(path.join(root, 'backend/shared/http/route-registry'));
const moduleRouteLoader = require(path.join(root, 'backend/shared/http/module-route-loader'));
const routeHandlers = require(path.join(root, 'backend/modules/communities/route-handlers'));
const surfaceDescriptor = require(path.join(root, 'backend/shared/http/repository-only-route-surface-descriptor'));

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assertFrozenContract() {
  assert.strictEqual(config.boundaryId, 'COM-B02CT');
  assert.strictEqual(config.predecessor.boundaryId, 'COM-B02CS');
  assert.strictEqual(config.predecessor.head, '734395ff2366ee2e31917b9270758f7b7fffaae2');
  assert.strictEqual(config.predecessor.tree, '8b056f97b70a8cdda7cee791031747882edab790');
  assert.strictEqual(config.mode, 'repository-only-readiness');
  assert.strictEqual(config.readinessContract.defaultFailClosedRequired, true);
  assert.strictEqual(config.readinessContract.activeHandlerReplacementAuthorized, false);
  assert.strictEqual(config.readinessContract.externalBindingInvocationAuthorized, false);
  assert.strictEqual(config.authority.activeExecuteHandlerInvocationAuthority, false);
  assert.strictEqual(config.authority.repositoryOnlySurfaceInvocationAuthority, false);
  assert.strictEqual(config.authority.externalCommandBindingInvocationAuthority, false);
  assert.strictEqual(config.authority.repositoryOperationInvocationAuthority, false);
  assert.strictEqual(config.authority.networkAuthority, false);
  assert.strictEqual(config.authority.runtimeWiringAuthority, false);
  assert.strictEqual(config.authority.runtimeActivationAuthority, false);
}

function assertActiveRuntimeSeam() {
  const source = read(config.frozenSources.stagingApiRuntime.path);
  assert.ok(source.includes("const { listRoutes } = require('../../shared/http/route-registry');"));
  assert.ok(source.includes("const { getHandler } = require('../../shared/http/module-route-loader');"));
  assert.ok(source.includes('const handler = getHandler(match.route.module, match.route.handler);'));
  assert.ok(source.includes('const result = await handler({'));
  assert.strictEqual(source.includes('getRepositoryOnlySurface'), false);
  assert.strictEqual(source.includes('repository-only-route-begin-dispatcher'), false);
  assert.strictEqual(source.includes('repository-only-route-resume-dispatcher'), false);
}

function assertFailClosedActiveHandlers() {
  const source = read(config.frozenSources.routeHandlers.path);
  assert.ok(source.includes("const B02F_FAILURE_CODE = 'COM_B02F_ROUTE_NOT_DEPLOYED_OR_ACTIVATED';"));
  for (const entry of config.routes) {
    assert.ok(source.includes(`async function ${entry.activeHandlerName}()`));
    assert.ok(source.includes(`throw createB02FBlockedRouteError('${entry.routeName}');`));
  }
}

function assertExistingExternalBindingLineage() {
  const resolverSource = read(config.frozenSources.surfaceResolver.path);
  const beginSource = read(config.frozenSources.beginDispatcher.path);
  const resumeSource = read(config.frozenSources.resumeDispatcher.path);
  const registryLookupSource = read(config.frozenSources.resumeRegistryLookupIntegration.path);
  const orchestrationSource = read(config.frozenSources.commandOrchestration.path);

  assert.ok(resolverSource.includes('function resolveRepositoryOnlyRouteSurface(routeName)'));
  assert.ok(beginSource.includes('function ' + 'dispatchRepositoryOnlyRouteBegin'));
  assert.ok(beginSource.includes('routeName, packet, options = {}'));
  assert.ok(beginSource.includes('const state = resolution.beginSurface(packet, options);'));
  assert.ok(resumeSource.includes('function ' + 'dispatchRepositoryOnlyRouteResume'));
  assert.ok(registryLookupSource.includes('repository-only-route-resume-dispatcher'));
  assert.ok(orchestrationSource.includes('function beginRepositoryOnlyCommandHandlerOrchestration(routeName, packet, options = {})'));
  assert.ok(orchestrationSource.includes('function resumeRepositoryOnlyCommandHandlerOrchestration(orchestration, repositoryResult, options = {})'));
}

function assertRouteParityWithoutInvocation() {
  const results = [];

  for (const entry of config.routes) {
    const route = routeRegistry.findRouteByName(entry.routeName);
    assert.ok(route, `missing active route: ${entry.routeName}`);
    assert.strictEqual(route.module, entry.moduleName);
    assert.strictEqual(route.handler, entry.activeHandlerName);

    const activeHandler = moduleRouteLoader.getHandler(entry.moduleName, entry.activeHandlerName);
    const beginSurface = moduleRouteLoader.getRepositoryOnlySurface(entry.moduleName, entry.beginSurfaceName);
    const resumeSurface = moduleRouteLoader.getRepositoryOnlySurface(entry.moduleName, entry.resumeSurfaceName);
    assert.strictEqual(activeHandler, routeHandlers.handlers[entry.activeHandlerName]);
    assert.strictEqual(activeHandler, routeHandlers[entry.activeHandlerName]);
    assert.strictEqual(beginSurface, routeHandlers[entry.beginSurfaceName]);
    assert.strictEqual(resumeSurface, routeHandlers[entry.resumeSurfaceName]);
    assert.notStrictEqual(activeHandler, beginSurface);
    assert.notStrictEqual(activeHandler, resumeSurface);

    const mapped = surfaceDescriptor.ROUTE_SURFACE_DESCRIPTORS[entry.routeName];
    assert.ok(mapped, `missing B02W mapping: ${entry.routeName}`);
    assert.strictEqual(mapped.activeHandlerName, entry.activeHandlerName);
    assert.strictEqual(mapped.beginSurfaceName, entry.beginSurfaceName);
    assert.strictEqual(surfaceDescriptor.RESUME_SURFACE_NAME, entry.resumeSurfaceName);

    results.push(Object.freeze({
      routeName: entry.routeName,
      activeRuntimeRouteResolved: true,
      activeHandlerReferenceResolvedNotInvoked: true,
      repositoryOnlyBeginReferenceResolvedNotInvoked: true,
      repositoryOnlyResumeReferenceResolvedNotInvoked: true,
      activeAndRepositoryOnlyReferencesRemainSeparated: true,
      controlledExternalBindingLineageReusable: true,
      defaultFailClosedPreserved: true
    }));
  }

  return Object.freeze(results);
}

function main() {
  assertFrozenContract();
  assertActiveRuntimeSeam();
  assertFailClosedActiveHandlers();
  assertExistingExternalBindingLineage();
  const cases = assertRouteParityWithoutInvocation();

  const proof = Object.freeze({
    contractId: config.contractId,
    boundaryId: config.boundaryId,
    domain: config.domain,
    mode: config.mode,
    state: 'REPOSITORY_READINESS_PASS',
    predecessor: config.predecessor,
    proofTarget: 'active runtime route resolution -> existing controlled external command binding lineage (structural only)',
    cases,
    invariants: Object.freeze({
      activeExecuteHandlerInvoked: false,
      repositoryOnlyBeginSurfaceInvoked: false,
      repositoryOnlyResumeSurfaceInvoked: false,
      beginDispatcherInvoked: false,
      resumeDispatcherInvoked: false,
      externalCommandBindingInvoked: false,
      repositoryOperationInvoked: false,
      newContinuationStateStored: false,
      credentialReadExecuted: false,
      rpcExecuted: false,
      networkExecuted: false,
      supabaseOperationExecuted: false,
      stagingReadExecuted: false,
      stagingMutationExecuted: false,
      runtimeWiringChanged: false,
      runtimeActivated: false,
      realtimeActivated: false,
      migrationApplied: false,
      productionChanged: false,
      mergeExecuted: false,
      readyForReviewExecuted: false
    })
  });

  if (process.env.PROOF_PATH) {
    fs.writeFileSync(process.env.PROOF_PATH, `${JSON.stringify(proof, null, 2)}\n`);
  }
  console.log(JSON.stringify(proof));
}

main();
