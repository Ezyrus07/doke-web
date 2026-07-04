'use strict';

const fs = require('fs');
const path = require('path');
const { createBackendRealE2ELocalServer } = require('../backend/shared/testing/backend-real-e2e-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_E2E_LOCAL_REPORT_PATH || 'reports/generated/backend-real-e2e-local-runtime-report.json';
const requiredFiles = [
  'backend/shared/testing/backend-real-e2e-local-server.js',
  'scripts/validate-backend-real-e2e-local-runtime.js',
  'docs/BACKEND-REAL-E2E-RUNBOOK.md',
  'docs/BACKEND-REAL-COMPLETE-READINESS-RUNBOOK.md',
  'docs/VALIDATION.md',
  'package.json'
];

const report = {
  name: 'backend-real-e2e-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate a complete local HTTP E2E across Auth, Identity, Orders, Messaging, Notifications and Wallet before real staging execution.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  localHttpRuntime: true,
  status: 'not_evaluated',
  results: [],
  endpointHits: [],
  failures: [],
  serverReport: null
};

main().catch((error) => fail(error.stack || error.message || String(error)));

async function main() {
  requiredFiles.forEach((file) => assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`));
  const server = createBackendRealE2ELocalServer();
  try {
    const { origin } = await server.start();
    record('local_server.started');
    const clientToken = await login(origin, 'client');
    const professionalToken = await login(origin, 'professional');
    const adminToken = await login(origin, 'admin');

    await get(origin, '/auth/session', clientToken);
    await get(origin, '/users/me', clientToken);
    await get(origin, '/profiles/me', clientToken);
    record('auth_identity.validated');

    const orderBody = { title: 'E2E backend real order', amountCents: 25000 };
    const createKey = 'e2e-order-create-001';
    const created = await post(origin, '/orders', clientToken, orderBody, createKey, [201]);
    const orderId = created.order && created.order.id;
    assert(orderId, 'Order creation must return order.id.');
    const replay = await post(origin, '/orders', clientToken, orderBody, createKey, [201]);
    assert(replay.idempotency && replay.idempotency.replay === true, 'Order creation replay must be marked as replay.');
    const conflict = await post(origin, '/orders', clientToken, { title: 'Different', amountCents: 30000 }, createKey, [409]);
    assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Order payload drift must return DOKE_IDEMPOTENCY_CONFLICT.');
    await post(origin, `/orders/${orderId}/accept`, professionalToken, { note: 'accepted' }, 'e2e-order-accept-001');
    await post(origin, `/orders/${orderId}/quote`, professionalToken, { amountCents: 25000 }, 'e2e-order-quote-001');
    await post(origin, `/orders/${orderId}/charge`, professionalToken, { amountCents: 25000 }, 'e2e-order-charge-001');
    await post(origin, `/orders/${orderId}/start`, professionalToken, { at: '2026-07-03T00:00:00.000Z' }, 'e2e-order-start-001');
    await post(origin, `/orders/${orderId}/complete`, professionalToken, { at: '2026-07-03T00:00:00.000Z' }, 'e2e-order-complete-001');
    record('orders.write_flow.validated');

    const conversation = await post(origin, `/orders/${orderId}/conversation`, clientToken, { source: 'e2e' }, 'e2e-conversation-create-001', [201]);
    const conversationId = conversation.conversation && conversation.conversation.id;
    assert(conversationId, 'Conversation creation must return conversation.id.');
    const message = await post(origin, `/conversations/${conversationId}/messages`, clientToken, { body: 'Mensagem E2E' }, 'e2e-message-create-001', [201]);
    assert(message.message && message.message.id, 'Message creation must return message.id.');
    await post(origin, `/conversations/${conversationId}/read`, professionalToken, { at: '2026-07-03T00:00:00.000Z' }, 'e2e-conversation-read-001');
    record('messaging.flow.validated');

    const notification = await post(origin, '/notifications', adminToken, { userId: 'user_client_e2e', type: 'system', title: 'E2E notification' }, 'e2e-notification-create-001', [201]);
    assert(notification.notification && notification.notification.id, 'Notification creation must return notification.id.');
    await post(origin, `/notifications/${notification.notification.id}/read`, clientToken, { at: '2026-07-03T00:00:00.000Z' }, 'e2e-notification-read-001');
    await post(origin, '/notifications/read-all', clientToken, { at: '2026-07-03T00:00:00.000Z' }, 'e2e-notification-read-all-001');
    record('notifications.flow.validated');

    await get(origin, '/wallet', professionalToken);
    await get(origin, '/wallet/transactions', professionalToken);
    const withdrawal = await post(origin, '/withdrawals', professionalToken, { amountCents: 5000 }, 'e2e-withdrawal-create-001', [201]);
    assert(withdrawal.withdrawal && withdrawal.withdrawal.status === 'pending', 'Withdrawal must be pending.');
    const receipts = await get(origin, '/receipts', professionalToken);
    assert(Array.isArray(receipts.receipts), 'Receipts must return an array.');
    record('wallet.flow.validated');

    report.serverReport = server.getReport();
    validateServerReport(report.serverReport);
  } finally {
    await server.stop();
  }
  report.status = report.failures.length ? 'failed' : 'backend_real_e2e_local_runtime_validated';
  finish();
}

async function login(origin, role) {
  const payload = await post(origin, '/auth/login', '', { email: `${role}@doke.local`, password: 'Doke1234!' }, null, [200]);
  const token = payload.token || payload.session && payload.session.token;
  assert(token, `Login for ${role} must return token.`);
  report.endpointHits.push({ role, method: 'POST', path: '/auth/login' });
  return token;
}

async function get(origin, endpoint, token, expectedStatuses = [200]) {
  return request(origin, 'GET', endpoint, token, undefined, null, expectedStatuses);
}

async function post(origin, endpoint, token, body, key, expectedStatuses = [200]) {
  return request(origin, 'POST', endpoint, token, body, key, expectedStatuses);
}

async function request(origin, method, endpoint, token, body, key, expectedStatuses) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers['x-idempotency-key'] = key;
  report.endpointHits.push({ method, path: shape(endpoint), hasIdempotencyKey: Boolean(key) });
  const response = await fetch(origin + endpoint, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!expectedStatuses.includes(response.status)) throw new Error(`${method} ${endpoint} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

function validateServerReport(serverReport) {
  const paths = new Set((serverReport.calls || []).map((call) => `${call.method} ${call.path}`));
  [
    'POST /auth/login', 'GET /auth/session', 'GET /users/me', 'GET /profiles/me',
    'POST /orders', 'POST /orders/:id/accept', 'POST /orders/:id/quote', 'POST /orders/:id/charge', 'POST /orders/:id/start', 'POST /orders/:id/complete',
    'POST /orders/:id/conversation', 'POST /conversations/:id/messages', 'POST /conversations/:id/read',
    'POST /notifications', 'POST /notifications/:id/read', 'POST /notifications/read-all',
    'GET /wallet', 'GET /wallet/transactions', 'POST /withdrawals', 'GET /receipts'
  ].forEach((signature) => assert(paths.has(signature), `E2E must hit ${signature}.`));
  const mutatingCalls = (serverReport.calls || []).filter((call) => call.method !== 'GET' && call.path !== '/auth/login');
  const withoutKey = mutatingCalls.filter((call) => !call.hasIdempotencyKey);
  assert(withoutKey.length === 0, `All E2E mutations must include idempotency key. Missing: ${withoutKey.map((call) => `${call.method} ${call.path}`).join(', ')}`);
  record('e2e.idempotency_coverage.validated');
}

function shape(pathName) {
  return pathName
    .replace(/^\/orders\/[^/]+\/conversation$/, '/orders/:id/conversation')
    .replace(/^\/orders\/[^/]+\/(accept|decline|quote|charge|start|complete|status)$/, '/orders/:id/$1')
    .replace(/^\/orders\/[^/]+$/, '/orders/:id')
    .replace(/^\/conversations\/[^/]+\/(messages|read)$/, '/conversations/:id/$1')
    .replace(/^\/conversations\/[^/]+$/, '/conversations/:id')
    .replace(/^\/notifications\/[^/]+\/read$/, '/notifications/:id/read');
}
function errorCode(payload) { return payload && (payload.code || payload.error && payload.error.code); }
function record(name) { report.results.push({ name, ok: true }); }
function assert(condition, message) { if (!condition) report.failures.push(message); }
function fail(message) { report.failures.push(message); report.status = 'failed'; finish(); process.exit(1); }
function finish() { if (writeReport) { const output = path.join(root, reportPath); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } if (report.failures.length) { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); } console.log(`[${report.name}] ${report.status}`); }
