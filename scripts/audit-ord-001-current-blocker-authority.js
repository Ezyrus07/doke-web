#!/usr/bin/env node
'use strict';

// Repository-only compatibility gate: never calls hosted services or mutates source.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n?/g, '\n');
const parsed = (file) => JSON.parse(read(file));
const matrix = parsed('config/domain-completion-matrix.json');
const ord = matrix.domains.find((item) => item.id === 'ORD-001');
assert(ord, 'ORD-001 must exist');
assert.deepEqual(ord.blockers.map((item) => item.id), ['ORD-B02', 'ORD-B03'],
  'Current active blockers must not resurrect the completed isolated-runtime ORD-B05 milestone');
assert.equal(ord.productionGate, 'blocked');
assert.equal(ord.securityGate, 'partial');

const b02 = ord.blockers.find((item) => item.id === 'ORD-B02');
assert.equal(b02.severity, 'high');
for (const fragment of ['authorization envelope', 'runId-scoped cleanup', 'zero residue',
  'check-env', '2026-10-06', '280787d0b6130d89c2963c7b197118f9021b9daa']) {
  assert(b02.description.includes(fragment), 'ORD-B02 missing requirement or historical source: ' + fragment);
}
assert(ord.nextActions[0].includes('ORD-B02') && ord.nextActions[0].includes('cleanup')
  && ord.nextActions[0].includes('separately authorized'));
assert(ord.nextActions[2].includes('production release') && ord.nextActions[2].includes('external-provider selection'));
assert(ord.evidence.some((item) => item.includes('ORD-B05') && item.includes('historically closed')));
assert(ord.evidence.some((item) => item.includes('2026-10-06') && item.includes('280787d0b6130d89c2963c7b197118f9021b9daa')));

const canary = parsed('docs/validation/ORD-001-A08-STAGING-RELEASE-READINESS.json');
assert.equal(canary.historicalPreflight.status, 'staging_runtime_deployed_preflight_passed_browser_canary_blocked');
assert.equal(canary.historicalPreflight.initialRemainingBlockers[0], 'existing_synthetic_credentials_unavailable_in_browser_session');
assert.equal(canary.browserCanary.status, 'passed');
assert.equal(canary.browserCanary.runDate, '2026-10-06');
assert.equal(canary.browserCanary.evidenceHeadSha, '280787d0b6130d89c2963c7b197118f9021b9daa');
assert.equal(canary.browserCanary.acceptedOrderReadback, true);
assert.equal(canary.browserCanary.persistedMessageReadback, true);
assert.equal(canary.browserCanary.productionTested, false);

const a09 = parsed('config/ord-001-a09b0-provider-adapter-boundary.json');
const a10 = parsed('config/ord-001-a10-blocker-reconciliation.json');
const selection = a10.blockerDisposition.find((item) => item.id === 'ORD-B05');
assert(selection, 'Historic ORD-B05 provider-selection disposition must remain traceable');
assert.equal(selection.genericContinuationAuthorizes, false);
assert.equal(selection.requiredPhrase, 'I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING');
assert.equal(a09.selection.providerSelected, false);
assert.equal(a09.adapter.providerSpecificAdapterBound, false);
assert.equal(a09.adapter.commandsMaterialized, false);

// Keep the B04C historical evidence intact, separate from the live ORD blockers.
const history = parsed('config/sched-001-b04c-authenticated-ord-sched-composition-canary-closure.json');
assert.deepEqual(history.blockerDecision.remainingOrd, ['ORD-B02', 'ORD-B03', 'ORD-B05']);
assert.equal(history.successfulRun.rolledBack, true);
assert.equal(history.successfulRun.residueCountsZero, true);

const guards = [
  ['scripts/audit-ord-001-a08-staging-release-readiness.js', 'ORD-B05 must be closed after the isolated staging deployment.'],
  ['scripts/audit-ord-001-a09b0-provider-adapter-boundary.js', 'ORD-B05 must stay closed after the separately authorized isolated staging deployment.'],
  ['scripts/audit-ord-001-a10-blocker-reconciliation.js', "if (postB04Closure) assert(!blockers['ORD-B05'])"]
];
for (const [file, fragment] of guards) assert(read(file).includes(fragment), 'Historical closure assertion changed: ' + file);
for (const file of [
  'scripts/audit-sched-001-b04c-authenticated-ord-sched-composition-canary-closure.js',
  'scripts/audit-sched-001-c01a-frontend-canonical-authority-readiness.js',
  'scripts/audit-sched-001-c01b-frontend-canonical-schedule-read-model.js'
]) {
  const text = read(file);
  assert(text.includes("['ORD-B02', 'ORD-B03']"), 'SCHED live blocker expectation drift: ' + file);
  assert(text.includes("providerDisposition.requiredPhrase"), 'Separate provider selection guard missing: ' + file);
  assert(!text.includes("ord.blockers.map((item) => item.id), ['ORD-B02', 'ORD-B03', 'ORD-B05']"));
  assert(!text.includes("ord.blockers.map((blocker) => blocker.id), ['ORD-B02', 'ORD-B03', 'ORD-B05']"));
}
console.log('ORD-001 current blocker authority and historical canary compatibility PASS (read-only).');
