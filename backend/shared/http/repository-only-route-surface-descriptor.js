'use strict';

const { findRouteByName } = require('./route-registry');

const CONTRACT_ID = 'com-b02w-route-registry-repository-only-surface-descriptor-integration-v1';
const BOUNDARY_ID = 'COM-B02W';
const PREDECESSOR_CONTRACT_ID = 'com-b02v-module-route-loader-repository-only-orchestration-surface-integration-v1';
const PREDECESSOR_HEAD = 'db56a9b2512fa96a6818a30fbef6986e66cca377';
const RESUME_SURFACE_NAME = 'resumeCommandRepositoryOnlySurface';

const ROUTE_SURFACE_DESCRIPTORS = Object.freeze({
  'communities.membership.command': Object.freeze({
    activeHandlerName: 'executeMembershipCommand',
    beginSurfaceName: 'composeMembershipCommandRepositoryOnly'
  }),
  'communities.governance.command': Object.freeze({
    activeHandlerName: 'executeGovernanceCommand',
    beginSurfaceName: 'composeGovernanceCommandRepositoryOnly'
  }),
  'communities.content.command': Object.freeze({
    activeHandlerName: 'executeContentCommand',
    beginSurfaceName: 'composeContentCommandRepositoryOnly'
  })
});

function describeRepositoryOnlyRouteSurface(routeName) {
  const mapped = ROUTE_SURFACE_DESCRIPTORS[routeName];
  if (!mapped) return null;
  const route = findRouteByName(routeName);
  if (!route || route.module !== 'communities' || route.handler !== mapped.activeHandlerName) return null;

  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    decision: 'repository_only_route_surface_descriptor',
    routeName,
    moduleName: route.module,
    activeHandlerName: mapped.activeHandlerName,
    beginSurfaceName: mapped.beginSurfaceName,
    resumeSurfaceName: RESUME_SURFACE_NAME,
    activeHandlerPreserved: true,
    routeRegistryPreserved: true,
    moduleRouteLoaderPreserved: true,
    executableReferenceExposed: false,
    repositoryOperationInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

function listRepositoryOnlyRouteSurfaceDescriptors() {
  return Object.keys(ROUTE_SURFACE_DESCRIPTORS)
    .map((routeName) => describeRepositoryOnlyRouteSurface(routeName))
    .filter(Boolean);
}

function inspectRepositoryOnlyRouteSurfaceDescriptors() {
  const descriptors = listRepositoryOnlyRouteSurfaceDescriptors();
  return Object.freeze({
    contractId: CONTRACT_ID,
    boundaryId: BOUNDARY_ID,
    predecessorContractId: PREDECESSOR_CONTRACT_ID,
    predecessorHead: PREDECESSOR_HEAD,
    decision: 'repository_only_route_surface_descriptors_materialized',
    routeNames: Object.freeze(descriptors.map((entry) => entry.routeName)),
    descriptorCount: descriptors.length,
    resumeSurfaceName: RESUME_SURFACE_NAME,
    executableReferenceExposed: false,
    routeRegistryPreserved: true,
    moduleRouteLoaderPreserved: true,
    repositoryOperationInvoked: false,
    networkExecuted: false,
    runtimeActivated: false,
    productionChanged: false
  });
}

module.exports = Object.freeze({
  CONTRACT_ID,
  BOUNDARY_ID,
  PREDECESSOR_CONTRACT_ID,
  PREDECESSOR_HEAD,
  RESUME_SURFACE_NAME,
  ROUTE_SURFACE_DESCRIPTORS,
  describeRepositoryOnlyRouteSurface,
  listRepositoryOnlyRouteSurfaceDescriptors,
  inspectRepositoryOnlyRouteSurfaceDescriptors
});
