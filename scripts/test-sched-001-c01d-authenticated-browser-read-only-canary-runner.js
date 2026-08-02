#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const runner = 'scripts/run-sched-001-c01d-authenticated-browser-read-only-canary.js';
const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
const runtimePrefix = '.sched-c01d-authenticated-browser-read-only-canary-runtime-';
const legacyWait = "page.waitForURL(/\\/pedidos\\.html(?:[?#].*)?$/, { timeout: 30_000 }),";

const executorSource = fs.readFileSync(executor, 'utf8');
const runnerSource = fs.readFileSync(runner, 'utf8');
assert.strictEqual(executorSource.split(legacyWait).length - 1, 1);
assert(runnerSource.includes("waitUntil: 'domcontentloaded'"));
assert(runnerSource.includes('source.replace(legacyWait, correctedWait)'));
assert(runnerSource.includes('fs.rmSync(runtimePath, { force: true })'));

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

const after = fs.readdirSync('scripts').filter((name) => name.startsWith(runtimePrefix));
assert.deepStrictEqual(after, []);

console.log('SCHED-C01D authenticated browser read-only runner tests passed.');
