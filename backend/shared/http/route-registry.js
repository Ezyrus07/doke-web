'use strict';

/**
 * Backend route registry for the controlled MVP API.
 *
 * This file is intentionally framework-neutral. It is the server-side counterpart
 * of the frontend provider contracts and the API action contract. Real handlers
 * can be bound to Express, Fastify, Supabase Edge Functions, or another runtime
 * without changing route names, role scopes, idempotency, or audit guarantees.
 */

const ROUTES = Object.freeze([
  // Auth and identity.
  route('auth.login', 'POST', '/auth/login', 'auth', 'login', ['guest'], 'public', false, false),
  route('auth.register', 'POST', '/auth/register', 'auth', 'register', ['guest'], 'public', false, true),
  route('auth.session', 'GET', '/auth/session', 'auth', 'session', ['client', 'professional', 'support', 'admin'], 'self', false, false),
  route('auth.logout', 'POST', '/auth/logout', 'auth', 'logout', ['client', 'professional', 'support', 'admin'], 'self', false, false),
  route('auth.recovery', 'POST', '/auth/recovery', 'auth', 'recovery', ['guest'], 'public', true, false),
  route('auth.resetPassword', 'POST', '/auth/reset-password', 'auth', 'resetPassword', ['guest'], 'public', true, true),
  route('users.current', 'GET', '/users/me', 'auth', 'currentUser', ['client', 'professional', 'support', 'admin'], 'self', false, false),
  route('users.updateCurrent', 'PATCH', '/users/me', 'auth', 'updateCurrentUser', ['client', 'professional', 'support', 'admin'], 'self', true, true),
  route('profiles.current', 'GET', '/profiles/me', 'auth', 'currentProfile', ['client', 'professional', 'support', 'admin'], 'self', false, false),
  route('profiles.updateCurrent', 'PATCH', '/profiles/me', 'auth', 'updateCurrentProfile', ['client', 'professional', 'support', 'admin'], 'self', true, true),

  // Orders.
  route('orders.list', 'GET', '/orders', 'orders', 'listOrders', ['client', 'professional', 'support', 'admin'], 'order_participant_or_support', false, false),
  route('orders.create', 'POST', '/orders', 'orders', 'createOrder', ['client'], 'order_client', true, true),
  route('orders.get', 'GET', '/orders/:id', 'orders', 'getOrder', ['client', 'professional', 'support', 'admin'], 'order_participant_or_support', false, false),
  route('orders.accept', 'POST', '/orders/:id/accept', 'orders', 'acceptOrder', ['professional'], 'order_professional', true, true),
  route('orders.decline', 'POST', '/orders/:id/decline', 'orders', 'declineOrder', ['professional'], 'order_professional', true, true),
  route('orders.quote', 'POST', '/orders/:id/quote', 'orders', 'sendQuote', ['professional'], 'order_professional', true, true),
  route('orders.charge', 'POST', '/orders/:id/charge', 'orders', 'sendCharge', ['professional'], 'order_professional', true, true),
  route('orders.start', 'POST', '/orders/:id/start', 'orders', 'startOrder', ['professional'], 'order_professional', true, true),
  route('orders.complete', 'POST', '/orders/:id/complete', 'orders', 'completeOrder', ['professional'], 'order_professional', true, true),
  route('orders.updateStatus', 'POST', '/orders/:id/status', 'orders', 'updateOrderStatus', ['support', 'admin'], 'internal_operator', true, true, true),

  // Conversations and messages.
  route('conversations.list', 'GET', '/conversations', 'messaging', 'listConversations', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),
  route('conversations.get', 'GET', '/conversations/:id', 'messaging', 'getConversation', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),
  route('conversations.createForOrder', 'POST', '/orders/:id/conversation', 'messaging', 'createConversationForOrder', ['client', 'professional', 'support', 'admin'], 'order_participant_or_support', true, true),
  route('conversations.updateOrder', 'POST', '/conversations/:id/order', 'messaging', 'updateConversationOrder', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true),
  route('messages.send', 'POST', '/conversations/:id/messages', 'messaging', 'sendMessage', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),
  route('messages.markRead', 'POST', '/conversations/:id/read', 'messaging', 'markConversationRead', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),

  // Notifications.
  route('notifications.list', 'GET', '/notifications', 'notifications', 'listNotifications', ['client', 'professional', 'support', 'admin'], 'notification_owner', false, false),
  route('notifications.get', 'GET', '/notifications/:id', 'notifications', 'getNotification', ['client', 'professional', 'support', 'admin'], 'notification_owner', false, false),
  route('notifications.create', 'POST', '/notifications', 'notifications', 'createNotification', ['support', 'admin'], 'internal_operator', true, true, true),
  route('notifications.update', 'PATCH', '/notifications/:id', 'notifications', 'updateNotification', ['support', 'admin'], 'internal_operator', true, true, true),
  route('notifications.read', 'POST', '/notifications/:id/read', 'notifications', 'markNotificationRead', ['client', 'professional', 'support', 'admin'], 'notification_owner', false, false),
  route('notifications.dismiss', 'POST', '/notifications/:id/dismiss', 'notifications', 'dismissNotification', ['client', 'professional', 'support', 'admin'], 'notification_owner', false, false),
  route('notifications.readAll', 'POST', '/notifications/read-all', 'notifications', 'markAllNotificationsRead', ['client', 'professional', 'support', 'admin'], 'notification_owner', false, false),

  // Wallet and finance.
  route('wallet.summary', 'GET', '/wallet', 'wallet', 'getWalletSummary', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.transactions', 'GET', '/wallet/transactions', 'wallet', 'listWalletTransactions', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.dashboard', 'GET', '/wallet/dashboard', 'wallet', 'getWalletDashboard', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.monthlyHistory', 'GET', '/wallet/monthly-history', 'wallet', 'getWalletMonthlyHistory', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.receivablesSchedule', 'GET', '/wallet/receivables/schedule', 'wallet', 'getReceivablesSchedule', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.bankAccount', 'GET', '/wallet/bank-account', 'wallet', 'getBankAccount', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('wallet.saveBankAccount', 'POST', '/wallet/bank-account', 'wallet', 'saveBankAccount', ['professional'], 'wallet_owner', true, true),
  route('receivables.list', 'GET', '/wallet/receivables', 'wallet', 'listReceivables', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('receivables.create', 'POST', '/wallet/receivables', 'wallet', 'createReceivable', ['support', 'admin'], 'internal_operator', true, true, true),
  route('withdrawals.list', 'GET', '/withdrawals', 'wallet', 'listWithdrawals', ['professional', 'support', 'admin'], 'wallet_owner_or_support', false, false),
  route('withdrawals.request', 'POST', '/withdrawals', 'wallet', 'requestWithdrawal', ['professional'], 'wallet_owner', true, true),
  route('withdrawals.approve', 'POST', '/withdrawals/:id/approve', 'admin', 'approveWithdrawal', ['support', 'admin'], 'internal_operator', true, true, true),
  route('withdrawals.decline', 'POST', '/withdrawals/:id/decline', 'admin', 'declineWithdrawal', ['support', 'admin'], 'internal_operator', true, true, true),
  route('disputes.list', 'GET', '/disputes', 'wallet', 'listDisputes', ['client', 'professional', 'support', 'admin'], 'dispute_participant_or_support', false, false),
  route('disputes.open', 'POST', '/disputes', 'wallet', 'openDispute', ['client'], 'order_client', true, true),
  route('disputes.respond', 'POST', '/disputes/:id/respond', 'wallet', 'respondDispute', ['professional'], 'dispute_professional', true, true),
  route('disputes.release', 'POST', '/admin/disputes/:id/release', 'admin', 'releaseDispute', ['support', 'admin'], 'internal_operator', true, true, true),
  route('disputes.refund', 'POST', '/admin/disputes/:id/refund', 'admin', 'refundDispute', ['support', 'admin'], 'internal_operator', true, true, true),
  route('receipts.list', 'GET', '/receipts', 'wallet', 'listReceipts', ['client', 'professional', 'support', 'admin'], 'receipt_owner_or_support', false, false),
  route('receipts.get', 'GET', '/receipts/:id', 'wallet', 'getReceipt', ['client', 'professional', 'support', 'admin'], 'receipt_owner_or_support', false, false),
  route('auditEvents.list', 'GET', '/admin/audit-events', 'admin', 'listAuditEvents', ['support', 'admin'], 'internal_operator', false, false, true)
]);

function route(name, method, path, module, handler, allowedRoles, scope, idempotencyRequired, auditRequired, serviceRoleRequired) {
  return Object.freeze({
    name,
    method,
    path,
    module,
    handler,
    allowedRoles: Object.freeze(allowedRoles.slice()),
    scope,
    idempotencyRequired: Boolean(idempotencyRequired),
    auditRequired: Boolean(auditRequired),
    serviceRoleRequired: Boolean(serviceRoleRequired),
    authorizationGate: 'backend_route_guard',
    rlsValidationRequired: true
  });
}

function listRoutes() {
  return ROUTES.slice();
}

function findRouteByName(name) {
  return ROUTES.find((entry) => entry.name === name) || null;
}

function listRoutesByModule(moduleName) {
  return ROUTES.filter((entry) => entry.module === moduleName);
}

function getRouteIndex() {
  return ROUTES.reduce((index, entry) => {
    index[entry.name] = entry;
    return index;
  }, {});
}

module.exports = Object.freeze({
  ROUTES,
  listRoutes,
  findRouteByName,
  listRoutesByModule,
  getRouteIndex
});
