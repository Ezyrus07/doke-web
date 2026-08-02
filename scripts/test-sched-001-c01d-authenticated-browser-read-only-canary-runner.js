#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
const runner = 'scripts/run-sched-001-c01d-authenticated-browser-read-only-canary.js';
const removedPreparers = [
  'scripts/prepare-sched-001-c01d-authenticated-browser-login-runtime.js',
  'scripts/prepare-sched-001-c01d-authenticated-browser-bootstrap-runtime.js'
];
const executorSource = fs.readFileSync(executor, 'utf8');
const runnerSource = fs.readFileSync(runner, 'utf8');

[
  "lastCheckpoint: 'initialized'",
  'async function withPhaseTimeout',
  "120_000,\n      'client_inspection'",
  "120_000,\n      'professional_inspection'",
  "90_000,\n        'canonical_messages_inspection'",
  'page.setDefaultTimeout(10_000)',
  "new Set(['doke.auth.session.v1', 'doke.auth.session.v2', 'doke.auth.session'])",
  "submit.click({ noWaitAfter: true",
  "'supabase.min.js'),\n    path.join(root",
  "checkpoint('orders_domcontentloaded')",
  'orders_domcontentloaded_node_watchdog',
  'orders_prerequisites_node_watchdog',
  'path: localSupabaseUmd',
  'await Promise.resolve(window.DokeInitOrders())',
  "state === 'ready' || state === 'empty'",
  "checkpoint('orders_remote_hydration_complete')",
  "resolve('timeout'), 10_000",
  'browser_cleanup_timeout_forced_exit',
  'fs.writeSync(1, serialized)',
  'process.exit(code)'
].forEach((fragment) => assert(executorSource.includes(fragment), 'Canonical executor missing ' + fragment));

assert(!executorSource.includes('localSupabaseSource'));
assert(runnerSource.includes('timeout: watchdogMs'));
assert(runnerSource.includes("killSignal: 'SIGKILL'"));
assert(runnerSource.includes('runner_watchdog_timeout_before_executor_completion'));
[
  'runtimePrefix',
  'buildRuntimeSource',
  'writeFileSync(runtimePath',
  'replaceExactlyOnce(source'
].forEach((fragment) => assert(!runnerSource.includes(fragment), 'Runner retains source rewriting: ' + fragment));
removedPreparers.forEach((file) => assert(!fs.existsSync(file), 'Legacy runtime preparer still exists: ' + file));

const dryRun = spawnSync(process.execPath, [runner, '--dry-run'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'dry_run_only');
assert.strictEqual(report.browserContextsCreated, 0);
assert.strictEqual(report.stagingReadsPerformed, 0);
assert.strictEqual(report.stagingMutationsPerformed, 0);
assert.strictEqual(report.lastCheckpoint, 'initialized');
assert.deepStrictEqual(report.checkpointHistory, []);

console.log('SCHED-C01D canonical browser runner tests passed.');
