#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';
const source = fs.readFileSync(executor, 'utf8');
[
  "checkpoint('orders_navigation_goto_commit')",
  "checkpoint('orders_list_attached')",
  "checkpoint('orders_document_bootstrap_complete')",
  "checkpoint('orders_prerequisites_ready')",
  "checkpoint('orders_initializer_ready')",
  "checkpoint('orders_remote_hydration_complete')",
  'bootstrapDiagnostics.pageErrors',
  'bootstrapDiagnostics.failedScripts',
  "polling: 100, timeout: 20_000",
  "polling: 100, timeout: 45_000"
].forEach((fragment) => assert(source.includes(fragment), 'Canonical bootstrap contract missing ' + fragment));
assert(!source.includes('page.addInitScript({ path: localSupabaseUmd })'));
assert(!source.includes('body: localSupabaseSource'));

const before = fs.readFileSync(executor, 'utf8');
const result = spawnSync(process.execPath, [executor, '--dry-run'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});
assert.strictEqual(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
assert.strictEqual(report.status, 'dry_run_only');
assert.strictEqual(report.stagingReadsPerformed, 0);
assert.strictEqual(report.stagingMutationsPerformed, 0);
assert.strictEqual(fs.readFileSync(executor, 'utf8'), before);

console.log('SCHED-C01D canonical browser bootstrap tests passed.');
