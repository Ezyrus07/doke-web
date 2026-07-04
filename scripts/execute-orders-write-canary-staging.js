#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnvOnly = args.has('--check-env');
const execute = args.has('--execute');
const writeReport = args.has('--write-report');

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  apiUrl: 'DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL',
  allowNetwork: 'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK',
  allowMutations: 'DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS',
  allowExecute: 'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE',
  targetMarker: 'DOKE_ORDERS_WRITE_CANARY_TARGET_MARKER',
  preflightReportPath: 'DOKE_ORDERS_WRITE_CANARY_STAGING_PREFLIGHT_REPORT_PATH',
  reportPath: 'DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTION_REPORT_PATH'
});

const DEFAULT_PREFLIGHT_REPORT_PATH = 'reports/generated/orders-write-canary-staging-preflight-gate-report.json';
const DEFAULT_REPORT_PATH = 'reports/generated/orders-write-canary-staging-execution-report.json';

const REQUIRED_FILES = Object.freeze([
  'scripts/execute-orders-write-canary-staging.js',
  'scripts/audit-orders-write-canary-staging-executor.js',
  'scripts/validate-orders-write-canary-staging-preflight-gate.js',
  'scripts/validate-orders-write-canary-local-runtime.js',
  'docs/ORDERS-WRITE-STAGING-EXECUTOR-RUNBOOK.md',
  'docs/ORDERS-WRITE-STAGING-PREFLIGHT-RUNBOOK.md',
  'docs/ORDERS-WRITE-CANARY-RUNBOOK.md',
  'docs/VALIDATION.md',
  'package.json'
]);

const EXPECTED_PREFLIGHT_STATUS = 'orders_write_canary_ready_for_manual_staging_execution';
const BLOCKED_FLAGS_STATUS = 'blocked_until_orders_write_staging_execution_flags';
const BLOCKED_PREFLIGHT_STATUS = 'blocked_until_orders_write_staging_preflight_report';
const UNSAFE_TARGET_STATUS = 'blocked_unsafe_orders_write_staging_execution_target';
const READY_STATUS = 'orders_write_canary_ready_for_manual_staging_mutation_execution';
const VALIDATED_STATUS = 'orders_write_canary_staging_execution_validated';
const EXPECTED_CONFLICT_CODE = 'DOKE_IDEMPOTENCY_CONFLICT';
const DRY_STATUS = 'dry_run_plan_only';
const CHECK_ENV_STATUS = 'check_env_only';

const MUTATION_STEPS = Object.freeze([
  { key: 'create', method: 'POST', path: '/orders', role: 'client', body: { category: 'Pintura', title: 'Canary staging order', description: 'Pedido de validação controlada do canary de escrita.', address: { city: 'Salvador', state: 'BA' } }, expectedStatuses: [200, 201] },
  { key: 'accept', method: 'POST', pathTemplate: '/orders/:id/accept', role: 'professional', body: { note: 'Aceite controlado pelo canary de staging.' }, expectedStatuses: [200] },
  { key: 'quote', method: 'POST', pathTemplate: '/orders/:id/quote', role: 'professional', body: { amountCents: 25900, currency: 'BRL', description: 'Orçamento controlado pelo canary de staging.' }, expectedStatuses: [200] },
  { key: 'charge', method: 'POST', pathTemplate: '/orders/:id/charge', role: 'professional', body: { amountCents: 25900, currency: 'BRL' }, expectedStatuses: [200] },
  { key: 'start', method: 'POST', pathTemplate: '/orders/:id/start', role: 'professional', body: { source: 'orders-write-staging-executor' }, expectedStatuses: [200] },
  { key: 'status', method: 'POST', pathTemplate: '/orders/:id/status', role: 'professional', body: { status: 'reviewing' }, expectedStatuses: [200] },
  { key: 'complete', method: 'POST', pathTemplate: '/orders/:id/complete', role: 'professional', body: { source: 'orders-write-staging-executor' }, expectedStatuses: [200] },
  { key: 'decline-negative-branch', method: 'POST', pathTemplate: '/orders/:id/decline', role: 'professional', body: { reason: 'negative branch validation only' }, expectedStatuses: [200, 409, 422] }
]);

const FORBIDDEN_DOMAIN_PATTERN = /^\/(conversations|notifications|wallet|withdrawals|disputes|receipts|admin)(\/|$)/;

const report = {
  name: 'orders-write-canary-staging-execution',
  generatedAt: new Date().toISOString(),
  dryRun,
  checkEnvOnly,
  execute,
  writeActivation: false,
  performsNetworkRequest: false,
  performsMutation: false,
  objective: 'Execute a manually confirmed orders write canary against local/staging after preflight approval.',
  expectedFrontendProviders: {
    authProvider: 'api',
    dataProvider: 'mock',
    ordersProvider: 'api-write-canary-staging-execution',
    enableNetworkRequests: true,
    writeActivation: false
  },
  requiredEnv: Object.values(ENV),
  requiredPreflightStatus: EXPECTED_PREFLIGHT_STATUS,
  mutationSteps: MUTATION_STEPS.map((step) => ({ key: step.key, method: step.method, path: step.path || step.pathTemplate, role: step.role })),
  environment: {
    DOKE_ENVIRONMENT: process.env[ENV.environment] || '',
    hasApiUrl: Boolean(process.env[ENV.apiUrl]),
    allowNetwork: process.env[ENV.allowNetwork] === '1',
    allowMutations: process.env[ENV.allowMutations] === '1',
    allowExecute: process.env[ENV.allowExecute] === '1',
    targetMarker: process.env[ENV.targetMarker] || ''
  },
  preflightReportPath: process.env[ENV.preflightReportPath] || DEFAULT_PREFLIGHT_REPORT_PATH,
  executionStatus: 'not_evaluated',
  endpointHits: [],
  idempotencyChecks: [],
  rollback: {
    frontendProviderRollback: 'dataProvider=mock; ordersProvider=mock; writeActivation=false',
    serverRollback: 'Use staging seed rollback or delete only canary-tagged records created by this run.'
  },
  results: [],
  warnings: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error.stack || error.message || String(error));
  report.executionStatus = report.executionStatus === 'not_evaluated' ? 'failed' : report.executionStatus;
  maybeWriteReport();
  printReport();
  process.exit(1);
});

async function main() {
  assertRequiredFiles();
  assertPackageScripts();
  assertNoFrontendActivation();

  if (dryRun) {
    report.executionStatus = DRY_STATUS;
    record('plan.printed', 'passed', 'No external request and no mutation were executed.');
    maybeWriteReport();
    printPlan();
    return;
  }

  evaluateEnvironment();
  evaluatePreflightReport();

  if (checkEnvOnly) {
    report.executionStatus = report.failures.length ? report.executionStatus : CHECK_ENV_STATUS;
    record('execution.skipped', 'passed', '--check-env validates prerequisites without network or mutation.');
    maybeWriteReport();
    printReport();
    return;
  }

  if (!execute || process.env[ENV.allowExecute] !== '1') {
    report.executionStatus = report.failures.length ? report.executionStatus : BLOCKED_FLAGS_STATUS;
    report.failures.push('Real staging write execution requires both --execute and DOKE_ORDERS_WRITE_CANARY_STAGING_EXECUTE=1.');
    maybeWriteReport();
    printReport();
    failIfNeeded();
    return;
  }

  if (report.failures.length) {
    maybeWriteReport();
    printReport();
    failIfNeeded();
    return;
  }

  report.performsNetworkRequest = true;
  report.performsMutation = true;
  await executeSmoke(process.env[ENV.apiUrl]);
  assertDomainIsolation();
  report.executionStatus = report.failures.length ? 'failed' : VALIDATED_STATUS;
  record('execution.completed', report.failures.length ? 'failed' : 'passed', report.executionStatus);
  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  REQUIRED_FILES.forEach((file) => {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required staging execution asset: ${file}`);
  });
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertPackageScripts() {
  const parsed = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const scripts = parsed.scripts || {};
  const expected = {
    'audit:orders-write-canary-staging-executor': 'node scripts/audit-orders-write-canary-staging-executor.js',
    'execute:orders-write-canary:staging:dry-run': 'node scripts/execute-orders-write-canary-staging.js --dry-run',
    'execute:orders-write-canary:staging:check-env': 'node scripts/execute-orders-write-canary-staging.js --check-env',
    'execute:orders-write-canary:staging': 'node scripts/execute-orders-write-canary-staging.js --execute',
    'execute:orders-write-canary:staging:report': 'node scripts/execute-orders-write-canary-staging.js --execute --write-report'
  };
  Object.entries(expected).forEach(([name, command]) => {
    if (scripts[name] !== command) report.failures.push(`package.json missing ${name}: ${command}`);
  });
  if (!report.failures.length) record('package_scripts.present', 'passed');
}

function assertNoFrontendActivation() {
  if (report.expectedFrontendProviders.dataProvider !== 'mock') report.failures.push('Staging executor must preserve dataProvider=mock.');
  if (report.expectedFrontendProviders.writeActivation !== false) report.failures.push('Staging executor must not activate frontend write.');
  record('frontend_activation.disabled', 'passed', 'dataProvider=mock; writeActivation=false');
}

function evaluateEnvironment() {
  const environment = process.env[ENV.environment] || '';
  const apiUrl = process.env[ENV.apiUrl] || '';
  const allowNetwork = process.env[ENV.allowNetwork] === '1';
  const allowMutations = process.env[ENV.allowMutations] === '1';

  if (!['local', 'staging'].includes(environment)) {
    report.failures.push('DOKE_ENVIRONMENT must be local or staging for orders write staging execution.');
    report.executionStatus = BLOCKED_FLAGS_STATUS;
  }
  if (!apiUrl) {
    report.failures.push('DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL is required.');
    report.executionStatus = BLOCKED_FLAGS_STATUS;
  } else if (!isSafeTarget(apiUrl)) {
    report.failures.push('DOKE_ORDERS_WRITE_CANARY_STAGING_API_URL must point to a local/staging target or include the configured target marker.');
    report.executionStatus = UNSAFE_TARGET_STATUS;
  }
  if (!allowNetwork) {
    report.failures.push('DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_NETWORK=1 is required.');
    report.executionStatus = BLOCKED_FLAGS_STATUS;
  }
  if (!allowMutations) {
    report.failures.push('DOKE_ORDERS_WRITE_CANARY_STAGING_ALLOW_MUTATIONS=1 is required.');
    report.executionStatus = BLOCKED_FLAGS_STATUS;
  }
  if (!report.failures.length) {
    report.executionStatus = READY_STATUS;
    record('environment.safe_for_manual_execution', 'passed');
  }
}

function evaluatePreflightReport() {
  const reportPath = process.env[ENV.preflightReportPath] || DEFAULT_PREFLIGHT_REPORT_PATH;
  const absolutePath = path.join(root, reportPath);
  if (!fs.existsSync(absolutePath)) {
    report.failures.push(`Missing required preflight report: ${reportPath}`);
    report.executionStatus = BLOCKED_PREFLIGHT_STATUS;
    return;
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    report.failures.push(`Invalid preflight report JSON at ${reportPath}: ${error.message}`);
    report.executionStatus = BLOCKED_PREFLIGHT_STATUS;
    return;
  }
  if (parsed.preflightStatus !== EXPECTED_PREFLIGHT_STATUS) {
    report.failures.push(`Preflight report must have preflightStatus=${EXPECTED_PREFLIGHT_STATUS}.`);
    report.executionStatus = BLOCKED_PREFLIGHT_STATUS;
    return;
  }
  record('preflight_report.ready', 'passed', reportPath);
}

async function executeSmoke(baseUrl) {
  const clientToken = await login(baseUrl, 'client');
  const professionalToken = await login(baseUrl, 'professional');
  await request(baseUrl, 'GET', '/auth/session', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/users/me', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/profiles/me', { token: clientToken, role: 'client', expectedStatuses: [200] });
  await request(baseUrl, 'GET', '/orders', { token: clientToken, role: 'client', expectedStatuses: [200] });

  const createStep = MUTATION_STEPS[0];
  const created = await runIdempotentMutation(baseUrl, createStep, clientToken, null);
  const orderId = created.order && created.order.id;
  if (!orderId) throw new Error('POST /orders did not return order.id.');

  for (const step of MUTATION_STEPS.slice(1)) {
    await runIdempotentMutation(baseUrl, step, professionalToken, orderId);
  }
}

async function runIdempotentMutation(baseUrl, step, token, orderId) {
  const endpoint = step.path || step.pathTemplate.replace(':id', orderId);
  const idempotencyKey = makeIdempotencyKey(step.key);
  const first = await request(baseUrl, step.method, endpoint, { token, role: step.role, idempotencyKey, body: step.body, expectedStatuses: step.expectedStatuses });
  const replay = await request(baseUrl, step.method, endpoint, { token, role: step.role, idempotencyKey, body: step.body, expectedStatuses: step.expectedStatuses });
  if (replay.idempotency && replay.idempotency.replay === true) {
    report.idempotencyChecks.push({ step: step.key, replay: true, conflict: 'not_exercised_against_staging_executor' });
  } else {
    throw new Error(`${step.method} ${endpoint} did not report idempotency.replay=true on same-payload replay.`);
  }
  return first;
}

async function login(baseUrl, role) {
  const email = role === 'professional' ? 'professional.canary@doke.local' : 'client.canary@doke.local';
  const payload = await request(baseUrl, 'POST', '/auth/login', { role, body: { email, login: email, password: 'DokeCanary123!' }, expectedStatuses: [200] });
  const session = payload.session || {};
  const token = session.token || session.accessToken || session.access_token || payload.token || payload.accessToken || payload.access_token;
  if (!token) throw new Error(`Login for ${role} did not return a token.`);
  record(`auth.login.${role}`, 'passed');
  return token;
}

async function request(baseUrl, method, endpoint, options = {}) {
  if (FORBIDDEN_DOMAIN_PATTERN.test(endpoint)) throw new Error(`Forbidden domain request blocked before fetch: ${endpoint}`);
  const headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  if (options.idempotencyKey) headers['x-idempotency-key'] = options.idempotencyKey;
  report.endpointHits.push({ method, path: shapePath(endpoint), role: options.role || '', hasIdempotencyKey: Boolean(options.idempotencyKey) });
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${endpoint}`, { method, headers, body: options.body === undefined ? undefined : JSON.stringify(options.body) });
  const payload = await response.json().catch(() => ({}));
  if (!(options.expectedStatuses || [200]).includes(response.status)) {
    const message = payload.error && payload.error.message || payload.message || response.statusText;
    throw new Error(`${method} ${endpoint} returned ${response.status}: ${message}`);
  }
  return payload;
}

function assertDomainIsolation() {
  const forbiddenHit = report.endpointHits.find((hit) => FORBIDDEN_DOMAIN_PATTERN.test(hit.path));
  if (forbiddenHit) report.failures.push(`Forbidden domain hit: ${forbiddenHit.method} ${forbiddenHit.path}`);
  const expected = new Set(MUTATION_STEPS.map((step) => `${step.method} ${step.path || step.pathTemplate}`));
  const actual = new Set(report.endpointHits.map((hit) => `${hit.method} ${hit.path}`));
  for (const signature of expected) {
    if (!actual.has(signature)) report.failures.push(`Expected staging mutation was not exercised: ${signature}`);
  }
  if (!report.failures.length) record('domain_isolation.orders_only', 'passed');
}

function isSafeTarget(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    const marker = (process.env[ENV.targetMarker] || '').toLowerCase().trim();
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(host)) return true;
    if (host.includes('staging') || host.includes('stage') || host.includes('stg') || host.includes('preview') || host.includes('local') || host.includes('sandbox')) return true;
    return Boolean(marker && value.toLowerCase().includes(marker));
  } catch (_error) {
    return false;
  }
}

function shapePath(endpoint) {
  return endpoint.replace(/\/orders\/[^/]+\//, '/orders/:id/').replace(/\/orders\/[^/]+$/, '/orders/:id');
}

function makeIdempotencyKey(step) {
  return `orders-write-staging-${step}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function record(name, status, details) {
  report.results.push({ name, status, details: details || '' });
}

function maybeWriteReport() {
  if (!writeReport) return;
  const outputPath = process.env[ENV.reportPath] || DEFAULT_REPORT_PATH;
  fs.mkdirSync(path.dirname(path.join(root, outputPath)), { recursive: true });
  fs.writeFileSync(path.join(root, outputPath), `${JSON.stringify(report, null, 2)}\n`);
}

function printPlan() {
  console.log(JSON.stringify({
    name: report.name,
    executionStatus: report.executionStatus,
    performsNetworkRequest: false,
    performsMutation: false,
    mutationSteps: report.mutationSteps,
    requiredEnv: report.requiredEnv,
    requiredPreflightStatus: report.requiredPreflightStatus,
    next: 'Run --check-env after generating the real preflight report. Run --execute only in local/staging with all explicit flags.'
  }, null, 2));
}

function printReport() {
  console.log(JSON.stringify(report, null, 2));
}

function failIfNeeded() {
  if (report.failures.length) process.exit(1);
}
