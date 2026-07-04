'use strict';

const fs = require('fs');
const path = require('path');
const { createBetaLaunchE2ELocalServer } = require('../backend/shared/testing/beta-launch-e2e-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const selectedDomain = process.env.DOKE_BETA_LAUNCH_LOCAL_DOMAIN || '';
const reportPath = process.env.DOKE_BETA_LAUNCH_LOCAL_RUNTIME_REPORT_PATH || 'reports/generated/beta-launch-local-runtime-report.json';

const requiredFiles = [
  'backend/shared/testing/beta-launch-e2e-local-server.js',
  'scripts/validate-beta-launch-local-runtime.js',
  'docs/PAYMENTS-ESCROW-CANARY-RUNBOOK.md',
  'docs/KYC-CANARY-RUNBOOK.md',
  'docs/SUPPORT-ADMIN-CANARY-RUNBOOK.md',
  'docs/SECURITY-ABUSE-CANARY-RUNBOOK.md',
  'docs/BETA-LAUNCH-E2E-RUNBOOK.md',
  'package.json'
];

const report = {
  name: 'beta-launch-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate beta launch domains: payments/escrow, KYC, support/admin and security/abuse contracts against a local HTTP runtime.',
  performsExternalNetworkRequest: false,
  performsExternalMutation: false,
  localHttpRuntime: true,
  selectedDomain: selectedDomain || 'all',
  status: 'not_evaluated',
  results: [],
  endpointHits: [],
  failures: [],
  serverReport: null
};

main().catch((error) => fail(error.stack || error.message || String(error)));

async function main() {
  requiredFiles.forEach((file) => assert(fs.existsSync(path.join(root, file)), `Missing required file: ${file}`));
  const server = createBetaLaunchE2ELocalServer();
  try {
    const { origin } = await server.start();
    record('local_server.started');
    const tokens = {
      client: await login(origin, 'client'),
      professional: await login(origin, 'professional'),
      admin: await login(origin, 'admin')
    };
    await get(origin, '/auth/session', tokens.client);
    await get(origin, '/users/me', tokens.client);
    await get(origin, '/profiles/me', tokens.client);
    record('auth_identity.prerequisite.validated');

    if (shouldRun('payments')) await validatePayments(origin, tokens);
    if (shouldRun('kyc')) await validateKyc(origin, tokens);
    if (shouldRun('support')) await validateSupport(origin, tokens);
    if (shouldRun('security')) await validateSecurity(origin, tokens);

    report.serverReport = server.getReport();
    validateServerReport(report.serverReport);
  } finally {
    await server.stop();
  }
  report.status = report.failures.length ? 'failed' : statusForSelectedDomain();
  finish();
}

function shouldRun(domain) {
  return !selectedDomain || selectedDomain === 'all' || selectedDomain === domain;
}
function statusForSelectedDomain() {
  if (selectedDomain === 'payments') return 'payments_escrow_canary_local_runtime_validated';
  if (selectedDomain === 'kyc') return 'kyc_canary_local_runtime_validated';
  if (selectedDomain === 'support') return 'support_admin_canary_local_runtime_validated';
  if (selectedDomain === 'security') return 'security_abuse_canary_local_runtime_validated';
  return 'beta_launch_local_runtime_validated';
}

async function validatePayments(origin, tokens) {
  const methods = await get(origin, '/payments/methods', tokens.client);
  assert(Array.isArray(methods.methods) && methods.methods.some((item) => item.id === 'pix'), 'Payment methods must include Pix.');
  const sessionBody = { orderId: 'order_seed_paid_1', amountCents: 15000, provider: 'mock_gateway' };
  const sessionKey = 'checkout-session-001';
  const session = await post(origin, '/checkout/sessions', tokens.client, sessionBody, sessionKey, [201]);
  const paymentId = session.payment && session.payment.id;
  assert(paymentId, 'Checkout session must return payment.id.');
  const replay = await post(origin, '/checkout/sessions', tokens.client, sessionBody, sessionKey, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Checkout replay must be marked.');
  const conflict = await post(origin, '/checkout/sessions', tokens.client, { ...sessionBody, amountCents: 16000 }, sessionKey, [409]);
  assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Checkout payload drift must conflict.');
  const confirmed = await post(origin, `/payments/${paymentId}/confirm`, tokens.client, { providerReference: 'pay_ref_001' }, 'payment-confirm-001');
  assert(confirmed.payment && confirmed.payment.status === 'confirmed', 'Payment must confirm.');
  const forbiddenHold = await post(origin, '/escrow/holds', tokens.client, { paymentId }, 'escrow-forbidden-001', [403]);
  assert(errorCode(forbiddenHold) === 'DOKE_ESCROW_CREATE_FORBIDDEN', 'Escrow hold creation must be admin-only.');
  const hold = await post(origin, '/escrow/holds', tokens.admin, { paymentId }, 'escrow-hold-001', [201]);
  const holdId = hold.escrowHold && hold.escrowHold.id;
  assert(holdId, 'Escrow hold must return id.');
  const released = await post(origin, `/escrow/${holdId}/release`, tokens.admin, { reason: 'job_complete' }, 'escrow-release-001');
  assert(released.escrowHold && released.escrowHold.status === 'released', 'Escrow must release.');
  record('payments_escrow.flow.validated');
}

async function validateKyc(origin, tokens) {
  const forbidden = await get(origin, '/professionals/verification', tokens.client, [403]);
  assert(errorCode(forbidden) === 'DOKE_PROFESSIONAL_REQUIRED', 'Client cannot read professional verification.');
  const verification = await get(origin, '/professionals/verification', tokens.professional);
  assert(verification.verification && verification.verification.status, 'Professional verification must be readable.');
  await patch(origin, '/professionals/verification', tokens.professional, { status: 'draft', businessType: 'individual' }, 'kyc-verification-update-001');
  const docBody = { documentType: 'identity', uploadId: 'upload_identity_seed' };
  const doc = await post(origin, '/kyc/documents', tokens.professional, docBody, 'kyc-doc-create-001', [201]);
  const docId = doc.document && doc.document.id;
  assert(docId, 'KYC document must return id.');
  const submitted = await post(origin, `/kyc/documents/${docId}/submit`, tokens.professional, { attest: true }, 'kyc-doc-submit-001');
  assert(submitted.document && submitted.document.status === 'submitted', 'KYC document must submit.');
  const forbiddenReviews = await get(origin, '/admin/kyc/reviews', tokens.professional, [403]);
  assert(errorCode(forbiddenReviews) === 'DOKE_ADMIN_REQUIRED', 'KYC reviews must be admin-only.');
  const reviews = await get(origin, '/admin/kyc/reviews', tokens.admin);
  assert(Array.isArray(reviews.reviews) && reviews.reviews.some((item) => item.id === docId), 'Admin must list submitted KYC reviews.');
  const approved = await post(origin, `/admin/kyc/reviews/${docId}/approve`, tokens.admin, { note: 'ok' }, 'kyc-approve-001');
  assert(approved.document && approved.document.status === 'approved', 'Admin must approve KYC document.');
  record('kyc.flow.validated');
}

async function validateSupport(origin, tokens) {
  const ticketBody = { subject: 'Problema no pagamento', priority: 'high' };
  const ticket = await post(origin, '/support/tickets', tokens.client, ticketBody, 'support-ticket-create-001', [201]);
  const ticketId = ticket.ticket && ticket.ticket.id;
  assert(ticketId, 'Support ticket must return id.');
  const message = await post(origin, `/support/tickets/${ticketId}/messages`, tokens.client, { body: 'Preciso de ajuda.' }, 'support-message-create-001', [201]);
  assert(message.message && message.message.ticketId === ticketId, 'Support message must attach to ticket.');
  const forbidden = await get(origin, '/admin/support/tickets', tokens.client, [403]);
  assert(errorCode(forbidden) === 'DOKE_ADMIN_REQUIRED', 'Admin support list must be admin-only.');
  const adminList = await get(origin, '/admin/support/tickets', tokens.admin);
  assert(Array.isArray(adminList.tickets) && adminList.tickets.some((item) => item.id === ticketId), 'Admin must list support tickets.');
  const assigned = await post(origin, `/admin/support/tickets/${ticketId}/assign`, tokens.admin, { assigneeId: 'support_agent_1' }, 'support-assign-001');
  assert(assigned.ticket && assigned.ticket.status === 'assigned', 'Admin must assign ticket.');
  const resolved = await post(origin, `/admin/support/tickets/${ticketId}/resolve`, tokens.admin, { resolution: 'answered' }, 'support-resolve-001');
  assert(resolved.ticket && resolved.ticket.status === 'resolved', 'Admin must resolve ticket.');
  record('support.flow.validated');
}

async function validateSecurity(origin, tokens) {
  const bucket = { bucket: 'post_publication', ipAddress: '127.0.0.1' };
  await post(origin, '/security/rate-limit/check', tokens.client, bucket, 'rate-limit-check-001');
  await post(origin, '/security/rate-limit/check', tokens.client, bucket, 'rate-limit-check-002');
  await post(origin, '/security/rate-limit/check', tokens.client, bucket, 'rate-limit-check-003');
  const limited = await post(origin, '/security/rate-limit/check', tokens.client, bucket, 'rate-limit-check-004');
  assert(limited.decision === 'limited', 'Rate limit must eventually limit repeated actions.');
  const abuse = await post(origin, '/security/abuse-events', tokens.client, { type: 'spam_signal', severity: 'medium' }, 'abuse-event-create-001', [201]);
  assert(abuse.abuseEvent && abuse.abuseEvent.status === 'open', 'Abuse event must be created.');
  const forbidden = await get(origin, '/admin/security/abuse-events', tokens.professional, [403]);
  assert(errorCode(forbidden) === 'DOKE_ADMIN_REQUIRED', 'Abuse event admin list must be admin-only.');
  const adminList = await get(origin, '/admin/security/abuse-events', tokens.admin);
  assert(Array.isArray(adminList.abuseEvents) && adminList.abuseEvents.length >= 1, 'Admin must list abuse events.');
  const risk = await post(origin, '/security/sessions/risk-score', tokens.client, { ipAddress: '127.0.0.1' }, 'session-risk-001');
  assert(risk.decision === 'allow', 'Local session risk score should allow.');
  record('security.flow.validated');
}

function validateServerReport(serverReport) {
  const requiredPaths = [];
  if (shouldRun('payments')) requiredPaths.push('GET /payments/methods', 'POST /checkout/sessions', 'POST /payments/:id/confirm', 'POST /escrow/holds', 'POST /escrow/:id/release');
  if (shouldRun('kyc')) requiredPaths.push('GET /professionals/verification', 'PATCH /professionals/verification', 'POST /kyc/documents', 'POST /kyc/documents/:id/submit', 'GET /admin/kyc/reviews', 'POST /admin/kyc/reviews/:id/approve');
  if (shouldRun('support')) requiredPaths.push('POST /support/tickets', 'POST /support/tickets/:id/messages', 'GET /admin/support/tickets', 'POST /admin/support/tickets/:id/assign', 'POST /admin/support/tickets/:id/resolve');
  if (shouldRun('security')) requiredPaths.push('POST /security/rate-limit/check', 'POST /security/abuse-events', 'GET /admin/security/abuse-events', 'POST /security/sessions/risk-score');
  const hits = new Set((serverReport.calls || []).map((call) => `${call.method} ${call.path}`));
  requiredPaths.forEach((pathName) => assert(hits.has(pathName), `Expected local runtime call: ${pathName}`));
  (serverReport.calls || []).forEach((call) => {
    if (call.method !== 'GET' && call.path !== '/auth/login') assert(call.hasIdempotencyKey, `${call.method} ${call.path} must include idempotency key.`);
  });
  report.endpointHits = Array.from(hits).sort();
  record('server_report.endpoint_contract.validated');
}

async function login(origin, role) {
  const result = await request(origin, '/auth/login', { method: 'POST', body: { role }, idempotencyKey: `login-${role}-001` });
  assert(result.token, `Login for ${role} must return token.`);
  return result.token;
}
async function get(origin, pathName, token, expected = [200]) { return request(origin, pathName, { method: 'GET', token, expected }); }
async function post(origin, pathName, token, body, idempotencyKey, expected = [200]) { return request(origin, pathName, { method: 'POST', token, body, idempotencyKey, expected }); }
async function patch(origin, pathName, token, body, idempotencyKey, expected = [200]) { return request(origin, pathName, { method: 'PATCH', token, body, idempotencyKey, expected }); }
async function request(origin, pathName, options = {}) {
  const headers = { accept: 'application/json' };
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body) headers['content-type'] = 'application/json';
  if (options.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey;
  const response = await fetch(`${origin}${pathName}`, { method: options.method || 'GET', headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const json = await response.json();
  const expected = options.expected || [200];
  assert(expected.includes(response.status), `${options.method || 'GET'} ${pathName} returned ${response.status}; expected ${expected.join(', ')}. Body: ${JSON.stringify(json)}`);
  return json;
}
function errorCode(payload) { return payload && payload.error && payload.error.code; }
function record(name) { report.results.push({ name, status: 'passed' }); }
function assert(condition, message) { if (!condition) report.failures.push(message); }
function fail(message) { report.status = 'failed'; report.failures.push(String(message)); finish(1); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode);
}
