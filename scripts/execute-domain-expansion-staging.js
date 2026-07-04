'use strict';

const fs = require('fs');
const path = require('path');
const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const writeReport = args.has('--write-report');
const execute = args.has('--execute') || process.env.DOKE_DOMAIN_EXPANSION_STAGING_EXECUTE === '1';
const apiUrl = String(process.env.DOKE_DOMAIN_EXPANSION_STAGING_API_URL || '').replace(/\/+$/, '');
const environment = String(process.env.DOKE_ENVIRONMENT || '').toLowerCase();
const reportPath = process.env.DOKE_DOMAIN_EXPANSION_STAGING_REPORT_PATH || 'reports/generated/domain-expansion-staging-execution-report.json';

const requiredReports = [
  ['reports/generated/domain-expansion-readiness-gate-report.json', 'domain_expansion_ready_for_manual_contract_sprints'],
  ['reports/generated/domain-expansion-local-runtime-report.json', 'domain_expansion_local_runtime_validated'],
  ['reports/generated/backend-real-e2e-local-runtime-report.json', 'backend_real_e2e_local_runtime_validated'],
  ['reports/generated/backend-real-observability-gate-report.json', 'backend_real_observability_ready_for_manual_staging_rollout']
];
const plan = [
  'POST /auth/login', 'GET /auth/session', 'GET /users/me', 'GET /profiles/me',
  'GET /service-listings', 'POST /service-listings', 'PATCH /service-listings/:id', 'POST /service-listings/:id/publish',
  'GET /publications', 'POST /publications', 'PATCH /publications/:id', 'POST /publications/:id/publish',
  'GET /community/posts', 'POST /community/posts', 'POST /community/posts/:id/comments', 'POST /community/posts/:id/reactions'
];
const report = {
  name: 'domain-expansion-staging-execution',
  generatedAt: new Date().toISOString(),
  objective: 'Execute service listings, publications and community staging smoke only when upstream reports, flags and safe target markers are present.',
  mode: execute ? 'execute' : checkEnv ? 'check-env' : dryRun ? 'dry-run' : 'blocked-evaluation',
  performsExternalNetworkRequest: execute,
  performsExternalMutation: execute,
  apiUrl: apiUrl ? redact(apiUrl) : '',
  status: 'not_evaluated',
  plan,
  results: [],
  warnings: [],
  failures: []
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
    report.status = 'domain_expansion_staging_execution_dry_run_ready';
    record('dry_run.plan_rendered');
    return finish();
  }
  const envOk = evaluateEnvironment();
  const reportsOk = evaluateReports();
  if (checkEnv || !execute) {
    report.status = envOk && reportsOk ? 'domain_expansion_staging_ready_for_manual_execution' : 'blocked_until_domain_expansion_staging_prerequisites';
    return finish();
  }
  if (!envOk || !reportsOk) {
    report.status = 'blocked_until_domain_expansion_staging_prerequisites';
    return finish();
  }
  await executePlan();
  report.status = report.failures.length ? 'failed' : 'domain_expansion_staging_execution_validated';
  finish();
}

function assertStaticAssets() {
  [
    'docs/DOMAIN-EXPANSION-STAGING-RUNBOOK.md',
    'docs/DOMAIN-EXPANSION-E2E-RUNBOOK.md',
    'docs/SERVICE-LISTINGS-CANARY-RUNBOOK.md',
    'docs/PUBLICATIONS-CANARY-RUNBOOK.md',
    'docs/COMMUNITY-CANARY-RUNBOOK.md',
    'package.json'
  ].forEach((file) => { if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required file: ${file}`); });
  record('static_assets.present');
}

function evaluateEnvironment() {
  let ok = true;
  if (!['local', 'staging'].includes(environment)) { ok = false; report.warnings.push('DOKE_ENVIRONMENT must be local or staging.'); }
  if (!apiUrl) { ok = false; report.warnings.push('DOKE_DOMAIN_EXPANSION_STAGING_API_URL is required.'); }
  if (apiUrl && unsafeTarget(apiUrl)) { ok = false; report.failures.push('Refusing unsafe domain expansion staging target. URL must contain local/staging marker and must not look like production.'); report.status = 'blocked_unsafe_domain_expansion_staging_target'; }
  ['DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_NETWORK', 'DOKE_DOMAIN_EXPANSION_STAGING_ALLOW_MUTATIONS', 'DOKE_DOMAIN_EXPANSION_STAGING_EXECUTE'].forEach((name) => {
    if (process.env[name] !== '1') { ok = false; report.warnings.push(`${name}=1 is required for execution.`); }
  });
  if (process.env.DOKE_DOMAIN_EXPANSION_STAGING_CONFIRM !== 'execute-domain-expansion') {
    ok = false;
    report.warnings.push('DOKE_DOMAIN_EXPANSION_STAGING_CONFIRM=execute-domain-expansion is required.');
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
  await get('/auth/session', clientToken);
  await get('/users/me', clientToken);
  await get('/profiles/me', clientToken);

  await get('/service-listings', clientToken);
  const serviceListing = await post('/service-listings', professionalToken, { title: 'Staging service listing smoke', category: 'eletrica', priceCents: 1000 }, 'staging-service-listing-create-001', [200, 201]);
  const serviceListingId = readId(serviceListing, 'serviceListing') || 'unknown-service-listing';
  await patch(`/service-listings/${serviceListingId}`, professionalToken, { priceCents: 1200 }, 'staging-service-listing-patch-001');
  await post(`/service-listings/${serviceListingId}/publish`, professionalToken, { at: new Date().toISOString() }, 'staging-service-listing-publish-001');

  await get('/publications', clientToken);
  const publication = await post('/publications', professionalToken, { title: 'Staging publication smoke', body: 'Staging smoke publication.' }, 'staging-publication-create-001', [200, 201]);
  const publicationId = readId(publication, 'publication') || 'unknown-publication';
  await patch(`/publications/${publicationId}`, professionalToken, { body: 'Staging smoke publication updated.' }, 'staging-publication-patch-001');
  await post(`/publications/${publicationId}/publish`, professionalToken, { at: new Date().toISOString() }, 'staging-publication-publish-001');

  await get('/community/posts', clientToken);
  const postPayload = await post('/community/posts', clientToken, { title: 'Staging community smoke', body: 'Staging smoke community post.' }, 'staging-community-post-create-001', [200, 201]);
  const postId = readId(postPayload, 'post') || 'unknown-community-post';
  await post(`/community/posts/${postId}/comments`, professionalToken, { body: 'Staging smoke comment.' }, 'staging-community-comment-create-001', [200, 201]);
  await post(`/community/posts/${postId}/reactions`, professionalToken, { type: 'like' }, 'staging-community-reaction-create-001', [200, 201]);
  record('domain_expansion_staging_smoke.executed');
}

async function login(role) {
  const payload = await request('POST', '/auth/login', '', { email: `${role}@doke.local`, password: process.env[`DOKE_${role.toUpperCase()}_PASSWORD`] || 'Doke1234!' }, null, [200]);
  const token = payload.token || payload.accessToken || payload.access_token || payload.session && (payload.session.token || payload.session.accessToken || payload.session.access_token);
  if (!token) throw new Error(`Login for ${role} did not return token.`);
  return token;
}
async function get(endpoint, token) { return request('GET', endpoint, token, undefined, null, [200]); }
async function post(endpoint, token, body, key, expected = [200]) { return request('POST', endpoint, token, body, key, expected); }
async function patch(endpoint, token, body, key, expected = [200]) { return request('PATCH', endpoint, token, body, key, expected); }
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
function unsafeTarget(url) { const lower = String(url).toLowerCase(); return /(^|\.)doke\.com|production|prod|api\.doke/.test(lower) || !/(localhost|127\.0\.0\.1|local|staging|stage|stg|preview|sandbox)/.test(lower); }
function redact(url) { return String(url).replace(/:\/\/([^/@]+@)?/, '://').replace(/:[0-9]+$/, ':<port>'); }
function shape(pathName) { return pathName.replace(/^\/service-listings\/[^/]+\/publish$/, '/service-listings/:id/publish').replace(/^\/service-listings\/[^/]+$/, '/service-listings/:id').replace(/^\/publications\/[^/]+\/publish$/, '/publications/:id/publish').replace(/^\/publications\/[^/]+$/, '/publications/:id').replace(/^\/community\/posts\/[^/]+\/(comments|reactions)$/, '/community/posts/:id/$1'); }
function record(name) { report.results.push({ name, ok: true }); }
function finish() {
  if (writeReport) {
    const output = path.join(root, reportPath);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  }
  if (report.failures.length && report.status === 'failed') { console.error(`[${report.name}] failed`); report.failures.forEach((failure) => console.error(`- ${failure}`)); process.exit(1); }
  console.log(`[${report.name}] ${report.status}`);
}
