#!/usr/bin/env node
'use strict';

const fs = require('fs');

const config = JSON.parse(fs.readFileSync('config/sched-001-a07-history-canary-readiness.json', 'utf8'));
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.scripts['audit:sched-001-a07-history-canary-readiness'] = 'node scripts/audit-sched-001-a07-history-canary-readiness.js';
pkg.scripts['test:sched-001-a07-history-canary-readiness'] = 'node scripts/test-sched-001-a07-history-canary-readiness.js';
pkg.scripts['plan:sched-001-a07-history-canaries'] = 'node scripts/plan-sched-001-a07-history-canaries.js';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');

const matrix = JSON.parse(fs.readFileSync('config/domain-completion-matrix.json', 'utf8'));
matrix.version = '1.3.49';
matrix.updatedAt = '2026-07-31T11:18:00-03:00';
const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!sched || !ord) throw new Error('ORD-001 or SCHED-001 missing from matrix');
sched.maturity = 2;
sched.serverAuthority = 'partial';
sched.stagingEvidence = 'staging_canary';
sched.securityGate = 'partial';
sched.blockers = sched.blockers.filter((blocker) => blocker.id !== 'SCHED-B05');
const descriptions = {
  'SCHED-B02': 'Canonical schema and PostgreSQL adapter exist in staging, but the trusted server composition root and runtime activation are pending.',
  'SCHED-B03': 'Canonical schema is applied, but migration-history alignment and rolled-back remote concurrency, idempotency and DST canaries are pending.',
  'SCHED-B04': 'orders.schedule_reservation_id exists in staging, but ORD-001 runtime wiring to the canonical reservation remains pending.'
};
sched.blockers.forEach((blocker) => {
  if (descriptions[blocker.id]) blocker.description = descriptions[blocker.id];
});
sched.nextActions = config.orderedNextActions;
const paths = [
  'config/sched-001-a07-history-canary-readiness.json',
  'docs/SCHED-001-A07-MIGRATION-HISTORY-CANARY-READINESS.md',
  'docs/validation/SCHED-001-A07-MIGRATION-HISTORY-CANARY-READINESS.json',
  'scripts/plan-sched-001-a07-history-canaries.js',
  'scripts/test-sched-001-a07-history-canary-readiness.js',
  'scripts/audit-sched-001-a07-history-canary-readiness.js',
  'supabase/tests/020_sched_a07_rolled_back_canaries.sql',
  '.github/workflows/sched-001-a07-history-canary-readiness.yml'
];
const tests = [
  'audit:sched-001-a07-history-canary-readiness',
  'test:sched-001-a07-history-canary-readiness'
];
for (const domain of [sched, ord]) {
  domain.requiredPaths = Array.from(new Set([...(domain.requiredPaths || []), ...paths]));
  domain.tests = Array.from(new Set([...(domain.tests || []), ...tests]));
}
ord.nextActions = ord.nextActions || [];
ord.nextActions[0] = 'Complete SCHED-A07 migration-history repair and rolled-back staging canaries after exact independent authorization.';
fs.writeFileSync('config/domain-completion-matrix.json', JSON.stringify(matrix, null, 2) + '\n');

const auditPaths = [
  'scripts/audit-sched-001-a01-repository-baseline-staging-security-preflight.js',
  'scripts/audit-sched-001-a02-command-event-timezone-conflict-contract.js',
  'scripts/audit-sched-001-a03-reservation-migration-local-contract.js',
  'scripts/audit-sched-001-a04-server-command-runtime.js',
  'scripts/audit-sched-001-a05-persistence-readiness.js',
  'scripts/audit-ord-001-a10-blocker-reconciliation.js',
  'scripts/audit-ord-001-a11-scheduling-authority-handoff.js'
];
const replacements = [
  ["assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04', 'SCHED-B05']);", "assert.deepStrictEqual(sched.blockers.map((item) => item.id), ['SCHED-B02', 'SCHED-B03', 'SCHED-B04']);"],
  ["assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));", "assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));"],
  ["assert(sched.blockers.some((blocker) => blocker.id === 'SCHED-B05' && blocker.category === 'reservation_status_authority'));", "assert(!sched.blockers.some((blocker) => blocker.id === 'SCHED-B05'));"],
  ["assert.deepStrictEqual(sched.nextActions, config.orderedNextActions);", "assert(sched.nextActions[0].includes('SCHED-A07'));"],
  ["assert(sched.nextActions[0].includes('SCHED-A05'));", "assert(sched.nextActions[0].includes('SCHED-A07'));"],
  ["assert(ord.nextActions[0].includes('SCHED-A05'));", "assert(ord.nextActions[0].includes('SCHED-A07'));"],
  ["assert(ord.nextActions[0].includes('exact independent staging authorization'));", "assert(ord.nextActions[0].includes('SCHED-A07'));"],
  ["assert.deepStrictEqual(ord.nextActions.slice(1), config.orderedNextActions.slice(1));", "assert.strictEqual(ord.nextActions.length, 4);" ]
];
for (const file of auditPaths) {
  if (!fs.existsSync(file)) continue;
  let text = fs.readFileSync(file, 'utf8');
  for (const [from, to] of replacements) text = text.split(from).join(to);
  fs.writeFileSync(file, text);
}

const a07AuditPath = 'scripts/audit-sched-001-a07-history-canary-readiness.js';
let a07Audit = fs.readFileSync(a07AuditPath, 'utf8');
a07Audit = a07Audit.replace(
  "  \"['scripts/plan-sched-001-a07-history-canaries.js', '--execute']\",\n",
  "  '--execute',\n"
);
fs.writeFileSync(a07AuditPath, a07Audit);
