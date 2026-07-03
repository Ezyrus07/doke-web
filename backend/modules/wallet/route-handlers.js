'use strict';

const { listRoutesByModule, findRouteByName } = require('../../shared/http/route-registry');
const { createActionHandler, notImplementedHandler } = require('../../shared/http/create-action-handler');
const walletService = require('./wallet-service');

const routes = listRoutesByModule('wallet');
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

handlers.getWalletSummary = handler('wallet.summary', ({ context, actor }) => walletService.getWalletSummary(context, actor));
handlers.listWalletTransactions = handler('wallet.transactions', ({ context, actor }) => walletService.listWalletTransactions(context, actor));
handlers.getWalletDashboard = handler('wallet.dashboard', ({ context, actor }) => walletService.getWalletDashboard(context, actor));
handlers.getWalletMonthlyHistory = handler('wallet.monthlyHistory', ({ context, actor }) => walletService.getWalletMonthlyHistory(context, actor));
handlers.getReceivablesSchedule = handler('wallet.receivablesSchedule', ({ context, actor }) => walletService.getReceivablesSchedule(context, actor));
handlers.getBankAccount = handler('wallet.bankAccount', ({ context, actor }) => walletService.getBankAccount(context, actor));
handlers.saveBankAccount = audited('wallet.saveBankAccount', ({ context, actor }) => walletService.saveBankAccount(context, actor));
handlers.listReceivables = handler('receivables.list', ({ context, actor }) => walletService.listReceivables(context, actor));
handlers.createReceivable = audited('receivables.create', ({ context, actor }) => walletService.createReceivable(context, actor));
handlers.listWithdrawals = handler('withdrawals.list', ({ context, actor }) => walletService.listWithdrawals(context, actor));
handlers.requestWithdrawal = audited('withdrawals.request', ({ context, actor, idempotencyKey }) => walletService.requestWithdrawal(context, actor, idempotencyKey));
handlers.listDisputes = handler('disputes.list', ({ context, actor }) => walletService.listDisputes(context, actor));
handlers.openDispute = audited('disputes.open', ({ context, actor, idempotencyKey }) => walletService.openDispute(context, actor, idempotencyKey));
handlers.respondDispute = audited('disputes.respond', ({ context, actor, idempotencyKey }) => walletService.respondDispute(context, actor, context.params.id, idempotencyKey));
handlers.listReceipts = handler('receipts.list', ({ context, actor }) => walletService.listReceipts(context, actor));
handlers.getReceipt = handler('receipts.get', ({ context, actor }) => walletService.getReceipt(context, actor, context.params.id));

function listRouteDefinitions() {
  return routes.slice();
}

module.exports = Object.freeze({
  routes,
  handlers,
  listRouteDefinitions
});
