#!/usr/bin/env node
'use strict';

const fs = require('fs');

const matrixPath = 'config/domain-completion-matrix.json';
const packagePath = 'package.json';
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

if (matrix.version !== '1.3.63') {
  throw new Error(`SCHED_B04A_MATRIX_VERSION_UNEXPECTED:${matrix.version}`);
}

const sched = matrix.domains.find((domain) => domain.id === 'SCHED-001');
const ord = matrix.domains.find((domain) => domain.id === 'ORD-001');
if (!sched || !ord) throw new Error('SCHED_B04A_DOMAIN_MISSING');
if (sched.maturity !== 3) throw new Error(`SCHED_B04A_SCHED_MATURITY_UNEXPECTED:${sched.maturity}`);

const requiredPaths = [
  'config/sched-001-b04-ord-canonical-wiring-readiness.json',
  'docs/SCHED-001-B04-ORD-CANONICAL-WIRING-READINESS.md',
  'docs/validation/SCHED-001-B04-ORD-CANONICAL-WIRING-READINESS.json',
  'scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js',
  'scripts/test-sched-001-b04-ord-canonical-wiring-readiness.js',
  '.github/workflows/sched-001-b04-ord-canonical-wiring-readiness.yml'
];

requiredPaths.forEach((path) => {
  appendUnique(sched.requiredPaths, path);
  appendUnique(ord.requiredPaths, path);
});

appendUnique(sched.tests, 'audit:sched-001-b04-ord-canonical-wiring-readiness');
appendUnique(sched.tests, 'test:sched-001-b04-ord-canonical-wiring-readiness');
appendUnique(ord.tests, 'audit:sched-001-b04-ord-canonical-wiring-readiness');
appendUnique(ord.tests, 'test:sched-001-b04-ord-canonical-wiring-readiness');

const evidenceText = 'SCHED-B04A froze the repository-only ORD canonical wiring contract: schedule_reservation_id is the reservation authority, scheduled_at is projection-only, direct schedule writes remain prohibited, and no runtime, staging, frontend, deployment or production effect occurred.';
appendUnique(sched.evidence, evidenceText);
appendUnique(ord.evidence, evidenceText);

const schedBlocker = sched.blockers.find((item) => item.id === 'SCHED-B04');
const ordBlocker = ord.blockers.find((item) => item.id === 'ORD-B04');
if (!schedBlocker || !ordBlocker) throw new Error('SCHED_B04A_EXPECTED_BLOCKER_MISSING');
schedBlocker.description = 'The ORD/SCHED authority contract is frozen, but the order read model, trusted command composition and local integration tests are not implemented.';
ordBlocker.description = 'The order domain remains handed to SCHED-001 until the canonical reservation reference, projection-only scheduled_at model and trusted command composition are implemented and validated.';

sched.nextActions = [
  'Implement SCHED-B04B locally: expose schedule_reservation_id in the order read model, reject direct canonical scheduled_at writes, and compose confirmed reservations with the scheduled order state.',
  'Add fail-closed local tests for confirm, reschedule, reservation cancellation, order cancellation and start-order authorization across ORD-001 and SCHED-001.',
  'Keep staging mutations, frontend authority switch, deployment, Cron, workers, production and merge blocked until a separately authorized remote canary exists.'
];
ord.nextActions = [
  'Implement ORD-B04 through SCHED-B04B so orders consume schedule_reservation_id as authority and scheduled_at only as a projection from a confirmed reservation.',
  'Preserve order lifecycle ownership while prohibiting generic manual transitions to scheduled and direct frontend writes to canonical schedule fields.',
  'Keep staging, deployment, production and merge blocked pending independent local and remote evidence.'
];

pkg.scripts = pkg.scripts || {};
pkg.scripts['audit:sched-001-b04-ord-canonical-wiring-readiness'] = 'node scripts/audit-sched-001-b04-ord-canonical-wiring-readiness.js';
pkg.scripts['test:sched-001-b04-ord-canonical-wiring-readiness'] = 'node scripts/test-sched-001-b04-ord-canonical-wiring-readiness.js';

matrix.version = '1.3.64';
matrix.updatedAt = process.env.SCHED_B04A_UPDATED_AT || new Date().toISOString();

fs.writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
console.log('SCHED-B04A matrix reconciliation prepared.');

function appendUnique(list, value) {
  if (!Array.isArray(list)) throw new Error('SCHED_B04A_EXPECTED_ARRAY');
  if (!list.includes(value)) list.push(value);
}
