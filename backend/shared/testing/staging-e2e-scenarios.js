'use strict';

/**
 * Canonical local/staging runtime validation plan for the controlled MVP.
 *
 * This file is intentionally data-only. The executable runner consumes these
 * scenarios, while static audits validate that every runtime domain remains in
 * the release gate before frontend API activation is allowed.
 */

const STAGING_E2E_ENVIRONMENT = Object.freeze({
  baseUrl: 'DOKE_STAGING_API_URL',
  allowMutations: 'DOKE_STAGING_E2E_ALLOW_MUTATIONS',
  clientEmail: 'DOKE_STAGING_CLIENT_EMAIL',
  clientPassword: 'DOKE_STAGING_CLIENT_PASSWORD',
  professionalEmail: 'DOKE_STAGING_PROFESSIONAL_EMAIL',
  professionalPassword: 'DOKE_STAGING_PROFESSIONAL_PASSWORD',
  supportEmail: 'DOKE_STAGING_SUPPORT_EMAIL',
  supportPassword: 'DOKE_STAGING_SUPPORT_PASSWORD',
  adminEmail: 'DOKE_STAGING_ADMIN_EMAIL',
  adminPassword: 'DOKE_STAGING_ADMIN_PASSWORD',
  seededOrderId: 'DOKE_STAGING_ORDER_ID',
  seededConversationId: 'DOKE_STAGING_CONVERSATION_ID',
  seededNotificationId: 'DOKE_STAGING_NOTIFICATION_ID',
  seededWithdrawalId: 'DOKE_STAGING_WITHDRAWAL_ID',
  seededDisputeId: 'DOKE_STAGING_DISPUTE_ID'
});

const STAGING_E2E_DEFAULT_USERS = Object.freeze({
  client: Object.freeze({ email: 'cliente@doke.local', password: 'Doke1234!' }),
  professional: Object.freeze({ email: 'profissional@doke.local', password: 'Doke1234!' }),
  support: Object.freeze({ email: 'suporte@doke.local', password: 'Doke1234!' }),
  admin: Object.freeze({ email: 'admin@doke.local', password: 'Doke1234!' })
});

const STAGING_E2E_SCENARIOS = Object.freeze([
  scenario('identity.client', 'client', 'GET', '/users/me', false, 'Client identity resolves from seeded Supabase auth token.'),
  scenario('identity.professional_profile', 'professional', 'GET', '/profiles/me', false, 'Professional identity exposes the owner/current profile DTO.'),
  scenario('identity.support_session', 'support', 'GET', '/auth/session', false, 'Support token resolves role before internal routes are tested.'),
  scenario('orders.client_list', 'client', 'GET', '/orders', false, 'Client lists only own orders through RLS and route scope.'),
  scenario('orders.professional_list', 'professional', 'GET', '/orders', false, 'Professional lists assigned orders only.'),
  scenario('orders.support_list', 'support', 'GET', '/orders', false, 'Support can inspect orders through server runtime/service role.'),
  scenario('orders.accept_requires_idempotency', 'professional', 'POST', '/orders/:id/accept', true, 'Professional order action must require x-idempotency-key.'),
  scenario('orders.client_accept_denied', 'client', 'POST', '/orders/:id/accept', true, 'Client token must be denied from professional order action.'),
  scenario('idempotency.replay_same_payload', 'professional', 'POST', '/orders/:id/quote', true, 'Repeating the same key and payload returns the stored response without duplicating side effects.'),
  scenario('idempotency.reject_payload_drift', 'professional', 'POST', '/orders/:id/quote', true, 'Reusing the same key with a different payload returns DOKE_IDEMPOTENCY_CONFLICT.'),
  scenario('messaging.list', 'client', 'GET', '/conversations', false, 'Client lists participant conversations.'),
  scenario('messaging.send_message', 'client', 'POST', '/conversations/:id/messages', false, 'Client can send a scoped message.'),
  scenario('messaging.mark_read', 'professional', 'POST', '/conversations/:id/read', false, 'Professional can mark participant conversation as read.'),
  scenario('notifications.list', 'professional', 'GET', '/notifications', false, 'Professional lists own notifications.'),
  scenario('notifications.read', 'professional', 'POST', '/notifications/:id/read', false, 'Professional can mark own notification as read.'),
  scenario('notifications.support_create', 'support', 'POST', '/notifications', true, 'Support creates notification with idempotency and audit gate.'),
  scenario('wallet.summary', 'professional', 'GET', '/wallet', false, 'Professional reads own wallet summary.'),
  scenario('wallet.transactions', 'professional', 'GET', '/wallet/transactions', false, 'Professional reads own transaction feed.'),
  scenario('wallet.bank_account', 'professional', 'GET', '/wallet/bank-account', false, 'Professional reads own payout account.'),
  scenario('withdrawals.request', 'professional', 'POST', '/withdrawals', true, 'Professional requests withdrawal with idempotency key.'),
  scenario('withdrawals.client_denied', 'client', 'POST', '/withdrawals', true, 'Client token must be denied from withdrawal request.'),
  scenario('disputes.list', 'client', 'GET', '/disputes', false, 'Client reads disputes where it participates.'),
  scenario('receipts.list', 'professional', 'GET', '/receipts', false, 'Professional reads own receipts.'),
  scenario('audit.support_list', 'support', 'GET', '/admin/audit-events', false, 'Support can inspect server-side audit events.'),
  scenario('audit.client_denied', 'client', 'GET', '/admin/audit-events', false, 'Client token must be denied from admin audit events.')
]);

const STAGING_E2E_REQUIRED_SQL_TESTS = Object.freeze([
  'supabase/tests/001_rls_matrix_validation.sql',
  'supabase/tests/002_idempotency_and_audit_validation.sql',
  'supabase/tests/003_policy_negative_cases.sql',
  'supabase/tests/004_runtime_e2e_postconditions.sql',
  'supabase/tests/005_runtime_idempotency_audit_replay_validation.sql'
]);

function scenario(name, actorRole, method, path, idempotencyRequired, objective) {
  return Object.freeze({
    name,
    actorRole,
    method,
    path,
    idempotencyRequired: Boolean(idempotencyRequired),
    objective
  });
}

function listScenarioNames() {
  return STAGING_E2E_SCENARIOS.map((entry) => entry.name);
}

module.exports = Object.freeze({
  STAGING_E2E_ENVIRONMENT,
  STAGING_E2E_DEFAULT_USERS,
  STAGING_E2E_SCENARIOS,
  STAGING_E2E_REQUIRED_SQL_TESTS,
  listScenarioNames
});
