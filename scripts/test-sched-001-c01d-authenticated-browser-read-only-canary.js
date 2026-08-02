#!/usr/bin/env node
'use strict';

const assert = require('assert');
const { spawnSync } = require('child_process');

const executor = 'scripts/execute-sched-001-c01d-authenticated-browser-read-only-canary.js';

const dryRun = spawnSync(process.execPath, [executor, '--dry-run'], { encoding: 'utf8' });
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'dry_run_only');
assert.strictEqual(report.credentialsRecorded, false);
assert.strictEqual(report.rawIdentifiersRecorded, false);
assert.strictEqual(report.screenshotsCaptured, 0);
assert.strictEqual(report.browserContextsCreated, 0);
assert.strictEqual(report.stagingReadsPerformed, 0);
assert.strictEqual(report.stagingMutationsPerformed, 0);

const missingEnv = spawnSync(process.execPath, [executor, '--check-env'], { encoding: 'utf8', env: {} });
assert.notStrictEqual(missingEnv.status, 0);
const blocked = JSON.parse(missingEnv.stdout);
assert.strictEqual(blocked.status, 'blocked_by_environment');
assert(blocked.failures.some((value) => value.includes('DOKE_STAGING_CLIENT_EMAIL is required')));
assert.strictEqual(blocked.browserContextsCreated, 0);
assert.strictEqual(blocked.stagingReadsPerformed, 0);

const conflictingModes = spawnSync(process.execPath, [executor, '--dry-run', '--execute'], { encoding: 'utf8' });
assert.notStrictEqual(conflictingModes.status, 0);

console.log('SCHED-C01D authenticated browser read-only execution tests passed.');
