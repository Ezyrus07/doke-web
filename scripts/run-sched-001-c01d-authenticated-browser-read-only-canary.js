#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const executorPath = path.join(__dirname, 'execute-sched-001-c01d-authenticated-browser-read-only-canary.js');
const defaultReport = 'reports/generated/sched-001-c01d-authenticated-browser-read-only-canary-report.json';
const watchdogMs = 8 * 60 * 1000;

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
  const result = spawnSync(
    process.execPath,
    [executorPath, ...process.argv.slice(2)],
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
}

try {
  process.exitCode = run();
} catch (error) {
  console.error(error && (error.stack || error.message) || String(error));
  process.exitCode = 1;
}
