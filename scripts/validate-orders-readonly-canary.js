#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  STAGING_E2E_DEFAULT_USERS
} = require('../backend/shared/testing/staging-e2e-scenarios');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const writeReport = args.has('--write-report');

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  apiUrl: 'DOKE_ORDERS_READONLY_CANARY_API_URL',
  fallbackApiUrl: 'DOKE_STAGING_API_URL',
  allowNetwork: 'DOKE_ORDERS_READONLY_CANARY_ALLOW_NETWORK',
  marker: 'DOKE_ORDERS_READONLY_CANARY_MARKER',
  roles: 'DOKE_ORDERS_READONLY_CANARY_ROLES',
  reportPath: 'DOKE_ORDERS_READONLY_CANARY_REPORT_PATH',
  authPromotionReportPath: 'DOKE_AUTH_IDENTITY_CANARY_PROMOTION_REPORT_PATH',
  bypassAuthGate: 'DOKE_ORDERS_READONLY_CANARY_BYPASS_AUTH_GATE'
});

const DEFAULT_REPORT_PATH = 'reports/generated/orders-readonly-canary-report.json';
const DEFAULT_AUTH_PROMOTION_REPORT_PATH = 'reports/generated/auth-identity-canary-promotion-gate-report.json';

const REQUIRED_FILES = Object.freeze([
  'scripts/validate-auth-identity-canary.js',
  'scripts/validate-auth-identity-canary-promotion-gate.js',
  'scripts/validate-orders-readonly-canary.js',
  'assets/js/services/orders-service.js',
  'assets/js/services/repository-boundary.js',
  'assets/js/services/api-repository-provider.js',
  'assets/js/repositories/orders-repository.js',
  'docs/ORDERS-READONLY-CANARY-RUNBOOK.md',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md'
]);

const AUTH_ENDPOINTS = Object.freeze([
  { name: 'login', method: 'POST', path: '/auth/login' },
  { name: 'session', method: 'GET', path: '/auth/session' },
  { name: 'currentUser', method: 'GET', path: '/users/me' },
  { name: 'currentProfile', method: 'GET', path: '/profiles/me' }
]);

const ORDERS_ENDPOINTS = Object.freeze([
  { name: 'ordersList', method: 'GET', path: '/orders' },
  { name: 'orderDetail', method: 'GET', path: '/orders/:id' }
]);

const FORBIDDEN_ORDER_WRITE_PATTERN = /^(POST|PATCH|PUT|DELETE)\s+\/orders(\/|$)/;
const FORBIDDEN_DOMAIN_PATTERN = /\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});

async function main() {
  const report = createReport();
  assertRequiredFiles(report);

  if (dryRun) {
    printPlan(report);
    maybeWriteReport(report);
    failIfNeeded(report);
    return;
  }

  validateEnvironment(report);
  assertAuthIdentityPromotionGate(report);
  if (report.failures.length) {
    printFailures(report);
    maybeWriteReport(report);
    process.exit(1);
  }

  for (const role of resolveRoles()) {
    await runRoleSmoke(report, role);
    if (report.failures.length) break;
  }

  assertNoForbiddenEndpoints(report);
  maybeWriteReport(report);
  failIfNeeded(report);
  console.log('Orders read-only canary validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}

function createReport() {
  return {
    name: 'orders-readonly-canary',
    generatedAt: new Date().toISOString(),
    dryRun,
    objective: 'Validate only read-only orders API traffic after auth/identity canary promotion gate approval.',
    environment: describeEnvironment(),
    requiredFiles: REQUIRED_FILES.slice(),
    expectedFrontendProviders: {
      authProvider: 'api',
      dataProvider: 'mock',
      ordersProvider: 'api-readonly',
      enableNetworkRequests: true
    },
    authEndpoints: AUTH_ENDPOINTS.map((entry) => Object.assign({}, entry)),
    ordersEndpoints: ORDERS_ENDPOINTS.map((entry) => Object.assign({}, entry)),
    roles: resolveRoles(),
    endpointHits: [],
    results: [],
    failures: [],
    warnings: []
  };
}

function describeEnvironment() {
  const apiUrl = resolveApiUrl();
  return {
    dokeEnvironment: process.env[ENV.environment] || '',
    apiUrlSource: process.env[ENV.apiUrl] ? ENV.apiUrl : process.env[ENV.fallbackApiUrl] ? ENV.fallbackApiUrl : null,
    hasApiUrl: Boolean(apiUrl),
    apiTarget: apiUrl ? describeSafeTarget(apiUrl) : null,
    hasNetworkConsent: process.env[ENV.allowNetwork] === '1',
    marker: process.env[ENV.marker] || '',
    roles: process.env[ENV.roles] || 'client,professional',
    authPromotionReportPath: process.env[ENV.authPromotionReportPath] || DEFAULT_AUTH_PROMOTION_REPORT_PATH,
    bypassAuthGate: process.env[ENV.bypassAuthGate] || ''
  };
}

function assertRequiredFiles(report) {
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required orders read-only canary asset: ${file}`);
  }
  if (!report.failures.length) record(report, 'required_files.present', 'passed');
}

function validateEnvironment(report) {
  const environment = process.env[ENV.environment];
  const apiUrl = resolveApiUrl();

  if (!['local', 'staging'].includes(environment)) {
    report.failures.push(`${ENV.environment} must be exactly "local" or "staging".`);
  }
  if (!apiUrl) {
    report.failures.push(`Missing ${ENV.apiUrl} or ${ENV.fallbackApiUrl}.`);
  }
  if (process.env[ENV.allowNetwork] !== '1') {
    report.failures.push(`${ENV.allowNetwork}=1 is required before orders read-only canary smoke can call the API.`);
  }
  if (typeof fetch !== 'function') {
    report.failures.push('This validation requires a Node runtime with global fetch support.');
  }
  assertSafeTarget(report, apiUrl, environment);
}

function assertAuthIdentityPromotionGate(report) {
  if (isLocalGateBypassAllowed()) {
    report.warnings.push('Auth/identity promotion gate bypassed only for local orders read-only canary runtime.');
    record(report, 'auth_identity_promotion_gate.local_runtime_bypass', 'passed');
    return;
  }

  const reportPath = path.join(root, process.env[ENV.authPromotionReportPath] || DEFAULT_AUTH_PROMOTION_REPORT_PATH);
  if (!fs.existsSync(reportPath)) {
    report.failures.push(`Missing auth/identity promotion gate report: ${path.relative(root, reportPath)}.`);
    return;
  }

  let promotionReport;
  try {
    promotionReport = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (error) {
    report.failures.push(`Auth/identity promotion gate report is invalid JSON: ${error.message}`);
    return;
  }

  if (promotionReport.name !== 'auth-identity-canary-promotion-gate') {
    report.failures.push('Auth/identity promotion report must be generated by validate-auth-identity-canary-promotion-gate.js.');
  }
  if (promotionReport.promotionStatus !== 'auth_identity_canary_ready_for_manual_staging_rollout') {
    report.failures.push(`Auth/identity promotion gate is not ready: ${promotionReport.promotionStatus || 'unknown'}.`);
  }
  if (Array.isArray(promotionReport.failures) && promotionReport.failures.length) {
    report.failures.push(`Auth/identity promotion report has failures: ${promotionReport.failures.join(' | ')}`);
  }
  if (!report.failures.length) record(report, 'auth_identity_promotion_gate.ready', 'passed', path.relative(root, reportPath));
}

async function runRoleSmoke(report, role) {
  const credentials = credentialsForRole(role);
  const loginPayload = await request(report, 'POST', '/auth/login', {
    role,
    body: {
      login: credentials.email,
      email: credentials.email,
      password: credentials.password,
      remember: true
    },
    expectedStatuses: [200, 201]
  });
  const session = loginPayload.session || loginPayload.authSession || loginPayload.data && loginPayload.data.session || {};
  const token = session.token || session.accessToken || session.access_token || loginPayload.accessToken || loginPayload.access_token || loginPayload.token;
  if (!token) throw new Error(`Orders read-only login for ${role} did not return an access token.`);
  record(report, `auth.login.${role}`, 'passed');

  const sessionPayload = await request(report, 'GET', '/auth/session', { role, token, expectedStatuses: [200] });
  const userPayload = await request(report, 'GET', '/users/me', { role, token, expectedStatuses: [200] });
  const profilePayload = await request(report, 'GET', '/profiles/me', { role, token, expectedStatuses: [200] });

  const user = userPayload.user || userPayload.currentUser || sessionPayload.user || sessionPayload.session && sessionPayload.session.user;
  const profile = profilePayload.profile || profilePayload.currentProfile || sessionPayload.profile || sessionPayload.session && sessionPayload.session.profile;
  if (!user || !user.id) throw new Error(`Orders read-only /users/me for ${role} did not return a user id.`);
  if (!profile || !profile.id) throw new Error(`Orders read-only /profiles/me for ${role} did not return a profile id.`);
  record(report, `identity.session.${role}`, 'passed');
  record(report, `identity.currentUser.${role}`, 'passed', user.id);
  record(report, `identity.currentProfile.${role}`, 'passed', profile.id);

  const ordersPayload = await request(report, 'GET', '/orders', { role, token, expectedStatuses: [200] });
  const orders = normalizeOrdersPayload(ordersPayload);
  record(report, `orders.list.${role}`, 'passed', `${orders.length} item(s)`);

  if (!orders.length) {
    report.warnings.push(`Orders read-only canary list for ${role} returned no items; /orders/:id was not exercised for this role.`);
    record(report, `orders.get.${role}`, 'skipped', 'No list item available for detail smoke.');
    return;
  }

  const firstOrder = orders.find((order) => order && order.id) || null;
  if (!firstOrder) throw new Error(`Orders read-only list for ${role} did not include an item with id.`);
  const detailPayload = await request(report, 'GET', `/orders/${encodeURIComponent(firstOrder.id)}`, { role, token, expectedStatuses: [200] });
  const detailOrder = detailPayload.order || detailPayload.item || detailPayload.data && (detailPayload.data.order || detailPayload.data.item) || detailPayload;
  if (!detailOrder || !detailOrder.id) throw new Error(`Orders read-only /orders/:id for ${role} did not return an order id.`);
  record(report, `orders.get.${role}`, 'passed', detailOrder.id);
}

async function request(report, method, endpointPath, options = {}) {
  const url = `${resolveApiUrl()}${endpointPath}`;
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const init = {
    method,
    headers,
    credentials: 'include'
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  report.endpointHits.push({ method, path: shapePath(endpointPath), role: options.role || '' });
  const response = await fetch(url, init);
  const contentType = response.headers && response.headers.get && response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json().catch(() => ({})) : {};
  const expectedStatuses = options.expectedStatuses || [200];
  if (!expectedStatuses.includes(response.status)) {
    const detail = payload.message || payload.error && payload.error.message || payload.error || response.statusText || 'Unexpected status';
    throw new Error(`${method} ${endpointPath} returned ${response.status}: ${detail}`);
  }
  return payload || {};
}

function normalizeOrdersPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload.orders)) return payload.orders;
  if (payload.data && Array.isArray(payload.data.items)) return payload.data.items;
  if (payload.data && Array.isArray(payload.data.orders)) return payload.data.orders;
  return [];
}

function assertNoForbiddenEndpoints(report) {
  report.endpointHits.forEach((hit) => {
    const signature = `${hit.method} ${hit.path}`;
    if (FORBIDDEN_ORDER_WRITE_PATTERN.test(signature)) {
      report.failures.push(`Orders read-only canary attempted forbidden write endpoint: ${signature}.`);
    }
    if (FORBIDDEN_DOMAIN_PATTERN.test(hit.path)) {
      report.failures.push(`Orders read-only canary leaked into forbidden domain endpoint: ${signature}.`);
    }
  });
  if (!report.failures.length) record(report, 'endpoint_scope.readonly_orders_only', 'passed');
}

function isLocalGateBypassAllowed() {
  const bypass = process.env[ENV.bypassAuthGate] === 'local-runtime';
  const environment = process.env[ENV.environment] === 'local';
  const target = describeSafeTarget(resolveApiUrl());
  const marker = String(process.env[ENV.marker] || '').toLowerCase();
  return bypass && environment && (target.hasLocalMarker || marker === 'local') && !target.productionLike;
}

function credentialsForRole(role) {
  const upper = role.toUpperCase();
  const fallback = STAGING_E2E_DEFAULT_USERS[role];
  if (!fallback) throw new Error(`Unsupported orders read-only canary role: ${role}`);
  return {
    email: process.env[`DOKE_STAGING_${upper}_EMAIL`] || fallback.email,
    password: process.env[`DOKE_STAGING_${upper}_PASSWORD`] || fallback.password
  };
}

function resolveRoles() {
  const raw = process.env[ENV.roles] || 'client,professional';
  return raw.split(',').map((entry) => entry.trim().toLowerCase()).filter(Boolean);
}

function resolveApiUrl() {
  return normalizeBaseUrl(process.env[ENV.apiUrl] || process.env[ENV.fallbackApiUrl] || '');
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/$/, '');
}

function assertSafeTarget(report, rawValue, environment) {
  if (!rawValue) return;
  const target = describeTarget(rawValue);
  const marker = String(process.env[ENV.marker] || '').toLowerCase();
  const haystack = `${target.protocol} ${target.host} ${target.pathname}`.toLowerCase();

  if (/\b(prod|production|live)\b/.test(haystack) || haystack.includes('prod-') || haystack.includes('-prod')) {
    report.failures.push(`Orders read-only canary API target looks production-like and was blocked: ${redact(rawValue)}.`);
  }

  const hasLocalMarker = /(^|[.\-:/])(?:localhost|127\.0\.0\.1|0\.0\.0\.0|local)([.\-:/]|$)/.test(haystack);
  const hasStagingMarker = /(^|[.\-:/])(?:staging|stage|stg|preview)([.\-:/]|$)/.test(haystack);
  const hasExplicitMarker = marker === environment || marker === 'local' || marker === 'staging';

  if (environment === 'local' && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`Orders read-only canary API target is missing a local marker. Use localhost/127.0.0.1/local or set ${ENV.marker}=local.`);
  }

  if (environment === 'staging' && !hasStagingMarker && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`Orders read-only canary API target is missing a staging/local marker. Use a staging URL or set ${ENV.marker}=staging.`);
  }
}

function describeTarget(value) {
  try {
    const url = new URL(value);
    return { protocol: url.protocol, host: url.host, pathname: url.pathname };
  } catch (error) {
    return { protocol: '', host: value, pathname: '' };
  }
}

function describeSafeTarget(value) {
  const target = describeTarget(value);
  const haystack = `${target.protocol} ${target.host} ${target.pathname}`.toLowerCase();
  return {
    protocol: target.protocol,
    host: target.host,
    pathname: target.pathname,
    hasLocalMarker: /(^|[.\-:/])(?:localhost|127\.0\.0\.1|0\.0\.0\.0|local)([.\-:/]|$)/.test(haystack),
    hasStagingMarker: /(^|[.\-:/])(?:staging|stage|stg|preview)([.\-:/]|$)/.test(haystack),
    productionLike: /\b(prod|production|live)\b/.test(haystack) || haystack.includes('prod-') || haystack.includes('-prod')
  };
}

function shapePath(endpointPath) {
  const normalized = String(endpointPath || '').replace(/\?.*$/, '').replace(/\/$/, '') || '/';
  if (/^\/orders\/[^/]+$/.test(normalized)) return '/orders/:id';
  return normalized;
}

function redact(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
  } catch (error) {
    return '[invalid-url]';
  }
}

function record(report, name, status, detail) {
  report.results.push({ name, status: status || 'passed', detail: detail || '' });
}

function maybeWriteReport(report) {
  if (!writeReport) return;
  const reportPath = process.env[ENV.reportPath] || DEFAULT_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Orders read-only canary report written to ${reportPath}`);
}

function printPlan(report) {
  console.log('Orders read-only canary dry-run plan:');
  console.log(`- environment: ${report.environment.dokeEnvironment || '(missing)'}`);
  console.log(`- api target configured: ${report.environment.hasApiUrl ? 'yes' : 'no'}`);
  console.log(`- network consent: ${report.environment.hasNetworkConsent ? 'yes' : 'no'}`);
  console.log(`- auth promotion report: ${report.environment.authPromotionReportPath}`);
  console.log('- endpoints:');
  AUTH_ENDPOINTS.concat(ORDERS_ENDPOINTS).forEach((entry) => console.log(`  - ${entry.method} ${entry.path}`));
  console.log('- forbidden: order write endpoints and non-orders domains remain out of scope.');
}

function printFailures(report) {
  console.error('Orders read-only canary validation failed:');
  report.failures.forEach((failure) => console.error(`- ${failure}`));
}

function failIfNeeded(report) {
  if (report.failures.length) {
    printFailures(report);
    process.exit(1);
  }
}
