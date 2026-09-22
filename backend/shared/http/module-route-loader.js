'use strict';

const auth = require('../../modules/auth/route-handlers');
const orders = require('../../modules/orders/route-handlers');
const messaging = require('../../modules/messaging/route-handlers');
const notifications = require('../../modules/notifications/route-handlers');
const wallet = require('../../modules/wallet/route-handlers');
const admin = require('../../modules/admin/route-handlers');
const communities = require('../../modules/communities/route-handlers');

const modules = Object.freeze({
  auth,
  orders,
  messaging,
  notifications,
  wallet,
  admin,
  communities
});

const repositoryOnlySurfaces = Object.freeze({
  communities: Object.freeze({
    composeMembershipCommandRepositoryOnly: communities.composeMembershipCommandRepositoryOnly,
    composeGovernanceCommandRepositoryOnly: communities.composeGovernanceCommandRepositoryOnly,
    composeContentCommandRepositoryOnly: communities.composeContentCommandRepositoryOnly,
    resumeCommandRepositoryOnlySurface: communities.resumeCommandRepositoryOnlySurface
  })
});

function listModuleRoutes() {
  return Object.keys(modules).reduce((all, key) => all.concat(modules[key].routes), []);
}

function getHandler(moduleName, handlerName) {
  const moduleEntry = modules[moduleName];
  return moduleEntry && moduleEntry.handlers ? moduleEntry.handlers[handlerName] || null : null;
}

function getRepositoryOnlySurface(moduleName, surfaceName) {
  const moduleEntry = repositoryOnlySurfaces[moduleName];
  return moduleEntry ? moduleEntry[surfaceName] || null : null;
}

module.exports = Object.freeze({
  modules,
  repositoryOnlySurfaces,
  listModuleRoutes,
  getHandler,
  getRepositoryOnlySurface
});
