#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { startBackendRealDomainLocalServer } = require('../backend/shared/testing/backend-real-domain-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const domainArg = (process.argv.find((arg) => arg.startsWith('--domain=')) || '').split('=')[1];
const domains = domainArg ? domainArg.split(',').map((item) => item.trim()).filter(Boolean) : ['messaging', 'notifications', 'wallet'];
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_DOMAIN_CANARY_REPORT_PATH || 'reports/generated/backend-domain-canary-local-runtime-report.json';

const report = {
  name: 'backend-domain-canary-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate backend real canary contracts for messaging, notifications and wallet against a local HTTP runtime with idempotency and domain isolation.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  localHttpRuntime: true,
  domains,
  status: 'not_evaluated',
  results: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  finish();
});

async function main() {
  assertFilesExist();
  const runtime = await startBackendRealDomainLocalServer();
  try {
    for (const domain of domains) {
      if (domain === 'messaging') await validateMessaging(runtime.origin);
      else if (domain === 'notifications') await validateNotifications(runtime.origin);
      else if (domain === 'wallet') await validateWallet(runtime.origin);
      else throw new Error(`Unsupported backend canary domain: ${domain}`);
    }
    validateDomainIsolation(runtime.calls);
    report.status = report.failures.length ? 'failed' : 'backend_domain_canary_local_runtime_validated';
  } finally {
    await runtime.close();
  }
  finish();
}

function assertFilesExist() {
  [
    'backend/shared/testing/backend-real-domain-local-server.js',
    'docs/MESSAGING-CANARY-RUNBOOK.md',
    'docs/NOTIFICATIONS-CANARY-RUNBOOK.md',
    'docs/WALLET-CANARY-RUNBOOK.md'
  ].forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required backend domain canary asset: ${file}`);
  });
  record('required_files.present');
}

async function validateMessaging(origin) {
  const conversations = await request(origin, 'GET', '/conversations', null, 'token-client');
  assert(Array.isArray(conversations.conversations), 'GET /conversations must return conversations array.');

  const conversation = await request(origin, 'GET', '/conversations/conv_1', null, 'token-client');
  assert(conversation.conversation && conversation.conversation.id === 'conv_1', 'GET /conversations/:id must return conversation.');

  const missingIdempotency = await request(origin, 'POST', '/conversations/conv_1/messages', { body: 'Sem chave' }, 'token-client', null, { expectOk: false });
  assertEqual(missingIdempotency.status, 400, 'Messaging mutation without idempotency key must fail.');
  assertEqual(missingIdempotency.body.code, 'DOKE_IDEMPOTENCY_REQUIRED', 'Messaging missing idempotency error code must be stable.');

  const first = await request(origin, 'POST', '/conversations/conv_1/messages', { body: 'Mensagem canary' }, 'token-client', 'msg-key-001');
  const replay = await request(origin, 'POST', '/conversations/conv_1/messages', { body: 'Mensagem canary' }, 'token-client', 'msg-key-001');
  assertEqual(first.message.id, replay.message.id, 'Messaging same idempotency key/payload must replay response.');

  const conflict = await request(origin, 'POST', '/conversations/conv_1/messages', { body: 'Payload diferente' }, 'token-client', 'msg-key-001', { expectOk: false });
  assertEqual(conflict.status, 409, 'Messaging same idempotency key with different payload must conflict.');
  assertEqual(conflict.body.code, 'DOKE_IDEMPOTENCY_CONFLICT', 'Messaging conflict code must be stable.');

  const read = await request(origin, 'POST', '/conversations/conv_1/read', { readAt: '2026-07-03T00:00:00.000Z' }, 'token-professional', 'msg-read-001');
  assertEqual(read.ok, true, 'Messaging read action must succeed with idempotency key.');
  record('messaging.local_runtime.validated');
}

async function validateNotifications(origin) {
  const notifications = await request(origin, 'GET', '/notifications', null, 'token-client');
  assert(Array.isArray(notifications.notifications), 'GET /notifications must return notifications array.');

  const createDenied = await request(origin, 'POST', '/notifications', { title: 'Denied' }, 'token-client', 'notif-create-denied', { expectOk: false });
  assertEqual(createDenied.status, 403, 'Client notification create must be denied.');

  const created = await request(origin, 'POST', '/notifications', { userId: 'user_client_1', type: 'system', title: 'Canary' }, 'token-admin', 'notif-create-001');
  assert(created.notification && created.notification.id, 'Admin notification create must return notification.');

  const read = await request(origin, 'POST', '/notifications/notif_1/read', { readAt: '2026-07-03T00:00:00.000Z' }, 'token-client', 'notif-read-001');
  assertEqual(read.notification.read, true, 'Notification read mutation must mark read.');

  const dismiss = await request(origin, 'POST', '/notifications/notif_1/dismiss', { dismissedAt: '2026-07-03T00:00:00.000Z' }, 'token-client', 'notif-dismiss-001');
  assertEqual(dismiss.notification.dismissed, true, 'Notification dismiss mutation must mark dismissed.');

  const readAll = await request(origin, 'POST', '/notifications/read-all', { readAt: '2026-07-03T00:00:00.000Z' }, 'token-client', 'notif-read-all-001');
  assertEqual(readAll.ok, true, 'Notification read-all mutation must succeed.');
  record('notifications.local_runtime.validated');
}

async function validateWallet(origin) {
  const wallet = await request(origin, 'GET', '/wallet', null, 'token-professional');
  assert(wallet.wallet && wallet.wallet.ownerId, 'GET /wallet must return wallet owner.');

  const transactions = await request(origin, 'GET', '/wallet/transactions', null, 'token-professional');
  assert(Array.isArray(transactions.transactions), 'GET /wallet/transactions must return array.');

  const withdrawal = await request(origin, 'POST', '/withdrawals', { amount: 100 }, 'token-professional', 'wallet-withdrawal-001');
  assert(withdrawal.withdrawal && withdrawal.withdrawal.status === 'pending', 'POST /withdrawals must create pending withdrawal.');

  const approveDenied = await request(origin, 'POST', '/withdrawals/withdrawal_1/approve', { approvedAt: '2026-07-03T00:00:00.000Z' }, 'token-professional', 'wallet-approve-denied', { expectOk: false });
  assertEqual(approveDenied.status, 403, 'Professional cannot approve withdrawal.');

  const approve = await request(origin, 'POST', '/withdrawals/withdrawal_1/approve', { approvedAt: '2026-07-03T00:00:00.000Z' }, 'token-admin', 'wallet-approve-001');
  assertEqual(approve.withdrawal.status, 'approved', 'Admin can approve withdrawal.');

  const dispute = await request(origin, 'POST', '/disputes', { orderId: 'order_api_1', reason: 'Canary' }, 'token-client', 'wallet-dispute-001');
  assert(dispute.dispute && dispute.dispute.id, 'POST /disputes must create dispute.');

  const refundDenied = await request(origin, 'POST', '/admin/disputes/dispute_1/refund', { amount: 100 }, 'token-client', 'wallet-refund-denied', { expectOk: false });
  assertEqual(refundDenied.status, 403, 'Client cannot refund dispute.');

  const refund = await request(origin, 'POST', '/admin/disputes/dispute_1/refund', { amount: 100 }, 'token-admin', 'wallet-refund-001');
  assertEqual(refund.dispute.status, 'refunded', 'Admin can refund dispute.');
  record('wallet.local_runtime.validated');
}

function validateDomainIsolation(calls) {
  const allowed = /^(\/auth|\/users|\/profiles|\/conversations|\/orders\/[^/]+\/conversation|\/notifications|\/wallet|\/withdrawals|\/disputes|\/receipts|\/admin\/disputes)(\/|$)/;
  const unexpected = calls.filter((call) => !allowed.test(call.path));
  assertEqual(unexpected.length, 0, `Unexpected canary calls must be zero; got ${unexpected.map((call) => call.path).join(', ')}`);
  const mutations = calls.filter((call) => call.method !== 'GET' && !call.path.startsWith('/auth'));
  const missingKey = mutations.filter((call) => !call.idempotencyKey && !/denied/.test(JSON.stringify(call.body || {})));
  assert(missingKey.length <= 1, 'At most one intentional missing-idempotency negative case is expected.');
  record('domain_isolation.no_unexpected_routes');
}

async function request(origin, method, requestPath, body, token, idempotencyKey, options = {}) {
  const headers = { authorization: `Bearer ${token || 'token-client'}` };
  if (body) headers['content-type'] = 'application/json';
  if (idempotencyKey) headers['x-idempotency-key'] = idempotencyKey;
  const response = await fetch(origin + requestPath, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const payload = await response.json();
  if (options.expectOk !== false && !response.ok) throw new Error(`${method} ${requestPath} failed: ${response.status} ${JSON.stringify(payload)}`);
  if (options.expectOk === false) return { status: response.status, body: payload };
  return payload;
}

function record(name) {
  report.results.push({ name, ok: true });
}

function assert(condition, message) {
  if (!condition) report.failures.push(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) report.failures.push(`${message} Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
}

function finish() {
  if (writeReport) {
    const outputPath = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  }
  if (report.failures.length) {
    console.error(`[${report.name}] failed`);
    report.failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }
  console.log(`[${report.name}] ${report.status}`);
}
