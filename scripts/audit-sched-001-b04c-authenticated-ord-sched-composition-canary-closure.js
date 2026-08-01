#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');

const CONFIG = 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.json';
const EVIDENCE = 'docs/validation/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.json';
const DOC = 'docs/SCHED-001-B04C-AUTHENTICATED-ORD-SCHED-COMPOSITION-CANARY-CLOSURE.md';
const EXECUTION = 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-execution.json';
const MATRIX = 'config/domain-completion-matrix.json';
const WORKFLOW = '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.yml';

[CONFIG, EVIDENCE, DOC, EXECUTION, MATRIX, WORKFLOW].forEach((file) => {
  assert(fs.existsSync(file), `Missing B04C closure asset: ${file}`);
});

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const evidence = JSON.parse(fs.readFileSync(EVIDENCE, 'utf8'));
const execution = JSON.parse(fs.readFileSync(EXECUTION, 'utf8'));
const matrix = JSON.parse(fs.readFileSync(MATRIX, 'utf8'));
const docs = fs.readFileSync(DOC, 'utf8');
const workflow = fs.readFileSync(WORKFLOW, 'utf8');

assert.deepStrictEqual(evidence, config);
assert.strictEqual(config.status, 'authenticated_staging_composition_canary_passed_blockers_closed');
assert.strictEqual(config.authorization.status, 'consumed');
assert.strictEqual(config.authorization.mayBeReused, false);
assert.strictEqual(config.successfulRun.runId, 30716088197);
assert.strictEqual(config.successfulRun.jobId, 91411759384);
assert.strictEqual(config.successfulRun.headSha, 'c2bddcd061d2136e07d8c3790abf8f66884c480f');
assert.strictEqual(config.successfulRun.result, 'authenticated_ord_sched_composition_canary_passed');
assert.strictEqual(config.successfulRun.isolation, 'SERIALIZABLE');
assert.strictEqual(config.successfulRun.finalStatement, 'ROLLBACK');
assert.strictEqual(config.successfulRun.committed, false);
assert.strictEqual(config.successfulRun.rolledBack, true);
assert.strictEqual(config.successfulRun.residueCountsZero, true);
assert.strictEqual(config.successfulRun.authorityCountDeltaZero, true);
assert.strictEqual(config.attempts.totalAuthorized, 8);
assert.strictEqual(config.attempts.failedClosedBeforeSuccess, 7);
assert.strictEqual(config.attempts.successful, 1);
assert.strictEqual(config.attempts.allEndedInRollback, true);
assert.strictEqual(config.independentPostRunVerification.allResidueCountsZero, true);
assert.strictEqual(config.independentPostRunVerification.allAuthorityCountsZero, true);
assert.deepStrictEqual(config.blockerDecision.closed, ['SCHED-B04', 'ORD-B04']);
assert.deepStrictEqual(config.blockerDecision.remainingSched, []);
assert.deepStrictEqual(config.blockerDecision.remainingOrd, ['ORD-B02', 'ORD-B03', 'ORD-B05']);
assert.strictEqual(config.blockerDecision.domainCompletionClaimed, false);

Object.values(config.prohibitedActionsObserved).forEach((value) => {
  if (typeof value === 'boolean') assert.strictEqual(value, false);
  else assert.strictEqual(value, 0);
});

assert.strictEqual(execution.authorization.status, 'consumed_success');
assert.strictEqual(execution.authorization.mayBeReusedForRetry, false);
assert.strictEqual(execution.executionState.canaryPassed, true);
assert.strictEqual(execution.executionState.blockedBy, null);
assert.strictEqual(execution.executionState.successfulRun.runId, 30716088197);
assert.strictEqual(execution.executionState.allAuthorizedAttemptsRolledBack, true);
assert.strictEqual(execution.executionState.allResidueCountsZero, true);
assert.strictEqual(execution.executionState.allAuthorityCountDeltasZero, true);

const matrixParts = String(matrix.version).split('.').map(Number);
assert.strictEqual(matrixParts[0], 1);
assert.strictEqual(matrixParts[1], 3);
assert(matrixParts[2] >= 70, 'B04C closure requires matrix 1.3.70 or later');
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
assert(sched && ord);
assert.strictEqual(sched.maturity, 3);
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), []);
assert.deepStrictEqual(ord.blockers.map((item) => item.id), ['ORD-B02', 'ORD-B03', 'ORD-B05']);
assert(sched.nextActions[0].includes('frontend'));
assert(ord.nextActions[0].includes('ORD-B02'));
assert(sched.evidence.some((item) => item.includes('run 30716088197')));
assert(ord.evidence.some((item) => item.includes('run 30716088197')));

[
  'authenticated_ord_sched_composition_canary_passed',
  'SERIALIZABLE',
  'ROLLBACK',
  'SCHED-B04',
  'ORD-B04',
  'ORD-B02',
  'ORD-B03',
  'ORD-B05'
].forEach((fragment) => assert(docs.includes(fragment), `Closure documentation missing: ${fragment}`));

assert(workflow.includes('permissions:\n  contents: read'));
[
  'contents: write',
  'secrets.',
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_DB_PASSWORD',
  'psql ',
  'curl ',
  '--execute',
  'git push'
].forEach((fragment) => assert(!workflow.includes(fragment), `Closure workflow contains ${fragment}`));
assert(!fs.existsSync('.github/workflows/sched-001-b04c-authorized-retry-application.yml'));
assert(!fs.existsSync('.github/workflows/sched-001-b04c-bigint-normalization-reconciliation.yml'));

console.log('SCHED-B04C authenticated ORD/SCHED composition canary closure audit passed.');
