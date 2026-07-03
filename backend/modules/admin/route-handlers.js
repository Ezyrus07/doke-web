'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const walletService = require('../wallet/wallet-service');

const routes = listRoutesByModule('admin');
const handlers = routes.reduce((index, route) => {
  index[route.handler] = notImplementedHandler(route);
  return index;
}, {});

function audited(routeName, execute) {
  return createActionHandler(findRouteByName(routeName), {
    execute,
    recordAudit(event, context) {
      return walletService.recordAdminAuditEvent(context, event);
    }
  });
}

function handler(routeName, execute) {
  return createActionHandler(findRouteByName(routeName), { execute });
}

handlers.approveWithdrawal = audited('withdrawals.approve', ({ context, actor, idempotencyKey }) => walletService.approveWithdrawal(context, actor, context.params.id, idempotencyKey));
handlers.declineWithdrawal = audited('withdrawals.decline', ({ context, actor, idempotencyKey }) => walletService.declineWithdrawal(context, actor, context.params.id, idempotencyKey));
handlers.releaseDispute = audited('disputes.release', ({ context, actor, idempotencyKey }) => walletService.releaseDispute(context, actor, context.params.id, idempotencyKey));
handlers.refundDispute = audited('disputes.refund', ({ context, actor, idempotencyKey }) => walletService.refundDispute(context, actor, context.params.id, idempotencyKey));
handlers.listAuditEvents = handler('auditEvents.list', ({ context, actor }) => walletService.listAuditEvents(context, actor));

function listRouteDefinitions() {
  return routes.slice();
}

module.exports = Object.freeze({
  routes,
  handlers,
  listRouteDefinitions
});
