'use strict';

const fs = require('fs');
const path = require('path');
const { STAGING_E2E_DEFAULT_USERS } = require('../backend/shared/testing/staging-e2e-scenarios');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute');
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_BACKEND_REAL_MULTIDOMAIN_STAGING_REPORT_PATH || 'reports/generated/backend-real-multidomain-staging-execution-report.json';
const apiUrl = String(process.env.DOKE_BACKEND_REAL_STAGING_API_URL || '').replace(/\/+$/, '');
const environment = String(process.env.DOKE_ENVIRONMENT || '').toLowerCase();

const requiredReports = [
  ['reports/generated/auth-identity-canary-promotion-gate-report.json', 'auth_identity_canary_ready_for_manual_staging_rollout'],
  ['reports/generated/orders-readonly-canary-promotion-gate-report.json', 'orders_readonly_canary_ready_for_manual_write_canary_planning'],
  ['reports/generated/orders-write-canary-staging-execution-report.json', 'orders_write_canary_staging_execution_validated'],
  ['reports/generated/backend-real-complete-readiness-gate-report.json', 'backend_real_complete_ready_for_manual_domain_expansion']
];
const plan = [
  'Require DOKE_ENVIRONMENT=staging for real execution',
  'POST /auth/login', 'GET /auth/session', 'GET /users/me', 'GET /profiles/me',
  'GET /orders', 'POST /orders', 'POST /orders/:id/accept', 'POST /orders/:id/charge', 'POST /orders/:id/complete',
  'GET /conversations', 'POST /orders/:id/conversation', 'POST /conversations/:id/messages', 'POST /conversations/:id/read',
  'GET /notifications', 'POST /notifications', 'POST /notifications/:id/read',
  'GET /wallet', 'GET /wallet/transactions', 'POST /withdrawals (optional: requires available balance)', 'GET /receipts'
];
const report = {
  name: 'backend-real-multidomain-staging-execution',
  generatedAt: new Date().toISOString(),
  objective: 'Execute a real multi-domain staging smoke only when all upstream reports, flags and safe target markers are present.',
  mode: execute ? 'execute' : checkEnv ? 'check-env' : dryRun ? 'dry-run' : 'blocked-evaluation',
  performsExternalNetworkRequest: execute,
  performsExternalMutation: execute,
  status: 'not_evaluated',
  apiUrl: apiUrl ? redact(apiUrl) : '',
  plan,
  results: [],
  failures: [],
  warnings: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  report.status = 'failed';
  finish();
  process.exit(1);
});

async function main() {
  assertStaticAssets();
  if (dryRun) {
    report.status = 'backend_real_multidomain_staging_execution_dry_run_ready';
    record('dry_run.requires_staging_environment_for_execute');
    record('dry_run.plan_rendered');
    return finish();
  }

  const envOk = evaluateEnvironment();
  const reportsOk = evaluateReports();
  if (checkEnv || !execute) {
    report.status = envOk && reportsOk ? 'backend_real_multidomain_staging_ready_for_manual_execution' : 'blocked_until_backend_real_multidomain_staging_prerequisites';
    return finish();
  }

  if (!envOk || !reportsOk) {
    report.status = 'blocked_until_backend_real_multidomain_staging_prerequisites';
    return finish();
  }

  await executePlan();
  report.status = report.failures.length ? 'failed' : 'backend_real_multidomain_staging_execution_validated';
  finish();
}

function assertStaticAssets() {
  ['docs/BACKEND-REAL-MULTIDOMAIN-STAGING-RUNBOOK.md', 'docs/BACKEND-REAL-E2E-RUNBOOK.md', 'package.json'].forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`);
  });
  record('static_assets.present');
}

function evaluateEnvironment() {
  let ok = true;
  if (environment !== 'staging') { ok = false; report.warnings.push('DOKE_ENVIRONMENT must be exactly staging for Backend Real multidomain execution.'); }
  if (!apiUrl) { ok = false; report.warnings.push('DOKE_BACKEND_REAL_STAGING_API_URL is required.'); }
  if (apiUrl && unsafeTarget(apiUrl)) { ok = false; report.failures.push('Refusing unsafe backend real staging target. URL must contain local/staging marker and must not look like production.'); report.status = 'blocked_unsafe_backend_real_staging_target'; }
  ['DOKE_BACKEND_REAL_STAGING_ALLOW_NETWORK', 'DOKE_BACKEND_REAL_STAGING_ALLOW_MUTATIONS', 'DOKE_BACKEND_REAL_STAGING_EXECUTE'].forEach((name) => {
    if (process.env[name] !== '1') { ok = false; report.warnings.push(`${name}=1 is required for execution.`); }
  });
  if (process.env.DOKE_BACKEND_REAL_STAGING_CONFIRM !== 'execute-backend-real-multidomain') {
    ok = false;
    report.warnings.push('DOKE_BACKEND_REAL_STAGING_CONFIRM=execute-backend-real-multidomain is required.');
  }
  record(ok ? 'environment.ready' : 'environment.blocked');
  return ok;
}

function evaluateReports() {
  let ok = true;
  requiredReports.forEach(([file, expectedStatus]) => {
    const full = path.join(root, file);
    if (!fs.existsSync(full)) { ok = false; report.warnings.push(`Missing upstream report: ${file}`); return; }
    try {
      const payload = JSON.parse(fs.readFileSync(full, 'utf8'));
      if (payload.status !== expectedStatus) { ok = false; report.warnings.push(`${file} must have status ${expectedStatus}, got ${payload.status || 'missing'}.`); }
    } catch (error) {
      ok = false;
      report.warnings.push(`Could not parse upstream report ${file}: ${error.message}`);
    }
  });
  record(ok ? 'upstream_reports.ready' : 'upstream_reports.blocked');
  return ok;
}

async function executePlan() {
  const clientToken = await login('client');
  const professionalToken = await login('professional');
  const adminToken = await login('admin');

  await get('/auth/session', clientToken);
  const clientIdentity = await get('/users/me', clientToken);
  await get('/profiles/me', clientToken);
  await get('/orders', clientToken);

  const professionalIdentity = await get('/users/me', professionalToken);
  const professional = readUser(professionalIdentity, 'professional');
  const client = readUser(clientIdentity, 'client');

  const order = await post('/orders', clientToken, {
    title: 'Backend real multidomain staging smoke',
    amountCents: 1000,
    professionalId: professional.id
  }, 'staging-order-create-001', [200, 201]);
  const orderId = readId(order, 'order') || 'unknown-order';
  await post(`/orders/${orderId}/accept`, professionalToken, { note: 'accepted' }, 'staging-order-accept-001');
  await post(`/orders/${orderId}/charge`, professionalToken, { amountCents: 1000 }, 'staging-order-charge-001');
  await post(`/orders/${orderId}/complete`, professionalToken, { at: new Date().toISOString() }, 'staging-order-complete-001');
  await get('/conversations', clientToken);
  const conversation = await post(`/orders/${orderId}/conversation`, clientToken, { source: 'staging-smoke' }, 'staging-conversation-create-001', [200, 201]);
  const conversationId = readId(conversation, 'conversation') || 'unknown-conversation';
  await post(`/conversations/${conversationId}/messages`, clientToken, { body: 'Staging smoke message' }, 'staging-message-create-001', [200, 201]);
  await post(`/conversations/${conversationId}/read`, professionalToken, { at: new Date().toISOString() }, 'staging-conversation-read-001');
  await get('/notifications', clientToken);
  const notification = await post('/notifications', adminToken, { userId: client.id, type: 'system', title: 'Staging smoke notification' }, 'staging-notification-create-001', [200, 201, 403]);
  const notificationId = readId(notification, 'notification');
  if (notificationId) await post(`/notifications/${notificationId}/read`, clientToken, { at: new Date().toISOString() }, 'staging-notification-read-001');
  const wallet = await get('/wallet', professionalToken);
  await get('/wallet/transactions', professionalToken);
  await maybeRequestWithdrawal(professionalToken, wallet, 1000);
  await get('/receipts', professionalToken);
  record('multidomain_staging_smoke.executed');
}

async function maybeRequestWithdrawal(professionalToken, walletPayload, amountCents) {
  const availableCents = readAvailableWalletCents(walletPayload);
  if (availableCents < amountCents) {
    report.results.push({
      name: 'POST /withdrawals',
      ok: true,
      skipped: true,
      reason: 'insufficient_available_balance_for_optional_withdrawal',
      availableCents,
      requiredCents: amountCents
    });
    return null;
  }
  return post('/withdrawals', professionalToken, { amountCents }, 'staging-withdrawal-create-001', [200, 201]);
}

async function login(role) {
  const credentials = credentialsForRole(role);
  const payload = await request('POST', '/auth/login', '', { email: credentials.email, login: credentials.email, password: credentials.password }, null, [200, 201]);
  const token = payload.token || payload.accessToken || payload.access_token || payload.session && (payload.session.token || payload.session.accessToken || payload.session.access_token);
  if (!token) throw new Error(`Login for ${role} did not return token.`);
  return token;
}

function credentialsForRole(role) {
  const fallback = STAGING_E2E_DEFAULT_USERS[role];
  if (!fallback) throw new Error(`Unsupported staging canary role: ${role}`);
  const upper = role.toUpperCase();
  return {
    email: process.env[`DOKE_STAGING_${upper}_EMAIL`] || fallback.email,
    password: process.env[`DOKE_STAGING_${upper}_PASSWORD`] || process.env[`DOKE_${upper}_PASSWORD`] || fallback.password
  };
}

function readUser(payload, role) {
  const user = payload && (payload.user || payload.currentUser || payload.profile && payload.profile.user);
  if (!user || !user.id) throw new Error(`/users/me for ${role} did not return user.id.`);
  return user;
}
async function get(endpoint, token) { return request('GET', endpoint, token, undefined, null, [200]); }
async function post(endpoint, token, body, key, expected = [200]) { return request('POST', endpoint, token, body, key, expected); }
async function request(method, endpoint, token, body, key, expectedStatuses) {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (key) headers['x-idempotency-key'] = key;
  report.results.push({ name: `${method} ${shape(endpoint)}`, ok: true, plannedExternalCall: true, hasIdempotencyKey: Boolean(key) });
  const response = await fetch(`${apiUrl}${endpoint}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!expectedStatuses.includes(response.status)) throw new Error(`${method} ${endpoint} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}
function readId(payload, key) { return payload && payload[key] && payload[key].id || payload && payload.id; }
function readAvailableWalletCents(payload) {
  const wallet = payload && (payload.wallet || payload.data && payload.data.wallet || payload);
  const candidates = [
    wallet && wallet.balance_cents,
    wallet && wallet.available_balance_cents,
    wallet && wallet.availableBalanceCents,
    wallet && wallet.balances && wallet.balances.availableCents
  ];
  for (const candidate of candidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return Math.max(0, Math.trunc(value));
  }
  const amountCandidates = [
    wallet && wallet.availableBalance,
    wallet && wallet.available,
    wallet && wallet.balances && wallet.balances.available
  ];
  for (const candidate of amountCandidates) {
    const value = Number(candidate);
    if (Number.isFinite(value)) return Math.max(0, Math.round(value * 100));
  }
  return 0;
}
function unsafeTarget(url) { const lower = String(url).toLowerCase(); return /(^|\.)doke\.com|production|prod|api\.doke/.test(lower) || !/(localhost|127\.0\.0\.1|local|staging|stage|stg|preview|sandbox)/.test(lower); }
function redact(url) { return String(url).replace(/:\/\/([^/@]+@)?/, '://').replace(/:[0-9]+$/, ':<port>'); }
function shape(pathName) { return pathName.replace(/^\/orders\/[^/]+\/conversation$/, '/orders/:id/conversation').replace(/^\/orders\/[^/]+\/(accept|charge|complete)$/, '/orders/:id/$1').replace(/^\/conversations\/[^/]+\/(messages|read)$/, '/conversations/:id/$1').replace(/^\/notifications\/[^/]+\/read$/, '/notifications/:id/read'); }
function record(name) { report.results.push({ name, ok: true }); }
function finish() { if (writeReport) { const output = path.join(root, reportPath); fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); } if (report.failures.length && report.status === 'failed') { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); } console.log(`[${report.name}] ${report.status}`); }
