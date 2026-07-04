'use strict';

const fs = require('fs');
const path = require('path');
const { createProductBetaE2ELocalServer } = require('../backend/shared/testing/product-beta-e2e-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const selectedDomain = process.env.DOKE_PRODUCT_BETA_LOCAL_DOMAIN || '';
const reportPath = process.env.DOKE_PRODUCT_BETA_LOCAL_RUNTIME_REPORT_PATH || 'reports/generated/product-beta-local-runtime-report.json';

const requiredFiles = [
  'backend/shared/testing/product-beta-e2e-local-server.js',
  'scripts/validate-product-beta-local-runtime.js',
  'docs/MEDIA-UPLOADS-CANARY-RUNBOOK.md',
  'docs/MODERATION-CANARY-RUNBOOK.md',
  'docs/SEARCH-INDEXING-CANARY-RUNBOOK.md',
  'docs/PRICING-CANARY-RUNBOOK.md',
  'docs/PRODUCT-BETA-E2E-RUNBOOK.md',
  'package.json'
];

const report = {
  name: 'product-beta-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate media/uploads, moderation, search/indexing and pricing/boost contracts against a local HTTP runtime.',
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
  const server = createProductBetaE2ELocalServer();
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

    if (shouldRun('media')) await validateMedia(origin, tokens);
    if (shouldRun('moderation')) await validateModeration(origin, tokens);
    if (shouldRun('search')) await validateSearch(origin, tokens);
    if (shouldRun('pricing')) await validatePricing(origin, tokens);

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
  if (selectedDomain === 'media') return 'media_uploads_canary_local_runtime_validated';
  if (selectedDomain === 'moderation') return 'moderation_canary_local_runtime_validated';
  if (selectedDomain === 'search') return 'search_indexing_canary_local_runtime_validated';
  if (selectedDomain === 'pricing') return 'pricing_canary_local_runtime_validated';
  return 'product_beta_local_runtime_validated';
}

async function validateMedia(origin, tokens) {
  const unsupported = await post(origin, '/media/uploads', tokens.client, { filename: 'malware.exe', mimeType: 'application/x-msdownload' }, 'media-unsupported-001', [415]);
  assert(errorCode(unsupported) === 'DOKE_MEDIA_MIME_TYPE_UNSUPPORTED', 'Unsupported media mime type must be rejected.');
  const body = { filename: 'orcamento.png', mimeType: 'image/png', sizeBytes: 120000 };
  const key = 'media-upload-create-001';
  const created = await post(origin, '/media/uploads', tokens.client, body, key, [201]);
  const uploadId = created.upload && created.upload.id;
  assert(uploadId, 'Media upload creation must return upload.id.');
  const replay = await post(origin, '/media/uploads', tokens.client, body, key, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Media upload replay must be marked.');
  const conflict = await post(origin, '/media/uploads', tokens.client, { filename: 'outro.png', mimeType: 'image/png' }, key, [409]);
  assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Media payload drift must conflict.');
  const complete = await post(origin, `/media/uploads/${uploadId}/complete`, tokens.client, { checksum: 'local-checksum' }, 'media-upload-complete-001');
  assert(complete.upload && complete.upload.status === 'completed', 'Media upload must complete.');
  const attachment = await post(origin, '/attachments', tokens.client, { uploadId, targetType: 'publication', targetId: 'publication_seed_1' }, 'attachment-create-001', [201]);
  assert(attachment.attachment && attachment.attachment.status === 'attached', 'Attachment must be created from completed upload.');
  await get(origin, '/media/uploads', tokens.client);
  record('media.flow.validated');
}

async function validateModeration(origin, tokens) {
  const body = { targetType: 'publication', targetId: 'publication_seed_1', reason: 'spam' };
  const key = 'moderation-report-create-001';
  const created = await post(origin, '/reports', tokens.client, body, key, [201]);
  const reportId = created.report && created.report.id;
  assert(reportId, 'Report creation must return report.id.');
  const replay = await post(origin, '/reports', tokens.client, body, key, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Report replay must be marked.');
  const forbidden = await get(origin, '/moderation/reports', tokens.client, [403]);
  assert(errorCode(forbidden) === 'DOKE_ADMIN_REQUIRED', 'Moderation report list must be admin-only.');
  const adminList = await get(origin, '/moderation/reports', tokens.admin);
  assert(Array.isArray(adminList.reports) && adminList.reports.length >= 1, 'Admin must list moderation reports.');
  const resolved = await post(origin, `/moderation/reports/${reportId}/resolve`, tokens.admin, { resolution: 'removed' }, 'moderation-resolve-001');
  assert(resolved.report && resolved.report.status === 'resolved', 'Admin must resolve report.');
  const block = await post(origin, '/blocks', tokens.client, { blockedUserId: 'user_professional_product_beta' }, 'block-create-001', [201]);
  assert(block.block && block.block.status === 'active', 'Block must be created.');
  record('moderation.flow.validated');
}

async function validateSearch(origin, tokens) {
  const results = await get(origin, '/search?q=instala%C3%A7%C3%A3o&scope=services', tokens.client);
  assert(Array.isArray(results.items) && results.items.some((item) => item.type === 'service-listing'), 'Search must return service listing results.');
  const forbidden = await post(origin, '/search/index/rebuild', tokens.client, { scope: 'all' }, 'search-rebuild-forbidden-001', [403]);
  assert(errorCode(forbidden) === 'DOKE_SEARCH_INDEX_REBUILD_FORBIDDEN', 'Search index rebuild must be admin-only.');
  const rebuildBody = { scope: 'all', reason: 'local-validation' };
  const rebuildKey = 'search-rebuild-001';
  const rebuilt = await post(origin, '/search/index/rebuild', tokens.admin, rebuildBody, rebuildKey);
  assert(Number(rebuilt.indexedCount) >= 3, 'Search index rebuild must index existing seed content.');
  const replay = await post(origin, '/search/index/rebuild', tokens.admin, rebuildBody, rebuildKey);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Search rebuild replay must be marked.');
  record('search.flow.validated');
}

async function validatePricing(origin, tokens) {
  const plans = await get(origin, '/plans', tokens.client);
  assert(Array.isArray(plans.plans) && plans.plans.some((plan) => plan.id === 'plan_professional'), 'Plans must include professional plan.');
  const forbiddenSubscription = await post(origin, '/subscriptions', tokens.client, { planId: 'plan_professional' }, 'subscription-client-forbidden-001', [403]);
  assert(errorCode(forbiddenSubscription) === 'DOKE_SUBSCRIPTION_CREATE_FORBIDDEN', 'Client subscription creation for professional plan must be forbidden.');
  const subscription = await post(origin, '/subscriptions', tokens.professional, { planId: 'plan_professional' }, 'subscription-create-001', [201]);
  assert(subscription.subscription && subscription.subscription.status === 'active', 'Professional subscription must become active.');
  const serviceBoost = await post(origin, '/service-listings/service_listing_seed_1/boost', tokens.professional, { budgetCents: 1500 }, 'service-boost-001', [201]);
  assert(serviceBoost.boost && serviceBoost.boost.status === 'active', 'Service listing boost must become active.');
  const publicationBoost = await post(origin, '/publications/publication_seed_1/boost', tokens.professional, { budgetCents: 1200 }, 'publication-boost-001', [201]);
  assert(publicationBoost.boost && publicationBoost.boost.status === 'active', 'Publication boost must become active.');
  record('pricing.flow.validated');
}

function validateServerReport(serverReport) {
  const requiredPaths = [];
  if (shouldRun('media')) requiredPaths.push('POST /media/uploads', 'POST /media/uploads/:id/complete', 'POST /attachments');
  if (shouldRun('moderation')) requiredPaths.push('POST /reports', 'POST /blocks', 'GET /moderation/reports', 'POST /moderation/reports/:id/resolve');
  if (shouldRun('search')) requiredPaths.push('GET /search', 'POST /search/index/rebuild');
  if (shouldRun('pricing')) requiredPaths.push('GET /plans', 'POST /subscriptions', 'POST /service-listings/:id/boost', 'POST /publications/:id/boost');
  const hits = new Set((serverReport.calls || []).map((call) => `${call.method} ${call.path}`));
  requiredPaths.forEach((pathName) => assert(hits.has(pathName), `Expected local runtime call: ${pathName}`));
  (serverReport.calls || []).forEach((call) => {
    if (call.method !== 'GET' && call.path !== '/auth/login') assert(call.hasIdempotencyKey, `${call.method} ${call.path} must include idempotency key.`);
  });
  record('server_report.contracts.validated');
}

async function login(origin, role) {
  const payload = await post(origin, '/auth/login', '', { email: `${role}@doke.local`, password: 'Doke1234!' }, null, [200]);
  const token = payload.token || payload.session && payload.session.token;
  assert(token, `Login for ${role} must return token.`);
  report.endpointHits.push({ role, method: 'POST', path: '/auth/login' });
  return token;
}

async function get(origin, endpoint, token, expectedStatuses = [200]) { return request(origin, 'GET', endpoint, token, undefined, null, expectedStatuses); }
async function post(origin, endpoint, token, body, key, expectedStatuses = [200]) { return request(origin, 'POST', endpoint, token, body, key, expectedStatuses); }

async function request(origin, method, endpoint, token, body, key, expectedStatuses = [200]) {
  const headers = { accept: 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (key) headers['x-idempotency-key'] = key;
  const response = await fetch(`${origin}${endpoint}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json();
  report.endpointHits.push({ method, path: endpoint.split('?')[0], status: response.status });
  assert(expectedStatuses.includes(response.status), `${method} ${endpoint} returned ${response.status}; expected ${expectedStatuses.join(', ')}. Payload: ${JSON.stringify(payload)}`);
  return payload;
}

function errorCode(payload) { return payload && payload.error && payload.error.code; }
function record(name) { report.results.push({ name, status: 'passed' }); }
function assert(condition, message) { if (!condition) throw new Error(message); }
function fail(message) { report.status = 'failed'; report.failures.push(String(message)); finish(1); }
function finish(exitCode = 0) {
  if (writeReport) {
    const absolute = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(report, null, 2)}\n`);
  }
  console.log(JSON.stringify(report, null, 2));
  process.exit(exitCode || (report.failures.length ? 1 : 0));
}
