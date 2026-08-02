#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const PATHS = Object.freeze({
  config: 'config/sched-001-c01d-authenticated-browser-canary-readiness.json',
  docs: 'docs/SCHED-001-C01D-AUTHENTICATED-BROWSER-CANARY-READINESS.md',
  evidence: 'docs/validation/SCHED-001-C01D-AUTHENTICATED-BROWSER-CANARY-READINESS.json',
  planner: 'scripts/plan-sched-001-c01d-authenticated-browser-canary.js',
  audit: 'scripts/audit-sched-001-c01d-authenticated-browser-canary-readiness.js',
  test: 'scripts/test-sched-001-c01d-authenticated-browser-canary-readiness.js',
  workflow: '.github/workflows/sched-001-c01d-authenticated-browser-canary-readiness.yml',
  c01cConfig: 'config/sched-001-c01c-deterministic-frontend-presentation.json',
  presenter: 'assets/js/patterns/order-schedule-presentation.js',
  ordersCard: 'assets/js/pages/pedidos-local-orders.js',
  ordersDetail: 'assets/js/pages/pedidos/orders-details.js',
  messages: 'assets/js/pages/mensagens.js',
  matrix: 'config/domain-completion-matrix.json',
  executor: 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js',
  runner: 'scripts/run-sched-001-c01d-authenticated-browser-read-only-canary.js',
  runnerTest: 'scripts/test-sched-001-c01d-authenticated-browser-read-only-canary-runner.js',
  bootstrapTest: 'scripts/test-sched-001-c01d-authenticated-browser-bootstrap-runtime.js'
});

Object.values(PATHS).forEach((file) => assert(fs.existsSync(file), `Missing SCHED-C01D readiness asset: ${file}`));

const config = JSON.parse(fs.readFileSync(PATHS.config, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(PATHS.evidence, 'utf8'));
const docs = fs.readFileSync(PATHS.docs, 'utf8');
const planner = fs.readFileSync(PATHS.planner, 'utf8');
const workflow = fs.readFileSync(PATHS.workflow, 'utf8');
const c01c = JSON.parse(fs.readFileSync(PATHS.c01cConfig, 'utf8'));
const presenter = fs.readFileSync(PATHS.presenter, 'utf8');
const ordersCard = fs.readFileSync(PATHS.ordersCard, 'utf8');
const ordersDetail = fs.readFileSync(PATHS.ordersDetail, 'utf8');
const messages = fs.readFileSync(PATHS.messages, 'utf8');
const matrix = JSON.parse(fs.readFileSync(PATHS.matrix, 'utf8'));
const executor = fs.readFileSync(PATHS.executor, 'utf8');
const runner = fs.readFileSync(PATHS.runner, 'utf8');
const runnerTest = fs.readFileSync(PATHS.runnerTest, 'utf8');
const bootstrapTest = fs.readFileSync(PATHS.bootstrapTest, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.contractVersion, 'sched-c01d-authenticated-browser-read-only-canary-readiness-v1');
assert.strictEqual(config.scope, 'repository_only_authenticated_browser_read_only_canary_readiness');
assert.strictEqual(config.environment, 'doke-web-staging');
assert.strictEqual(config.projectRef, 'zwkczgewzbsorbrjuzpb');
assert.strictEqual(
  config.authorization.requiredExactPhrase,
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING'
);
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.authorization.browserExecutionCovered, false);
assert.strictEqual(config.authorization.dataMutationCovered, false);
assert.strictEqual(config.authorization.schedulingCommandsCovered, false);
assert.strictEqual(config.runtimeGate.failClosed, true);
assert.strictEqual(config.runtimeGate.browserContexts, 2);
assert.strictEqual(config.runtimeGate.browserContextIsolationRequired, true);
assert.strictEqual(config.runtimeGate.postLoginReadOnlyGuardRequired, true);
assert.deepStrictEqual(config.runtimeGate.allowedPostLoginMethods, ['GET', 'HEAD', 'OPTIONS']);
assert.strictEqual(config.runtimeGate.serviceRoleMaterialInBrowserForbidden, true);
assert.strictEqual(config.runtimeGate.directDatabaseAccessForbidden, true);
assert.strictEqual(config.runtimeGate.directSchedulingRpcForbidden, true);
assert.strictEqual(config.runtimeGate.canonicalExecutorRequired, true);
assert.strictEqual(config.runtimeGate.runtimeSourceRewritingForbidden, true);
assert.strictEqual(config.runtimeGate.bootstrapWatchdogsRequired, true);
assert.strictEqual(config.runtimeGate.initializerPromiseMustBeAwaited, true);
assert.strictEqual(config.runtimeGate.remoteHydrationTerminalStateRequired, true);
assert.strictEqual(config.canonicalRuntime.legacyRuntimePreparersRemoved, true);
assert.strictEqual(config.canonicalRuntime.runnerMayOnlySuperviseProcessWatchdog, true);
assert.strictEqual(config.externalAuthorizationEnvelope.repositoryStorageForbidden, true);
assert.strictEqual(config.externalAuthorizationEnvelope.rawIdentifiersInRepositoryForbidden, true);
assert.strictEqual(config.externalAuthorizationEnvelope.maxLifetimeSeconds, 7200);
assert.strictEqual(config.caseManifest.canonicalConfirmedCaseRequired, true);
assert.strictEqual(config.caseManifest.clientIntentOrNoneCaseRequired, true);
assert.strictEqual(config.caseManifest.liveIncompleteProjectionCaseForbidden, true);
assert.strictEqual(config.caseManifest.unexpectedIncompleteProjectionMustFailClosed, true);
assert.strictEqual(config.caseManifest.maximumOrders, 4);
assert.deepStrictEqual(config.surfaces, [
  'orders_card',
  'orders_detail_drawer',
  'messages_order_summary',
  'messages_order_detail'
]);
assert.strictEqual(config.evidencePolicy.screenshotsAllowed, false);
assert.strictEqual(config.evidencePolicy.videoAllowed, false);
assert.strictEqual(config.evidencePolicy.traceAllowedOnlyOnFailure, false);
assert.strictEqual(config.evidencePolicy.htmlReportAllowed, false);
assert.strictEqual(config.evidencePolicy.jsonReportAllowed, true);
assert.strictEqual(config.capabilities.dryRunAvailable, true);
assert.strictEqual(config.capabilities.environmentCheckAvailable, false);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.capabilities.browserNetworkAvailable, false);
assert.strictEqual(config.capabilities.authenticatedCanaryExecuted, false);
assert.deepStrictEqual(config.effects, {
  stagingReads: 0,
  stagingMutations: 0,
  productionAccess: 0,
  accountsUsed: 0,
  browserContextsCreated: 0,
  networkRequestsPerformed: 0,
  migrationsApplied: 0,
  deploymentsPerformed: 0,
  mergePerformed: false,
  autoMergeEnabled: false
});

[
  'I_EXPLICITLY_AUTHORIZE_SCHED_C01D_AUTHENTICATED_BROWSER_READ_ONLY_CANARY_ON_DOKE_STAGING',
  'Generic continuation does not authorize browser execution.',
  'two isolated `BrowserContext` instances',
  '`GET`, `HEAD` and `OPTIONS`',
  'Screenshots, video, trace and HTML reports are disabled',
  'staging reads: `0`',
  'SCHED-C01D remains blocked'
].forEach((fragment) => assert(docs.includes(fragment), `C01D documentation missing: ${fragment}`));

assert(planner.includes("args.has('--dry-run')"));
assert(planner.includes('Only --dry-run is available'));
assert(planner.includes("status: 'authenticated_browser_execution_blocked'"));
[
  'process.env',
  '@playwright/test',
  'playwright',
  'fetch(',
  "require('http')",
  "require('https')",
  'child_process',
  '--execute',
  '--check-env'
].forEach((fragment) => assert(!planner.includes(fragment), `C01D planner contains prohibited capability: ${fragment}`));

assert.strictEqual(c01c.next.id, 'SCHED-C01D');
assert.strictEqual(c01c.safety.stagingAccess, false);
assert.strictEqual(c01c.implementation.remoteSchedulingCommandsActivated, false);
assert(presenter.includes('function deriveAuthority(order)'));
assert(presenter.includes('function getPresentation(order, options)'));
assert(presenter.includes("'canonical_confirmed'"));
assert(presenter.includes("'client_intent'"));
assert(presenter.includes("'incomplete_projection'"));
assert(ordersCard.includes('orderSchedulePresentation'));
assert(ordersDetail.includes('orderSchedulePresentation'));
assert(messages.includes('getCanonicalSchedulePresentation'));
assert(!messages.includes('Agenda do anúncio</dt>'));
assert(!messages.includes('<dt>Data desejada</dt>'));

[
  'data-order-schedule-confirm',
  'data-order-schedule-reschedule',
  'data-order-schedule-cancel'
].forEach((fragment) => {
  assert(!ordersCard.includes(fragment));
  assert(!ordersDetail.includes(fragment));
  assert(!messages.includes(fragment));
});

const versionParts = String(matrix.version).split('.').map(Number);
assert.strictEqual(versionParts[0], 1);
assert.strictEqual(versionParts[1], 3);
assert(versionParts[2] >= 73, 'C01D readiness requires matrix 1.3.73 or later');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
assert(sched, 'SCHED-001 missing from matrix');
assert(Array.isArray(sched.nextActions) && sched.nextActions.some((action) => action.includes('SCHED-C01D')));

assert(workflow.includes('name: Doke SCHED-C01D Authenticated Browser Canary Readiness'));
assert(workflow.includes('permissions:\n  contents: read'));
assert(workflow.includes('node scripts/audit-sched-001-c01d-authenticated-browser-canary-readiness.js'));
assert(workflow.includes('node scripts/test-sched-001-c01d-authenticated-browser-canary-readiness.js'));
assert(workflow.includes('node scripts/plan-sched-001-c01d-authenticated-browser-canary.js --dry-run'));
assert(workflow.includes('npm run audit:sched-001-c01c-deterministic-frontend-presentation'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'SERVICE_ROLE',
  'playwright install',
  'node_modules/@playwright/test/cli.js test',
  '--execute',
  '--check-env',
  'curl ',
  'psql ',
  'supabase ',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `C01D readiness workflow contains prohibited fragment: ${fragment}`));

assert(executor.includes("checkpoint('orders_remote_hydration_complete')"));
assert(executor.includes('await Promise.resolve(window.DokeInitOrders())'));
assert(executor.includes('orders_domcontentloaded_node_watchdog'));
assert(executor.includes('orders_prerequisites_node_watchdog'));
assert(executor.includes('path: localSupabaseUmd'));
assert(executor.includes('async function withPhaseTimeout'));
assert(runner.includes('timeout: watchdogMs'));
assert(!runner.includes('buildRuntimeSource'));
assert(!runner.includes('runtimePrefix'));
assert(runnerTest.includes('legacyRuntimePreparersRemoved') || runnerTest.includes('Legacy runtime preparer still exists'));
assert(bootstrapTest.includes('Canonical bootstrap contract missing'));
assert(!fs.existsSync('scripts/prepare-sched-001-c01d-authenticated-browser-login-runtime.js'));
assert(!fs.existsSync('scripts/prepare-sched-001-c01d-authenticated-browser-bootstrap-runtime.js'));
assert(!workflow.includes('prepare-sched-001-c01d-authenticated-browser-login-runtime.js'));
assert(!workflow.includes('prepare-sched-001-c01d-authenticated-browser-bootstrap-runtime.js'));

assert.strictEqual(config.canonicalRuntime.loginTargetsCanonicalOrdersUrl, true);
assert.strictEqual(config.canonicalRuntime.duplicateOrdersNavigationForbidden, true);
assert.strictEqual(config.canonicalRuntime.bootstrapRoutesInstalledBeforeLoginRedirect, true);
assert.strictEqual(config.canonicalRuntime.allowedReadRoutesUseFallback, true);
assert(executor.includes('await installOrdersBootstrapRoutes(page)'));
assert(executor.includes("waitUntil: 'domcontentloaded'"));
assert(executor.includes('encodeURIComponent(ordersPath)'));
assert(executor.includes('return route.fallback()'));
assert(executor.includes("checkpoint('orders_navigation_reused_login_target')"));
assert(!executor.includes("next=../pedidos.html%3FdokeTarget%3Dstaging"));
assert(!executor.includes('if (ALLOWED_AFTER_LOGIN.has(method)) return route.continue()'));

console.log('SCHED-C01D authenticated browser read-only canary readiness audit passed.');
