'use strict';

const descriptor = require('./repository-only-route-surface-descriptor');
const { getRepositoryOnlySurface } = require('./module-route-loader');

const CONTRACT_ID = 'com-b02x-repository-only-route-surface-resolver-integration-v1';
const BOUNDARY_ID = 'COM-B02X';
const PREDECESSOR_CONTRACT_ID = 'com-b02w-route-registry-repository-only-surface-descriptor-integration-v1';
const PREDECESSOR_HEAD = '33db1b0bfac24f5785d6ccc0a5a13512d7c682ba';

function resolveRepositoryOnlyRouteSurface(routeName) {
  const routeDescriptor = descriptor.describeRepositoryOnlyRouteSurface(routeName);
  if (!routeDescriptor) return null;

  const beginSurface = getRepositoryOnlySurface(routeDescriptor.moduleName, routeDescriptor.beginSurfaceName);
  const resumeSurface = getRepositoryOnlySurface(routeDescriptor.moduleName, routeDescriptor.resumeSurfaceName);
  if (typeof beginSurface !== 'function' || typeof resumeSurface !== 'function') return null;

  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_surface_references_resolved_not_invoked',
    routeName: routeDescriptor.routeName,
    moduleName: routeDescriptor.moduleName,
    activeHandlerName: routeDescriptor.activeHandlerName,
    beginSurfaceName: routeDescriptor.beginSurfaceName,
    resumeSurfaceName: routeDescriptor.resumeSurfaceName,
    beginSurface,
    resumeSurface,
    executableReferencesResolved: true,
    executableReferencesInvoked: false,
    activeHandlerPreserved: true,
    routeRegistryPreserved: true,
    moduleRouteLoaderPreserved: true,
    routeHandlersPreserved: true,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function listRepositoryOnlyRouteSurfaceResolutions() {
  return descriptor.listRepositoryOnlyRouteSurfaceDescriptors()
    .map((entry) => resolveRepositoryOnlyRouteSurface(entry.routeName))
    .filter(Boolean);
}

function inspectRepositoryOnlyRouteSurfaceResolver() {
  const resolutions = listRepositoryOnlyRouteSurfaceResolutions();
  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_surface_resolver_materialized',
    routeNames: Object.freeze(resolutions.map((entry) => entry.routeName)),
    resolutionCount: resolutions.length,
    executableReferencesResolved: resolutions.length === 3,
    executableReferencesInvoked: false,
    activeHandlerPreserved: true,
    routeRegistryPreserved: true,
    moduleRouteLoaderPreserved: true,
    routeHandlersPreserved: true,
    repositoryOperationInvoked: false,
    rpcExecuted: false,
    networkExecuted: false,
    stagingReadExecuted: false,
    stagingMutationExecuted: false,
    migrationApplied: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  resolveRepositoryOnlyRouteSurface,
  listRepositoryOnlyRouteSurfaceResolutions,
  inspectRepositoryOnlyRouteSurfaceResolver
});
