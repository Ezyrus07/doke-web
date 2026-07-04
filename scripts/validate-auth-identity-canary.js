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
  apiUrl: 'DOKE_AUTH_IDENTITY_CANARY_API_URL',
  fallbackApiUrl: 'DOKE_STAGING_API_URL',
  allowNetwork: 'DOKE_AUTH_IDENTITY_CANARY_ALLOW_NETWORK',
  marker: 'DOKE_AUTH_IDENTITY_CANARY_MARKER',
  roles: 'DOKE_AUTH_IDENTITY_CANARY_ROLES',
  reportPath: 'DOKE_AUTH_IDENTITY_CANARY_REPORT_PATH'
});
const DEFAULT_REPORT_PATH = 'reports/generated/auth-identity-canary-report.json';
const REQUIRED_FILES = Object.freeze([
  'assets/js/core/runtime-config.js',
  'assets/js/services/auth-service.js',
  'assets/js/core/session.js',
  'assets/js/contracts/auth-domain-contract.js',
  'assets/js/contracts/identity-profile-contract.js',
  'docs/AUTH-IDENTITY-CANARY-RUNBOOK.md'
]);
const CANARY_ENDPOINTS = Object.freeze([
  { name: 'login', method: 'POST', path: '/auth/login' },
  { name: 'session', method: 'GET', path: '/auth/session' },
  { name: 'currentUser', method: 'GET', path: '/users/me' },
  { name: 'currentProfile', method: 'GET', path: '/profiles/me' }
]);

main().catch((error) => {
  console.error(error.message || error);
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
  if (report.failures.length) {
    printFailures(report);
    maybeWriteReport(report);
    process.exit(1);
  }

  for (const role of resolveRoles()) {
    await runRoleSmoke(report, role);
    if (report.failures.length) break;
  }

  maybeWriteReport(report);
  failIfNeeded(report);
  console.log('Auth/identity canary validation passed.');
  report.results.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
}

function createReport() {
  return {
    name: 'auth-identity-canary',
    generatedAt: new Date().toISOString(),
    dryRun,
    environment: describeEnvironment(),
    requiredFiles: REQUIRED_FILES.slice(),
    expectedFrontendProviders: {
      authProvider: 'api',
      dataProvider: 'mock',
      enableNetworkRequests: true
    },
    endpoints: CANARY_ENDPOINTS.map((entry) => Object.assign({}, entry)),
    roles: resolveRoles(),
    results: [],
    failures: [],
    warnings: []
  };
}

function describeEnvironment() {
  const apiUrl = resolveApiUrl();
  const apiTarget = apiUrl ? describeSafeTarget(apiUrl) : null;
  return {
    dokeEnvironment: process.env[ENV.environment] || '',
    apiUrlSource: process.env[ENV.apiUrl] ? ENV.apiUrl : process.env[ENV.fallbackApiUrl] ? ENV.fallbackApiUrl : null,
    hasApiUrl: Boolean(apiUrl),
    apiTarget,
    hasNetworkConsent: process.env[ENV.allowNetwork] === '1',
    marker: process.env[ENV.marker] || '',
    roles: process.env[ENV.roles] || 'client,professional'
  };
}

function assertRequiredFiles(report) {
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(root, file))) {
      report.failures.push(`Missing required canary asset: ${file}`);
    }
  }
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
    report.failures.push(`${ENV.allowNetwork}=1 is required before the frontend auth/identity canary smoke can call the API.`);
  }
  if (typeof fetch !== 'function') {
    report.failures.push('This validation requires a Node runtime with global fetch support.');
  }
  assertSafeTarget(report, apiUrl, environment);
}

function assertSafeTarget(report, rawValue, environment) {
  if (!rawValue) return;
  const target = describeTarget(rawValue);
  const marker = String(process.env[ENV.marker] || '').toLowerCase();
  const haystack = `${target.protocol} ${target.host} ${target.pathname}`.toLowerCase();

  if (/\b(prod|production|live)\b/.test(haystack) || haystack.includes('prod-') || haystack.includes('-prod')) {
    report.failures.push(`Canary API target looks production-like and was blocked: ${redact(rawValue)}.`);
  }

  const hasLocalMarker = /(^|[.\-:/])(?:localhost|127\.0\.0\.1|0\.0\.0\.0|local)([.\-:/]|$)/.test(haystack);
  const hasStagingMarker = /(^|[.\-:/])(?:staging|stage|stg|preview)([.\-:/]|$)/.test(haystack);
  const hasExplicitMarker = marker === environment || marker === 'local' || marker === 'staging';

  if (environment === 'local' && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`Canary API target is missing a local marker. Use localhost/127.0.0.1/local or set ${ENV.marker}=local.`);
  }

  if (environment === 'staging' && !hasStagingMarker && !hasLocalMarker && !hasExplicitMarker) {
    report.failures.push(`Canary API target is missing a staging/local marker. Use a staging URL or set ${ENV.marker}=staging.`);
  }
}

async function runRoleSmoke(report, role) {
  const credentials = credentialsForRole(role);
  const loginPayload = await request('POST', '/auth/login', {
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
  if (!token) throw new Error(`Canary login for ${role} did not return an access token.`);
  record(report, `auth.login.${role}`, 'passed');

  const sessionPayload = await request('GET', '/auth/session', { token, expectedStatuses: [200] });
  const userPayload = await request('GET', '/users/me', { token, expectedStatuses: [200] });
  const profilePayload = await request('GET', '/profiles/me', { token, expectedStatuses: [200] });

  const user = userPayload.user || userPayload.currentUser || sessionPayload.user || sessionPayload.session && sessionPayload.session.user;
  const profile = profilePayload.profile || profilePayload.currentProfile || sessionPayload.profile || sessionPayload.session && sessionPayload.session.profile;

  if (!user || !user.id) throw new Error(`Canary /users/me for ${role} did not return a user id.`);
  if (!profile || !profile.id) throw new Error(`Canary /profiles/me for ${role} did not return a profile id.`);

  record(report, `identity.session.${role}`, 'passed');
  record(report, `identity.currentUser.${role}`, 'passed', user.id);
  record(report, `identity.currentProfile.${role}`, 'passed', profile.id);
}

async function request(method, endpointPath, options = {}) {
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

function credentialsForRole(role) {
  const upper = role.toUpperCase();
  const fallback = STAGING_E2E_DEFAULT_USERS[role];
  if (!fallback) throw new Error(`Unsupported canary role: ${role}`);
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

function redact(value) {
  try {
    const url = new URL(value);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch (error) {
    return String(value || '').replace(/:[^:@/]+@/g, ':***@');
  }
}

function record(report, name, status, detail = '') {
  report.results.push({ name, status, detail });
}

function printPlan(report) {
  console.log('Auth/identity canary dry-run');
  console.log('Frontend provider contract: authProvider=api, dataProvider=mock, enableNetworkRequests=true.');
  console.log('Required environment:');
  Object.values(ENV).forEach((name) => console.log(`- ${name}`));
  console.log('Required files:');
  report.requiredFiles.forEach((file) => console.log(`- ${file}`));
  console.log('Endpoints checked in real mode:');
  report.endpoints.forEach((entry) => console.log(`- ${entry.method} ${entry.path}`));
  console.log('Default roles checked in real mode: client, professional.');
}

function printFailures(report) {
  console.error('Auth/identity canary validation failed:');
  report.failures.forEach((failure) => console.error(`- ${failure}`));
}

function maybeWriteReport(report) {
  if (!writeReport) return;
  const target = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Report written to ${path.relative(root, target)}`);
}

function failIfNeeded(report) {
  if (!report.failures.length) return;
  printFailures(report);
  process.exit(1);
}
