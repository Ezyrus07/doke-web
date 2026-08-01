#!/usr/bin/env node
'use strict';

const fs = require('fs');

const MATRIX_PATH = 'config/domain-completion-matrix.json';
const PACKAGE_PATH = 'package.json';
const EXECUTION_CONFIG_PATH = 'config/sched-001-b04c-authenticated-ord-sched-composition-canary-execution.json';
const SELF_PATH = 'scripts/apply-sched-001-b04c-execution-package-reconciliation.js';

const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(PACKAGE_PATH, 'utf8'));
const execution = JSON.parse(fs.readFileSync(EXECUTION_CONFIG_PATH, 'utf8'));

const requiredPaths = [
  EXECUTION_CONFIG_PATH,
  'scripts/execute-sched-001-b04c-authenticated-ord-sched-composition-canary.js',
  'scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-execution.js',
  'scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-execution.js',
  '.github/workflows/sched-001-b04c-authenticated-ord-sched-composition-canary.yml'
];
const testNames = [
  'audit:sched-001-b04c-authenticated-ord-sched-composition-canary-execution',
  'test:sched-001-b04c-authenticated-ord-sched-composition-canary-execution'
];

function addUnique(list, values) {
  const output = Array.isArray(list) ? list.slice() : [];
  for (const value of values) if (!output.includes(value)) output.push(value);
  return output;
}

function replaceOrAppendEvidence(domain, prefix, value) {
  const evidence = Array.isArray(domain.evidence) ? domain.evidence.slice() : [];
  const index = evidence.findIndex((item) => String(item).startsWith(prefix));
  if (index >= 0) evidence[index] = value;
  else evidence.push(value);
  domain.evidence = evidence;
}

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!sched || !ord) throw new Error('SCHED-001 or ORD-001 missing from domain matrix');

matrix.version = '1.3.67';
matrix.updatedAt = '2026-08-01T14:06:00-03:00';

for (const domain of [sched, ord]) {
  domain.requiredPaths = addUnique(domain.requiredPaths, requiredPaths);
  domain.tests = addUnique(domain.tests, testNames);
}

replaceOrAppendEvidence(
  sched,
  'SCHED-B04C execution package',
  'SCHED-B04C execution package is inert and fail-closed: it requires a manual workflow dispatch on the exact PR head, the exact independent staging authorization phrase, the frozen project ref, open draft PR state, SERIALIZABLE outer transaction, per-command savepoints, final ROLLBACK and independent zero-residue verification.'
);
replaceOrAppendEvidence(
  ord,
  'SCHED-B04C execution package',
  'SCHED-B04C execution package now exercises the ORD/SCHED projection contract, order event/history projection, replacement rejection, start authorization and partial-projection rollback, but no staging execution has occurred and ORD-B04 remains open.'
);

const schedBlocker = sched.blockers.find((blocker) => blocker.id === 'SCHED-B04');
if (!schedBlocker) throw new Error('SCHED-B04 missing from matrix');
schedBlocker.description = 'The ORD/SCHED local authority wiring and an inert exact-authorization canary executor are implemented. The blocker remains open until the authenticated staging composition canary passes with final rollback, unchanged authority counts and zero residue.';
const ordBlocker = ord.blockers.find((blocker) => blocker.id === 'ORD-B04');
if (!ordBlocker) throw new Error('ORD-B04 missing from matrix');
ordBlocker.description = 'ORD consumes the canonical schedule reservation projection locally and the exact-authorization staging executor is prepared. The blocker remains open until SCHED-B04C passes remotely with rollback, order event/history evidence and zero residue.';

sched.nextActions = [
  'Execute SCHED-B04C only after I_EXPLICITLY_AUTHORIZE_SCHED_B04C_AUTHENTICATED_ORD_SCHED_COMPOSITION_CANARIES_ON_DOKE_STAGING is supplied with the exact current PR head SHA.',
  'Require confirmation, reschedule, reservation cancellation, replacement rejection, order event/history projection and partial-projection rollback to pass in one SERIALIZABLE transaction ending in ROLLBACK.',
  'Close SCHED-B04 and ORD-B04 only after independent post-rollback residue and authority-count verification succeeds.',
  'Keep frontend authority switch, deployment, Cron, workers, production and merge blocked.'
];
ord.nextActions = [
  'Execute the exact-authorized SCHED-B04C authenticated ORD/SCHED staging canary and preserve the rollback evidence.',
  'Close ORD-B04 only when the canonical reservation reference, order status/history projection and start/cancel boundaries pass remotely.',
  'Keep generic scheduled transitions, direct scheduled_at authority and frontend compensating writes prohibited.',
  'Keep deployment, production and merge blocked pending independent release authorization.'
];

pkg.scripts = pkg.scripts || {};
pkg.scripts['audit:sched-001-b04c-authenticated-ord-sched-composition-canary-execution'] =
  'node scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-execution.js';
pkg.scripts['test:sched-001-b04c-authenticated-ord-sched-composition-canary-execution'] =
  'node scripts/test-sched-001-b04c-authenticated-ord-sched-composition-canary-execution.js';

execution.executionState.workflowDispatchPrepared = true;
execution.executionState.authenticatedCanaryExecuted = false;
execution.executionState.stagingReadsPerformed = 0;
execution.executionState.stagingMutationsPerformed = 0;

fs.writeFileSync(MATRIX_PATH, `${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(PACKAGE_PATH, `${JSON.stringify(pkg, null, 2)}\n`);
fs.writeFileSync(EXECUTION_CONFIG_PATH, `${JSON.stringify(execution, null, 2)}\n`);
fs.rmSync(SELF_PATH);
console.log('SCHED-B04C execution package reconciled; temporary patcher removed.');
