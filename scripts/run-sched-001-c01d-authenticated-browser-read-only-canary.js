#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const executorPath = path.join(__dirname, 'execute-sched-001-c01d-authenticated-browser-read-only-canary.js');
const runtimePrefix = '.sched-c01d-authenticated-browser-read-only-canary-runtime-';
const defaultReport = 'reports/generated/sched-001-c01d-authenticated-browser-read-only-canary-report.json';
const watchdogMs = 8 * 60 * 1000;
const legacyWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),";
const correctedWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { waitUntil: 'commit', timeout: 30_000 }),";
const reportTail = `  failures: [],
  warnings: []
};`;
const reportTailWithCheckpoints = `  failures: [],
  warnings: [],
  lastCheckpoint: 'initialized',
  checkpointHistory: []
};`;
const unboundedCleanup = `  } finally {
    await Promise.allSettled([clientContext.close(), professionalContext.close()]);
    await browser.close();
  }
}`;
const boundedCleanup = `  } finally {
    checkpoint('browser_cleanup_start');
    const cleanup = (async () => {
      await Promise.allSettled([clientContext.close(), professionalContext.close()]);
      await browser.close();
      return 'closed';
    })();
    const cleanupOutcome = await Promise.race([
      cleanup.catch((error) => {
        report.warnings.push('browser_cleanup_error:' + String(error && error.message || error));
        return 'error';
      }),
      new Promise((resolve) => setTimeout(() => resolve('timeout'), 10_000))
    ]);
    if (cleanupOutcome === 'timeout') {
      report.warnings.push('browser_cleanup_timeout_forced_exit');
    }
    checkpoint('browser_cleanup_complete');
  }
}`;
const deferredFinish = `  process.stdout.write(JSON.stringify(report, null, 2) + '\\n');
  process.exitCode = code;`;
const deterministicFinish = `  const serialized = JSON.stringify(report, null, 2) + '\\n';
  fs.writeSync(1, serialized);
  process.exit(code);`;
const executeSequence = `  const browser = await chromium.launch(launchOptions);
  const clientContext = await createContext(browser, 'client');
  const professionalContext = await createContext(browser, 'professional');
  report.browserContextsCreated = 2;

  try {
    const client = await inspectPersona(clientContext, 'client', process.env[ENV.clientEmail], process.env[ENV.clientPassword]);
    const professional = await inspectPersona(professionalContext, 'professional', process.env[ENV.professionalEmail], process.env[ENV.professionalPassword]);
    const all = client.cases.concat(professional.cases);`;
const boundedExecuteSequence = `  checkpoint('browser_launch_start');
  const browser = await chromium.launch(launchOptions);
  checkpoint('browser_launched');
  const clientContext = await createContext(browser, 'client');
  const professionalContext = await createContext(browser, 'professional');
  report.browserContextsCreated = 2;
  checkpoint('browser_contexts_created');

  try {
    checkpoint('client_inspection_start');
    const client = await withPhaseTimeout(
      inspectPersona(clientContext, 'client', process.env[ENV.clientEmail], process.env[ENV.clientPassword]),
      120_000,
      'client_inspection'
    );
    checkpoint('client_inspection_complete');
    checkpoint('professional_inspection_start');
    const professional = await withPhaseTimeout(
      inspectPersona(professionalContext, 'professional', process.env[ENV.professionalEmail], process.env[ENV.professionalPassword]),
      120_000,
      'professional_inspection'
    );
    checkpoint('professional_inspection_complete');
    const all = client.cases.concat(professional.cases);`;
const messageSequence = `    if (canonical) await inspectMessages(clientContext, professionalContext, canonical);
    if (alternate && alternate.orderDigest !== canonical?.orderDigest) await inspectMessages(clientContext, professionalContext, alternate);`;
const boundedMessageSequence = `    if (canonical) {
      checkpoint('canonical_messages_inspection_start');
      await withPhaseTimeout(inspectMessages(clientContext, professionalContext, canonical), 90_000, 'canonical_messages_inspection');
      checkpoint('canonical_messages_inspection_complete');
    }
    if (alternate && alternate.orderDigest !== canonical?.orderDigest) {
      checkpoint('alternate_messages_inspection_start');
      await withPhaseTimeout(inspectMessages(clientContext, professionalContext, alternate), 90_000, 'alternate_messages_inspection');
      checkpoint('alternate_messages_inspection_complete');
    }`;
const personaPageStart = `  const page = await context.newPage();
  const mutations = [];
  const requests = [];`;
const boundedPersonaPageStart = `  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(20_000);
  checkpoint(persona + '_page_created');
  const mutations = [];
  const requests = [];`;
const personaInspection = `  await login(page, email, password, persona);
  await installReadOnlyGuard(page, mutations);
  await navigateOrders(page);
  const cases = await collectOrderCases(page, persona);
  if (!cases.length) report.warnings.push(\`${'${persona}'} account has no visible order cards.\`);
  for (const orderCase of cases.slice(0, report.manifest.maximumOrders)) {
    await inspectOrdersDetail(page, orderCase);
  }`;
const boundedPersonaInspection = `  checkpoint(persona + '_login_start');
  await login(page, email, password, persona);
  checkpoint(persona + '_login_complete');
  await installReadOnlyGuard(page, mutations);
  checkpoint(persona + '_orders_navigation_start');
  await navigateOrders(page);
  checkpoint(persona + '_orders_navigation_complete');
  const cases = await collectOrderCases(page, persona);
  checkpoint(persona + '_orders_collected');
  if (!cases.length) report.warnings.push(\`${'${persona}'} account has no visible order cards.\`);
  const detailCandidates = [
    cases.find((entry) => entry.authority === 'canonical_confirmed'),
    cases.find((entry) => entry.authority === 'client_intent' || entry.authority === 'none')
  ].filter((entry, index, list) => entry && list.findIndex((candidate) => candidate.orderDigest === entry.orderDigest) === index);
  for (const orderCase of detailCandidates) {
    checkpoint(persona + '_orders_detail_start_' + orderCase.authority);
    await inspectOrdersDetail(page, orderCase);
    checkpoint(persona + '_orders_detail_complete_' + orderCase.authority);
  }`;
const messagesPageStart = `  const page = await context.newPage();
  const mutations = [];
  await installReadOnlyGuard(page, mutations);`;
const boundedMessagesPageStart = `  const page = await context.newPage();
  page.setDefaultTimeout(10_000);
  page.setDefaultNavigationTimeout(20_000);
  checkpoint('messages_page_created_' + orderCase.authority);
  const mutations = [];
  await installReadOnlyGuard(page, mutations);`;
const helperAnchor = `function check(surface, name, passed) {`;
const diagnosticHelpers = `async function withPhaseTimeout(promise, timeoutMs, label) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + '_timeout_after_' + timeoutMs + 'ms')), timeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function checkpoint(name) {
  report.lastCheckpoint = String(name);
  report.checkpointHistory.push({ name: String(name), at: new Date().toISOString() });
  if (report.checkpointHistory.length > 40) report.checkpointHistory.shift();
  if (writeReport || execute || checkEnv) {
    const file = path.resolve(root, process.env[ENV.reportPath] || DEFAULT_REPORT);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\\n');
  }
}

function check(surface, name, passed) {`;

function countOccurrences(source, fragment) {
  return source.split(fragment).length - 1;
}

function replaceExactlyOnce(source, before, after, label) {
  const matches = countOccurrences(source, before);
  if (matches !== 1) {
    throw new Error(`Expected exactly one ${label} contract, found ${matches}.`);
  }
  return source.replace(before, after);
}

function buildRuntimeSource(source) {
  let runtime = replaceExactlyOnce(source, legacyWait, correctedWait, 'legacy C01D login wait');
  runtime = replaceExactlyOnce(runtime, reportTail, reportTailWithCheckpoints, 'C01D report tail');
  runtime = replaceExactlyOnce(runtime, executeSequence, boundedExecuteSequence, 'C01D execution sequence');
  runtime = replaceExactlyOnce(runtime, messageSequence, boundedMessageSequence, 'C01D message sequence');
  runtime = replaceExactlyOnce(runtime, personaPageStart, boundedPersonaPageStart, 'C01D persona page defaults');
  runtime = replaceExactlyOnce(runtime, personaInspection, boundedPersonaInspection, 'C01D persona inspection');
  runtime = replaceExactlyOnce(runtime, messagesPageStart, boundedMessagesPageStart, 'C01D messages page defaults');
  runtime = replaceExactlyOnce(runtime, unboundedCleanup, boundedCleanup, 'unbounded C01D browser cleanup');
  runtime = replaceExactlyOnce(runtime, helperAnchor, diagnosticHelpers, 'C01D diagnostic helper anchor');
  runtime = replaceExactlyOnce(runtime, deferredFinish, deterministicFinish, 'deferred C01D process finish');
  return runtime;
}

function writeWatchdogReport() {
  const reportPath = path.resolve(
    process.cwd(),
    process.env.DOKE_SCHED_C01D_REPORT_PATH || defaultReport
  );
  let previous = {};
  try {
    previous = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch {
    previous = {};
  }

  const report = {
    contractVersion: previous.contractVersion || 'sched-c01d-authenticated-browser-read-only-canary-execution-v1',
    generatedAt: new Date().toISOString(),
    mode: 'execute',
    status: 'failed',
    headSha: String(process.env.DOKE_SCHED_C01D_EXPECTED_HEAD_SHA || previous.headSha || ''),
    projectRef: previous.projectRef || 'zwkczgewzbsorbrjuzpb',
    credentialsRecorded: false,
    rawIdentifiersRecorded: false,
    screenshotsCaptured: 0,
    videosCaptured: 0,
    tracesCaptured: 0,
    executionCountersComplete: false,
    browserContextsCreated: null,
    stagingReadsPerformed: null,
    stagingMutationsPerformed: null,
    postLoginMutationRequests: null,
    selectedCases: Array.isArray(previous.selectedCases) ? previous.selectedCases : [],
    surfaceChecks: Array.isArray(previous.surfaceChecks) ? previous.surfaceChecks : [],
    failures: ['runner_watchdog_timeout_before_executor_completion'],
    warnings: ['Execution counters are intentionally null because the child process was force-terminated.'],
    lastCheckpoint: previous.lastCheckpoint || 'unknown',
    checkpointHistory: Array.isArray(previous.checkpointHistory) ? previous.checkpointHistory : [],
    caseManifestDigest: previous.caseManifestDigest,
    manifest: previous.manifest,
    authorizationEnvelopeDigest: previous.authorizationEnvelopeDigest
  };

  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const serialized = JSON.stringify(report, null, 2) + '\n';
  fs.writeFileSync(reportPath, serialized);
  fs.writeSync(1, serialized);
}

function run() {
  const source = fs.readFileSync(executorPath, 'utf8');
  const runtimeSource = buildRuntimeSource(source);
  const runtimePath = path.join(
    __dirname,
    `${runtimePrefix}${process.pid}-${Date.now()}.js`
  );

  try {
    fs.writeFileSync(runtimePath, runtimeSource, {
      encoding: 'utf8',
      mode: 0o700
    });

    const result = spawnSync(
      process.execPath,
      [runtimePath, ...process.argv.slice(2)],
      {
        cwd: process.cwd(),
        env: process.env,
        encoding: null,
        maxBuffer: 16 * 1024 * 1024,
        timeout: watchdogMs,
        killSignal: 'SIGKILL'
      }
    );

    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error?.code === 'ETIMEDOUT' && process.argv.includes('--execute')) {
      writeWatchdogReport();
      return 1;
    }
    if (result.error) throw result.error;
    return Number.isInteger(result.status) ? result.status : 1;
  } finally {
    fs.rmSync(runtimePath, { force: true });
  }
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(error && (error.stack || error.message) || String(error));
  process.exitCode = 1;
}
