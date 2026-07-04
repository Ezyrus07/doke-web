#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { createOrdersWriteCanaryLocalServer } = require('../backend/shared/testing/orders-write-canary-local-server');
const { STAGING_E2E_DEFAULT_USERS } = require('../backend/shared/testing/staging-e2e-scenarios');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_ORDERS_WRITE_CANARY_LOCAL_REPORT_PATH || 'reports/generated/orders-write-canary-local-runtime-report.json';

const REQUIRED_FILES = Object.freeze([
  'backend/shared/testing/orders-write-canary-local-server.js',
  'scripts/validate-orders-write-canary-local-runtime.js',
  'scripts/audit-orders-write-canary-local-runtime.js',
  'scripts/validate-orders-write-canary-planning-gate.js',
  'scripts/audit-orders-write-canary-planning-gate.js',
  'docs/ORDERS-WRITE-CANARY-RUNBOOK.md',
  'docs/VALIDATION.md',
  'docs/BACKEND-INTEGRATION-PLAN.md',
  'docs/ACTIVE-CONTRACTS-INDEX.md',
  'docs/DATA-READY-CONTRACTS.md',
  'backend/README.md',
  'package.json'
]);

const EXPECTED_MUTATION_ENDPOINTS = Object.freeze([
  'POST /orders',
  'POST /orders/:id/accept',
  'POST /orders/:id/decline',
  'POST /orders/:id/quote',
  'POST /orders/:id/charge',
  'POST /orders/:id/start',
  'POST /orders/:id/complete',
  'POST /orders/:id/status'
]);

const FORBIDDEN_DOMAIN_PATTERN = /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

const report = {
  name: 'orders-write-canary-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate an orders-only local write harness with idempotency replay/conflict checks before any staging write activation.',
  writeActivation: false,
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-write-canary-local-runtime',
    enableNetworkRequests: true
  },
  expectedMutationEndpoints: EXPECTED_MUTATION_ENDPOINTS.slice(),
  requiredFiles: REQUIRED_FILES.slice(),
  endpointHits: [],
  results: [],
  warnings: [],
  failures: [],
  serverReport: null,
  status: 'not_evaluated',
  nextAllowedStep: null
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  report.status = 'failed';
  maybeWriteReport();
  printReport();
  process.exit(1);
});

async function main() {
  assertRequiredFiles();
  assertPackageScripts();
  assertNoFrontendActivation();

  const server = createOrdersWriteCanaryLocalServer();
  let started = null;
  try {
    started = await server.start();
    record('local_server.started', 'passed', redactBaseUrl(started.baseUrl));
    await runSmoke(started.baseUrl);
    report.serverReport = server.getReport();
    assertServerReport(report.serverReport);
  } finally {
    await server.stop();
  }

  if (!report.failures.length) {
    report.status = 'orders_write_canary_local_runtime_validated';
    report.nextAllowedStep = 'Keep frontend write activation disabled. Next gate may prepare manual staging write canary only after upstream real reports exist.';
  }

  maybeWriteReport();
  printReport();
  if (report.failures.length) process.exit(1);
}

async function runSmoke(baseUrl) {
  const clientToken = await login(baseUrl, 'client');
  const professionalToken = await login(baseUrl, 'professional');

  await request(baseUrl, 'GET', '/auth/session', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/users/me', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/profiles/me', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/orders', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/orders/order-write-seeded-1', { token: professionalToken, role: 'professional', expectedStatuses: [200] });
  record('readiness.auth_identity_orders_read', 'passed');

  await request(baseUrl, 'POST', '/orders', {
    token: clientToken,
    role: 'client',
    body: createOrderBody('missing-key'),
    expectedStatuses: [409]
  });
  record('idempotency.create_missing_key_rejected', 'passed');

  const createKey = key('create-order');
  const createBody = createOrderBody('primary');
  const created = await request(baseUrl, 'POST', '/orders', {
    token: clientToken,
    role: 'client',
    idempotencyKey: createKey,
    body: createBody,
    expectedStatuses: [201]
  });
  const orderId = created.order && created.order.id;
  if (!orderId) throw new Error('POST /orders did not return an order id.');
  record('orders.create.idempotent_claim', 'passed', orderId);

  const replayedCreate = await request(baseUrl, 'POST', '/orders', {
    token: clientToken,
    role: 'client',
    idempotencyKey: createKey,
    body: createBody,
    expectedStatuses: [201]
  });
  if (!replayedCreate.idempotency || replayedCreate.idempotency.replay !== true) throw new Error('POST /orders replay did not report idempotency.replay=true.');
  if (!replayedCreate.order || replayedCreate.order.id !== orderId) throw new Error('POST /orders replay returned a different order id.');
  record('orders.create.same_payload_replay', 'passed', orderId);

  await assertConflict(baseUrl, 'POST', '/orders', {
    token: clientToken,
    role: 'client',
    idempotencyKey: createKey,
    body: createOrderBody('payload-drift')
  }, 'orders.create.payload_drift_conflict');

  await request(baseUrl, 'POST', `/orders/${orderId}/accept`, {
    token: clientToken,
    role: 'client',
    idempotencyKey: key('client-accept-denied'),
    body: { note: 'client cannot accept' },
    expectedStatuses: [403]
  });
  record('orders.accept.client_denied_by_role', 'passed');

  await request(baseUrl, 'POST', `/orders/${orderId}/accept`, {
    token: professionalToken,
    role: 'professional',
    body: { note: 'missing key should fail' },
    expectedStatuses: [409]
  });
  record('idempotency.action_missing_key_rejected', 'passed');

  await runIdempotentAction(baseUrl, professionalToken, 'accept', orderId, { note: 'accepted by local harness' });
  await runIdempotentAction(baseUrl, professionalToken, 'quote', orderId, { amountCents: 25900, currency: 'BRL', description: 'Orçamento local harness.' }, { amountCents: 35900, currency: 'BRL', description: 'Payload drift.' });
  await runIdempotentAction(baseUrl, professionalToken, 'charge', orderId, { amountCents: 25900, currency: 'BRL' }, { amountCents: 30900, currency: 'BRL' });
  await runIdempotentAction(baseUrl, professionalToken, 'start', orderId, { source: 'local-runtime' });
  await runIdempotentAction(baseUrl, professionalToken, 'status', orderId, { status: 'reviewing' }, { status: 'payload_drift' });
  await runIdempotentAction(baseUrl, professionalToken, 'complete', orderId, { source: 'local-runtime' });
  await runIdempotentAction(baseUrl, professionalToken, 'decline', orderId, { reason: 'negative branch exercised' });

  record('orders.write_actions.all_expected_mutations_exercised', 'passed');
}

async function runIdempotentAction(baseUrl, token, action, orderId, body, driftBody) {
  const endpoint = `/orders/${orderId}/${action}`;
  const actionKey = key(`action-${action}`);
  const first = await request(baseUrl, 'POST', endpoint, { token, role: 'professional', idempotencyKey: actionKey, body, expectedStatuses: [200] });
  if (!first.order || !first.order.id) throw new Error(`${endpoint} did not return an order.`);
  const replay = await request(baseUrl, 'POST', endpoint, { token, role: 'professional', idempotencyKey: actionKey, body, expectedStatuses: [200] });
  if (!replay.idempotency || replay.idempotency.replay !== true) throw new Error(`${endpoint} replay did not report idempotency.replay=true.`);
  await assertConflict(baseUrl, 'POST', endpoint, { token, role: 'professional', idempotencyKey: actionKey, body: driftBody || Object.assign({}, body, { drift: true }) }, `orders.${action}.payload_drift_conflict`);
  record(`orders.${action}.same_payload_replay`, 'passed');
}

async function login(baseUrl, role) {
  const credentials = STAGING_E2E_DEFAULT_USERS[role];
  const payload = await request(baseUrl, 'POST', '/auth/login', { role, body: { login: credentials.email, email: credentials.email, password: credentials.password }, expectedStatuses: [200] });
  const session = payload.session || {};
  const token = session.token || session.accessToken || session.access_token || payload.token || payload.accessToken || payload.access_token;
  if (!token) throw new Error(`Login for ${role} did not return a token.`);
  record(`auth.login.${role}`, 'passed');
  return token;
}

async function assertConflict(baseUrl, method, endpoint, options, name) {
  const payload = await request(baseUrl, method, endpoint, Object.assign({}, options, { expectedStatuses: [409] }));
  const code = payload.error && payload.error.code || payload.code;
  if (code !== 'DOKE_IDEMPOTENCY_CONFLICT') throw new Error(`${name} expected DOKE_IDEMPOTENCY_CONFLICT, got ${code || 'unknown'}.`);
  record(name, 'passed');
}

async function request(baseUrl, method, endpoint, options = {}) {
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey;
  report.endpointHits.push({ method, path: shapePath(endpoint), role: options.role || '', hasIdempotencyKey: Boolean(options.idempotencyKey) });
  const response = await fetch(`${baseUrl}${endpoint}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const payload = await response.json().catch(() => ({}));
  if (!(options.expectedStatuses || [200]).includes(response.status)) {
    const message = payload.error && payload.error.message || payload.message || response.statusText;
    throw new Error(`${method} ${endpoint} returned ${response.status}: ${message}`);
  }
  return payload;
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  const parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-local-runtime': 'node scripts/audit-orders-write-canary-local-runtime.js',
    'validate:orders-write-canary:local-runtime': 'node scripts/validate-orders-write-canary-local-runtime.js',
    'validate:orders-write-canary:local-runtime:report': 'node scripts/validate-orders-write-canary-local-runtime.js --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });
  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function assertNoFrontendActivation() {
  if (report.writeActivation !== false) report.failures.push('Local write harness must keep writeActivation=false.');
  if (report.expectedFrontendProviders.dataProvider !== 'mock') report.failures.push('Local write harness must preserve dataProvider=mock.');
  record('frontend_activation.disabled', 'passed', 'writeActivation=false; dataProvider=mock');
}

function assertServerReport(serverReport) {
  if (serverReport.unexpectedRequests.length) report.failures.push(`Unexpected server requests: ${JSON.stringify(serverReport.unexpectedRequests)}`);
  if (serverReport.forbiddenRequests.length) report.failures.push(`Forbidden server requests: ${JSON.stringify(serverReport.forbiddenRequests)}`);
  report.endpointHits.forEach((hit) => {
    if (FORBIDDEN_DOMAIN_PATTERN.test(hit.path)) report.failures.push(`Forbidden domain hit: ${hit.method} ${hit.path}`);
  });
  const hitSignatures = new Set(report.endpointHits.map((hit) => `${hit.method} ${hit.path}`));
  EXPECTED_MUTATION_ENDPOINTS.forEach((signature) => {
    if (!hitSignatures.has(signature)) report.failures.push(`Expected mutation endpoint was not exercised: ${signature}`);
  });
  const events = serverReport.idempotencyEvents || [];
  if (!events.some((entry) => entry.type === 'missing_key')) report.failures.push('Idempotency missing-key rejection was not exercised.');
  if (!events.some((entry) => entry.type === 'replay')) report.failures.push('Idempotency replay was not exercised.');
  if (!events.some((entry) => entry.type === 'conflict')) report.failures.push('Idempotency conflict was not exercised.');
  if (!events.some((entry) => entry.type === 'claimed')) report.failures.push('Idempotency claim was not exercised.');
  if (!report.failures.length) record('server_report.idempotency_and_scope', 'passed');
}

function createOrderBody(seed) { return { title: `Pedido ${seed}`, description: `Pedido gerado pelo orders write local harness ${seed}.`, amountCents: 12900 }; }
function key(seed) { return `local-orders-write-${seed}`; }
function shapePath(value) { return String(value).replace(/^\/orders\/[^/]+(\/|$)/, '/orders/:id$1'); }
function redactBaseUrl(value) { const url = new URL(value); return `${url.protocol}//${url.hostname}:<port>`; }
function maybeWriteReport() { if (!writeReport) return; const target = path.join(root, reportPath); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`); }
function printReport() { console.log(JSON.stringify({ name: report.name, status: report.status, writeActivation: report.writeActivation, expectedFrontendProviders: report.expectedFrontendProviders, results: report.results, warnings: report.warnings, failures: report.failures, nextAllowedStep: report.nextAllowedStep }, null, 2)); }
function record(name, status, detail) { report.results.push({ name, status, detail: detail || '' }); }
