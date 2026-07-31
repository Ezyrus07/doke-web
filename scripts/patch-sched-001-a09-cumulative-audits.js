'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function replaceExact(relativePath, before, after) {
  const absolutePath = path.join(ROOT, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');
  if (!source.includes(before)) {
    throw new Error(`SCHED_A09_AUDIT_PATCH_TARGET_MISSING:${relativePath}`);
  }
  fs.writeFileSync(absolutePath, source.replace(before, after));
}

replaceExact(
  'scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js',
  `assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
assert(config.orderedNextActions[0].includes('SCHED-A04'));
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert(config.orderedNextActions[0].includes('SCHED-A04'));
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceExact(
  'scripts/audit-sched-001-a03-reservation-migration-local-contract.js',
  `assert(config.orderedNextActions[0].includes('SCHED-A04'));
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert(config.orderedNextActions[0].includes('SCHED-A04'));
const postA09 = Number(String(matrix.version).split('.')[2]) >= 50 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceExact(
  'scripts/audit-sched-001-a04-server-command-runtime.js',
  `assert.strictEqual(sched.maturity, 2);
assert(['contract_only', 'partial'].includes(sched.serverAuthority));
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
assert(config.orderedNextActions[0].includes('SCHED-A05'));
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert(['contract_only', 'partial'].includes(sched.serverAuthority));
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert(config.orderedNextActions[0].includes('SCHED-A05'));
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceExact(
  'scripts/audit-sched-001-a05-persistence-readiness.js',
  `assert.strictEqual(sched.maturity, 2);
assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert.strictEqual(sched.serverAuthority, 'partial');
assert.strictEqual(sched.stagingEvidence, 'staging_canary');
assert.strictEqual(sched.securityGate, 'partial');
const postA09 = compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3;
if (postA09) {
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert.strictEqual(sched.maturity, 2);
  assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceExact(
  'scripts/audit-ord-001-a10-blocker-reconciliation.js',
  `assert.strictEqual(ord.nextActions.length, 4);
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert.strictEqual(ord.nextActions.length, 4);
if (compareVersions(matrix.version, '1.3.50') >= 0) {
  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

replaceExact(
  'scripts/audit-ord-001-a11-scheduling-authority-handoff.js',
  `assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));
assert(sched.nextActions[0].includes('SCHED-A07'));
assert(ord.nextActions[0].includes('SCHED-A07'));`,
  `assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B02'));
assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B04' && blocker.category === 'order_integration'));
if (compareVersions(matrix.version, '1.3.50') >= 0 && sched.maturity === 3) {
  assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.nextActions[0].includes('trusted server composition root'));
  assert(ord.nextActions[0].includes('Keep ORD-B04 handed to SCHED-001'));
  assert(ord.evidence.some((item) => item.includes('SCHED-A08 completed the official migration-history repair')));
} else {
  assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B03'));
  assert(sched.nextActions[0].includes('SCHED-A07'));
  assert(ord.nextActions[0].includes('SCHED-A07'));
}`
);

fs.unlinkSync(__filename);
console.log('SCHED-A09 cumulative audit transition applied.');
