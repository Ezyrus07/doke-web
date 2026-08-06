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

function listModuleRoutes() {
  return Object.keys(modules).reduce((all, key) => all.concat(modules[key].routes), []);
}

function getHandler(moduleName, handlerName) {
  const moduleEntry = modules[moduleName];
  return moduleEntry && moduleEntry.handlers ? moduleEntry.handlers[handlerName] || null : null;
}

module.exports = Object.freeze({
  modules,
  listModuleRoutes,
  getHandler
});
