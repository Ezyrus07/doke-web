#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { validateAuthorizationEnvelope } = require('./lib/ord-a06-authorization-envelope');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run') || args.has('--print-plan');
const checkEnvOnly = args.has('--check-env');
const execute = args.has('--execute');
const writeReport = args.has('--write-report');

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  authorizationAck: 'DOKE_ORD_A06_AUTHORIZATION_ACK',
  authorizationManifestPath: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_PATH',
  authorizationManifestDigest: 'DOKE_ORD_A06_AUTHORIZATION_MANIFEST_SHA256',
  allowNetwork: 'DOKE_ORD_A06_ALLOW_NETWORK',
  allowMutations: 'DOKE_ORD_A06_ALLOW_MUTATIONS',
  allowExecute: 'DOKE_ORD_A06_EXECUTE',
  webBaseUrl: 'DOKE_ORD_A06_WEB_BASE_URL',
  apiBaseUrl: 'DOKE_ORD_A06_API_BASE_URL',
  supabaseUrl: 'DOKE_ORD_A06_SUPABASE_URL',
  serviceRoleKey: 'DOKE_ORD_A06_SERVICE_ROLE_KEY',
  clientEmail: 'DOKE_ORD_A06_CLIENT_EMAIL',
  clientPassword: 'DOKE_ORD_A06_CLIENT_PASSWORD',
  professionalEmail: 'DOKE_ORD_A06_PROFESSIONAL_EMAIL',
  professionalPassword: 'DOKE_ORD_A06_PROFESSIONAL_PASSWORD',
  serviceRef: 'DOKE_ORD_A06_SERVICE_REF',
  runId: 'DOKE_ORD_A06_RUN_ID',
  targetMarker: 'DOKE_ORD_A06_TARGET_MARKER',
  browserExecutablePath: 'DOKE_PLAYWRIGHT_EXECUTABLE_PATH',
  reportPath: 'DOKE_ORD_A06_PLAYWRIGHT_REPORT_PATH'
});

const AUTHORIZATION_ACK = 'I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS';
const RUN_ID_PATTERN = /^ord-a06-[a-z0-9][a-z0-9-]{5,80}$/;
const DEFAULT_REPORT_PATH = 'reports/generated/ord-a06-playwright-executor-report.json';
const REQUIRED_FILES = Object.freeze([
  'scripts/execute-ord-001-a06-visual-settlement-playwright.js',
  'scripts/audit-ord-001-a06-playwright-executor.js',
  'scripts/lib/ord-a06-authorization-envelope.js',
  'docs/ORD-001-A06-AUTHORIZATION-ENVELOPE.md',
  'docs/validation/ORD-001-A06-AUTHORIZATION-ENVELOPE.json',
  'docs/ORD-001-A06-PLAYWRIGHT-EXECUTOR.md',
  'docs/validation/ORD-001-A06-PLAYWRIGHT-EXECUTOR.json',
  'supabase/migrations/20260730003500_ord_a06_canary_cleanup_boundary.sql',
  'supabase/migrations/20260730004500_ord_a06_cleanup_explicit_role_precedence.sql',
  'assets/js/services/orders-service.js',
  'auth/login.html',
  'pedidos.html',
  'package.json'
]);
const PRODUCTION_HOSTS = new Set(['doke.com.br', 'www.doke.com.br', 'app.doke.com.br']);

const report = {
  name: 'ord-a06-visual-settlement-playwright-executor',
  generatedAt: new Date().toISOString(),
  objective: 'Execute one authorized two-account staging visual settlement canary and remove only its runId-tagged records.',
  mode: dryRun ? 'dry-run' : checkEnvOnly ? 'check-env' : execute ? 'execute' : 'blocked',
  performsNetworkRequest: false,
  performsMutation: false,
  credentialsRecorded: false,
  serviceRoleExposedToBrowser: false,
  environment: {
    name: process.env[ENV.environment] || '',
    authorizationAcknowledged: process.env[ENV.authorizationAck] === AUTHORIZATION_ACK,
    hasAuthorizationManifestPath: Boolean(process.env[ENV.authorizationManifestPath]),
    hasAuthorizationManifestDigest: Boolean(process.env[ENV.authorizationManifestDigest]),
    authorizationEnvelope: null,
    allowNetwork: process.env[ENV.allowNetwork] === '1',
    allowMutations: process.env[ENV.allowMutations] === '1',
    allowExecute: process.env[ENV.allowExecute] === '1',
    hasWebBaseUrl: Boolean(process.env[ENV.webBaseUrl]),
    hasApiBaseUrl: Boolean(process.env[ENV.apiBaseUrl]),
    hasSupabaseUrl: Boolean(process.env[ENV.supabaseUrl]),
    hasServiceRoleKey: Boolean(process.env[ENV.serviceRoleKey]),
    hasClientCredentials: Boolean(process.env[ENV.clientEmail] && process.env[ENV.clientPassword]),
    hasProfessionalCredentials: Boolean(process.env[ENV.professionalEmail] && process.env[ENV.professionalPassword]),
    accountsDistinct: Boolean(process.env[ENV.clientEmail] && process.env[ENV.professionalEmail])
      && String(process.env[ENV.clientEmail]).toLowerCase() !== String(process.env[ENV.professionalEmail]).toLowerCase(),
    hasServiceRef: Boolean(process.env[ENV.serviceRef]),
    runId: process.env[ENV.runId] || '',
    targetMarker: process.env[ENV.targetMarker] || ''
  },
  requiredEnvironment: Object.values(ENV).filter((name) => name !== ENV.browserExecutablePath && name !== ENV.reportPath),
  plan: [
    'Validate explicit staging authorization, target URLs, two distinct test accounts and one ord-a06 runId.',
    'Open isolated Playwright contexts for client and professional.',
    'Authenticate through auth/login.html without recording credentials.',
    'Activate the orders write canary in each browser while preserving supabase-read.',
    'Create one doubly marked order with runId-scoped idempotency.',
    'Prove the professional sees requested state and race two accept commands to surface one optimistic conflict.',
    'Prove the client sees accepted state, then the professional submits a R$ 123,45 quote.',
    'Prove the client sees quoted state and capture visual evidence.',
    'Call cleanup_order_canary_run using service_role outside the browser, assert zero residue and run it again idempotently.'
  ],
  status: 'not_evaluated',
  orderId: null,
  screenshots: [],
  conflict: null,
  cleanup: null,
  checks: [],
  warnings: [],
  failures: []
};

main().catch((error) => {
  report.failures.push(error && (error.stack || error.message) || String(error));
  if (report.status === 'not_evaluated') report.status = 'failed';
  maybeWriteReport();
  printReport();
  process.exitCode = 1;
});

async function main() {
  assertRequiredFiles();
  assertNoCredentialDefaults();

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'dry_run_plan_only';
    record('execution.skipped', report.failures.length ? 'failed' : 'passed', 'No browser, network request or mutation was executed.');
    maybeWriteReport();
    printPlan();
    failIfNeeded();
    return;
  }

  evaluateEnvironment();

  if (checkEnvOnly) {
    report.status = report.failures.length ? 'blocked_by_environment' : 'environment_ready_for_authorized_execution';
    record('execution.skipped', 'passed', '--check-env performs no browser launch, network request or mutation.');
    maybeWriteReport();
    printReport();
    failIfNeeded();
    return;
  }

  if (!execute || process.env[ENV.allowExecute] !== '1') {
    report.failures.push('Real execution requires both --execute and DOKE_ORD_A06_EXECUTE=1.');
    report.status = 'blocked_until_explicit_execute';
    maybeWriteReport();
    printReport();
    failIfNeeded();
    return;
  }

  if (report.failures.length) {
    report.status = 'blocked_by_environment';
    maybeWriteReport();
    printReport();
    failIfNeeded();
    return;
  }

  report.performsNetworkRequest = true;
  report.performsMutation = true;
  await executeVisualSettlement();
  report.status = report.failures.length ? 'failed' : 'visual_settlement_executed_and_cleaned';
  maybeWriteReport();
  printReport();
  failIfNeeded();
}

function assertRequiredFiles() {
  for (const file of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(root, file))) report.failures.push(`Missing required ORD-A06 executor asset: ${file}`);
  }
  if (!report.failures.length) record('required_files.present', 'passed');
}

function assertNoCredentialDefaults() {
  const source = fs.readFileSync(__filename, 'utf8');
  const forbidden = [
    ['cliente', 'doke.local'],
    ['profissional', 'doke.local'],
    ['suporte', 'doke.local'],
    ['admin', 'doke.local']
  ].map(function (parts) { return parts[0] + '@' + parts[1]; });
  for (const value of forbidden) {
    if (source.includes(value)) report.failures.push(`Executor contains forbidden historical credential default: ${value}`);
  }
  if (!report.failures.length) record('credential_defaults.absent', 'passed');
}

function evaluateEnvironment() {
  const environment = String(process.env[ENV.environment] || '').trim().toLowerCase();
  const runId = String(process.env[ENV.runId] || '').trim().toLowerCase();
  const marker = String(process.env[ENV.targetMarker] || '').trim().toLowerCase();
  const webBaseUrl = process.env[ENV.webBaseUrl] || '';
  const apiBaseUrl = process.env[ENV.apiBaseUrl] || '';
  const supabaseUrl = process.env[ENV.supabaseUrl] || '';
  const clientEmail = String(process.env[ENV.clientEmail] || '').trim().toLowerCase();
  const professionalEmail = String(process.env[ENV.professionalEmail] || '').trim().toLowerCase();

  requireExact(environment, 'staging', `${ENV.environment} must be staging.`);
  requireExact(process.env[ENV.authorizationAck], AUTHORIZATION_ACK, `${ENV.authorizationAck} must explicitly authorize the two staging test accounts.`);
  requireValue(ENV.authorizationManifestPath);
  requireValue(ENV.authorizationManifestDigest);
  requireFlag(ENV.allowNetwork);
  requireFlag(ENV.allowMutations);
  requireFlag(ENV.allowExecute);
  requireValue(ENV.webBaseUrl);
  requireValue(ENV.apiBaseUrl);
  requireValue(ENV.supabaseUrl);
  requireValue(ENV.serviceRoleKey);
  requireValue(ENV.clientEmail);
  requireValue(ENV.clientPassword);
  requireValue(ENV.professionalEmail);
  requireValue(ENV.professionalPassword);
  requireValue(ENV.serviceRef);
  requireValue(ENV.runId);
  requireValue(ENV.targetMarker);

  if (clientEmail && professionalEmail && clientEmail === professionalEmail) {
    report.failures.push('Client and professional staging accounts must be distinct.');
  }
  if (runId && !RUN_ID_PATTERN.test(runId)) {
    report.failures.push(`${ENV.runId} must match ${RUN_ID_PATTERN}.`);
  }
  if (marker && marker.length < 4) report.failures.push(`${ENV.targetMarker} must contain at least four characters.`);

  for (const [label, url] of [['web', webBaseUrl], ['api', apiBaseUrl], ['supabase', supabaseUrl]]) {
    if (url && !isSafeTarget(url, marker)) report.failures.push(`${label} target is production-like or does not contain the explicit staging marker.`);
  }

  if (!report.failures.length) {
    try {
      const authorization = validateAuthorizationEnvelope({
        root,
        manifestPath: process.env[ENV.authorizationManifestPath],
        manifestDigest: process.env[ENV.authorizationManifestDigest],
        expected: {
          authorizationAck: AUTHORIZATION_ACK,
          runId,
          targetMarker: marker,
          clientEmail,
          professionalEmail,
          serviceRef: process.env[ENV.serviceRef],
          webBaseUrl,
          apiBaseUrl,
          supabaseUrl
        }
      });
      report.environment.authorizationEnvelope = authorization.summary;
      record('environment.authorization_envelope', 'passed', authorization.summary.authorizationId);
    } catch (error) {
      report.failures.push(`Authorization envelope rejected: ${error.message}`);
    }
  }

  if (!report.failures.length) record('environment.fail_closed_gate', 'passed');
}

function requireValue(name) {
  if (!String(process.env[name] || '').trim()) report.failures.push(`${name} is required.`);
}

function requireFlag(name) {
  if (process.env[name] !== '1') report.failures.push(`${name}=1 is required.`);
}

function requireExact(actual, expected, message) {
  if (String(actual || '') !== expected) report.failures.push(message);
}

function isSafeTarget(rawUrl, marker) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    const normalizedMarker = String(marker || '').toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (PRODUCTION_HOSTS.has(host)) return false;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    return Boolean(normalizedMarker && `${host}${url.pathname}`.toLowerCase().includes(normalizedMarker));
  } catch {
    return false;
  }
}

async function executeVisualSettlement() {
  let chromium;
  try {
    ({ chromium } = require('@playwright/test'));
  } catch (error) {
    throw new Error(`@playwright/test is required for ORD-A06 execution: ${error.message}`);
  }

  const runId = process.env[ENV.runId].trim().toLowerCase();
  const webBaseUrl = stripTrailingSlash(process.env[ENV.webBaseUrl]);
  const apiBaseUrl = stripTrailingSlash(process.env[ENV.apiBaseUrl]);
  const marker = process.env[ENV.targetMarker].trim();
  const evidenceDir = path.join(root, 'reports/generated/ord-a06', runId);
  fs.mkdirSync(evidenceDir, { recursive: true });

  const launchOptions = { headless: true };
  if (process.env[ENV.browserExecutablePath]) {
    launchOptions.executablePath = process.env[ENV.browserExecutablePath];
    launchOptions.args = ['--no-sandbox', '--disable-dev-shm-usage'];
  }

  const browser = await chromium.launch(launchOptions);
  const clientContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const professionalContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const clientPage = await clientContext.newPage();
  const professionalPage = await professionalContext.newPage();
  let cleanupAttempted = false;

  try {
    await loginThroughUi(clientPage, webBaseUrl, process.env[ENV.clientEmail], process.env[ENV.clientPassword], 'client');
    await loginThroughUi(professionalPage, webBaseUrl, process.env[ENV.professionalEmail], process.env[ENV.professionalPassword], 'professional');

    await activateCanary(clientPage, apiBaseUrl, marker);
    await activateCanary(professionalPage, apiBaseUrl, marker);

    const professional = await readCurrentUser(professionalPage);
    if (!professional || !professional.id) throw new Error('Professional browser session did not expose the canonical user id.');

    const created = await clientPage.evaluate(async ({ runId: browserRunId, serviceRef, professionalId }) => {
      const orders = window.Doke && window.Doke.services && window.Doke.services.orders;
      if (!orders || typeof orders.create !== 'function') throw new Error('Canonical orders service is unavailable in the client browser.');
      return orders.create({
        serviceId: serviceRef,
        professionalId,
        title: `ORD-A06 visual settlement ${browserRunId}`,
        description: 'Pedido sintético autorizado para validar convergência visual entre duas sessões isoladas.',
        city: 'Salvador',
        state: 'BA',
        externalId: `${browserRunId}:order`,
        idempotencyKey: `${browserRunId}:create`,
        source: 'ord-a06-playwright',
        metadata: {
          canaryDomain: 'ORD-001',
          canarySublot: 'ORD-A06',
          canaryScope: 'visual-settlement',
          canaryRunId: browserRunId
        }
      });
    }, { runId, serviceRef: process.env[ENV.serviceRef], professionalId: professional.id });

    const orderId = String(created && created.id || '').trim();
    if (!orderId) throw new Error('Client create command did not return order.id.');
    report.orderId = orderId;
    record('client.create', 'passed', orderId);

    await refreshAndAssertCard(professionalPage, orderId, ['pending', 'requested'], 'professional-requested', evidenceDir);

    const conflict = await professionalPage.evaluate(async ({ orderId: id, runId: browserRunId }) => {
      const orders = window.Doke && window.Doke.services && window.Doke.services.orders;
      if (!orders || typeof orders.accept !== 'function') throw new Error('Canonical orders accept command is unavailable.');
      const tasks = [
        orders.accept(id, { idempotencyKey: `${browserRunId}:accept-a` }),
        orders.accept(id, { idempotencyKey: `${browserRunId}:accept-b` })
      ];
      const settled = await Promise.allSettled(tasks);
      return settled.map((entry) => entry.status === 'fulfilled'
        ? { status: 'fulfilled', orderStatus: entry.value && (entry.value.backendStatus || entry.value.status) || '' }
        : {
            status: 'rejected',
            code: entry.reason && entry.reason.code || '',
            httpStatus: entry.reason && entry.reason.status || 0,
            message: entry.reason && entry.reason.message || String(entry.reason || '')
          });
    }, { orderId, runId });

    const fulfilled = conflict.filter((entry) => entry.status === 'fulfilled');
    const rejected = conflict.filter((entry) => entry.status === 'rejected');
    const optimisticConflict = rejected.some((entry) => entry.httpStatus === 409
      || entry.code === 'DOKE_ORDER_CONFLICT'
      || /conflict|changed|alterado|concorr/i.test(entry.message));
    if (fulfilled.length !== 1 || rejected.length !== 1 || !optimisticConflict) {
      throw new Error(`Optimistic conflict probe expected one success and one conflict: ${JSON.stringify(conflict)}`);
    }
    report.conflict = { fulfilled: fulfilled.length, rejected: rejected.length, optimisticConflict: true };
    record('professional.accept.optimistic_conflict', 'passed');

    await refreshAndAssertCard(clientPage, orderId, ['accepted', 'conversation'], 'client-accepted', evidenceDir);

    await professionalPage.evaluate(async ({ orderId: id, runId: browserRunId }) => {
      const orders = window.Doke && window.Doke.services && window.Doke.services.orders;
      if (!orders || typeof orders.quote !== 'function') throw new Error('Canonical orders quote command is unavailable.');
      return orders.quote(id, {
        amount: '123,45',
        amountCents: 12345,
        budget: '123,45',
        currency: 'BRL',
        description: 'Proposta sintética ORD-A06.',
        idempotencyKey: `${browserRunId}:quote`
      });
    }, { orderId, runId });
    record('professional.quote', 'passed', 'R$ 123,45');

    await refreshAndAssertCard(clientPage, orderId, ['quoted', 'responded'], 'client-quoted', evidenceDir);
    const clientProjection = await readOrderProjection(clientPage, orderId);
    if (!clientProjection || !['quoted', 'responded'].includes(String(clientProjection.status || '').toLowerCase())) {
      throw new Error('Client canonical projection did not converge to quoted state.');
    }
    record('client.quote_projection', 'passed', String(clientProjection.status || ''));

    report.cleanup = await cleanupRunId(runId);
    cleanupAttempted = true;
    if (!report.cleanup || report.cleanup.first.status !== 'cleaned' || report.cleanup.second.status !== 'already_clean') {
      throw new Error(`Cleanup contract returned an unexpected result: ${JSON.stringify(report.cleanup)}`);
    }
    record('service_role.cleanup', 'passed', 'cleaned then already_clean');

    await assertCardAbsent(clientPage, orderId);
    await assertCardAbsent(professionalPage, orderId);
    record('browser.zero_residue', 'passed');
  } finally {
    if (!cleanupAttempted && process.env[ENV.serviceRoleKey] && process.env[ENV.supabaseUrl] && process.env[ENV.runId]) {
      try {
        report.cleanup = await cleanupRunId(process.env[ENV.runId].trim().toLowerCase());
        record('service_role.cleanup.finally', 'passed', report.cleanup.first.status);
      } catch (cleanupError) {
        report.failures.push(`Final cleanup failed: ${cleanupError.message}`);
      }
    }
    await Promise.allSettled([
      rollbackCanary(clientPage),
      rollbackCanary(professionalPage)
    ]);
    await Promise.allSettled([clientContext.close(), professionalContext.close()]);
    await browser.close();
  }
}

async function loginThroughUi(page, webBaseUrl, email, password, expectedRole) {
  const loginUrl = `${webBaseUrl}/auth/login.html?next=../pedidos.html`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#email-login').fill(email);
  await page.locator('#senha-login').fill(password);
  await Promise.all([
    page.waitForURL(/\/pedidos\.html(?:[?#].*)?$/, { timeout: 30_000 }),
    page.locator('[data-auth-submit]').click()
  ]);
  await page.waitForFunction(() => Boolean(window.Doke && window.Doke.session && window.Doke.session.getCurrentUser && window.Doke.session.getCurrentUser()), null, { timeout: 20_000 });
  const user = await readCurrentUser(page);
  if (!user || !user.id) throw new Error(`${expectedRole} login did not materialize a canonical user.`);
  if (expectedRole === 'professional' && user.role !== 'professional') {
    throw new Error(`Authorized professional account resolved as role=${user.role || 'unknown'}.`);
  }
  if (expectedRole === 'client' && !['client', 'professional'].includes(user.role)) {
    throw new Error(`Authorized client account does not have client capability: role=${user.role || 'unknown'}.`);
  }
  record(`${expectedRole}.login`, 'passed', `role=${user.role}`);
}

async function activateCanary(page, apiBaseUrl, marker) {
  await page.waitForFunction(() => Boolean(window.Doke && window.Doke.services && window.Doke.services.orders), null, { timeout: 20_000 });
  const status = await page.evaluate(({ apiBaseUrl: baseUrl, marker: targetMarker }) => {
    return window.Doke.services.orders.configureOrdersWriteCanary({ apiBaseUrl: baseUrl, targetMarker });
  }, { apiBaseUrl, marker });
  if (!status || status.active !== true || status.ordersReadProvider !== 'supabase-read') {
    throw new Error(`Orders write canary activation did not preserve supabase-read: ${JSON.stringify(status)}`);
  }
}

async function rollbackCanary(page) {
  if (!page || page.isClosed()) return;
  await page.evaluate(() => {
    const orders = window.Doke && window.Doke.services && window.Doke.services.orders;
    if (orders && typeof orders.rollbackOrdersWriteCanary === 'function') return orders.rollbackOrdersWriteCanary();
    return null;
  }).catch(() => null);
}

async function readCurrentUser(page) {
  return page.evaluate(() => {
    if (window.Doke && window.Doke.session && typeof window.Doke.session.getCurrentUser === 'function') {
      return window.Doke.session.getCurrentUser();
    }
    if (window.DokeAuth && typeof window.DokeAuth.getCurrentUser === 'function') return window.DokeAuth.getCurrentUser();
    return null;
  });
}

async function readOrderProjection(page, orderId) {
  return page.evaluate(async (id) => {
    const orders = window.Doke && window.Doke.services && window.Doke.services.orders;
    if (!orders || typeof orders.getById !== 'function') return null;
    return orders.getById(id);
  }, orderId);
}

async function refreshAndAssertCard(page, orderId, expectedStatuses, evidenceName, evidenceDir) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.Doke && window.Doke.services && window.Doke.services.orders), null, { timeout: 20_000 });
  const selector = `[data-order-id="${cssEscape(orderId)}"], .order-card[data-id="${cssEscape(orderId)}"]`;
  const card = page.locator(selector).first();
  await card.waitFor({ state: 'visible', timeout: 20_000 });
  const status = String(await card.getAttribute('data-status') || '').toLowerCase();
  const statusText = String(await card.locator('.order-card__status-text').first().textContent().catch(() => '') || '').toLowerCase();
  const matches = expectedStatuses.some((item) => status === item || statusText.includes(item));
  if (!matches) throw new Error(`Order ${orderId} visual status did not match ${expectedStatuses.join(', ')}; data-status=${status}; text=${statusText}`);
  const screenshotPath = path.join(evidenceDir, `${evidenceName}.png`);
  await card.screenshot({ path: screenshotPath });
  report.screenshots.push(path.relative(root, screenshotPath).replace(/\\/g, '/'));
}

async function assertCardAbsent(page, orderId) {
  if (!page || page.isClosed()) return;
  await page.reload({ waitUntil: 'domcontentloaded' });
  const selector = `[data-order-id="${cssEscape(orderId)}"], .order-card[data-id="${cssEscape(orderId)}"]`;
  await page.waitForTimeout(700);
  if (await page.locator(selector).count()) throw new Error(`Order ${orderId} remained visible after cleanup.`);
}

async function cleanupRunId(runId) {
  const first = await invokeCleanup(runId);
  const second = await invokeCleanup(runId);
  return { first: sanitizeCleanup(first), second: sanitizeCleanup(second) };
}

async function invokeCleanup(runId) {
  const supabaseUrl = stripTrailingSlash(process.env[ENV.supabaseUrl]);
  const key = process.env[ENV.serviceRoleKey];
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/cleanup_order_canary_run`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_run_id: runId })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`cleanup_order_canary_run failed with ${response.status}: ${body.message || body.code || 'unknown error'}`);
  return body;
}

function sanitizeCleanup(value) {
  return {
    status: value && value.status || '',
    runId: value && value.runId || '',
    orderId: value && value.orderId || null,
    deleted: value && value.deleted || {}
  };
}

function cssEscape(value) {
  return String(value || '').replace(/(["\\])/g, '\\$1');
}

function stripTrailingSlash(value) {
  return String(value || '').replace(/\/+$/, '');
}

function record(name, status, detail = '') {
  report.checks.push({ name, status, detail });
}

function maybeWriteReport() {
  if (!writeReport) return;
  const outputPath = path.join(root, process.env[ENV.reportPath] || DEFAULT_REPORT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`ORD-A06 Playwright report written to ${path.relative(root, outputPath)}`);
}

function printPlan() {
  console.log('ORD-A06 Playwright executor dry-run:');
  report.plan.forEach((step, index) => console.log(`${index + 1}. ${step}`));
  printReport();
}

function printReport() {
  console.log(`ORD-A06 Playwright executor status: ${report.status}`);
  report.checks.forEach((entry) => console.log(`- ${entry.status}: ${entry.name}${entry.detail ? ` — ${entry.detail}` : ''}`));
  report.warnings.forEach((warning) => console.warn(`- warning: ${warning}`));
  report.failures.forEach((failure) => console.error(`- failure: ${failure}`));
}

function failIfNeeded() {
  if (report.failures.length) process.exitCode = 1;
}
