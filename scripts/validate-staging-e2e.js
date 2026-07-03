#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const {
  STAGING_E2E_ENVIRONMENT,
  STAGING_E2E_DEFAULT_USERS,
  STAGING_E2E_SCENARIOS,
  STAGING_E2E_REQUIRED_SQL_TESTS
} = require('../backend/shared/testing/staging-e2e-scenarios');

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const allowMutations = process.env[STAGING_E2E_ENVIRONMENT.allowMutations] === '1' || args.has('--allow-mutations');
const MUTATION_ENV_NAME = 'DOKE_STAGING_E2E_ALLOW_MUTATIONS';
const baseUrl = normalizeBaseUrl(process.env[STAGING_E2E_ENVIRONMENT.baseUrl] || readArg('--base-url'));

async function main() {
  if (dryRun) {
    printDryRunPlan();
    return;
  }

  if (!baseUrl) {
    throw usageError(`Missing ${STAGING_E2E_ENVIRONMENT.baseUrl}.`);
  }
  if (!allowMutations) {
    throw usageError(`Set ${STAGING_E2E_ENVIRONMENT.allowMutations}=1 or pass --allow-mutations. This validation mutates staging data.`);
  }
  if (typeof fetch !== 'function') {
    throw usageError('This script requires a Node runtime with global fetch support.');
  }

  const context = {
    baseUrl,
    tokens: {},
    identities: {},
    resources: {},
    results: []
  };

  await loginAllRoles(context);
  await validateIdentity(context);
  await validateOrders(context);
  await validateMessaging(context);
  await validateNotifications(context);
  await validateWalletFinance(context);
  await validateAdminAudit(context);

  const failed = context.results.filter((entry) => entry.status !== 'passed' && entry.status !== 'skipped');
  if (failed.length) {
    console.error('validate:staging-e2e failed:');
    failed.forEach((entry) => console.error(`- ${entry.name}: ${entry.detail}`));
    process.exit(1);
  }

  console.log('validate:staging-e2e passed');
  context.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}

function printDryRunPlan() {
  console.log('validate:staging-e2e dry run');
  console.log('Required environment:');
  Object.entries(STAGING_E2E_ENVIRONMENT).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
  console.log('Required SQL pre-checks:');
  STAGING_E2E_REQUIRED_SQL_TESTS.forEach((file) => console.log(`- ${file}`));
  console.log('Runtime scenarios:');
  STAGING_E2E_SCENARIOS.forEach((entry) => {
    console.log(`- ${entry.name}: ${entry.actorRole} ${entry.method} ${entry.path}${entry.idempotencyRequired ? ' [idempotency]' : ''}`);
  });
}

async function loginAllRoles(context) {
  for (const role of ['client', 'professional', 'support', 'admin']) {
    const credentials = credentialsForRole(role);
    const response = await request(context, 'guest', 'POST', '/auth/login', {
      body: credentials,
      expectedStatuses: [200, 201]
    });
    const session = response.session || response.authSession || response.data && response.data.session || {};
    const token = session.access_token || session.accessToken || response.access_token || response.accessToken;
    if (!token) throw new Error(`Login for ${role} did not return an access token.`);
    context.tokens[role] = token;
    context.identities[role] = response.user || response.identity || response.data && response.data.user || null;
    record(context, `auth.login.${role}`, 'passed');
  }
}

async function validateIdentity(context) {
  for (const role of ['client', 'professional', 'support', 'admin']) {
    await request(context, role, 'GET', '/auth/session', { expectedStatuses: [200] });
    await request(context, role, 'GET', '/users/me', { expectedStatuses: [200] });
    await request(context, role, 'GET', '/profiles/me', { expectedStatuses: [200] });
    record(context, `identity.${role}`, 'passed');
  }
}

async function validateOrders(context) {
  const clientList = await request(context, 'client', 'GET', '/orders', { expectedStatuses: [200] });
  const professionalList = await request(context, 'professional', 'GET', '/orders', { expectedStatuses: [200] });
  await request(context, 'support', 'GET', '/orders', { expectedStatuses: [200] });
  const order = pickFirst(clientList.orders) || pickFirst(professionalList.orders);
  const orderId = process.env[STAGING_E2E_ENVIRONMENT.seededOrderId] || order && order.id;
  if (!orderId) throw new Error('No seeded order found. Apply supabase/seed/002_mvp_controlled_seed.sql or set DOKE_STAGING_ORDER_ID.');
  context.resources.orderId = orderId;

  await request(context, 'client', 'POST', `/orders/${orderId}/accept`, {
    body: { note: 'negative validation: client cannot accept' },
    idempotencyKey: key('client-accept-denied'),
    expectedStatuses: [401, 403]
  });
  record(context, 'orders.client_accept_denied', 'passed');

  await request(context, 'professional', 'POST', `/orders/${orderId}/accept`, {
    body: { note: 'staging validation accept' },
    expectedStatuses: [409]
  });
  record(context, 'orders.accept_requires_idempotency', 'passed');

  const quoteKey = key('quote');
  const quoteBody = { amountCents: 25900, currency: 'BRL', description: 'Orçamento validado pelo smoke staging.' };

  await request(context, 'professional', 'POST', `/orders/${orderId}/quote`, {
    body: quoteBody,
    idempotencyKey: quoteKey,
    expectedStatuses: [200]
  });
  record(context, 'orders.quote', 'passed');

  await request(context, 'professional', 'POST', `/orders/${orderId}/quote`, {
    body: quoteBody,
    idempotencyKey: quoteKey,
    expectedStatuses: [200]
  });
  record(context, 'idempotency.replay_same_payload', 'passed');

  await request(context, 'professional', 'POST', `/orders/${orderId}/quote`, {
    body: { amountCents: 35900, currency: 'BRL', description: 'Payload diferente deve ser recusado.' },
    idempotencyKey: quoteKey,
    expectedStatuses: [409]
  });
  record(context, 'idempotency.reject_payload_drift', 'passed');
}

async function validateMessaging(context) {
  const list = await request(context, 'client', 'GET', '/conversations', { expectedStatuses: [200] });
  let conversation = pickFirst(list.conversations);
  if (!conversation && context.resources.orderId) {
    const created = await request(context, 'client', 'POST', `/orders/${context.resources.orderId}/conversation`, {
      idempotencyKey: key('conversation-for-order'),
      body: { source: 'staging_e2e' },
      expectedStatuses: [200, 201]
    });
    conversation = created.conversation || created;
  }
  const conversationId = process.env[STAGING_E2E_ENVIRONMENT.seededConversationId] || conversation && conversation.id;
  if (!conversationId) throw new Error('No seeded conversation found and conversation creation did not return an id.');
  context.resources.conversationId = conversationId;

  await request(context, 'client', 'POST', `/conversations/${conversationId}/messages`, {
    body: { text: 'Mensagem de validação staging E2E.', type: 'text' },
    expectedStatuses: [200, 201]
  });
  await request(context, 'professional', 'POST', `/conversations/${conversationId}/read`, {
    body: { source: 'staging_e2e' },
    expectedStatuses: [200]
  });
  record(context, 'messaging.scoped_exchange', 'passed');
}

async function validateNotifications(context) {
  const list = await request(context, 'professional', 'GET', '/notifications', { expectedStatuses: [200] });
  let notification = pickFirst(list.notifications);
  const notificationId = process.env[STAGING_E2E_ENVIRONMENT.seededNotificationId] || notification && notification.id;
  if (notificationId) {
    await request(context, 'professional', 'POST', `/notifications/${notificationId}/read`, { expectedStatuses: [200] });
    await request(context, 'professional', 'POST', `/notifications/${notificationId}/dismiss`, { expectedStatuses: [200] });
    record(context, 'notifications.owner_read_dismiss', 'passed');
  } else {
    record(context, 'notifications.owner_read_dismiss', 'skipped', 'no seeded notification id found');
  }

  await request(context, 'support', 'POST', '/notifications', {
    idempotencyKey: key('support-notification'),
    body: {
      userId: context.identities.professional && context.identities.professional.id,
      title: 'Validação staging',
      message: 'Notificação gerada pelo smoke E2E.',
      type: 'system',
      data: { source: 'staging_e2e' }
    },
    expectedStatuses: [200, 201]
  });
  record(context, 'notifications.support_create', 'passed');
}

async function validateWalletFinance(context) {
  await request(context, 'professional', 'GET', '/wallet', { expectedStatuses: [200] });
  await request(context, 'professional', 'GET', '/wallet/transactions', { expectedStatuses: [200] });
  await request(context, 'professional', 'GET', '/wallet/bank-account', { expectedStatuses: [200, 404] });

  await request(context, 'client', 'POST', '/withdrawals', {
    body: { amountCents: 1000, source: 'negative_validation' },
    idempotencyKey: key('client-withdrawal-denied'),
    expectedStatuses: [401, 403]
  });

  const withdrawal = await request(context, 'professional', 'POST', '/withdrawals', {
    body: { amountCents: 1000, source: 'staging_e2e' },
    idempotencyKey: key('withdrawal-request'),
    expectedStatuses: [200, 201]
  });
  context.resources.withdrawalId = process.env[STAGING_E2E_ENVIRONMENT.seededWithdrawalId] || withdrawal.id || withdrawal.withdrawal && withdrawal.withdrawal.id || '';

  await request(context, 'client', 'GET', '/disputes', { expectedStatuses: [200] });
  await request(context, 'professional', 'GET', '/receipts', { expectedStatuses: [200] });
  record(context, 'withdrawals.client_denied', 'passed');
  record(context, 'wallet.finance_surface', 'passed');
}

async function validateAdminAudit(context) {
  await request(context, 'client', 'GET', '/admin/audit-events', { expectedStatuses: [401, 403] });
  await request(context, 'support', 'GET', '/admin/audit-events', { expectedStatuses: [200] });
  record(context, 'audit.scope', 'passed');
}

async function request(context, role, method, path, options) {
  const requestOptions = options || {};
  const headers = { 'content-type': 'application/json', 'x-request-id': key('req') };
  if (role !== 'guest') {
    const token = context.tokens[role];
    if (!token) throw new Error(`Missing token for ${role}.`);
    headers.authorization = `Bearer ${token}`;
  }
  if (requestOptions.idempotencyKey) headers['x-idempotency-key'] = requestOptions.idempotencyKey;

  const response = await fetch(`${context.baseUrl}${path}`, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : JSON.stringify(requestOptions.body || {})
  });
  const payload = await readJson(response);
  const expected = requestOptions.expectedStatuses || [200];
  if (!expected.includes(response.status)) {
    const detail = payload && (payload.error && payload.error.message || payload.message || JSON.stringify(payload)) || response.statusText;
    throw new Error(`${role} ${method} ${path} expected ${expected.join('/')} but got ${response.status}: ${detail}`);
  }
  return payload || {};
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function credentialsForRole(role) {
  const upper = role.toUpperCase();
  return {
    email: process.env[`DOKE_STAGING_${upper}_EMAIL`] || STAGING_E2E_DEFAULT_USERS[role].email,
    password: process.env[`DOKE_STAGING_${upper}_PASSWORD`] || STAGING_E2E_DEFAULT_USERS[role].password
  };
}

function pickFirst(value) {
  return Array.isArray(value) && value.length ? value[0] : null;
}

function key(label) {
  return `doke-${label}-${crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(12).toString('hex')}`;
}

function record(context, name, status, detail) {
  context.results.push({ name, status, detail: detail || '' });
}

function normalizeBaseUrl(value) {
  const raw = String(value || '').trim();
  return raw ? raw.replace(/\/+$/, '') : '';
}

function readArg(name) {
  const argsArray = process.argv.slice(2);
  const index = argsArray.indexOf(name);
  return index >= 0 ? argsArray[index + 1] : '';
}

function usageError(message) {
  const error = new Error(`${message}\nRun: node scripts/validate-staging-e2e.js --dry-run`);
  error.code = 'DOKE_STAGING_E2E_USAGE_ERROR';
  return error;
}

main().catch((error) => {
  console.error(error && error.message || error);
  process.exit(1);
});
