#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const { spawnSync } = require('child_process');

const CONFIG_PATH = 'config/sched-001-c01d-authenticated-browser-canary-readiness.json';
const EVIDENCE_PATH = 'docs/validation/SCHED-001-C01D-AUTHENTICATED-BROWSER-CANARY-READINESS.json';
const PLANNER_PATH = 'scripts/plan-sched-001-c01d-authenticated-browser-canary.js';

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE_PATH, 'utf8'));

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.authorization.genericNextAllowed, false);
assert.strictEqual(config.authorization.browserExecutionCovered, false);
assert.strictEqual(config.runtimeGate.postLoginReadOnlyGuardRequired, true);
assert.deepStrictEqual(config.runtimeGate.allowedPostLoginMethods, ['GET', 'HEAD', 'OPTIONS']);
assert.strictEqual(config.caseManifest.liveIncompleteProjectionCaseForbidden, true);
assert.strictEqual(config.evidencePolicy.screenshotsAllowed, false);
assert.strictEqual(config.evidencePolicy.reportContainsOnlyAssertionsDigestsAndCounts, true);
assert.strictEqual(config.capabilities.executeModeAvailable, false);
assert.strictEqual(config.effects.networkRequestsPerformed, 0);
assert.strictEqual(config.effects.stagingMutations, 0);

const dryRun = spawnSync(process.execPath, [PLANNER_PATH, '--dry-run'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(dryRun.status, 0, dryRun.stderr);
const report = JSON.parse(dryRun.stdout);
assert.strictEqual(report.mode, 'dry-run');
assert.strictEqual(report.status, 'authenticated_browser_execution_blocked');
assert.strictEqual(report.requiredExactPhrase, config.authorization.requiredExactPhrase);
assert.strictEqual(report.genericNextAllowed, false);
assert.strictEqual(report.browserContextsRequired, 2);
assert.deepStrictEqual(report.postLoginAllowedMethods, ['GET', 'HEAD', 'OPTIONS']);
assert.deepStrictEqual(report.surfaces, config.surfaces);
assert.deepStrictEqual(report.capabilities, config.capabilities);
assert.deepStrictEqual(report.effects, config.effects);

const output = dryRun.stdout;
assert(!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(output));
assert(!/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/i.test(output));
assert(!/eyJ[A-Za-z0-9_-]{20,}/.test(output));
assert(!/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]{20,}\b/i.test(output));
assert(!/\bsk_[A-Za-z0-9_-]{20,}\b/i.test(output));
assert(!/"password"\s*:/i.test(output));
assert(!/"serviceRoleKey"\s*:/i.test(output));

const noMode = spawnSync(process.execPath, [PLANNER_PATH], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(noMode.status, 2);
assert(noMode.stderr.includes('Only --dry-run is available'));

const executeAttempt = spawnSync(process.execPath, [PLANNER_PATH, '--execute'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(executeAttempt.status, 2);
assert(executeAttempt.stderr.includes('requires a separate authorized package'));

const extraFlagAttempt = spawnSync(process.execPath, [PLANNER_PATH, '--dry-run', '--check-env'], {
  cwd: process.cwd(),
  encoding: 'utf8'
});
assert.strictEqual(extraFlagAttempt.status, 2);

console.log('SCHED-C01D authenticated browser read-only canary readiness tests passed.');
