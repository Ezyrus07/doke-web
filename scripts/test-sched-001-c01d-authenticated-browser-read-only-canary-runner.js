#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const runner = 'scripts/run-sched-001-c01d-authenticated-browser-read-only-canary.js';
const preparer = 'scripts/prepare-sched-001-c01d-authenticated-browser-login-runtime.js';
const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
const runtimePrefix = '.sched-c01d-authenticated-browser-read-only-canary-runtime-';
const legacyWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),";
const unboundedCleanup = `  } finally {
    await Promise.allSettled([clientContext.close(), professionalContext.close()]);
    await browser.close();
  }
}`;
const deferredFinish = `  process.stdout.write(JSON.stringify(report, null, 2) + '\\n');
  process.exitCode = code;`;
const unboundedDetailLoop = `  for (const orderCase of cases.slice(0, report.manifest.maximumOrders)) {
    await inspectOrdersDetail(page, orderCase);
  }`;

const executorSource = fs.readFileSync(executor, 'utf8');
const runnerSource = fs.readFileSync(runner, 'utf8');
const preparerSource = fs.readFileSync(preparer, 'utf8');
assert.strictEqual(executorSource.split(legacyWait).length - 1, 1);
assert.strictEqual(executorSource.split(unboundedCleanup).length - 1, 1);
assert.strictEqual(executorSource.split(deferredFinish).length - 1, 1);
assert.strictEqual(executorSource.split(unboundedDetailLoop).length - 1, 1);
assert(runnerSource.includes("waitUntil: 'commit'"));
assert(!runnerSource.includes("waitUntil: 'domcontentloaded'"));
assert(runnerSource.includes("resolve('timeout'), 10_000"));
assert(runnerSource.includes('browser_cleanup_timeout_forced_exit'));
assert(runnerSource.includes('timeout: watchdogMs'));
assert(runnerSource.includes("killSignal: 'SIGKILL'"));
assert(runnerSource.includes('runner_watchdog_timeout_before_executor_completion'));
assert(runnerSource.includes('executionCountersComplete: false'));
assert(runnerSource.includes("lastCheckpoint: previous.lastCheckpoint || 'unknown'"));
assert(runnerSource.includes('checkpointHistory: Array.isArray(previous.checkpointHistory)'));
assert(runnerSource.includes("lastCheckpoint: 'initialized'"));
assert(runnerSource.includes('async function withPhaseTimeout'));
assert(runnerSource.includes("120_000,\n      'client_inspection'"));
assert(runnerSource.includes("120_000,\n      'professional_inspection'"));
assert(runnerSource.includes("90_000, 'canonical_messages_inspection'"));
assert(runnerSource.includes("90_000, 'alternate_messages_inspection'"));
assert(runnerSource.includes('const detailCandidates = ['));
assert(runnerSource.includes("cases.find((entry) => entry.authority === 'canonical_confirmed')"));
assert(runnerSource.includes("cases.find((entry) => entry.authority === 'client_intent' || entry.authority === 'none')"));
assert(runnerSource.includes('page.setDefaultTimeout(10_000)'));
assert(runnerSource.includes('page.setDefaultNavigationTimeout(20_000)'));
assert(runnerSource.includes("checkpoint(persona + '_orders_collected')"));
assert(runnerSource.includes('fs.writeSync(1, serialized)'));
assert(runnerSource.includes('process.exit(code)'));
assert(runnerSource.includes('fs.rmSync(runtimePath, { force: true })'));
assert(preparerSource.includes("new Set(['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session'])"));
assert(preparerSource.includes('page.context().storageState()'));
assert(preparerSource.includes('candidate && candidate.id'));
assert(preparerSource.includes("user = { role: String(candidate.role || candidate.type || 'client')"));
assert(preparerSource.includes("checkpoint(persona + '_login_session_ready')"));
assert(preparerSource.includes('canonical sanitized session snapshot'));
assert(preparerSource.includes("submit.click({ noWaitAfter: true"));

const before = fs.readdirSync('scripts').filter((name) => name.startsWith(runtimePrefix));
assert.deepStrictEqual(before, []);

const dryRun = spawnSync(process.execPath, [runner, '--dry-run'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'dry_run_only');
assert.strictEqual(report.credentialsRecorded, false);
assert.strictEqual(report.rawIdentifiersRecorded, false);
assert.strictEqual(report.browserContextsCreated, 0);
assert.strictEqual(report.stagingReadsPerformed, 0);
assert.strictEqual(report.stagingMutationsPerformed, 0);
assert.strictEqual(report.lastCheckpoint, 'initialized');
assert.deepStrictEqual(report.checkpointHistory, []);

const preparedDryRun = spawnSync(process.execPath, [preparer, '--dry-run'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});
assert.strictEqual(preparedDryRun.status, 0, preparedDryRun.stderr);
const preparedReport = JSON.parse(preparedDryRun.stdout);
assert.strictEqual(preparedReport.mode, 'dry-run');
assert.strictEqual(preparedReport.status, 'dry_run_only');
assert.strictEqual(fs.readFileSync(executor, 'utf8'), executorSource);

const after = fs.readdirSync('scripts').filter((name) => name.startsWith(runtimePrefix));
assert.deepStrictEqual(after, []);

console.log('SCHED-C01D authenticated browser read-only runner tests passed.');
