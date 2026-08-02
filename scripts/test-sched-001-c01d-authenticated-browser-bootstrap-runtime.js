#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const wrapper = 'scripts/prepare-sched-001-c01d-authenticated-browser-bootstrap-runtime.js';
const preparer = 'scripts/prepare-sched-001-c01d-authenticated-browser-login-runtime.js';
const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';

const wrapperSource = fs.readFileSync(wrapper, 'utf8');
const preparerSource = fs.readFileSync(preparer, 'utf8');
const executorSource = fs.readFileSync(executor, 'utf8');

assert(wrapperSource.includes("'supabase.min.js'),\n    path.join(root"));
assert(wrapperSource.includes("path: localSupabaseUmd"));
assert(wrapperSource.includes("'Supabase CDN fulfillment body'"));
assert(wrapperSource.includes("checkpoint('orders_domcontentloaded')"));
assert(wrapperSource.includes("checkpoint('orders_document_bootstrap_complete')"));
assert(wrapperSource.includes('orders_domcontentloaded_node_watchdog'));
assert(wrapperSource.includes('orders_prerequisites_node_watchdog'));
assert(wrapperSource.includes("polling: 100, timeout: 20_000"));
assert(wrapperSource.includes('bootstrapDiagnostics.failedScripts'));
assert(wrapperSource.includes("spawnSync(process.execPath, ['--check', preparerPath]"));
assert(wrapperSource.includes("fs.writeFileSync(preparerPath, originalSource"));

const result = spawnSync(process.execPath, [wrapper, '--dry-run'], {
  encoding: 'utf8',
  maxBuffer: 16 * 1024 * 1024
});
assert.strictEqual(result.status, 0, result.stderr || result.stdout);
const report = JSON.parse(result.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'dry_run_only');
assert.strictEqual(report.browserContextsCreated, 0);
assert.strictEqual(report.stagingReadsPerformed, 0);
assert.strictEqual(report.stagingMutationsPerformed, 0);
assert.strictEqual(report.credentialsRecorded, false);
assert.strictEqual(report.rawIdentifiersRecorded, false);
assert.strictEqual(fs.readFileSync(preparer, 'utf8'), preparerSource);
assert.strictEqual(fs.readFileSync(executor, 'utf8'), executorSource);

console.log('SCHED-C01D authenticated browser bootstrap runtime tests passed.');
