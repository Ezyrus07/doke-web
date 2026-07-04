'use strict';

const fs = require('fs');
const path = require('path');
const { createDomainExpansionE2ELocalServer } = require('../backend/shared/testing/domain-expansion-e2e-local-server');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const writeReport = args.has('--write-report');
const reportPath = process.env.DOKE_DOMAIN_EXPANSION_LOCAL_RUNTIME_REPORT_PATH || 'reports/generated/domain-expansion-local-runtime-report.json';
const selectedDomain = process.env.DOKE_DOMAIN_EXPANSION_LOCAL_DOMAIN || '';
const requiredFiles = [
  'backend/shared/testing/domain-expansion-e2e-local-server.js',
  'scripts/validate-domain-expansion-local-runtime.js',
  'docs/SERVICE-LISTINGS-CANARY-RUNBOOK.md',
  'docs/PUBLICATIONS-CANARY-RUNBOOK.md',
  'docs/COMMUNITY-CANARY-RUNBOOK.md',
  'docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md',
  'package.json'
];

const report = {
  name: 'domain-expansion-local-runtime',
  generatedAt: new Date().toISOString(),
  objective: 'Validate service listings, publications and community backend contracts against a local HTTP runtime before real staging execution.',
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
  const server = createDomainExpansionE2ELocalServer();
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

    if (shouldRun('service-listings')) await validateServiceListings(origin, tokens);
    if (shouldRun('publications')) await validatePublications(origin, tokens);
    if (shouldRun('community')) await validateCommunity(origin, tokens);

    report.serverReport = server.getReport();
    validateServerReport(report.serverReport);
  } finally {
    await server.stop();
  }
  report.status = report.failures.length ? 'failed' : statusForSelectedDomain();
  finish();
}

function shouldRun(domain) {
  return !selectedDomain || selectedDomain === domain || selectedDomain === 'all';
}

function statusForSelectedDomain() {
  if (selectedDomain === 'service-listings') return 'service_listings_canary_local_runtime_validated';
  if (selectedDomain === 'publications') return 'publications_canary_local_runtime_validated';
  if (selectedDomain === 'community') return 'community_canary_local_runtime_validated';
  return 'domain_expansion_local_runtime_validated';
}

async function validateServiceListings(origin, tokens) {
  const forbidden = await post(origin, '/service-listings', tokens.client, { title: 'Cliente não pode anunciar serviço' }, 'service-client-forbidden-001', [403]);
  assert(errorCode(forbidden) === 'DOKE_SERVICE_LISTING_CREATE_FORBIDDEN', 'Client service listing creation must be forbidden.');
  const createBody = { title: 'Instalação elétrica local', category: 'eletrica', priceCents: 18000 };
  const createKey = 'service-listing-create-001';
  const created = await post(origin, '/service-listings', tokens.professional, createBody, createKey, [201]);
  const serviceListingId = created.serviceListing && created.serviceListing.id;
  assert(serviceListingId, 'Service listing creation must return serviceListing.id.');
  const replay = await post(origin, '/service-listings', tokens.professional, createBody, createKey, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Service listing replay must be marked as replay.');
  const conflict = await post(origin, '/service-listings', tokens.professional, { title: 'Outro serviço' }, createKey, [409]);
  assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Service listing payload drift must return DOKE_IDEMPOTENCY_CONFLICT.');
  await patch(origin, `/service-listings/${serviceListingId}`, tokens.professional, { priceCents: 22000 }, 'service-listing-patch-001');
  const published = await post(origin, `/service-listings/${serviceListingId}/publish`, tokens.professional, { at: now() }, 'service-listing-publish-001');
  assert(published.serviceListing && published.serviceListing.status === 'published', 'Service listing must be published.');
  await get(origin, '/service-listings', tokens.client);
  record('service_listings.flow.validated');
}

async function validatePublications(origin, tokens) {
  const createBody = { title: 'Antes e depois local', body: 'Conteúdo de publicação local.' };
  const createKey = 'publication-create-001';
  const created = await post(origin, '/publications', tokens.professional, createBody, createKey, [201]);
  const publicationId = created.publication && created.publication.id;
  assert(publicationId, 'Publication creation must return publication.id.');
  const replay = await post(origin, '/publications', tokens.professional, createBody, createKey, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Publication replay must be marked as replay.');
  const conflict = await post(origin, '/publications', tokens.professional, { title: 'Outro conteúdo' }, createKey, [409]);
  assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Publication payload drift must return DOKE_IDEMPOTENCY_CONFLICT.');
  await patch(origin, `/publications/${publicationId}`, tokens.professional, { body: 'Conteúdo atualizado.' }, 'publication-patch-001');
  const published = await post(origin, `/publications/${publicationId}/publish`, tokens.professional, { at: now() }, 'publication-publish-001');
  assert(published.publication && published.publication.status === 'published', 'Publication must be published.');
  const clientCreated = await post(origin, '/publications', tokens.client, { title: 'Dúvida do cliente', body: 'Pergunta pública.' }, 'publication-client-create-001', [201]);
  assert(clientCreated.publication && clientCreated.publication.authorId === 'user_client_domain', 'Client publication creation must be supported.');
  await get(origin, '/publications', tokens.client);
  record('publications.flow.validated');
}

async function validateCommunity(origin, tokens) {
  const createBody = { title: 'Discussão comunidade local', body: 'Tema da comunidade.' };
  const createKey = 'community-post-create-001';
  const created = await post(origin, '/community/posts', tokens.client, createBody, createKey, [201]);
  const postId = created.post && created.post.id;
  assert(postId, 'Community post creation must return post.id.');
  const replay = await post(origin, '/community/posts', tokens.client, createBody, createKey, [201]);
  assert(replay.idempotency && replay.idempotency.replay === true, 'Community post replay must be marked as replay.');
  const conflict = await post(origin, '/community/posts', tokens.client, { title: 'Outro tópico' }, createKey, [409]);
  assert(errorCode(conflict) === 'DOKE_IDEMPOTENCY_CONFLICT', 'Community post payload drift must return DOKE_IDEMPOTENCY_CONFLICT.');
  const comment = await post(origin, `/community/posts/${postId}/comments`, tokens.professional, { body: 'Comentário profissional.' }, 'community-comment-create-001', [201]);
  assert(comment.comment && comment.comment.id, 'Community comment must return comment.id.');
  const reaction = await post(origin, `/community/posts/${postId}/reactions`, tokens.professional, { type: 'like' }, 'community-reaction-create-001', [201]);
  assert(reaction.reaction && reaction.reaction.id, 'Community reaction must return reaction.id.');
  await get(origin, '/community/posts', tokens.client);
  record('community.flow.validated');
}

function validateServerReport(serverReport) {
  const requiredPaths = shouldRun('service-listings') ? ['POST /service-listings', 'PATCH /service-listings/:id', 'POST /service-listings/:id/publish'] : [];
  if (shouldRun('publications')) requiredPaths.push('POST /publications', 'PATCH /publications/:id', 'POST /publications/:id/publish');
  if (shouldRun('community')) requiredPaths.push('POST /community/posts', 'POST /community/posts/:id/comments', 'POST /community/posts/:id/reactions');
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
async function patch(origin, endpoint, token, body, key, expectedStatuses = [200]) { return request(origin, 'PATCH', endpoint, token, body, key, expectedStatuses); }

async function request(origin, method, endpoint, token, body, key, expectedStatuses) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (key) headers['x-idempotency-key'] = key;
  const response = await fetch(`${origin}${endpoint}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  report.endpointHits.push({ method, path: shape(endpoint), status: response.status, hasIdempotencyKey: Boolean(key) });
  if (!expectedStatuses.includes(response.status)) fail(`${method} ${endpoint} returned ${response.status}: ${JSON.stringify(payload)}`);
  return payload;
}

function shape(pathName) {
  return pathName
    .replace(/^\/service-listings\/[^/]+\/publish$/, '/service-listings/:id/publish')
    .replace(/^\/service-listings\/[^/]+$/, '/service-listings/:id')
    .replace(/^\/publications\/[^/]+\/publish$/, '/publications/:id/publish')
    .replace(/^\/publications\/[^/]+$/, '/publications/:id')
    .replace(/^\/community\/posts\/[^/]+\/(comments|reactions)$/, '/community/posts/:id/$1');
}
function errorCode(payload) { return payload && payload.error && payload.error.code; }
function now() { return '2026-07-03T00:00:00.000Z'; }
function record(name) { report.results.push({ name, ok: true }); }
function assert(condition, message) { if (!condition) fail(message); }
function fail(message) { report.failures.push(message); report.status = 'failed'; finish(); process.exit(1); }
function finish() {
  if (writeReport) {
    const output = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  if (report.status === 'failed') console.error(`[${report.name}] failed`);
  else console.log(`[${report.name}] ${report.status}`);
}
