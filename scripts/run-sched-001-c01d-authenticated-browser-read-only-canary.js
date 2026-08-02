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
const unboundedCleanup = `  } finally {
    await Promise.allSettled([clientContext.close(), professionalContext.close()]);
    await browser.close();
  }
}`;
const boundedCleanup = `  } finally {
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
  }
}`;
const deferredFinish = `  process.stdout.write(JSON.stringify(report, null, 2) + '\\n');
  process.exitCode = code;`;
const deterministicFinish = `  const serialized = JSON.stringify(report, null, 2) + '\\n';
  fs.writeSync(1, serialized);
  process.exit(code);`;

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
  runtime = replaceExactlyOnce(runtime, unboundedCleanup, boundedCleanup, 'unbounded C01D browser cleanup');
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
    selectedCases: [],
    surfaceChecks: [],
    failures: ['runner_watchdog_timeout_before_executor_completion'],
    warnings: ['Execution counters are intentionally null because the child process was force-terminated.'],
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
