#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const checkEnv = args.has('--check-env');
const execute = args.has('--execute');
const writeReport = args.has('--write-report');

const AUTHORIZATION = 'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING';
const PROJECT_REF = 'zwkczgewzbsorbrjuzpb';
const DEFAULT_REPORT = 'reports/generated/sched-001-c01d-authenticated-browser-read-only-canary-report.json';
const ALLOWED_AFTER_LOGIN = new Set(['GET', 'HEAD', 'OPTIONS']);
const FORBIDDEN_CONTROL_SELECTORS = [
  '[data-order-schedule-confirm]',
  '[data-order-schedule-reschedule]',
  '[data-order-schedule-cancel]'
];

const ENV = Object.freeze({
  environment: 'DOKE_ENVIRONMENT',
  authorization: 'DOKE_SCHED_C01D_AUTHORIZATION',
  expectedHead: 'DOKE_SCHED_C01D_EXPECTED_HEAD_SHA',
  allowNetwork: 'DOKE_SCHED_C01D_ALLOW_NETWORK',
  allowExecute: 'DOKE_SCHED_C01D_EXECUTE',
  webBaseUrl: 'DOKE_SCHED_C01D_WEB_BASE_URL',
  projectRef: 'SUPABASE_PROJECT_REF',
  clientEmail: 'DOKE_STAGING_CLIENT_EMAIL',
  clientPassword: 'DOKE_STAGING_CLIENT_PASSWORD',
  professionalEmail: 'DOKE_STAGING_PROFESSIONAL_EMAIL',
  professionalPassword: 'DOKE_STAGING_PROFESSIONAL_PASSWORD',
  manifestPath: 'DOKE_SCHED_C01D_CASE_MANIFEST_PATH',
  manifestDigest: 'DOKE_SCHED_C01D_CASE_MANIFEST_SHA256',
  envelopePath: 'DOKE_SCHED_C01D_AUTHORIZATION_ENVELOPE_PATH',
  envelopeDigest: 'DOKE_SCHED_C01D_AUTHORIZATION_ENVELOPE_SHA256',
  browserPath: 'DOKE_PLAYWRIGHT_EXECUTABLE_PATH',
  reportPath: 'DOKE_SCHED_C01D_REPORT_PATH'
});

const report = {
  contractVersion: 'sched-c01d-authenticated-browser-read-only-canary-execution-v1',
  generatedAt: new Date().toISOString(),
  mode: dryRun ? 'dry-run' : checkEnv ? 'check-env' : execute ? 'execute' : 'blocked',
  status: 'not_evaluated',
  headSha: '',
  projectRef: PROJECT_REF,
  credentialsRecorded: false,
  rawIdentifiersRecorded: false,
  screenshotsCaptured: 0,
  videosCaptured: 0,
  tracesCaptured: 0,
  browserContextsCreated: 0,
  stagingReadsPerformed: 0,
  stagingMutationsPerformed: 0,
  postLoginMutationRequests: 0,
  selectedCases: [],
  surfaceChecks: [],
  failures: [],
  warnings: []
};

main().catch((error) => {
  fail(error && (error.stack || error.message) || String(error));
  report.status = 'failed';
  finish(1);
});

async function main() {
  validateMode();
  validateStaticContract();

  if (dryRun) {
    report.status = report.failures.length ? 'failed' : 'dry_run_only';
    finish(report.failures.length ? 1 : 0);
    return;
  }

  validateEnvironment();
  if (report.failures.length) {
    report.status = 'blocked_by_environment';
    finish(1);
    return;
  }

  if (checkEnv) {
    report.status = 'environment_ready_for_authorized_read_only_execution';
    finish(0);
    return;
  }

  if (!execute || process.env[ENV.allowExecute] !== '1') {
    fail(`Real execution requires --execute and ${ENV.allowExecute}=1.`);
    report.status = 'blocked_until_explicit_execute';
    finish(1);
    return;
  }

  await executeCanary();
  report.status = report.failures.length ? 'failed' : 'authenticated_browser_read_only_canary_passed';
  finish(report.failures.length ? 1 : 0);
}

function validateMode() {
  const selected = [dryRun, checkEnv, execute].filter(Boolean).length;
  if (selected !== 1) fail('Exactly one of --dry-run, --check-env or --execute is required.');
}

function validateStaticContract() {
  const required = [
    'assets/js/patterns/order-schedule-presentation.js',
    'assets/js/pages/pedidos-local-orders.js',
    'assets/js/pages/pedidos/orders-details.js',
    'assets/js/pages/mensagens.js',
    'auth/login.html',
    'pedidos.html',
    'mensagens.html',
    'config/sched-001-c01d-authenticated-browser-canary-readiness.json'
  ];
  for (const file of required) {
    if (!fs.existsSync(path.join(root, file))) fail(`Missing required C01D runtime asset: ${file}`);
  }
  const source = fs.readFileSync(__filename, 'utf8');
  const forbiddenFragments = [('@' + 'doke.local'), ('service' + '_role'), ('eyJ' + 'hbGciOi')];
  for (const fragment of forbiddenFragments) {
    if (source.includes(fragment)) fail(`Executor contains forbidden credential material fragment: ${fragment}`);
  }
}

function validateEnvironment() {
  const required = Object.values(ENV).filter((name) => ![ENV.browserPath, ENV.reportPath].includes(name));
  for (const name of required) {
    if (!String(process.env[name] || '').trim()) fail(`${name} is required.`);
  }
  exact(ENV.environment, 'staging');
  exact(ENV.authorization, AUTHORIZATION);
  exact(ENV.allowNetwork, '1');
  exact(ENV.projectRef, PROJECT_REF);
  if (execute) exact(ENV.allowExecute, '1');

  const head = String(process.env[ENV.expectedHead] || '').trim();
  if (!/^[a-f0-9]{40}$/.test(head)) fail(`${ENV.expectedHead} must be a 40-character commit SHA.`);
  report.headSha = head;

  const web = String(process.env[ENV.webBaseUrl] || '').trim();
  try {
    const url = new URL(web);
    if (!['127.0.0.1', 'localhost'].includes(url.hostname)) fail('C01D web target must be the isolated local PR server.');
  } catch {
    fail(`${ENV.webBaseUrl} must be a valid URL.`);
  }

  if (String(process.env[ENV.clientEmail] || '').trim().toLowerCase() === String(process.env[ENV.professionalEmail] || '').trim().toLowerCase()) {
    fail('Client and professional accounts must be distinct.');
  }

  validateJsonFile(ENV.manifestPath, ENV.manifestDigest, validateManifest);
  validateJsonFile(ENV.envelopePath, ENV.envelopeDigest, validateEnvelope);
}

function validateJsonFile(pathEnv, digestEnv, validator) {
  const file = path.resolve(root, process.env[pathEnv] || '');
  if (!fs.existsSync(file)) {
    fail(`${pathEnv} does not point to an existing file.`);
    return;
  }
  const bytes = fs.readFileSync(file);
  const digest = sha256(bytes);
  if (digest !== String(process.env[digestEnv] || '').trim().toLowerCase()) {
    fail(`${digestEnv} does not match ${pathEnv}.`);
    return;
  }
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); }
  catch (error) { fail(`${pathEnv} is invalid JSON: ${error.message}`); return; }
  validator(value, digest);
}

function validateManifest(manifest, digest) {
  if (manifest.contractVersion !== 'sched-c01d-read-only-case-manifest-v1') fail('Case manifest contractVersion mismatch.');
  if (manifest.projectRef !== PROJECT_REF) fail('Case manifest projectRef mismatch.');
  if (manifest.headSha !== process.env[ENV.expectedHead]) fail('Case manifest headSha mismatch.');
  if (!Array.isArray(manifest.requiredAuthorities) || !manifest.requiredAuthorities.includes('canonical_confirmed')) fail('Manifest must require canonical_confirmed.');
  if (!Array.isArray(manifest.alternateAuthorities) || !manifest.alternateAuthorities.some((value) => value === 'client_intent' || value === 'none')) fail('Manifest must require client_intent or none.');
  if (Number(manifest.maximumOrders) < 2 || Number(manifest.maximumOrders) > 4) fail('Manifest maximumOrders must be between 2 and 4.');
  report.caseManifestDigest = digest;
  report.manifest = {
    requiredAuthorities: manifest.requiredAuthorities,
    alternateAuthorities: manifest.alternateAuthorities,
    maximumOrders: Number(manifest.maximumOrders)
  };
}

function validateEnvelope(envelope, digest) {
  if (envelope.contractVersion !== 'sched-c01d-external-authorization-envelope-v1') fail('Authorization envelope contractVersion mismatch.');
  if (envelope.headSha !== process.env[ENV.expectedHead]) fail('Authorization envelope headSha mismatch.');
  if (envelope.projectRef !== PROJECT_REF) fail('Authorization envelope projectRef mismatch.');
  if (envelope.authorizationPhraseDigest !== sha256(AUTHORIZATION)) fail('Authorization phrase digest mismatch.');
  if (envelope.caseManifestDigest !== report.caseManifestDigest) fail('Envelope case manifest digest mismatch.');
  if (envelope.clientAccountDigest !== sha256(normalizeEmail(process.env[ENV.clientEmail]))) fail('Envelope client account binding mismatch.');
  if (envelope.professionalAccountDigest !== sha256(normalizeEmail(process.env[ENV.professionalEmail]))) fail('Envelope professional account binding mismatch.');
  const issued = Date.parse(envelope.issuedAt || '');
  const expires = Date.parse(envelope.expiresAt || '');
  const now = Date.now();
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || expires <= issued || expires - issued > 7_200_000) fail('Authorization envelope lifetime is invalid.');
  if (now < issued - 60_000 || now > expires) fail('Authorization envelope is not currently valid.');
  report.authorizationEnvelopeDigest = digest;
}

function exact(name, expected) {
  if (String(process.env[name] || '') !== expected) fail(`${name} must equal the authorized value.`);
}

async function executeCanary() {
  const { chromium } = require('@playwright/test');
  const launchOptions = { headless: true };
  if (process.env[ENV.browserPath]) {
    launchOptions.executablePath = process.env[ENV.browserPath];
    launchOptions.args = ['--no-sandbox', '--disable-dev-shm-usage'];
  }

  const browser = await chromium.launch(launchOptions);
  const clientContext = await createContext(browser, 'client');
  const professionalContext = await createContext(browser, 'professional');
  report.browserContextsCreated = 2;

  try {
    const client = await inspectPersona(clientContext, 'client', process.env[ENV.clientEmail], process.env[ENV.clientPassword]);
    const professional = await inspectPersona(professionalContext, 'professional', process.env[ENV.professionalEmail], process.env[ENV.professionalPassword]);
    const all = client.cases.concat(professional.cases);
    const canonical = all.find((entry) => entry.authority === 'canonical_confirmed');
    const alternate = all.find((entry) => entry.authority === 'client_intent' || entry.authority === 'none');
    if (!canonical) fail('No authorized visible canonical_confirmed order case was found.');
    if (!alternate) fail('No authorized visible client_intent or none order case was found.');
    if (canonical) await inspectMessages(clientContext, professionalContext, canonical);
    if (alternate && alternate.orderDigest !== canonical?.orderDigest) await inspectMessages(clientContext, professionalContext, alternate);
  } finally {
    await Promise.allSettled([clientContext.close(), professionalContext.close()]);
    await browser.close();
  }
}

async function createContext(browser, persona) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
  await context.addInitScript(() => {
    window.DOKE_RUNTIME_CONFIG = {
      environment: 'staging',
      flags: { enableNetworkRequests: true },
      dataProvider: 'mock',
      ordersProvider: 'supabase-read',
      ordersReadProvider: 'supabase-read',
      ordersWriteCanary: false,
      orderWriteActivation: false
    };
  });
  context.__persona = persona;
  return context;
}

async function inspectPersona(context, persona, email, password) {
  const page = await context.newPage();
  const mutations = [];
  const requests = [];
  page.on('request', (request) => requests.push({ method: request.method(), url: shapeUrl(request.url()) }));

  await login(page, email, password, persona);
  await installReadOnlyGuard(page, mutations);
  await navigateOrders(page);
  const cases = await collectOrderCases(page, persona);
  if (!cases.length) report.warnings.push(`${persona} account has no visible order cards.`);
  for (const orderCase of cases.slice(0, report.manifest.maximumOrders)) {
    await inspectOrdersDetail(page, orderCase);
  }
  if (mutations.length) {
    report.postLoginMutationRequests += mutations.length;
    fail(`${persona} attempted post-login mutation requests: ${mutations.map((entry) => entry.method + ' ' + entry.url).join(', ')}`);
  }
  report.stagingReadsPerformed += requests.filter((entry) => /supabase\.co/.test(entry.url) && ALLOWED_AFTER_LOGIN.has(entry.method)).length;
  await page.close();
  return { persona, cases };
}

async function login(page, email, password, persona) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const loginUrl = `${base}/auth/login.html?next=../pedidos.html%3FdokeTarget%3Dstaging`;
  await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
  await page.locator('#email-login').fill(email);
  await page.locator('#senha-login').fill(password);
  await Promise.all([
    page.waitForURL(/\/pedidos\.html(?:[?#].*)?$/, { timeout: 30_000 }),
    page.locator('[data-auth-submit]').click()
  ]);
  await page.waitForFunction(() => Boolean(window.Doke?.session?.getCurrentUser?.()?.id), null, { timeout: 20_000 });
  const user = await page.evaluate(() => {
    const value = window.Doke?.session?.getCurrentUser?.() || null;
    return value ? { id: value.id, role: value.role } : null;
  });
  if (!user?.id) throw new Error(`${persona} login did not materialize a canonical user.`);
  if (persona === 'professional' && user.role !== 'professional') throw new Error(`Professional credential resolved as role=${user.role || 'unknown'}.`);
}

async function installReadOnlyGuard(page, mutations) {
  await page.route('**/*', async (route) => {
    const request = route.request();
    const method = request.method().toUpperCase();
    if (ALLOWED_AFTER_LOGIN.has(method)) return route.continue();
    mutations.push({ method, url: shapeUrl(request.url()) });
    return route.abort('blockedbyclient');
  });
}

async function navigateOrders(page) {
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  const url = `${base}/pedidos.html?dokeTarget=staging&dokeOrdersProvider=supabase-read&dokeOrdersReadProvider=supabase-read&dokeEnableNetwork=1`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => {
    const list = document.querySelector('.orders-list');
    return Boolean(list && (list.dataset.localOrdersRendered === 'true' || document.querySelector('.order-card[data-id]')));
  }, null, { timeout: 30_000 });
}

async function collectOrderCases(page, persona) {
  const cases = await page.locator('.order-card[data-id]').evaluateAll((cards, forbiddenSelectors) => cards.map((card) => {
    const visibleSchedule = card.querySelector('[data-order-schedule-authority]');
    return {
      rawId: card.dataset.id || '',
      authority: card.dataset.scheduleAuthority || 'none',
      hasCanonicalSchedule: card.dataset.hasCanonicalSchedule === 'true',
      hasReservation: Boolean(card.dataset.scheduleReservationId),
      hasScheduledAt: Boolean(card.dataset.scheduledAt),
      presentationTitle: card.dataset.schedulePresentationTitle || '',
      presentationValue: card.dataset.schedulePresentationValue || visibleSchedule?.textContent?.trim() || '',
      visibleAuthority: visibleSchedule?.getAttribute('data-order-schedule-authority') || '',
      forbiddenControls: forbiddenSelectors.filter((selector) => card.querySelector(selector)).length,
      legacyDataDesejada: /Data desejada/i.test(card.textContent || ''),
      legacyAgendaAnuncio: /Agenda do anúncio/i.test(card.textContent || '')
    };
  }), FORBIDDEN_CONTROL_SELECTORS);

  return cases.map((entry) => {
    const orderDigest = sha256(entry.rawId);
    const sanitized = {
      persona,
      orderDigest,
      authority: entry.authority,
      presentationDigest: sha256(`${entry.presentationTitle}|${entry.presentationValue}`)
    };
    validateCardCase(entry, sanitized);
    report.selectedCases.push(sanitized);
    return Object.assign({}, sanitized, { rawId: entry.rawId });
  });
}

function validateCardCase(entry, sanitized) {
  check(sanitized, 'orders_card.authority_matches_visible', entry.visibleAuthority === entry.authority);
  check(sanitized, 'orders_card.no_schedule_command_controls', entry.forbiddenControls === 0);
  check(sanitized, 'orders_card.legacy_copy_absent', !entry.legacyAgendaAnuncio);
  if (entry.authority === 'canonical_confirmed') {
    check(sanitized, 'orders_card.canonical_tuple_complete', entry.hasCanonicalSchedule && entry.hasReservation && entry.hasScheduledAt);
    check(sanitized, 'orders_card.confirmed_copy', /Horário confirmado|Agendado/i.test(`${entry.presentationTitle} ${entry.presentationValue}`));
  } else if (entry.authority === 'client_intent') {
    check(sanitized, 'orders_card.intent_not_confirmed', !/Horário confirmado|Agendado/i.test(`${entry.presentationTitle} ${entry.presentationValue}`));
  } else if (entry.authority === 'incomplete_projection') {
    check(sanitized, 'orders_card.incomplete_fails_closed', /Sincronização|indisponível|atualize/i.test(`${entry.presentationTitle} ${entry.presentationValue}`));
  }
}

async function inspectOrdersDetail(page, orderCase) {
  const card = page.locator(`.order-card[data-id="${cssEscape(orderCase.rawId)}"]`);
  if (!await card.count()) return;
  const button = card.locator('[data-order-open="details"]');
  if (!await button.count()) {
    report.warnings.push(`No details button for order digest ${orderCase.orderDigest}.`);
    return;
  }
  await button.click();
  const row = page.locator('[data-orders-detail-layer]:not([hidden]) [data-detail-schedule-row]');
  await row.waitFor({ state: 'attached', timeout: 10_000 });
  const detail = await row.evaluate((node) => ({
    authority: node.dataset.scheduleAuthority || 'none',
    title: node.querySelector('[data-detail-schedule-label]')?.textContent?.trim() || '',
    value: node.querySelector('[data-detail-schedule]')?.textContent?.trim() || '',
    hidden: node.hidden
  }));
  const surface = { persona: orderCase.persona, orderDigest: orderCase.orderDigest, authority: orderCase.authority };
  check(surface, 'orders_detail.authority_consistent', detail.authority === orderCase.authority);
  check(surface, 'orders_detail.presentation_visible', !detail.hidden && Boolean(detail.value));
  check(surface, 'orders_detail.presentation_digest_consistent', sha256(`${detail.title}|${detail.value}`) === orderCase.presentationDigest);
  await page.locator('[data-orders-detail-layer] [data-orders-detail-close]').first().click();
}

async function inspectMessages(clientContext, professionalContext, orderCase) {
  const context = orderCase.persona === 'professional' ? professionalContext : clientContext;
  const page = await context.newPage();
  const mutations = [];
  await installReadOnlyGuard(page, mutations);
  const base = stripSlash(process.env[ENV.webBaseUrl]);
  await page.goto(`${base}/mensagens.html?order=${encodeURIComponent(orderCase.rawId)}&dokeTarget=staging`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-messages-order-context]', { timeout: 30_000 });
  const summary = await page.locator('[data-messages-order-context]').evaluate((node) => {
    const schedule = node.querySelector('[data-schedule-authority]');
    return {
      authority: schedule?.dataset.scheduleAuthority || 'none',
      title: schedule?.querySelector('dt')?.textContent?.trim() || '',
      value: schedule?.querySelector('dd')?.textContent?.trim() || '',
      text: node.textContent || '',
      forbiddenControls: ['[data-order-schedule-confirm]','[data-order-schedule-reschedule]','[data-order-schedule-cancel]'].filter((selector) => node.querySelector(selector)).length
    };
  });
  const surface = { persona: orderCase.persona, orderDigest: orderCase.orderDigest, authority: orderCase.authority };
  check(surface, 'messages_summary.authority_consistent', summary.authority === orderCase.authority);
  check(surface, 'messages_summary.presentation_digest_consistent', sha256(`${summary.title}|${summary.value}`) === orderCase.presentationDigest);
  check(surface, 'messages_summary.legacy_data_desejada_absent', !/Data desejada/i.test(summary.text));
  check(surface, 'messages_summary.legacy_agenda_anuncio_absent', !/Agenda do anúncio/i.test(summary.text));
  check(surface, 'messages_summary.no_schedule_command_controls', summary.forbiddenControls === 0);

  await page.locator('[data-messages-open-order-detail]').click();
  const detailSection = page.locator('[data-messages-order-detail-layer]:not([hidden]) [data-detail-schedule-section]');
  await detailSection.waitFor({ state: 'attached', timeout: 10_000 });
  const detail = await detailSection.evaluate((node) => ({
    authority: node.dataset.scheduleAuthority || 'none',
    title: node.querySelector('strong, .orders-detail-section__eyebrow')?.textContent?.trim() || '',
    value: node.querySelector('[data-detail-schedule]')?.textContent?.trim() || '',
    text: node.textContent || ''
  }));
  check(surface, 'messages_detail.authority_consistent', detail.authority === orderCase.authority);
  check(surface, 'messages_detail.presentation_contains_value', detail.text.includes(summary.value));
  if (mutations.length) {
    report.postLoginMutationRequests += mutations.length;
    fail(`Messages surface attempted mutation requests: ${mutations.map((entry) => entry.method + ' ' + entry.url).join(', ')}`);
  }
  await page.close();
}

function check(surface, name, passed) {
  const entry = { surface: name, persona: surface.persona, orderDigest: surface.orderDigest, authority: surface.authority, passed: Boolean(passed) };
  report.surfaceChecks.push(entry);
  if (!passed) fail(`${name} failed for ${surface.orderDigest}.`);
}

function finish(code) {
  report.stagingMutationsPerformed = report.postLoginMutationRequests;
  if (writeReport || execute || checkEnv) {
    const file = path.resolve(root, process.env[ENV.reportPath] || DEFAULT_REPORT);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  }
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  process.exitCode = code;
}

function fail(message) { report.failures.push(String(message)); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function normalizeEmail(value) { return String(value || '').trim().toLowerCase(); }
function stripSlash(value) { return String(value || '').replace(/\/$/, ''); }
function shapeUrl(value) {
  try { const url = new URL(value); return `${url.origin}${url.pathname}`; }
  catch { return 'invalid-url'; }
}
function cssEscape(value) { return String(value).replace(/["\\]/g, '\\$&'); }
